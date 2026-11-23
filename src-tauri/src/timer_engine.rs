use crate::models::{
    is_in_quiet_hours, AppConfig, ReminderMode, StatsStore, TimerPhase, TimerPreset, TimerSnapshot,
};
use crate::system_monitor::SystemActivityState;

const TOTAL_EYE_TIPS: usize = 12;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TimerAction {
    OpenPreBreak,
    ClosePreBreak,
    OpenBreak { mode: ReminderMode },
    CloseBreak,
    PlaySound(&'static str),
    RefreshTrayMenu,
    SaveStats,
}

#[derive(Debug)]
pub struct TimerCore {
    pub config: AppConfig,
    pub stats: StatsStore,
    pub phase: TimerPhase,
    pub remaining_seconds: u32,
    pub total_seconds: u32,
    pub is_preview: bool,
    pub dnd_reason: Option<String>,
    pub tip_index: usize,
    saved_before_preview: Option<(TimerPhase, u32, u32)>,
    unsaved_focus_ticks: u32,
}

impl TimerCore {
    pub fn new(mut config: AppConfig, stats: StatsStore) -> Self {
        config.sanitize();
        let focus_secs = config.active_preset().focus_minutes * 60;
        Self {
            config,
            stats,
            phase: TimerPhase::Focusing,
            remaining_seconds: focus_secs,
            total_seconds: focus_secs,
            is_preview: false,
            dnd_reason: None,
            tip_index: 0,
            saved_before_preview: None,
            unsaved_focus_ticks: 0,
        }
    }

    pub fn snapshot(&self, today: &str) -> TimerSnapshot {
        TimerSnapshot {
            phase: self.phase,
            remaining_seconds: self.remaining_seconds,
            total_seconds: self.total_seconds,
            active_preset: self.config.active_preset(),
            is_preview: self.is_preview,
            dnd_reason: self.dnd_reason.clone(),
            tip_index: self.tip_index,
            today_stats: self.stats.get_or_empty(today),
        }
    }

    pub fn tick(
        &mut self,
        activity: SystemActivityState,
        now_minutes_of_day: u32,
        today: &str,
    ) -> Vec<TimerAction> {
        let mut actions = Vec::new();

        // Preview mode only counts down its preview break timer
        if self.is_preview {
            if self.remaining_seconds > 1 {
                self.remaining_seconds -= 1;
            } else {
                actions.extend(self.end_preview());
            }
            return actions;
        }

        // Check quiet hours when enabled
        let in_quiet = self.config.enable_quiet_hours
            && is_in_quiet_hours(
                now_minutes_of_day,
                &self.config.quiet_start,
                &self.config.quiet_end,
            );

        // Handle Idle / Lock detection during focus phases
        if self.config.enable_idle_detection {
            let idle_threshold_secs = (self.config.idle_threshold_minutes as u64) * 60;
            let user_is_idle =
                activity.is_locked_or_away || activity.idle_seconds >= idle_threshold_secs;

            match self.phase {
                TimerPhase::Focusing | TimerPhase::PreBreak => {
                    if user_is_idle {
                        let was_pre_break = self.phase == TimerPhase::PreBreak;
                        self.phase = TimerPhase::IdlePaused;
                        self.dnd_reason = Some("idle".to_string());
                        if was_pre_break {
                            actions.push(TimerAction::ClosePreBreak);
                        }
                        actions.push(TimerAction::RefreshTrayMenu);
                        return actions;
                    }
                }
                TimerPhase::IdlePaused => {
                    if !user_is_idle {
                        // User returned after resting away from PC -> fresh focus cycle!
                        let focus_secs = self.config.active_preset().focus_minutes * 60;
                        self.phase = TimerPhase::Focusing;
                        self.remaining_seconds = focus_secs;
                        self.total_seconds = focus_secs;
                        self.dnd_reason = None;
                        actions.push(TimerAction::RefreshTrayMenu);
                    }
                    return actions;
                }
                _ => {}
            }
        } else if self.phase == TimerPhase::IdlePaused {
            // User turned off idle detection while idle-paused
            self.phase = TimerPhase::Focusing;
            self.dnd_reason = None;
            actions.push(TimerAction::RefreshTrayMenu);
        }

        let fullscreen_blocking =
            self.config.enable_fullscreen_dnd && activity.is_fullscreen_dnd;
        let dnd_active = fullscreen_blocking || in_quiet;
        let dnd_label = if fullscreen_blocking {
            Some("fullscreen".to_string())
        } else if in_quiet {
            Some("quiet_hours".to_string())
        } else {
            None
        };

        match self.phase {
            TimerPhase::Paused | TimerPhase::IdlePaused => {}

            TimerPhase::DndDeferred => {
                if !dnd_active {
                    self.dnd_reason = None;
                    actions.extend(self.enter_break(false, self.config.reminder_mode));
                } else {
                    self.dnd_reason = dnd_label;
                }
            }

            TimerPhase::Focusing => {
                self.record_focus_second(today, &mut actions);

                if self.remaining_seconds > 1 {
                    self.remaining_seconds -= 1;

                    // Transition to PreBreak if enabled and not in DND
                    if self.config.enable_pre_break_notice
                        && !dnd_active
                        && self.remaining_seconds <= self.config.pre_break_seconds
                        && self.total_seconds > self.config.pre_break_seconds
                    {
                        self.phase = TimerPhase::PreBreak;
                        actions.push(TimerAction::OpenPreBreak);
                        if self.config.enable_sound {
                            actions.push(TimerAction::PlaySound("pre_break"));
                        }
                        actions.push(TimerAction::RefreshTrayMenu);
                    }
                } else {
                    self.remaining_seconds = 0;
                    if dnd_active {
                        self.phase = TimerPhase::DndDeferred;
                        self.dnd_reason = dnd_label;
                        actions.push(TimerAction::RefreshTrayMenu);
                    } else {
                        actions.extend(self.enter_break(false, self.config.reminder_mode));
                    }
                }
            }

            TimerPhase::PreBreak => {
                self.record_focus_second(today, &mut actions);

                if dnd_active {
                    self.phase = TimerPhase::DndDeferred;
                    self.dnd_reason = dnd_label;
                    actions.push(TimerAction::ClosePreBreak);
                    actions.push(TimerAction::RefreshTrayMenu);
                    return actions;
                }

                if self.remaining_seconds > 1 {
                    self.remaining_seconds -= 1;
                } else {
                    actions.push(TimerAction::ClosePreBreak);
                    actions.extend(self.enter_break(false, self.config.reminder_mode));
                }
            }

            TimerPhase::OnBreak => {
                if self.config.enable_stats {
                    self.stats.entry_mut(today).total_break_seconds += 1;
                }
                if self.remaining_seconds > 1 {
                    self.remaining_seconds -= 1;
                } else {
                    actions.extend(self.complete_break(today));
                }
            }
        }

        actions
    }

    fn record_focus_second(&mut self, today: &str, actions: &mut Vec<TimerAction>) {
        if !self.config.enable_stats {
            return;
        }
        self.stats.entry_mut(today).focus_seconds += 1;
        self.unsaved_focus_ticks += 1;
        if self.unsaved_focus_ticks >= 30 {
            self.unsaved_focus_ticks = 0;
            actions.push(TimerAction::SaveStats);
        }
    }

    fn enter_break(&mut self, preview: bool, mode: ReminderMode) -> Vec<TimerAction> {
        let break_secs = if preview {
            20
        } else {
            self.config.active_preset().break_seconds
        };

        self.phase = TimerPhase::OnBreak;
        self.remaining_seconds = break_secs;
        self.total_seconds = break_secs;
        self.is_preview = preview;
        self.dnd_reason = None;
        self.tip_index = (self.tip_index + 1) % TOTAL_EYE_TIPS;

        let mut actions = vec![
            TimerAction::OpenBreak { mode },
            TimerAction::RefreshTrayMenu,
        ];
        if self.config.enable_sound {
            actions.push(TimerAction::PlaySound("break_start"));
        }
        actions
    }

    fn reset_to_focus(&mut self) {
        let focus_secs = self.config.active_preset().focus_minutes * 60;
        self.phase = TimerPhase::Focusing;
        self.remaining_seconds = focus_secs;
        self.total_seconds = focus_secs;
        self.is_preview = false;
        self.dnd_reason = None;
    }

    pub fn pause(&mut self) -> Vec<TimerAction> {
        if self.is_preview {
            return self.end_preview();
        }
        let mut actions = Vec::new();
        if self.phase == TimerPhase::PreBreak {
            actions.push(TimerAction::ClosePreBreak);
        }
        if matches!(
            self.phase,
            TimerPhase::Focusing | TimerPhase::PreBreak | TimerPhase::DndDeferred
        ) {
            self.phase = TimerPhase::Paused;
            self.dnd_reason = None;
            actions.push(TimerAction::RefreshTrayMenu);
        }
        actions
    }

    pub fn resume(&mut self) -> Vec<TimerAction> {
        let mut actions = Vec::new();
        if matches!(self.phase, TimerPhase::Paused | TimerPhase::IdlePaused) {
            self.phase = TimerPhase::Focusing;
            self.dnd_reason = None;
            actions.push(TimerAction::RefreshTrayMenu);
        }
        actions
    }

    pub fn reset(&mut self) -> Vec<TimerAction> {
        let mut actions = Vec::new();
        if self.is_preview {
            actions.extend(self.end_preview());
        }
        if self.phase == TimerPhase::PreBreak {
            actions.push(TimerAction::ClosePreBreak);
        } else if self.phase == TimerPhase::OnBreak {
            actions.push(TimerAction::CloseBreak);
        }
        self.reset_to_focus();
        actions.push(TimerAction::RefreshTrayMenu);
        actions
    }

    pub fn start_break_now(&mut self) -> Vec<TimerAction> {
        let mut actions = Vec::new();
        if self.is_preview {
            actions.extend(self.end_preview());
        }
        if self.phase == TimerPhase::PreBreak {
            actions.push(TimerAction::ClosePreBreak);
        }
        actions.extend(self.enter_break(false, self.config.reminder_mode));
        actions
    }

    pub fn preview_reminder(&mut self, mode: ReminderMode) -> Vec<TimerAction> {
        let mut actions = Vec::new();
        if self.is_preview {
            actions.extend(self.end_preview());
        }
        if self.phase == TimerPhase::OnBreak {
            return actions;
        }
        if self.phase == TimerPhase::PreBreak {
            actions.push(TimerAction::ClosePreBreak);
        }
        self.saved_before_preview = Some((self.phase, self.remaining_seconds, self.total_seconds));
        actions.extend(self.enter_break(true, mode));
        actions
    }

    pub fn end_preview(&mut self) -> Vec<TimerAction> {
        if !self.is_preview {
            return Vec::new();
        }
        self.is_preview = false;
        if let Some((phase, rem, total)) = self.saved_before_preview.take() {
            self.phase = if phase == TimerPhase::PreBreak {
                TimerPhase::Focusing
            } else {
                phase
            };
            self.remaining_seconds = rem;
            self.total_seconds = total;
        } else {
            self.reset_to_focus();
        }
        vec![TimerAction::CloseBreak, TimerAction::RefreshTrayMenu]
    }

    pub fn complete_break(&mut self, today: &str) -> Vec<TimerAction> {
        if self.is_preview {
            return self.end_preview();
        }
        let mut actions = vec![TimerAction::CloseBreak];
        if self.phase == TimerPhase::OnBreak && self.config.enable_stats {
            self.stats.entry_mut(today).completed_breaks += 1;
            self.unsaved_focus_ticks = 0;
            actions.push(TimerAction::SaveStats);
        }
        if self.config.enable_sound {
            actions.push(TimerAction::PlaySound("break_end"));
        }
        self.reset_to_focus();
        actions.push(TimerAction::RefreshTrayMenu);
        actions
    }

    pub fn skip_break(&mut self, today: &str) -> Vec<TimerAction> {
        if self.is_preview {
            return self.end_preview();
        }
        if !self.config.allow_skip {
            return Vec::new();
        }
        let mut actions = Vec::new();
        if self.phase == TimerPhase::PreBreak {
            actions.push(TimerAction::ClosePreBreak);
        } else if self.phase == TimerPhase::OnBreak {
            actions.push(TimerAction::CloseBreak);
        }
        if self.config.enable_stats {
            self.stats.entry_mut(today).skipped_breaks += 1;
            self.unsaved_focus_ticks = 0;
            actions.push(TimerAction::SaveStats);
        }
        self.reset_to_focus();
        actions.push(TimerAction::RefreshTrayMenu);
        actions
    }

    pub fn postpone_break(&mut self, minutes_override: Option<u32>, today: &str) -> Vec<TimerAction> {
        if self.is_preview {
            return self.end_preview();
        }
        if !self.config.allow_postpone && self.phase == TimerPhase::OnBreak {
            return Vec::new();
        }
        let mins = minutes_override
            .unwrap_or(self.config.postpone_minutes)
            .clamp(1, 30);
        let mut actions = Vec::new();
        if self.phase == TimerPhase::PreBreak {
            actions.push(TimerAction::ClosePreBreak);
        } else if self.phase == TimerPhase::OnBreak {
            actions.push(TimerAction::CloseBreak);
        }
        if self.config.enable_stats {
            self.stats.entry_mut(today).postponed_breaks += 1;
            self.unsaved_focus_ticks = 0;
            actions.push(TimerAction::SaveStats);
        }
        let postpone_secs = mins * 60;
        self.phase = TimerPhase::Focusing;
        self.remaining_seconds = postpone_secs;
        self.total_seconds = postpone_secs;
        self.dnd_reason = None;
        actions.push(TimerAction::RefreshTrayMenu);
        actions
    }

    pub fn switch_preset(&mut self, preset_id: &str) -> Vec<TimerAction> {
        if !self.config.presets.iter().any(|p| p.id == preset_id) {
            return Vec::new();
        }
        self.config.active_preset_id = preset_id.to_string();
        let mut actions = self.reset();
        actions.push(TimerAction::RefreshTrayMenu);
        actions
    }

    pub fn update_config(&mut self, mut next: AppConfig) -> Vec<TimerAction> {
        next.sanitize();
        let prev_active = self.config.active_preset();
        let next_active = next.active_preset();
        let preset_changed = prev_active.id != next_active.id
            || prev_active.focus_minutes != next_active.focus_minutes
            || prev_active.break_seconds != next_active.break_seconds;

        self.config = next;
        let mut actions = vec![TimerAction::RefreshTrayMenu];
        if preset_changed && self.phase != TimerPhase::OnBreak {
            if self.phase == TimerPhase::PreBreak {
                actions.push(TimerAction::ClosePreBreak);
            }
            self.reset_to_focus();
        }
        actions
    }

    pub fn save_custom_preset(&mut self, mut preset: TimerPreset) -> (TimerPreset, Vec<TimerAction>) {
        preset.is_builtin = false;
        preset.focus_minutes = preset.focus_minutes.clamp(1, 180);
        preset.break_seconds = preset.break_seconds.clamp(10, 3600);
        if preset.name.trim().is_empty() {
            preset.name = "自定义护眼方案".to_string();
        }

        if let Some(existing) = self
            .config
            .presets
            .iter_mut()
            .find(|p| p.id == preset.id && !p.is_builtin)
        {
            *existing = preset.clone();
        } else {
            if preset.id.trim().is_empty() {
                preset.id = format!("custom-{}", uuid::Uuid::new_v4());
            }
            self.config.presets.push(preset.clone());
        }

        let actions = vec![TimerAction::RefreshTrayMenu];
        if self.config.active_preset_id == preset.id && self.phase != TimerPhase::OnBreak {
            self.reset_to_focus();
        }
        (preset, actions)
    }

    pub fn delete_custom_preset(&mut self, preset_id: &str) -> Vec<TimerAction> {
        let is_deletable = self
            .config
            .presets
            .iter()
            .any(|p| p.id == preset_id && !p.is_builtin);
        if !is_deletable {
            return Vec::new();
        }
        self.config.presets.retain(|p| p.id != preset_id);
        let actions = vec![TimerAction::RefreshTrayMenu];
        if self.config.active_preset_id == preset_id {
            self.config.active_preset_id = "preset-20-20-20".to_string();
            if self.phase != TimerPhase::OnBreak {
                self.reset_to_focus();
            }
        }
        actions
    }

    pub fn clear_stats(&mut self) -> Vec<TimerAction> {
        self.stats = StatsStore::default();
        self.unsaved_focus_ticks = 0;
        vec![TimerAction::SaveStats]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{is_in_quiet_hours, AppConfig, StatsStore};

    fn make_short_core() -> TimerCore {
        let mut cfg = AppConfig::default();
        cfg.presets.push(TimerPreset {
            id: "test-short".to_string(),
            name: "测试方案".to_string(),
            description: "短周期测试".to_string(),
            focus_minutes: 1,
            break_seconds: 10,
            is_builtin: false,
        });
        cfg.active_preset_id = "test-short".to_string();
        cfg.pre_break_seconds = 5;
        cfg.enable_pre_break_notice = true;
        TimerCore::new(cfg, StatsStore::default())
    }

    #[test]
    fn focus_prebreak_break_complete_cycle() {
        let mut core = make_short_core();
        core.remaining_seconds = 6;
        let idle = SystemActivityState::default();

        // 6 -> 5 triggers PreBreak
        let actions = core.tick(idle, 600, "2026-11-23");
        assert_eq!(core.phase, TimerPhase::PreBreak);
        assert!(actions.contains(&TimerAction::OpenPreBreak));

        // 5 -> 4 -> 3 -> 2 -> 1 -> Break
        for _ in 0..4 {
            core.tick(idle, 600, "2026-11-23");
        }
        assert_eq!(core.phase, TimerPhase::PreBreak);
        assert_eq!(core.remaining_seconds, 1);

        let actions = core.tick(idle, 600, "2026-11-23");
        assert_eq!(core.phase, TimerPhase::OnBreak);
        assert_eq!(core.remaining_seconds, 10);
        assert!(actions.contains(&TimerAction::ClosePreBreak));
        assert!(actions.contains(&TimerAction::OpenBreak {
            mode: ReminderMode::Overlay
        }));

        // Complete 10s break
        for _ in 0..9 {
            core.tick(idle, 600, "2026-11-23");
        }
        let actions = core.tick(idle, 600, "2026-11-23");
        assert_eq!(core.phase, TimerPhase::Focusing);
        assert!(actions.contains(&TimerAction::CloseBreak));
        assert!(actions.contains(&TimerAction::SaveStats));
        assert_eq!(core.stats.get_or_empty("2026-11-23").completed_breaks, 1);
    }

    #[test]
    fn idle_detection_pauses_and_resets_on_return() {
        let mut core = make_short_core();
        core.remaining_seconds = 30;
        let idle_state = SystemActivityState {
            idle_seconds: 300,
            is_fullscreen_dnd: false,
            is_locked_or_away: false,
        };
        core.tick(idle_state, 600, "2026-11-23");
        assert_eq!(core.phase, TimerPhase::IdlePaused);

        // User returns
        let active_state = SystemActivityState::default();
        core.tick(active_state, 600, "2026-11-23");
        assert_eq!(core.phase, TimerPhase::Focusing);
        assert_eq!(core.remaining_seconds, 60);
    }

    #[test]
    fn fullscreen_dnd_defers_break_until_exit() {
        let mut core = make_short_core();
        core.remaining_seconds = 1;
        let fs_state = SystemActivityState {
            idle_seconds: 0,
            is_fullscreen_dnd: true,
            is_locked_or_away: false,
        };
        core.tick(fs_state, 600, "2026-11-23");
        assert_eq!(core.phase, TimerPhase::DndDeferred);
        assert_eq!(core.dnd_reason.as_deref(), Some("fullscreen"));

        // Exit fullscreen -> immediately enters break
        let normal_state = SystemActivityState::default();
        let actions = core.tick(normal_state, 600, "2026-11-23");
        assert_eq!(core.phase, TimerPhase::OnBreak);
        assert!(actions
            .iter()
            .any(|a| matches!(a, TimerAction::OpenBreak { .. })));
    }

    #[test]
    fn quiet_hours_handles_midnight_wrap() {
        assert!(is_in_quiet_hours(23 * 60, "22:00", "08:00"));
        assert!(is_in_quiet_hours(2 * 60, "22:00", "08:00"));
        assert!(!is_in_quiet_hours(12 * 60, "22:00", "08:00"));
        assert!(is_in_quiet_hours(13 * 60, "12:00", "14:00"));
        assert!(!is_in_quiet_hours(15 * 60, "12:00", "14:00"));
    }

    #[test]
    fn skip_and_postpone_respect_permissions_and_record_stats() {
        let mut core = make_short_core();
        core.start_break_now();
        core.config.allow_skip = false;
        let actions = core.skip_break("2026-11-23");
        assert!(actions.is_empty());
        assert_eq!(core.phase, TimerPhase::OnBreak);

        core.config.allow_skip = true;
        core.skip_break("2026-11-23");
        assert_eq!(core.phase, TimerPhase::Focusing);
        assert_eq!(core.stats.get_or_empty("2026-11-23").skipped_breaks, 1);

        core.start_break_now();
        core.postpone_break(Some(3), "2026-11-23");
        assert_eq!(core.phase, TimerPhase::Focusing);
        assert_eq!(core.remaining_seconds, 180);
        assert_eq!(core.stats.get_or_empty("2026-11-23").postponed_breaks, 1);
    }

    #[test]
    fn preview_restores_previous_timer_without_stats_mutation() {
        let mut core = make_short_core();
        core.remaining_seconds = 42;
        core.preview_reminder(ReminderMode::Popup);
        assert!(core.is_preview);
        assert_eq!(core.phase, TimerPhase::OnBreak);

        core.complete_break("2026-11-23");
        assert!(!core.is_preview);
        assert_eq!(core.phase, TimerPhase::Focusing);
        assert_eq!(core.remaining_seconds, 42);
        assert_eq!(core.stats.get_or_empty("2026-11-23").completed_breaks, 0);
    }
}

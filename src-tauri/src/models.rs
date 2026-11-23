use chrono::Local;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReminderMode {
    Popup,
    Overlay,
}

impl Default for ReminderMode {
    fn default() -> Self {
        Self::Overlay
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ThemeMode {
    Light,
    Dark,
    System,
}

impl Default for ThemeMode {
    fn default() -> Self {
        Self::Light
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TimerPhase {
    Focusing,
    PreBreak,
    OnBreak,
    Paused,
    IdlePaused,
    DndDeferred,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerPreset {
    pub id: String,
    pub name: String,
    pub description: String,
    pub focus_minutes: u32,
    pub break_seconds: u32,
    #[serde(default)]
    pub is_builtin: bool,
}

pub fn default_presets() -> Vec<TimerPreset> {
    vec![
        TimerPreset {
            id: "preset-20-20-20".to_string(),
            name: "20-20-20 护眼法".to_string(),
            description: "每用眼 20 分钟，眺望 6 米外远景 20 秒，眼科医生推荐".to_string(),
            focus_minutes: 20,
            break_seconds: 20,
            is_builtin: true,
        },
        TimerPreset {
            id: "preset-pomodoro".to_string(),
            name: "经典番茄钟".to_string(),
            description: "高效专注 25 分钟，离开屏幕充分休息 5 分钟".to_string(),
            focus_minutes: 25,
            break_seconds: 300,
            is_builtin: true,
        },
        TimerPreset {
            id: "preset-deep-work".to_string(),
            name: "深度办公".to_string(),
            description: "沉浸工作 45 分钟，远眺眨眼并活动肩颈 5 分钟".to_string(),
            focus_minutes: 45,
            break_seconds: 300,
            is_builtin: true,
        },
        TimerPreset {
            id: "preset-long-study".to_string(),
            name: "长时学习".to_string(),
            description: "持续阅读或编程 60 分钟，起身完整放松 10 分钟".to_string(),
            focus_minutes: 60,
            break_seconds: 600,
            is_builtin: true,
        },
    ]
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AppConfig {
    pub active_preset_id: String,
    pub presets: Vec<TimerPreset>,

    // General & Tray
    pub auto_start: bool,
    pub start_minimized: bool,
    pub close_to_tray: bool,
    pub theme: ThemeMode,

    // Reminder behavior
    pub reminder_mode: ReminderMode,
    pub multi_monitor_overlay: bool,
    pub overlay_opacity: f32,
    pub allow_skip: bool,
    pub allow_postpone: bool,
    pub postpone_minutes: u32,
    pub enable_pre_break_notice: bool,
    pub pre_break_seconds: u32,

    // Smart DND & Idle detection
    pub enable_idle_detection: bool,
    pub idle_threshold_minutes: u32,
    pub enable_fullscreen_dnd: bool,
    pub enable_quiet_hours: bool,
    pub quiet_start: String,
    pub quiet_end: String,

    // Sound & Guidance
    pub enable_sound: bool,
    pub sound_preset: String,
    pub sound_volume: f32,
    pub enable_eye_tips: bool,

    // Statistics
    pub enable_stats: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            active_preset_id: "preset-20-20-20".to_string(),
            presets: default_presets(),
            auto_start: false,
            start_minimized: false,
            close_to_tray: true,
            theme: ThemeMode::Light,
            reminder_mode: ReminderMode::Overlay,
            multi_monitor_overlay: true,
            overlay_opacity: 0.88,
            allow_skip: true,
            allow_postpone: true,
            postpone_minutes: 5,
            enable_pre_break_notice: true,
            pre_break_seconds: 15,
            enable_idle_detection: true,
            idle_threshold_minutes: 5,
            enable_fullscreen_dnd: true,
            enable_quiet_hours: false,
            quiet_start: "22:00".to_string(),
            quiet_end: "08:00".to_string(),
            enable_sound: true,
            sound_preset: "chime".to_string(),
            sound_volume: 0.55,
            enable_eye_tips: true,
            enable_stats: true,
        }
    }
}

impl AppConfig {
    pub fn sanitize(&mut self) {
        // Ensure all built-in presets exist
        let builtins = default_presets();
        for builtin in builtins {
            if !self.presets.iter().any(|p| p.id == builtin.id) {
                self.presets.push(builtin);
            }
        }

        // Clamp every preset duration into safe bounds
        for preset in &mut self.presets {
            preset.focus_minutes = preset.focus_minutes.clamp(1, 180);
            preset.break_seconds = preset.break_seconds.clamp(10, 3600);
            if preset.name.trim().is_empty() {
                preset.name = "自定义方案".to_string();
            }
        }

        // Ensure active preset exists
        if !self.presets.iter().any(|p| p.id == self.active_preset_id) {
            self.active_preset_id = self
                .presets
                .first()
                .map(|p| p.id.clone())
                .unwrap_or_else(|| "preset-20-20-20".to_string());
        }

        self.overlay_opacity = self.overlay_opacity.clamp(0.60, 0.96);
        self.postpone_minutes = self.postpone_minutes.clamp(1, 30);
        self.pre_break_seconds = self.pre_break_seconds.clamp(5, 60);
        self.idle_threshold_minutes = self.idle_threshold_minutes.clamp(1, 60);
        self.sound_volume = self.sound_volume.clamp(0.0, 1.0);
        const VALID_SOUNDS: &[&str] = &[
            "chime",
            "singing_bowl",
            "water_drop",
            "kalimba",
            "piano",
            "zen_bell",
        ];
        if !VALID_SOUNDS.contains(&self.sound_preset.as_str()) {
            self.sound_preset = "chime".to_string();
        }

        if parse_hhmm(&self.quiet_start).is_none() {
            self.quiet_start = "22:00".to_string();
        }
        if parse_hhmm(&self.quiet_end).is_none() {
            self.quiet_end = "08:00".to_string();
        }
    }

    pub fn active_preset(&self) -> TimerPreset {
        self.presets
            .iter()
            .find(|p| p.id == self.active_preset_id)
            .cloned()
            .unwrap_or_else(|| default_presets().remove(0))
    }
}

pub fn parse_hhmm(value: &str) -> Option<u32> {
    let mut parts = value.trim().split(':');
    let h: u32 = parts.next()?.parse().ok()?;
    let m: u32 = parts.next()?.parse().ok()?;
    if h < 24 && m < 60 && parts.next().is_none() {
        Some(h * 60 + m)
    } else {
        None
    }
}

pub fn is_in_quiet_hours(now_minutes: u32, start_str: &str, end_str: &str) -> bool {
    let (Some(start), Some(end)) = (parse_hhmm(start_str), parse_hhmm(end_str)) else {
        return false;
    };
    if start == end {
        return false;
    }
    if start < end {
        now_minutes >= start && now_minutes < end
    } else {
        // Crosses midnight, e.g. 22:00 -> 08:00
        now_minutes >= start || now_minutes < end
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyStats {
    pub date: String,
    pub focus_seconds: u64,
    pub completed_breaks: u32,
    pub skipped_breaks: u32,
    pub postponed_breaks: u32,
    pub total_break_seconds: u64,
}

impl DailyStats {
    pub fn new(date: impl Into<String>) -> Self {
        Self {
            date: date.into(),
            ..Default::default()
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsStore {
    pub days: Vec<DailyStats>,
}

impl StatsStore {
    pub fn today_key() -> String {
        Local::now().format("%Y-%m-%d").to_string()
    }

    pub fn entry_mut(&mut self, date: &str) -> &mut DailyStats {
        if let Some(idx) = self.days.iter().position(|d| d.date == date) {
            return &mut self.days[idx];
        }
        self.days.push(DailyStats::new(date));
        self.days.sort_by(|a, b| a.date.cmp(&b.date));
        if self.days.len() > 90 {
            let overflow = self.days.len() - 90;
            self.days.drain(0..overflow);
        }
        let idx = self
            .days
            .iter()
            .position(|d| d.date == date)
            .expect("inserted date must exist");
        &mut self.days[idx]
    }

    pub fn get_or_empty(&self, date: &str) -> DailyStats {
        self.days
            .iter()
            .find(|d| d.date == date)
            .cloned()
            .unwrap_or_else(|| DailyStats::new(date))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerSnapshot {
    pub phase: TimerPhase,
    pub remaining_seconds: u32,
    pub total_seconds: u32,
    pub active_preset: TimerPreset,
    pub is_preview: bool,
    pub dnd_reason: Option<String>,
    pub tip_index: usize,
    pub today_stats: DailyStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioCuePayload {
    pub cue: String,
    pub preset: String,
    pub volume: f32,
}

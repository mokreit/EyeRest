use std::sync::Mutex;

use tauri::{AppHandle, Emitter, State};
use tauri_plugin_autostart::ManagerExt;

use crate::models::{
    AppConfig, AudioCuePayload, ReminderMode, StatsStore, TimerPreset, TimerSnapshot,
};
use crate::storage::Storage;
use crate::timer_engine::{TimerAction, TimerCore};
use crate::tray::{refresh_tray_menu, update_tray_tooltip};
use crate::window_manager::{
    close_break_windows, close_pre_break_window, open_break_windows, open_pre_break_window,
};

pub struct AppState {
    pub core: Mutex<TimerCore>,
    pub storage: Storage,
}

pub fn apply_actions(app: &AppHandle, state: &AppState, actions: Vec<TimerAction>) {
    let today = StatsStore::today_key();
    let (snapshot, config, stats_to_save) = {
        let guard = state.core.lock().expect("timer mutex poisoned");
        let save = actions.contains(&TimerAction::SaveStats);
        (
            guard.snapshot(&today),
            guard.config.clone(),
            if save { Some(guard.stats.clone()) } else { None },
        )
    };

    if let Some(stats) = stats_to_save {
        let _ = state.storage.save_stats(&stats);
    }

    for action in actions {
        match action {
            TimerAction::OpenPreBreak => open_pre_break_window(app),
            TimerAction::ClosePreBreak => close_pre_break_window(app),
            TimerAction::OpenBreak { mode } => open_break_windows(app, &config, mode),
            TimerAction::CloseBreak => close_break_windows(app),
            TimerAction::PlaySound(cue) => {
                let _ = app.emit(
                    "audio:cue",
                    AudioCuePayload {
                        cue: cue.to_string(),
                        preset: config.sound_preset.clone(),
                        volume: config.sound_volume,
                    },
                );
            }
            TimerAction::RefreshTrayMenu => refresh_tray_menu(app, &config, &snapshot),
            TimerAction::SaveStats => {}
        }
    }

    update_tray_tooltip(app, &snapshot);
    let _ = app.emit("timer:state", &snapshot);
}

fn snapshot_now(state: &AppState) -> TimerSnapshot {
    let today = StatsStore::today_key();
    state
        .core
        .lock()
        .expect("timer mutex poisoned")
        .snapshot(&today)
}

#[tauri::command]
pub async fn get_state(state: State<'_, AppState>) -> Result<TimerSnapshot, String> {
    Ok(snapshot_now(&state))
}

#[tauri::command]
pub async fn get_config(app: AppHandle, state: State<'_, AppState>) -> Result<AppConfig, String> {
    let autostart_enabled = app.autolaunch().is_enabled().unwrap_or(false);
    let mut cfg = state
        .core
        .lock()
        .expect("timer mutex poisoned")
        .config
        .clone();
    cfg.auto_start = autostart_enabled;
    Ok(cfg)
}

#[tauri::command]
pub async fn update_config(
    app: AppHandle,
    state: State<'_, AppState>,
    mut config: AppConfig,
) -> Result<AppConfig, String> {
    config.sanitize();

    // Sync Windows autostart registry entry when changed
    let autolaunch = app.autolaunch();
    let current_os = autolaunch.is_enabled().unwrap_or(false);
    if config.auto_start != current_os {
        let res = if config.auto_start {
            autolaunch.enable()
        } else {
            autolaunch.disable()
        };
        if let Err(err) = res {
            return Err(format!("设置开机自启动失败: {err}"));
        }
    }

    let (saved_cfg, actions) = {
        let mut guard = state.core.lock().expect("timer mutex poisoned");
        let actions = guard.update_config(config);
        (guard.config.clone(), actions)
    };

    state.storage.save_config(&saved_cfg)?;
    apply_actions(&app, &state, actions);
    let _ = app.emit("config:updated", &saved_cfg);
    Ok(saved_cfg)
}

#[tauri::command]
pub async fn get_stats(state: State<'_, AppState>) -> Result<StatsStore, String> {
    Ok(state
        .core
        .lock()
        .expect("timer mutex poisoned")
        .stats
        .clone())
}

#[tauri::command]
pub async fn clear_stats(app: AppHandle, state: State<'_, AppState>) -> Result<StatsStore, String> {
    let actions = {
        let mut guard = state.core.lock().expect("timer mutex poisoned");
        guard.clear_stats()
    };
    apply_actions(&app, &state, actions);
    Ok(state
        .core
        .lock()
        .expect("timer mutex poisoned")
        .stats
        .clone())
}

#[tauri::command]
pub async fn timer_pause(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<TimerSnapshot, String> {
    let actions = state.core.lock().expect("timer mutex poisoned").pause();
    apply_actions(&app, &state, actions);
    Ok(snapshot_now(&state))
}

#[tauri::command]
pub async fn timer_resume(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<TimerSnapshot, String> {
    let actions = state.core.lock().expect("timer mutex poisoned").resume();
    apply_actions(&app, &state, actions);
    Ok(snapshot_now(&state))
}

#[tauri::command]
pub async fn timer_reset(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<TimerSnapshot, String> {
    let actions = state.core.lock().expect("timer mutex poisoned").reset();
    apply_actions(&app, &state, actions);
    Ok(snapshot_now(&state))
}

#[tauri::command]
pub async fn timer_start_break_now(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<TimerSnapshot, String> {
    let actions = state
        .core
        .lock()
        .expect("timer mutex poisoned")
        .start_break_now();
    apply_actions(&app, &state, actions);
    Ok(snapshot_now(&state))
}

#[tauri::command]
pub async fn timer_skip_break(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<TimerSnapshot, String> {
    let today = StatsStore::today_key();
    let actions = state
        .core
        .lock()
        .expect("timer mutex poisoned")
        .skip_break(&today);
    apply_actions(&app, &state, actions);
    Ok(snapshot_now(&state))
}

#[tauri::command]
pub async fn timer_postpone_break(
    app: AppHandle,
    state: State<'_, AppState>,
    minutes: Option<u32>,
) -> Result<TimerSnapshot, String> {
    let today = StatsStore::today_key();
    let actions = state
        .core
        .lock()
        .expect("timer mutex poisoned")
        .postpone_break(minutes, &today);
    apply_actions(&app, &state, actions);
    Ok(snapshot_now(&state))
}

#[tauri::command]
pub async fn timer_complete_break(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<TimerSnapshot, String> {
    let today = StatsStore::today_key();
    let actions = state
        .core
        .lock()
        .expect("timer mutex poisoned")
        .complete_break(&today);
    apply_actions(&app, &state, actions);
    Ok(snapshot_now(&state))
}

#[tauri::command]
pub async fn expand_break_to_overlay(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let config = state
        .core
        .lock()
        .expect("timer mutex poisoned")
        .config
        .clone();
    open_break_windows(&app, &config, ReminderMode::Overlay);
    Ok(())
}

#[tauri::command]
pub async fn preview_reminder(
    app: AppHandle,
    state: State<'_, AppState>,
    mode: ReminderMode,
) -> Result<TimerSnapshot, String> {
    let actions = state
        .core
        .lock()
        .expect("timer mutex poisoned")
        .preview_reminder(mode);
    apply_actions(&app, &state, actions);
    Ok(snapshot_now(&state))
}

#[tauri::command]
pub async fn set_active_preset(
    app: AppHandle,
    state: State<'_, AppState>,
    preset_id: String,
) -> Result<AppConfig, String> {
    let (cfg, actions) = {
        let mut guard = state.core.lock().expect("timer mutex poisoned");
        let actions = guard.switch_preset(&preset_id);
        (guard.config.clone(), actions)
    };
    state.storage.save_config(&cfg)?;
    apply_actions(&app, &state, actions);
    let _ = app.emit("config:updated", &cfg);
    Ok(cfg)
}

#[tauri::command]
pub async fn save_custom_preset(
    app: AppHandle,
    state: State<'_, AppState>,
    preset: TimerPreset,
) -> Result<AppConfig, String> {
    let (cfg, actions) = {
        let mut guard = state.core.lock().expect("timer mutex poisoned");
        let (_saved, actions) = guard.save_custom_preset(preset);
        (guard.config.clone(), actions)
    };
    state.storage.save_config(&cfg)?;
    apply_actions(&app, &state, actions);
    let _ = app.emit("config:updated", &cfg);
    Ok(cfg)
}

#[tauri::command]
pub async fn delete_custom_preset(
    app: AppHandle,
    state: State<'_, AppState>,
    preset_id: String,
) -> Result<AppConfig, String> {
    let (cfg, actions) = {
        let mut guard = state.core.lock().expect("timer mutex poisoned");
        let actions = guard.delete_custom_preset(&preset_id);
        (guard.config.clone(), actions)
    };
    state.storage.save_config(&cfg)?;
    apply_actions(&app, &state, actions);
    let _ = app.emit("config:updated", &cfg);
    Ok(cfg)
}

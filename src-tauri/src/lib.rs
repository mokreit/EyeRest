mod commands;
mod models;
mod storage;
mod system_monitor;
mod timer_engine;
mod tray;
mod window_manager;

use std::sync::Mutex;
use std::time::Duration;

use chrono::{Local, Timelike};
use tauri::{Emitter, Manager, WindowEvent};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

use crate::commands::{apply_actions, AppState};
use crate::models::{StatsStore, TimerPhase};
use crate::storage::Storage;
use crate::system_monitor::query_system_activity;
use crate::timer_engine::TimerCore;
use crate::tray::{init_tray, open_main_from_tray, update_tray_tooltip};
use crate::window_manager::{hide_main_window, show_main_window, MAIN_WINDOW_LABEL};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let handle = app.handle().clone();
            let storage = Storage::from_app(&handle);
            let mut config = storage.load_config();
            let stats = storage.load_stats();

            // Sync autostart field with actual OS setting on startup
            if let Ok(enabled) = handle.autolaunch().is_enabled() {
                config.auto_start = enabled;
            }

            let core = TimerCore::new(config.clone(), stats);
            let today = StatsStore::today_key();
            let initial_snapshot = core.snapshot(&today);

            let app_state = AppState {
                core: Mutex::new(core),
                storage,
            };
            app.manage(app_state);

            // Build native Windows system tray
            init_tray(&handle, &config, &initial_snapshot, |app_h, menu_id| {
                let app_clone = app_h.clone();
                let id_owned = menu_id.to_string();
                tauri::async_runtime::spawn(async move {
                    handle_tray_menu_action(&app_clone, &id_owned);
                });
            })?;

            // Decide whether to show the main window or stay silently in tray
            let launched_minimized = std::env::args().any(|arg| arg == "--minimized");
            if !launched_minimized && !config.start_minimized {
                show_main_window(&handle);
            }

            // Spawn single-source-of-truth 1s background timer loop
            let tick_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(Duration::from_secs(1));
                loop {
                    interval.tick().await;
                    let activity = query_system_activity();
                    let now = Local::now();
                    let now_minutes = now.hour() * 60 + now.minute();
                    let today = now.format("%Y-%m-%d").to_string();

                    let state = tick_handle.state::<AppState>();
                    let actions = {
                        let mut guard = state.core.lock().expect("timer mutex poisoned");
                        guard.tick(activity, now_minutes, &today)
                    };

                    if actions.is_empty() {
                        let snap = {
                            let guard = state.core.lock().expect("timer mutex poisoned");
                            guard.snapshot(&today)
                        };
                        update_tray_tooltip(&tick_handle, &snap);
                        let _ = tick_handle.emit("timer:state", &snap);
                    } else {
                        apply_actions(&tick_handle, &state, actions);
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == MAIN_WINDOW_LABEL {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    let app = window.app_handle();
                    let close_to_tray = app
                        .state::<AppState>()
                        .core
                        .lock()
                        .map(|g| g.config.close_to_tray)
                        .unwrap_or(true);
                    if close_to_tray {
                        api.prevent_close();
                        hide_main_window(app);
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_state,
            commands::get_config,
            commands::update_config,
            commands::get_stats,
            commands::clear_stats,
            commands::timer_pause,
            commands::timer_resume,
            commands::timer_reset,
            commands::timer_start_break_now,
            commands::timer_skip_break,
            commands::timer_postpone_break,
            commands::timer_complete_break,
            commands::expand_break_to_overlay,
            commands::preview_reminder,
            commands::set_active_preset,
            commands::save_custom_preset,
            commands::delete_custom_preset,
        ])
        .run(tauri::generate_context!())
        .expect("error while running EyeRest application");
}

fn handle_tray_menu_action(app: &tauri::AppHandle, menu_id: &str) {
    let state = app.state::<AppState>();
    let today = StatsStore::today_key();

    match menu_id {
        "tray_open" => open_main_from_tray(app),
        "tray_quit" => {
            // Persist stats before exit
            let stats = state
                .core
                .lock()
                .expect("timer mutex poisoned")
                .stats
                .clone();
            let _ = state.storage.save_stats(&stats);
            app.exit(0);
        }
        "tray_toggle_pause" => {
            let actions = {
                let mut guard = state.core.lock().expect("timer mutex poisoned");
                if matches!(guard.phase, TimerPhase::Paused | TimerPhase::IdlePaused) {
                    guard.resume()
                } else {
                    guard.pause()
                }
            };
            apply_actions(app, &state, actions);
        }
        "tray_break_now" => {
            let actions = state
                .core
                .lock()
                .expect("timer mutex poisoned")
                .start_break_now();
            apply_actions(app, &state, actions);
        }
        "tray_postpone" => {
            let actions = state
                .core
                .lock()
                .expect("timer mutex poisoned")
                .postpone_break(None, &today);
            apply_actions(app, &state, actions);
        }
        "tray_reset" => {
            let actions = state.core.lock().expect("timer mutex poisoned").reset();
            apply_actions(app, &state, actions);
        }
        id if id.starts_with("preset::") => {
            let preset_id = id.trim_start_matches("preset::");
            let (cfg, actions) = {
                let mut guard = state.core.lock().expect("timer mutex poisoned");
                let actions = guard.switch_preset(preset_id);
                (guard.config.clone(), actions)
            };
            let _ = state.storage.save_config(&cfg);
            apply_actions(app, &state, actions);
            let _ = app.emit("config:updated", &cfg);
        }
        _ => {}
    }
}

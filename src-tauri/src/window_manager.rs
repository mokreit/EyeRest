use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::models::{AppConfig, ReminderMode};

pub const MAIN_WINDOW_LABEL: &str = "main";
pub const POPUP_PREFIX: &str = "reminder-popup";
pub const PRE_BREAK_PREFIX: &str = "pre-break-toast";
pub const OVERLAY_PREFIX: &str = "overlay-";

static NEXT_WIN_SEQ: AtomicU64 = AtomicU64::new(1);

fn next_seq() -> u64 {
    NEXT_WIN_SEQ.fetch_add(1, Ordering::Relaxed)
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
    }
}

pub fn hide_main_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = win.hide();
    }
}

pub fn open_pre_break_window(app: &AppHandle) {
    close_pre_break_window(app);

    let width = 320.0;
    let height = 76.0;
    let (pos_x, pos_y) = bottom_right_position(app, width, height, 20.0, 56.0);
    let label = format!("{PRE_BREAK_PREFIX}-{}", next_seq());

    let builder = WebviewWindowBuilder::new(app, label, WebviewUrl::App("index.html".into()))
        .title("即将护眼休息")
        .inner_size(width, height)
        .position(pos_x, pos_y)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .resizable(false)
        .skip_taskbar(true)
        .focused(false)
        .shadow(false);

    let _ = builder.build();
}

pub fn close_pre_break_window(app: &AppHandle) {
    let labels: Vec<String> = app
        .webview_windows()
        .keys()
        .filter(|label| label.starts_with(PRE_BREAK_PREFIX))
        .cloned()
        .collect();
    for label in labels {
        if let Some(win) = app.get_webview_window(&label) {
            let _ = win.destroy();
        }
    }
}

pub fn open_break_windows(app: &AppHandle, config: &AppConfig, mode: ReminderMode) {
    close_break_windows(app);
    close_pre_break_window(app);

    match mode {
        ReminderMode::Popup => open_popup_window(app),
        ReminderMode::Overlay => open_overlay_windows(app, config.multi_monitor_overlay),
    }
}

fn open_popup_window(app: &AppHandle) {
    let width = 380.0;
    let height = 248.0;
    let (pos_x, pos_y) = bottom_right_position(app, width, height, 20.0, 56.0);
    let label = format!("{POPUP_PREFIX}-{}", next_seq());

    let builder = WebviewWindowBuilder::new(app, label, WebviewUrl::App("index.html".into()))
        .title("EyeRest · 护眼休息提醒")
        .inner_size(width, height)
        .position(pos_x, pos_y)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .resizable(false)
        .skip_taskbar(true)
        .focused(false)
        .shadow(false);

    let _ = builder.build();
}

fn open_overlay_windows(app: &AppHandle, multi_monitor: bool) {
    let primary_monitor = app.primary_monitor().ok().flatten();
    let primary_name = primary_monitor.as_ref().and_then(|m| m.name().cloned());
    let primary_pos = primary_monitor.as_ref().map(|m| *m.position());

    let mut monitors = if multi_monitor {
        app.available_monitors().unwrap_or_default()
    } else {
        primary_monitor.into_iter().collect()
    };

    monitors.sort_by_key(|m| {
        let is_primary = match (&primary_name, m.name()) {
            (Some(p), Some(n)) => p == n,
            _ => primary_pos.map(|pp| pp == *m.position()).unwrap_or(false),
        };
        if is_primary {
            0
        } else {
            1
        }
    });

    let seq = next_seq();

    if monitors.is_empty() {
        let _ = WebviewWindowBuilder::new(
            app,
            format!("overlay-primary-{seq}"),
            WebviewUrl::App("index.html".into()),
        )
        .title("EyeRest · 护眼休息")
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .fullscreen(true)
        .skip_taskbar(true)
        .focused(true)
        .build();
        return;
    }

    for (idx, monitor) in monitors.into_iter().enumerate() {
        let is_primary = idx == 0;
        let scale = monitor.scale_factor().max(1.0);
        let pos = monitor.position();
        let size = monitor.size();

        let logical_x = (pos.x as f64) / scale;
        let logical_y = (pos.y as f64) / scale;
        let logical_w = (size.width as f64) / scale;
        let logical_h = (size.height as f64) / scale;

        let label = if is_primary {
            format!("overlay-primary-{seq}")
        } else {
            format!("overlay-sub-{idx}-{seq}")
        };

        let builder = WebviewWindowBuilder::new(app, label, WebviewUrl::App("index.html".into()))
            .title("EyeRest · 护眼休息")
            .position(logical_x, logical_y)
            .inner_size(logical_w, logical_h)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .resizable(false)
            .skip_taskbar(true)
            .focused(is_primary)
            .shadow(false);

        let _ = builder.build();
    }
}

pub fn close_break_windows(app: &AppHandle) {
    let labels: Vec<String> = app
        .webview_windows()
        .keys()
        .filter(|label| label.starts_with(POPUP_PREFIX) || label.starts_with(OVERLAY_PREFIX))
        .cloned()
        .collect();
    for label in labels {
        if let Some(win) = app.get_webview_window(&label) {
            let _ = win.destroy();
        }
    }
}

fn bottom_right_position(
    app: &AppHandle,
    win_w: f64,
    win_h: f64,
    margin_right: f64,
    margin_bottom: f64,
) -> (f64, f64) {
    if let Ok(Some(monitor)) = app.primary_monitor() {
        let scale = monitor.scale_factor().max(1.0);
        let pos = monitor.position();
        let size = monitor.size();
        let right = (pos.x as f64 + size.width as f64) / scale;
        let bottom = (pos.y as f64 + size.height as f64) / scale;
        (
            (right - win_w - margin_right).max(0.0),
            (bottom - win_h - margin_bottom).max(0.0),
        )
    } else {
        (900.0, 500.0)
    }
}

use tauri::menu::{CheckMenuItemBuilder, Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Runtime};

use crate::models::{AppConfig, TimerPhase, TimerSnapshot};
use crate::window_manager::show_main_window;

pub const TRAY_ID: &str = "eyerest-tray";

pub fn init_tray<R: Runtime>(
    app: &AppHandle<R>,
    config: &AppConfig,
    snapshot: &TimerSnapshot,
    on_menu_event: impl Fn(&AppHandle<R>, &str) + Send + Sync + 'static,
) -> tauri::Result<()> {
    let menu = build_tray_menu(app, config, snapshot)?;
    let tooltip = format_tooltip(snapshot);

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .tooltip(tooltip)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app_handle, event| {
            on_menu_event(app_handle, event.id().as_ref());
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app_handle = tray.app_handle();
                if let Some(win) = app_handle.get_webview_window("main") {
                    let _ = win.unminimize();
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder.build(app)?;
    Ok(())
}

use tauri::Manager;

pub fn update_tray_tooltip(app: &AppHandle, snapshot: &TimerSnapshot) {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let _ = tray.set_tooltip(Some(format_tooltip(snapshot)));
    }
}

pub fn refresh_tray_menu(app: &AppHandle, config: &AppConfig, snapshot: &TimerSnapshot) {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        if let Ok(menu) = build_tray_menu(app, config, snapshot) {
            let _ = tray.set_menu(Some(menu));
        }
        let _ = tray.set_tooltip(Some(format_tooltip(snapshot)));
    }
}

fn build_tray_menu<R: Runtime>(
    app: &AppHandle<R>,
    config: &AppConfig,
    snapshot: &TimerSnapshot,
) -> tauri::Result<Menu<R>> {
    let status_text = match snapshot.phase {
        TimerPhase::Focusing => format!("专注中 · {}", snapshot.active_preset.name),
        TimerPhase::PreBreak => "即将开始护眼休息…".to_string(),
        TimerPhase::OnBreak => "正在护眼休息".to_string(),
        TimerPhase::Paused => "已手动暂停".to_string(),
        TimerPhase::IdlePaused => "离开电脑 · 自动暂停".to_string(),
        TimerPhase::DndDeferred => "免打扰 · 休息已暂缓".to_string(),
    };

    let status_item = MenuItemBuilder::with_id("status_info", status_text)
        .enabled(false)
        .build(app)?;

    let toggle_label = if matches!(snapshot.phase, TimerPhase::Paused | TimerPhase::IdlePaused) {
        "继续计时"
    } else {
        "暂停计时"
    };
    let toggle_item = MenuItemBuilder::with_id("tray_toggle_pause", toggle_label).build(app)?;
    let break_now_item = MenuItemBuilder::with_id("tray_break_now", "立即护眼休息").build(app)?;
    let postpone_label = format!("推迟 {} 分钟", config.postpone_minutes);
    let postpone_item = MenuItemBuilder::with_id("tray_postpone", postpone_label).build(app)?;
    let reset_item = MenuItemBuilder::with_id("tray_reset", "重置本轮计时").build(app)?;

    let mut presets_sub = SubmenuBuilder::new(app, "切换护眼方案");
    for preset in &config.presets {
        let item_id = format!("preset::{}", preset.id);
        let checked = preset.id == config.active_preset_id;
        let label = format!(
            "{} ({}分 / {})",
            preset.name,
            preset.focus_minutes,
            format_duration_short(preset.break_seconds)
        );
        let item = CheckMenuItemBuilder::with_id(item_id, label)
            .checked(checked)
            .build(app)?;
        presets_sub = presets_sub.item(&item);
    }
    let presets_submenu = presets_sub.build()?;

    let open_item = MenuItemBuilder::with_id("tray_open", "打开 EyeRest 主界面").build(app)?;
    let quit_item = MenuItemBuilder::with_id("tray_quit", "退出程序").build(app)?;

    MenuBuilder::new(app)
        .item(&status_item)
        .separator()
        .item(&toggle_item)
        .item(&break_now_item)
        .item(&postpone_item)
        .item(&reset_item)
        .separator()
        .item(&presets_submenu)
        .separator()
        .item(&open_item)
        .item(&quit_item)
        .build()
}

pub fn format_tooltip(snapshot: &TimerSnapshot) -> String {
    let time_str = format_mmss(snapshot.remaining_seconds);
    match snapshot.phase {
        TimerPhase::Focusing => format!("EyeRest · 距离休息还有 {}", time_str),
        TimerPhase::PreBreak => format!("EyeRest · {} 后开始护眼休息", time_str),
        TimerPhase::OnBreak => format!("EyeRest · 护眼休息中 {}", time_str),
        TimerPhase::Paused => format!("EyeRest · 已暂停 ({})", time_str),
        TimerPhase::IdlePaused => "EyeRest · 检测到离开电脑（自动暂停）".to_string(),
        TimerPhase::DndDeferred => "EyeRest · 免打扰模式（休息已暂缓）".to_string(),
    }
}

fn format_mmss(total_secs: u32) -> String {
    let m = total_secs / 60;
    let s = total_secs % 60;
    format!("{:02}:{:02}", m, s)
}

fn format_duration_short(secs: u32) -> String {
    if secs >= 60 && secs % 60 == 0 {
        format!("{}分", secs / 60)
    } else if secs >= 60 {
        format!("{}分{}秒", secs / 60, secs % 60)
    } else {
        format!("{}秒", secs)
    }
}

pub fn open_main_from_tray(app: &AppHandle) {
    show_main_window(app);
}

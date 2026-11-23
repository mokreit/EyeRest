#[derive(Debug, Clone, Copy, Default)]
pub struct SystemActivityState {
    pub idle_seconds: u64,
    pub is_fullscreen_dnd: bool,
    pub is_locked_or_away: bool,
}

#[cfg(windows)]
pub fn query_system_activity() -> SystemActivityState {
    use std::mem::size_of;
    use windows_sys::Win32::System::SystemInformation::GetTickCount;
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
    use windows_sys::Win32::UI::Shell::{
        SHQueryUserNotificationState, QUNS_BUSY, QUNS_NOT_PRESENT, QUNS_PRESENTATION_MODE,
        QUNS_RUNNING_D3D_FULL_SCREEN,
    };

    let mut idle_seconds = 0u64;
    unsafe {
        let mut lii = LASTINPUTINFO {
            cbSize: size_of::<LASTINPUTINFO>() as u32,
            dwTime: 0,
        };
        if GetLastInputInfo(&mut lii) != 0 {
            let now = GetTickCount();
            let elapsed_ms = now.wrapping_sub(lii.dwTime);
            idle_seconds = (elapsed_ms / 1000) as u64;
        }
    }

    let mut is_fullscreen_dnd = false;
    let mut is_locked_or_away = false;
    unsafe {
        let mut state: i32 = 0;
        if SHQueryUserNotificationState(&mut state) == 0 {
            if state == QUNS_NOT_PRESENT {
                is_locked_or_away = true;
            } else if state == QUNS_BUSY
                || state == QUNS_RUNNING_D3D_FULL_SCREEN
                || state == QUNS_PRESENTATION_MODE
            {
                is_fullscreen_dnd = true;
            }
        }
    }

    SystemActivityState {
        idle_seconds,
        is_fullscreen_dnd,
        is_locked_or_away,
    }
}

#[cfg(not(windows))]
pub fn query_system_activity() -> SystemActivityState {
    SystemActivityState::default()
}

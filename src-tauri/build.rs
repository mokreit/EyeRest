fn main() {
    let mut windows = tauri_build::WindowsAttributes::new();

    // Copy icon.ico to OUT_DIR so MinGW windres works reliably even when
    // the repository lives under a non-ASCII directory path on Windows.
    if let Ok(out_dir) = std::env::var("OUT_DIR") {
        let src = std::path::Path::new("icons").join("icon.ico");
        let dst = std::path::Path::new(&out_dir).join("icon.ico");
        if src.exists() && std::fs::copy(&src, &dst).is_ok() {
            windows = windows.window_icon_path(dst);
        }
    }

    tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(windows))
        .expect("failed to run tauri-build");
}

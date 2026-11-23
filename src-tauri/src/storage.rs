use std::fs;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::models::{AppConfig, StatsStore};

const CONFIG_FILE: &str = "config.json";
const STATS_FILE: &str = "stats.json";

#[derive(Debug, Clone)]
pub struct Storage {
    base_dir: PathBuf,
}

impl Storage {
    pub fn from_app(app: &AppHandle) -> Self {
        let base_dir = app
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
        let _ = fs::create_dir_all(&base_dir);
        Self { base_dir }
    }

    pub fn load_config(&self) -> AppConfig {
        let path = self.base_dir.join(CONFIG_FILE);
        let mut config = fs::read_to_string(&path)
            .ok()
            .and_then(|raw| serde_json::from_str::<AppConfig>(&raw).ok())
            .unwrap_or_default();
        config.sanitize();
        config
    }

    pub fn save_config(&self, config: &AppConfig) -> Result<(), String> {
        let path = self.base_dir.join(CONFIG_FILE);
        write_json_atomic(&path, config)
    }

    pub fn load_stats(&self) -> StatsStore {
        let path = self.base_dir.join(STATS_FILE);
        fs::read_to_string(&path)
            .ok()
            .and_then(|raw| serde_json::from_str::<StatsStore>(&raw).ok())
            .unwrap_or_default()
    }

    pub fn save_stats(&self, stats: &StatsStore) -> Result<(), String> {
        let path = self.base_dir.join(STATS_FILE);
        write_json_atomic(&path, stats)
    }
}

fn write_json_atomic<T: serde::Serialize>(path: &Path, value: &T) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create dir failed: {e}"))?;
    }
    let payload = serde_json::to_string_pretty(value).map_err(|e| format!("serialize failed: {e}"))?;
    let tmp_path = path.with_extension("json.tmp");
    fs::write(&tmp_path, &payload).map_err(|e| format!("write temp failed: {e}"))?;
    if fs::rename(&tmp_path, path).is_err() {
        let _ = fs::remove_file(&tmp_path);
        fs::write(path, payload).map_err(|e| format!("write file failed: {e}"))?;
    }
    Ok(())
}

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  AppConfig,
  AudioCuePayload,
  ReminderMode,
  StatsStore,
  TimerPreset,
  TimerSnapshot,
} from "../types";

export const api = {
  getState: () => invoke<TimerSnapshot>("get_state"),
  getConfig: () => invoke<AppConfig>("get_config"),
  updateConfig: (config: AppConfig) => invoke<AppConfig>("update_config", { config }),
  getStats: () => invoke<StatsStore>("get_stats"),
  clearStats: () => invoke<StatsStore>("clear_stats"),

  pause: () => invoke<TimerSnapshot>("timer_pause"),
  resume: () => invoke<TimerSnapshot>("timer_resume"),
  reset: () => invoke<TimerSnapshot>("timer_reset"),
  startBreakNow: () => invoke<TimerSnapshot>("timer_start_break_now"),
  skipBreak: () => invoke<TimerSnapshot>("timer_skip_break"),
  postponeBreak: (minutes?: number) =>
    invoke<TimerSnapshot>("timer_postpone_break", { minutes: minutes ?? null }),
  completeBreak: () => invoke<TimerSnapshot>("timer_complete_break"),
  expandBreakToOverlay: () => invoke<void>("expand_break_to_overlay"),
  previewReminder: (mode: ReminderMode) => invoke<TimerSnapshot>("preview_reminder", { mode }),

  setActivePreset: (presetId: string) =>
    invoke<AppConfig>("set_active_preset", { presetId }),
  saveCustomPreset: (preset: TimerPreset) =>
    invoke<AppConfig>("save_custom_preset", { preset }),
  deleteCustomPreset: (presetId: string) =>
    invoke<AppConfig>("delete_custom_preset", { presetId }),

  onTimerState: (cb: (snap: TimerSnapshot) => void): Promise<UnlistenFn> =>
    listen<TimerSnapshot>("timer:state", (e) => cb(e.payload)),

  onConfigUpdated: (cb: (cfg: AppConfig) => void): Promise<UnlistenFn> =>
    listen<AppConfig>("config:updated", (e) => cb(e.payload)),

  onAudioCue: (cb: (payload: AudioCuePayload) => void): Promise<UnlistenFn> =>
    listen<AudioCuePayload>("audio:cue", (e) => cb(e.payload)),
};

export function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function formatDurationText(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 60) return `${s} 秒`;
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  if (mins < 60) {
    return rem === 0 ? `${mins} 分钟` : `${mins} 分 ${rem} 秒`;
  }
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins === 0 ? `${hrs} 小时` : `${hrs} 小时 ${remMins} 分钟`;
}

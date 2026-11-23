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

const isTauriRuntime =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function buildDemoData() {
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const demoTheme = (params.get("theme") as AppConfig["theme"]) || "light";
  const isOverlayDemo = params.get("view") === "overlay";

  const presets: TimerPreset[] = [
    {
      id: "preset-20-20-20",
      name: "20-20-20 护眼法",
      description: "每用眼 20 分钟，眺望 6 米外远景 20 秒，眼科医生推荐",
      focusMinutes: 20,
      breakSeconds: 20,
      isBuiltin: true,
    },
    {
      id: "preset-pomodoro",
      name: "经典番茄钟",
      description: "高效专注 25 分钟，离开屏幕充分休息 5 分钟",
      focusMinutes: 25,
      breakSeconds: 300,
      isBuiltin: true,
    },
    {
      id: "preset-deep-work",
      name: "深度办公",
      description: "沉浸工作 45 分钟，远眺眨眼并活动肩颈 5 分钟",
      focusMinutes: 45,
      breakSeconds: 300,
      isBuiltin: true,
    },
    {
      id: "preset-long-study",
      name: "长时学习",
      description: "持续阅读或编程 60 分钟，起身完整放松 10 分钟",
      focusMinutes: 60,
      breakSeconds: 600,
      isBuiltin: true,
    },
  ];

  const config: AppConfig = {
    activePresetId: "preset-20-20-20",
    presets,
    autoStart: true,
    startMinimized: false,
    closeToTray: true,
    theme: demoTheme,
    reminderMode: "overlay",
    multiMonitorOverlay: true,
    overlayOpacity: 0.9,
    allowSkip: true,
    allowPostpone: true,
    postponeMinutes: 5,
    enablePreBreakNotice: true,
    preBreakSeconds: 15,
    enableIdleDetection: true,
    idleThresholdMinutes: 5,
    enableFullscreenDnd: true,
    enableQuietHours: false,
    quietStart: "22:00",
    quietEnd: "08:00",
    enableSound: true,
    soundPreset: "chime",
    soundVolume: 0.6,
    enableEyeTips: true,
    enableStats: true,
  };

  const today = new Date();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  const sampleCounts = [5, 7, 6, 8, 5, 9, 7];
  const days = sampleCounts.map((completed, idx) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - idx));
    return {
      date: fmt(d),
      focusSeconds: completed * 1350,
      completedBreaks: completed,
      skippedBreaks: idx % 3 === 0 ? 1 : 0,
      postponedBreaks: idx % 2 === 0 ? 1 : 0,
      totalBreakSeconds: completed * 60,
    };
  });

  const snapshot: TimerSnapshot = {
    phase: isOverlayDemo ? "on_break" : "focusing",
    remainingSeconds: isOverlayDemo ? 18 : 16 * 60 + 42,
    totalSeconds: isOverlayDemo ? 20 : 20 * 60,
    activePreset: presets[0],
    isPreview: false,
    dndReason: null,
    tipIndex: 0,
    todayStats: days[days.length - 1],
  };

  return { config, snapshot, stats: { days } as StatsStore };
}

const noopUnlisten = async (): Promise<UnlistenFn> => () => {};

export const api = {
  getState: () =>
    isTauriRuntime
      ? invoke<TimerSnapshot>("get_state")
      : Promise.resolve(buildDemoData().snapshot),
  getConfig: () =>
    isTauriRuntime
      ? invoke<AppConfig>("get_config")
      : Promise.resolve(buildDemoData().config),
  updateConfig: (config: AppConfig) =>
    isTauriRuntime
      ? invoke<AppConfig>("update_config", { config })
      : Promise.resolve(config),
  getStats: () =>
    isTauriRuntime
      ? invoke<StatsStore>("get_stats")
      : Promise.resolve(buildDemoData().stats),
  clearStats: () =>
    isTauriRuntime
      ? invoke<StatsStore>("clear_stats")
      : Promise.resolve({ days: [] }),

  pause: () =>
    isTauriRuntime
      ? invoke<TimerSnapshot>("timer_pause")
      : Promise.resolve(buildDemoData().snapshot),
  resume: () =>
    isTauriRuntime
      ? invoke<TimerSnapshot>("timer_resume")
      : Promise.resolve(buildDemoData().snapshot),
  reset: () =>
    isTauriRuntime
      ? invoke<TimerSnapshot>("timer_reset")
      : Promise.resolve(buildDemoData().snapshot),
  startBreakNow: () =>
    isTauriRuntime
      ? invoke<TimerSnapshot>("timer_start_break_now")
      : Promise.resolve(buildDemoData().snapshot),
  skipBreak: () =>
    isTauriRuntime
      ? invoke<TimerSnapshot>("timer_skip_break")
      : Promise.resolve(buildDemoData().snapshot),
  postponeBreak: (minutes?: number) =>
    isTauriRuntime
      ? invoke<TimerSnapshot>("timer_postpone_break", { minutes: minutes ?? null })
      : Promise.resolve(buildDemoData().snapshot),
  completeBreak: () =>
    isTauriRuntime
      ? invoke<TimerSnapshot>("timer_complete_break")
      : Promise.resolve(buildDemoData().snapshot),
  expandBreakToOverlay: () =>
    isTauriRuntime
      ? invoke<void>("expand_break_to_overlay")
      : Promise.resolve(),
  previewReminder: (mode: ReminderMode) =>
    isTauriRuntime
      ? invoke<TimerSnapshot>("preview_reminder", { mode })
      : Promise.resolve(buildDemoData().snapshot),

  setActivePreset: (presetId: string) =>
    isTauriRuntime
      ? invoke<AppConfig>("set_active_preset", { presetId })
      : Promise.resolve({ ...buildDemoData().config, activePresetId: presetId }),
  saveCustomPreset: (preset: TimerPreset) =>
    isTauriRuntime
      ? invoke<AppConfig>("save_custom_preset", { preset })
      : Promise.resolve(buildDemoData().config),
  deleteCustomPreset: (presetId: string) =>
    isTauriRuntime
      ? invoke<AppConfig>("delete_custom_preset", { presetId })
      : Promise.resolve(buildDemoData().config),

  onTimerState: (cb: (snap: TimerSnapshot) => void): Promise<UnlistenFn> =>
    isTauriRuntime
      ? listen<TimerSnapshot>("timer:state", (e) => cb(e.payload))
      : noopUnlisten(),

  onConfigUpdated: (cb: (cfg: AppConfig) => void): Promise<UnlistenFn> =>
    isTauriRuntime
      ? listen<AppConfig>("config:updated", (e) => cb(e.payload))
      : noopUnlisten(),

  onAudioCue: (cb: (payload: AudioCuePayload) => void): Promise<UnlistenFn> =>
    isTauriRuntime
      ? listen<AudioCuePayload>("audio:cue", (e) => cb(e.payload))
      : noopUnlisten(),
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

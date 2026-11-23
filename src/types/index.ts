export type ReminderMode = "popup" | "overlay";
export type ThemeMode = "light" | "dark" | "system";
export type SoundPresetId =
  | "chime"
  | "singing_bowl"
  | "water_drop"
  | "kalimba"
  | "piano"
  | "zen_bell";

export type TimerPhase =
  | "focusing"
  | "pre_break"
  | "on_break"
  | "paused"
  | "idle_paused"
  | "dnd_deferred";

export interface TimerPreset {
  id: string;
  name: string;
  description: string;
  focusMinutes: number;
  breakSeconds: number;
  isBuiltin: boolean;
}

export interface AppConfig {
  activePresetId: string;
  presets: TimerPreset[];
  autoStart: boolean;
  startMinimized: boolean;
  closeToTray: boolean;
  theme: ThemeMode;
  reminderMode: ReminderMode;
  multiMonitorOverlay: boolean;
  overlayOpacity: number;
  allowSkip: boolean;
  allowPostpone: boolean;
  postponeMinutes: number;
  enablePreBreakNotice: boolean;
  preBreakSeconds: number;
  enableIdleDetection: boolean;
  idleThresholdMinutes: number;
  enableFullscreenDnd: boolean;
  enableQuietHours: boolean;
  quietStart: string;
  quietEnd: string;
  enableSound: boolean;
  soundPreset: SoundPresetId;
  soundVolume: number;
  enableEyeTips: boolean;
  enableStats: boolean;
}

export interface DailyStats {
  date: string;
  focusSeconds: number;
  completedBreaks: number;
  skippedBreaks: number;
  postponedBreaks: number;
  totalBreakSeconds: number;
}

export interface StatsStore {
  days: DailyStats[];
}

export interface TimerSnapshot {
  phase: TimerPhase;
  remainingSeconds: number;
  totalSeconds: number;
  activePreset: TimerPreset;
  isPreview: boolean;
  dndReason: string | null;
  tipIndex: number;
  todayStats: DailyStats;
}

export interface AudioCuePayload {
  cue: "pre_break" | "break_start" | "break_end" | string;
  preset: SoundPresetId | string;
  volume: number;
}

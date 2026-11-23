import {
  Award,
  CheckCircle2,
  Clock,
  Coffee,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
} from "lucide-react";
import { CountdownRing } from "../components/CountdownRing";
import { api, formatDurationText } from "../lib/tauri";
import { getEyeCareTip } from "../lib/tips";
import type { AppConfig, TimerSnapshot } from "../types";

interface DashboardProps {
  snapshot: TimerSnapshot;
  config: AppConfig;
  onConfigChange: (cfg: AppConfig) => void;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "夜深了，注意保护眼睛";
  if (h < 12) return "早安，开启清爽护眼的一天";
  if (h < 18) return "午后专注，记得定时远眺";
  return "傍晚时光，给双眼多一点温柔";
}

export function Dashboard({ snapshot, config, onConfigChange }: DashboardProps) {
  const isPaused =
    snapshot.phase === "paused" || snapshot.phase === "idle_paused";
  const isOnBreak = snapshot.phase === "on_break";
  const tip = getEyeCareTip(snapshot.tipIndex);

  const handleTogglePause = async () => {
    if (isPaused) {
      await api.resume();
    } else {
      await api.pause();
    }
  };

  const handleSwitchPreset = async (id: string) => {
    const updated = await api.setActivePreset(id);
    onConfigChange(updated);
  };

  const today = snapshot.todayStats;
  const totalDecisions = today.completedBreaks + today.skippedBreaks;
  const completionRate =
    totalDecisions === 0
      ? 100
      : Math.round((today.completedBreaks / totalDecisions) * 100);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--accent)" }}>
            {getGreeting()}
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">护眼控制台</h1>
        </div>

        <div
          className="px-3.5 py-2 rounded-2xl border text-xs font-medium flex items-center gap-2 backdrop-blur-md"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-soft)",
            color: "var(--text-secondary)",
          }}
        >
          <Monitor className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
          <span>当前提醒：</span>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {config.reminderMode === "overlay" ? "全屏护眼遮罩" : "柔和弹窗提醒"}
          </span>
        </div>
      </div>

      {/* Hero Countdown Card */}
      <div className="glass-card rounded-3xl p-7 relative overflow-hidden">
        {/* Subtle decorative emerald glow */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-35"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.45), transparent 70%)" }}
        />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-7 items-center">
          <div className="md:col-span-6 flex justify-center">
            <CountdownRing
              remainingSeconds={snapshot.remainingSeconds}
              totalSeconds={snapshot.totalSeconds}
              phase={snapshot.phase}
              presetName={snapshot.activePreset.name}
            />
          </div>

          <div className="md:col-span-6 space-y-5">
            {/* Primary controls */}
            <div className="flex items-center gap-2.5">
              {!isOnBreak ? (
                <button
                  onClick={handleTogglePause}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-sm cursor-pointer"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      继续护眼计时
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      暂停计时
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => void api.completeBreak()}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-sm cursor-pointer"
                >
                  <Coffee className="w-4 h-4" />
                  结束本次休息
                </button>
              )}

              <button
                onClick={() => void api.reset()}
                className="p-3.5 rounded-2xl border transition-all hover:scale-[1.03] active:scale-95 cursor-pointer"
                style={{
                  borderColor: "var(--border-soft)",
                  backgroundColor: "var(--bg-subtle)",
                }}
                title="重置本轮专注倒计时"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Secondary action row */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => void api.startBreakNow()}
                disabled={isOnBreak}
                className="px-4 py-2.5 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:border-emerald-500/40 disabled:opacity-45 cursor-pointer"
                style={{
                  borderColor: "var(--border-soft)",
                  backgroundColor: "var(--bg-surface-solid)",
                }}
              >
                <Coffee className="w-4 h-4 text-emerald-500" />
                立即休息片刻
              </button>

              <button
                onClick={() => void api.postponeBreak()}
                className="px-4 py-2.5 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:border-amber-500/40 cursor-pointer"
                style={{
                  borderColor: "var(--border-soft)",
                  backgroundColor: "var(--bg-surface-solid)",
                }}
              >
                <Timer className="w-4 h-4 text-amber-500" />
                推迟 {config.postponeMinutes} 分钟
              </button>
            </div>

            {/* Frosted Eye-Care Tip */}
            {config.enableEyeTips && (
              <div
                className="rounded-2xl p-4 border relative overflow-hidden"
                style={{
                  backgroundColor: "var(--bg-subtle)",
                  borderColor: "var(--border-soft)",
                }}
              >
                <div
                  className="flex items-center gap-1.5 text-[11px] font-semibold mb-1.5"
                  style={{ color: "var(--accent)" }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>护眼微指引 · {tip.category}</span>
                </div>
                <div className="text-[13.5px] font-semibold leading-snug">{tip.title}</div>
                <p
                  className="text-xs mt-1 leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {tip.detail}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Preset Switcher */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: "var(--accent)" }} />
            快速切换时间方案
          </h2>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            点击卡片即刻按新周期开始计时
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {config.presets.slice(0, 8).map((preset) => {
            const active = preset.id === config.activePresetId;
            const breakRatio = Math.min(
              35,
              Math.max(8, (preset.breakSeconds / (preset.focusMinutes * 60 + preset.breakSeconds)) * 100)
            );
            return (
              <button
                key={preset.id}
                onClick={() => void handleSwitchPreset(preset.id)}
                className="group text-left rounded-2xl p-4 border transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                style={{
                  backgroundColor: active ? "var(--accent-soft)" : "var(--bg-surface)",
                  borderColor: active ? "var(--accent)" : "var(--border-soft)",
                  boxShadow: active ? "0 8px 20px -10px rgba(15,138,100,0.35)" : "var(--shadow-card)",
                }}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-semibold text-[13.5px] truncate">{preset.name}</span>
                  {active ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  ) : !preset.isBuiltin ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 shrink-0">
                      自定义
                    </span>
                  ) : null}
                </div>

                <div
                  className="text-[11.5px] mt-1.5 tabular-nums font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {preset.focusMinutes} 分钟 · 休 {formatDurationText(preset.breakSeconds)}
                </div>

                {/* Focus / Break visual proportion bar */}
                <div className="w-full h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] mt-3 overflow-hidden flex">
                  <div
                    className="h-full rounded-l-full"
                    style={{
                      width: `${100 - breakRatio}%`,
                      backgroundColor: active ? "var(--accent)" : "var(--text-muted)",
                      opacity: active ? 0.85 : 0.35,
                    }}
                  />
                  <div
                    className="h-full bg-teal-400 rounded-r-full"
                    style={{ width: `${breakRatio}%`, opacity: active ? 0.9 : 0.45 }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Today's Metric Trio */}
      {config.enableStats && (
        <div className="grid grid-cols-3 gap-3.5">
          <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                今日专注用眼
              </div>
              <div className="text-lg font-bold tabular-nums mt-0.5">
                {formatDurationText(today.focusSeconds)}
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/12 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                完成护眼休息
              </div>
              <div className="text-lg font-bold tabular-nums mt-0.5 text-emerald-600 dark:text-emerald-400">
                {today.completedBreaks} 次
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                今日护眼达标率
              </div>
              <div className="text-lg font-bold tabular-nums mt-0.5">{completionRate}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

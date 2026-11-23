import { useState } from "react";
import {
  BarChart3,
  Check,
  Eye,
  Monitor,
  Moon,
  Play,
  Power,
  ShieldAlert,
  Sun,
  SunMoon,
  Volume2,
} from "lucide-react";
import { playEyeCareCue, SOUND_PRESETS } from "../lib/sound";
import { api } from "../lib/tauri";
import type { AppConfig, SoundPresetId, ThemeMode } from "../types";

interface SettingsProps {
  config: AppConfig;
  onConfigChange: (cfg: AppConfig) => void;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-200 cursor-pointer ${
        checked
          ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-inner"
          : "bg-slate-300/90 dark:bg-slate-700"
      }`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-5.5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SettingRow({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3.5 border-b last:border-b-0"
      style={{ borderColor: "var(--border-soft)" }}
    >
      <div className="space-y-0.5">
        <div className="text-[13.5px] font-semibold">{title}</div>
        <div className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {description}
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: typeof Power;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-[15px] leading-tight">{title}</div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </div>
        </div>
      </div>
      {action}
    </div>
  );
}

export function Settings({ config, onConfigChange }: SettingsProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [playingSoundId, setPlayingSoundId] = useState<SoundPresetId | null>(null);

  const patch = async (partial: Partial<AppConfig>) => {
    try {
      const updated = await api.updateConfig({ ...config, ...partial });
      onConfigChange(updated);
      setNotice("设置已自动保存");
      setTimeout(() => setNotice(null), 1800);
    } catch (err) {
      setNotice(String(err));
    }
  };

  const handleSelectSound = (id: SoundPresetId) => {
    void patch({ soundPreset: id });
    playEyeCareCue("break_start", config.soundVolume, id);
    setPlayingSoundId(id);
    setTimeout(() => setPlayingSoundId((curr) => (curr === id ? null : curr)), 1200);
  };

  const handleAudition = (id: SoundPresetId, cue: "break_start" | "break_end") => {
    playEyeCareCue(cue, config.soundVolume, id);
    setPlayingSoundId(id);
    setTimeout(() => setPlayingSoundId((curr) => (curr === id ? null : curr)), 1200);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            个性化定制
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">偏好设置</h1>
        </div>
        {notice && (
          <span
            className="text-xs px-3.5 py-1.5 rounded-full font-semibold animate-float-in border"
            style={{
              backgroundColor: "var(--accent-soft)",
              borderColor: "var(--accent)",
              color: "var(--accent)",
            }}
          >
            {notice}
          </span>
        )}
      </div>

      {/* 1. Reminder Mode & Visual Preview Cards */}
      <section className="glass-card rounded-3xl p-6">
        <SectionHeader
          icon={Monitor}
          title="护眼提醒方式"
          subtitle="选择到点休息时的呈现形态，支持随时预览效果"
        />

        {/* Visual Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">
          {/* Soft Popup visual card */}
          <div
            onClick={() => void patch({ reminderMode: "popup" })}
            className="rounded-2xl border p-4 transition-all cursor-pointer flex flex-col justify-between gap-3"
            style={{
              backgroundColor:
                config.reminderMode === "popup" ? "var(--accent-soft)" : "var(--bg-subtle)",
              borderColor:
                config.reminderMode === "popup" ? "var(--accent)" : "var(--border-soft)",
            }}
          >
            {/* Mini desktop mockup */}
            <div className="h-20 rounded-xl bg-slate-900/80 dark:bg-black/45 p-2.5 relative overflow-hidden border border-white/10">
              <div className="w-16 h-2 rounded bg-white/15 mb-1.5" />
              <div className="w-24 h-1.5 rounded bg-white/10" />
              <div className="absolute right-2.5 bottom-2.5 w-24 h-11 rounded-lg bg-emerald-950/95 border border-emerald-400/40 p-1.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-1.5 rounded bg-emerald-300/80" />
                  <span className="text-[8px] font-bold text-emerald-300 tabular-nums">00:20</span>
                </div>
                <div className="w-full h-1 rounded-full bg-emerald-400/60 mt-2.5" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold flex items-center gap-1.5">
                  <span>柔和弹窗提醒</span>
                  {config.reminderMode === "popup" && (
                    <Check className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  右下角不抢焦点悬浮卡片，温和不打断
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void api.previewReminder("popup");
                }}
                className="px-3 py-1.5 rounded-xl border text-[11px] font-semibold shrink-0 hover:opacity-85 cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-surface-solid)",
                  borderColor: "var(--border-strong)",
                }}
              >
                预览弹窗
              </button>
            </div>
          </div>

          {/* Fullscreen Overlay visual card */}
          <div
            onClick={() => void patch({ reminderMode: "overlay" })}
            className="rounded-2xl border p-4 transition-all cursor-pointer flex flex-col justify-between gap-3"
            style={{
              backgroundColor:
                config.reminderMode === "overlay" ? "var(--accent-soft)" : "var(--bg-subtle)",
              borderColor:
                config.reminderMode === "overlay" ? "var(--accent)" : "var(--border-soft)",
            }}
          >
            {/* Mini overlay mockup */}
            <div className="h-20 rounded-xl bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-950 p-2.5 relative overflow-hidden border border-emerald-400/25 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-400/20 blur-md absolute" />
              <div className="relative text-sm font-bold text-emerald-200 tabular-nums">00:20</div>
              <div className="relative w-14 h-1 rounded-full bg-emerald-300/60 mt-1" />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold flex items-center gap-1.5">
                  <span>全屏护眼遮罩</span>
                  {config.reminderMode === "overlay" && (
                    <Check className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  沉浸式呼吸光环与多屏覆盖，真正放空双眼
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void api.previewReminder("overlay");
                }}
                className="btn-primary px-3 py-1.5 rounded-xl text-[11px] font-semibold shrink-0 cursor-pointer"
              >
                预览遮罩
              </button>
            </div>
          </div>
        </div>

        {config.reminderMode === "overlay" && (
          <>
            <SettingRow
              title="多显示器同步全屏遮罩"
              description="连接多台显示器时，同时在所有屏幕上显示舒缓护眼背景"
              control={
                <Toggle
                  checked={config.multiMonitorOverlay}
                  onChange={(multiMonitorOverlay) => void patch({ multiMonitorOverlay })}
                />
              }
            />

            <SettingRow
              title={`全屏遮罩透明度（${Math.round(config.overlayOpacity * 100)}%）`}
              description="调节遮罩背景深浅，兼顾沉浸感与桌面可见度"
              control={
                <input
                  type="range"
                  min={0.65}
                  max={0.96}
                  step={0.01}
                  value={config.overlayOpacity}
                  onChange={(e) =>
                    void patch({ overlayOpacity: Number(e.target.value) })
                  }
                  className="w-36 eyerest-slider"
                />
              }
            />
          </>
        )}

        <SettingRow
          title="允许跳过本次休息"
          description="关闭后将隐藏「跳过」按钮与 Esc 跳过，帮助你严格执行护眼计划"
          control={
            <Toggle
              checked={config.allowSkip}
              onChange={(allowSkip) => void patch({ allowSkip })}
            />
          }
        />

        <SettingRow
          title="允许推迟休息"
          description="有紧急事务时可延后片刻再休息，并自定义推迟分钟数"
          control={
            <div className="flex items-center gap-3">
              {config.allowPostpone && (
                <select
                  value={config.postponeMinutes}
                  onChange={(e) =>
                    void patch({ postponeMinutes: Number(e.target.value) })
                  }
                  className="px-2.5 py-1.5 rounded-xl border text-xs font-medium outline-none"
                  style={{
                    backgroundColor: "var(--bg-surface-solid)",
                    borderColor: "var(--border-strong)",
                  }}
                >
                  {[2, 3, 5, 10, 15].map((m) => (
                    <option key={m} value={m}>
                      推迟 {m} 分钟
                    </option>
                  ))}
                </select>
              )}
              <Toggle
                checked={config.allowPostpone}
                onChange={(allowPostpone) => void patch({ allowPostpone })}
              />
            </div>
          }
        />

        <SettingRow
          title="休息前提前倒计时预警"
          description="在正式休息前于右下角轻提示，避免突然弹出打断保存工作"
          control={
            <div className="flex items-center gap-3">
              {config.enablePreBreakNotice && (
                <select
                  value={config.preBreakSeconds}
                  onChange={(e) =>
                    void patch({ preBreakSeconds: Number(e.target.value) })
                  }
                  className="px-2.5 py-1.5 rounded-xl border text-xs font-medium outline-none"
                  style={{
                    backgroundColor: "var(--bg-surface-solid)",
                    borderColor: "var(--border-strong)",
                  }}
                >
                  {[10, 15, 20, 30].map((s) => (
                    <option key={s} value={s}>
                      提前 {s} 秒
                    </option>
                  ))}
                </select>
              )}
              <Toggle
                checked={config.enablePreBreakNotice}
                onChange={(enablePreBreakNotice) => void patch({ enablePreBreakNotice })}
              />
            </div>
          }
        />
      </section>

      {/* 2. Multi-Sound Selector & Guidance */}
      <section className="glass-card rounded-3xl p-6">
        <SectionHeader
          icon={Volume2}
          title="提示音与放松引导"
          subtitle="6 种本地合成自然治愈音色，点击卡片即可选中并即时试听"
          action={
            <Toggle
              checked={config.enableSound}
              onChange={(enableSound) => void patch({ enableSound })}
            />
          }
        />

        {config.enableSound && (
          <div className="space-y-4 pb-4 mb-2 border-b" style={{ borderColor: "var(--border-soft)" }}>
            {/* 6 Sound Preset Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SOUND_PRESETS.map((sound) => {
                const selected = config.soundPreset === sound.id;
                const isPlaying = playingSoundId === sound.id;
                return (
                  <div
                    key={sound.id}
                    onClick={() => handleSelectSound(sound.id)}
                    className="rounded-2xl border p-3.5 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5 hover:-translate-y-0.5"
                    style={{
                      backgroundColor: selected ? "var(--accent-soft)" : "var(--bg-subtle)",
                      borderColor: selected ? "var(--accent)" : "var(--border-soft)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[13.5px] font-bold flex items-center gap-1.5">
                          <span>{sound.name}</span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                            style={{
                              backgroundColor: "var(--bg-surface-solid)",
                              color: selected ? "var(--accent)" : "var(--text-muted)",
                            }}
                          >
                            {sound.badge}
                          </span>
                        </div>
                        <p
                          className="text-[11px] mt-1 leading-snug"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {sound.tagline}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAudition(sound.id, "break_start");
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer"
                        style={{
                          backgroundColor: "var(--bg-surface-solid)",
                          borderColor: "var(--border-soft)",
                          color: selected ? "var(--accent)" : "var(--text-primary)",
                        }}
                      >
                        {isPlaying ? (
                          <span className="flex items-end gap-0.5 h-3">
                            <span className="w-0.5 h-full bg-emerald-500 rounded-full animate-sound-bar" />
                            <span
                              className="w-0.5 h-full bg-emerald-500 rounded-full animate-sound-bar"
                              style={{ animationDelay: "0.15s" }}
                            />
                            <span
                              className="w-0.5 h-full bg-emerald-500 rounded-full animate-sound-bar"
                              style={{ animationDelay: "0.3s" }}
                            />
                          </span>
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                        试听
                      </button>

                      {selected && (
                        <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "var(--accent)" }}>
                          <Check className="w-3.5 h-3.5" />
                          已选用
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Volume + Start/End cue audition */}
            <div
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl px-4 py-3 border"
              style={{
                backgroundColor: "var(--bg-subtle)",
                borderColor: "var(--border-soft)",
              }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                <Volume2 className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
                <span className="text-xs font-semibold shrink-0">
                  提示音量 {Math.round(config.soundVolume * 100)}%
                </span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={config.soundVolume}
                  onChange={(e) =>
                    void patch({ soundVolume: Number(e.target.value) })
                  }
                  className="flex-1 max-w-[180px] eyerest-slider"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAudition(config.soundPreset, "break_start")}
                  className="px-3 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer"
                  style={{
                    backgroundColor: "var(--bg-surface-solid)",
                    borderColor: "var(--border-strong)",
                  }}
                >
                  试听开始音
                </button>
                <button
                  type="button"
                  onClick={() => handleAudition(config.soundPreset, "break_end")}
                  className="px-3 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer"
                  style={{
                    backgroundColor: "var(--bg-surface-solid)",
                    borderColor: "var(--border-strong)",
                  }}
                >
                  试听结束音
                </button>
              </div>
            </div>
          </div>
        )}

        <SettingRow
          title="护眼放松引导与小贴士"
          description="休息时展示远眺、眨眼、眼肌舒缓与呼吸放松建议"
          control={
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-500/75" />
              <Toggle
                checked={config.enableEyeTips}
                onChange={(enableEyeTips) => void patch({ enableEyeTips })}
              />
            </div>
          }
        />

        <SettingRow
          title="启用每日护眼统计"
          description="在本地统计每日专注时长、按时休息次数与 7 天达标趋势"
          control={
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500/75" />
              <Toggle
                checked={config.enableStats}
                onChange={(enableStats) => void patch({ enableStats })}
              />
            </div>
          }
        />
      </section>

      {/* 3. General, Theme & Autostart */}
      <section className="glass-card rounded-3xl p-6">
        <SectionHeader
          icon={Power}
          title="启动、外观与系统托盘"
          subtitle="配置开机自启动、托盘驻留方式与护眼界面主题"
        />

        {/* Theme Selector */}
        <div className="pb-4 mb-1 border-b" style={{ borderColor: "var(--border-soft)" }}>
          <div className="text-[13.5px] font-semibold mb-2.5">界面外观主题</div>
          <div className="grid grid-cols-3 gap-2.5">
            {(
              [
                { id: "light", label: "浅色森屿", icon: Sun },
                { id: "dark", label: "深色夜林", icon: Moon },
                { id: "system", label: "跟随系统", icon: SunMoon },
              ] as { id: ThemeMode; label: string; icon: typeof Sun }[]
            ).map((opt) => {
              const Icon = opt.icon;
              const active = config.theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => void patch({ theme: opt.id })}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer"
                  style={{
                    backgroundColor: active ? "var(--accent-soft)" : "var(--bg-subtle)",
                    borderColor: active ? "var(--accent)" : "var(--border-soft)",
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <SettingRow
          title="开机自启动"
          description="Windows 登录时自动启动 EyeRest，持续守护用眼健康"
          control={
            <Toggle
              checked={config.autoStart}
              onChange={(autoStart) => void patch({ autoStart })}
            />
          }
        />

        <SettingRow
          title="启动时静默最小化到托盘"
          description="打开程序或开机自启时直接隐藏到右下角托盘，不弹出主窗口打扰"
          control={
            <Toggle
              checked={config.startMinimized}
              onChange={(startMinimized) => void patch({ startMinimized })}
            />
          }
        />

        <SettingRow
          title="关闭主窗口时最小化到系统托盘"
          description="点击右上角关闭按钮后在后台继续计时；关闭此选项将直接退出程序"
          control={
            <Toggle
              checked={config.closeToTray}
              onChange={(closeToTray) => void patch({ closeToTray })}
            />
          }
        />
      </section>

      {/* 4. Smart DND & Idle Detection */}
      <section className="glass-card rounded-3xl p-6">
        <SectionHeader
          icon={ShieldAlert}
          title="智能免打扰与空闲检测"
          subtitle="自动感知你的电脑使用场景，不打扰游戏与演示"
        />

        <SettingRow
          title="键鼠空闲 / 锁屏自动暂停并重置"
          description="检测到锁屏或长时间无键鼠操作时自动暂停，回到电脑后开启新一轮计时"
          control={
            <div className="flex items-center gap-3">
              {config.enableIdleDetection && (
                <select
                  value={config.idleThresholdMinutes}
                  onChange={(e) =>
                    void patch({ idleThresholdMinutes: Number(e.target.value) })
                  }
                  className="px-2.5 py-1.5 rounded-xl border text-xs font-medium outline-none"
                  style={{
                    backgroundColor: "var(--bg-surface-solid)",
                    borderColor: "var(--border-strong)",
                  }}
                >
                  {[2, 3, 5, 10, 15].map((m) => (
                    <option key={m} value={m}>
                      无操作 {m} 分钟
                    </option>
                  ))}
                </select>
              )}
              <Toggle
                checked={config.enableIdleDetection}
                onChange={(enableIdleDetection) => void patch({ enableIdleDetection })}
              />
            </div>
          }
        />

        <SettingRow
          title="全屏应用 / 游戏 / PPT 演示免打扰"
          description="自动识别 Windows 全屏独占应用或演示状态，期间暂缓弹窗，退出后再提醒"
          control={
            <Toggle
              checked={config.enableFullscreenDnd}
              onChange={(enableFullscreenDnd) => void patch({ enableFullscreenDnd })}
            />
          }
        />

        <SettingRow
          title="定时免打扰时段"
          description="在指定时间段内暂缓护眼弹窗（支持跨午夜，例如 22:00 至 08:00）"
          control={
            <div className="flex items-center gap-2.5">
              {config.enableQuietHours && (
                <div className="flex items-center gap-1.5 text-xs">
                  <input
                    type="time"
                    value={config.quietStart}
                    onChange={(e) => void patch({ quietStart: e.target.value })}
                    className="px-2.5 py-1 rounded-xl border text-xs font-medium"
                    style={{
                      backgroundColor: "var(--bg-surface-solid)",
                      borderColor: "var(--border-strong)",
                    }}
                  />
                  <span>至</span>
                  <input
                    type="time"
                    value={config.quietEnd}
                    onChange={(e) => void patch({ quietEnd: e.target.value })}
                    className="px-2.5 py-1 rounded-xl border text-xs font-medium"
                    style={{
                      backgroundColor: "var(--bg-surface-solid)",
                      borderColor: "var(--border-strong)",
                    }}
                  />
                </div>
              )}
              <Toggle
                checked={config.enableQuietHours}
                onChange={(enableQuietHours) => void patch({ enableQuietHours })}
              />
            </div>
          }
        />
      </section>
    </div>
  );
}

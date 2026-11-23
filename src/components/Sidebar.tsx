import { BarChart3, Clock, Eye, Leaf, Settings, SlidersHorizontal } from "lucide-react";
import { formatMMSS } from "../lib/tauri";
import type { TimerPhase, TimerSnapshot } from "../types";

export type NavTab = "dashboard" | "presets" | "stats" | "settings";

interface SidebarProps {
  activeTab: NavTab;
  onSelect: (tab: NavTab) => void;
  snapshot: TimerSnapshot;
  autoStart: boolean;
  closeToTray: boolean;
}

const NAV_ITEMS: { id: NavTab; label: string; desc: string; icon: typeof Clock }[] = [
  { id: "dashboard", label: "护眼计时", desc: "专注与休息控制", icon: Clock },
  { id: "presets", label: "时间方案", desc: "预设与自定义", icon: SlidersHorizontal },
  { id: "stats", label: "护眼统计", desc: "用眼习惯追踪", icon: BarChart3 },
  { id: "settings", label: "偏好设置", desc: "提醒与提示音", icon: Settings },
];

const PHASE_META: Record<TimerPhase, { text: string; dot: string; glow: string }> = {
  focusing: { text: "护眼守护中", dot: "bg-emerald-500", glow: "shadow-emerald-500/40" },
  pre_break: { text: "即将进入休息", dot: "bg-amber-400", glow: "shadow-amber-400/40" },
  on_break: { text: "正在护眼休息", dot: "bg-teal-400", glow: "shadow-teal-400/40" },
  paused: { text: "计时已暂停", dot: "bg-slate-400", glow: "shadow-slate-400/30" },
  idle_paused: { text: "离开自动暂停", dot: "bg-sky-400", glow: "shadow-sky-400/40" },
  dnd_deferred: { text: "免打扰暂缓中", dot: "bg-violet-400", glow: "shadow-violet-400/40" },
};

export function Sidebar({
  activeTab,
  onSelect,
  snapshot,
  autoStart,
  closeToTray,
}: SidebarProps) {
  const status = PHASE_META[snapshot.phase];

  return (
    <aside
      className="w-[232px] shrink-0 flex flex-col justify-between border-r px-4 py-6 backdrop-blur-2xl"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-soft)",
      }}
    >
      <div>
        {/* Brand mark */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-600/25 text-white">
            <Eye className="w-5 h-5" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
              <Leaf className="w-2.5 h-2.5 text-emerald-500" />
            </span>
          </div>
          <div>
            <div className="font-bold text-[16px] leading-tight tracking-tight">
              EyeRest
            </div>
            <div className="text-[11px] font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>
              明眸护眼 · 静谧守护
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="group relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-all duration-200 cursor-pointer"
                style={{
                  backgroundColor: active ? "var(--accent-soft)" : "transparent",
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                    style={{ backgroundColor: "var(--accent)" }}
                  />
                )}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: active ? "var(--bg-surface-solid)" : "transparent",
                    boxShadow: active ? "0 2px 8px rgba(15,138,100,0.12)" : "none",
                  }}
                >
                  <Icon className="w-[17px] h-[17px]" />
                </div>
                <div className="min-w-0">
                  <div
                    className="text-[13.5px] font-semibold leading-tight"
                    style={{ color: active ? "var(--text-primary)" : "inherit" }}
                  >
                    {item.label}
                  </div>
                  <div
                    className="text-[10.5px] truncate mt-0.5 opacity-75"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Live Status & Mini Countdown */}
      <div
        className="rounded-2xl p-3.5 border space-y-3"
        style={{
          backgroundColor: "var(--bg-subtle)",
          borderColor: "var(--border-soft)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className={`w-2 h-2 rounded-full ${status.dot} shadow-sm ${status.glow}`} />
            <span>{status.text}</span>
          </div>
          {activeTab !== "dashboard" && (
            <button
              onClick={() => onSelect("dashboard")}
              className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-lg cursor-pointer"
              style={{
                backgroundColor: "var(--accent-soft)",
                color: "var(--accent)",
              }}
              title="返回护眼计时"
            >
              {formatMMSS(snapshot.remainingSeconds)}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 text-[10.5px] font-medium">
          <span
            className="px-2 py-0.5 rounded-lg border"
            style={{
              backgroundColor: "var(--bg-surface-solid)",
              borderColor: "var(--border-soft)",
              color: "var(--text-secondary)",
            }}
          >
            {closeToTray ? "托盘常驻" : "关闭即退出"}
          </span>
          {autoStart && (
            <span
              className="px-2 py-0.5 rounded-lg"
              style={{
                backgroundColor: "var(--accent-soft)",
                color: "var(--accent)",
              }}
            >
              开机自启
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}

import { useEffect, useState } from "react";
import { Award, CheckCircle2, Clock, Download, FastForward, Trash2 } from "lucide-react";
import { StatsChart } from "../components/StatsChart";
import { api, formatDurationText } from "../lib/tauri";
import type { AppConfig, StatsStore, TimerSnapshot } from "../types";

interface StatisticsProps {
  config: AppConfig;
  snapshot: TimerSnapshot;
}

export function Statistics({ config, snapshot }: StatisticsProps) {
  const [stats, setStats] = useState<StatsStore>({ days: [] });
  const [confirmClear, setConfirmClear] = useState(false);

  const load = async () => {
    const data = await api.getStats();
    setStats(data);
  };

  useEffect(() => {
    void load();
  }, [snapshot.todayStats.completedBreaks, snapshot.todayStats.skippedBreaks]);

  const today = snapshot.todayStats;
  const totalBreaks = today.completedBreaks + today.skippedBreaks;
  const compliance =
    totalBreaks === 0 ? 100 : Math.round((today.completedBreaks / totalBreaks) * 100);

  const totalCompletedAllTime = stats.days.reduce((s, d) => s + d.completedBreaks, 0);
  const totalFocusAllTime = stats.days.reduce((s, d) => s + d.focusSeconds, 0);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(stats, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eyerest-stats-${today.date || "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = async () => {
    const cleared = await api.clearStats();
    setStats(cleared);
    setConfirmClear(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            健康用眼记录
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">每日护眼统计</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-soft)",
            }}
          >
            <Download className="w-3.5 h-3.5" />
            导出 JSON
          </button>

          {!confirmClear ? (
            <button
              onClick={() => setConfirmClear(true)}
              className="px-3.5 py-2 rounded-xl border text-xs font-semibold text-rose-500 flex items-center gap-1.5 cursor-pointer"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-soft)",
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空记录
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => void handleClear()}
                className="px-3.5 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                确认清空
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer"
                style={{ borderColor: "var(--border-strong)" }}
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>

      {!config.enableStats && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-700 dark:text-amber-300">
          当前已在「偏好设置」中关闭护眼统计记录，新产生的用眼与休息数据将不会被保存。
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="glass-card rounded-2xl p-4 space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
              今日用眼时长
            </div>
            <div className="text-xl font-bold mt-0.5 tabular-nums">
              {formatDurationText(today.focusSeconds)}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/12 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
              今日完成休息
            </div>
            <div className="text-xl font-bold mt-0.5 tabular-nums text-emerald-600 dark:text-emerald-400">
              {today.completedBreaks} 次
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <FastForward className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
              跳过 / 推迟
            </div>
            <div className="text-xl font-bold mt-0.5 tabular-nums">
              {today.skippedBreaks} / {today.postponedBreaks}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-500/12 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
              今日护眼达标率
            </div>
            <div className="text-xl font-bold mt-0.5 tabular-nums">{compliance}%</div>
          </div>
        </div>
      </div>

      {/* 7-day trend chart */}
      <div className="glass-card rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-bold text-[15px]">近 7 天护眼休息趋势</h2>
          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            累计守护用眼 {formatDurationText(totalFocusAllTime)} · 共完成 {totalCompletedAllTime} 次休息
          </span>
        </div>
        <StatsChart days={stats.days} />
      </div>
    </div>
  );
}

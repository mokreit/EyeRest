import { useState } from "react";
import type { DailyStats } from "../types";

interface StatsChartProps {
  days: DailyStats[];
}

function getLast7Dates(): { date: string; short: string; weekday: string; isToday: boolean }[] {
  const result: { date: string; short: string; weekday: string; isToday: boolean }[] = [];
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    result.push({
      date: `${yyyy}-${mm}-${dd}`,
      short: `${mm}/${dd}`,
      weekday: i === 0 ? "今天" : weekdays[d.getDay()],
      isToday: i === 0,
    });
  }
  return result;
}

export function StatsChart({ days }: StatsChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const byDate = new Map(days.map((d) => [d.date, d]));

  const last7 = getLast7Dates().map((meta) => {
    const entry = byDate.get(meta.date);
    return {
      ...meta,
      completed: entry?.completedBreaks ?? 0,
      skipped: entry?.skippedBreaks ?? 0,
      focusMins: Math.round((entry?.focusSeconds ?? 0) / 60),
    };
  });

  const maxBreaks = Math.max(4, ...last7.map((d) => d.completed + d.skipped));
  const activeItem = hoveredIdx !== null ? last7[hoveredIdx] : last7[last7.length - 1];

  return (
    <div className="w-full space-y-4">
      {/* Live detail bar */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl text-xs"
        style={{ backgroundColor: "var(--bg-subtle)" }}
      >
        <div className="font-semibold">
          {activeItem.weekday}（{activeItem.short}）
        </div>
        <div className="flex items-center gap-4 tabular-nums" style={{ color: "var(--text-secondary)" }}>
          <span>
            用眼 <strong style={{ color: "var(--text-primary)" }}>{activeItem.focusMins}</strong> 分钟
          </span>
          <span>
            完成休息 <strong className="text-emerald-600 dark:text-emerald-400">{activeItem.completed}</strong> 次
          </span>
          <span>
            跳过 <strong className="text-amber-500">{activeItem.skipped}</strong> 次
          </span>
        </div>
      </div>

      {/* Bar chart area with subtle horizontal gridlines */}
      <div className="relative pt-4 pb-1 px-2">
        <div className="pointer-events-none absolute inset-x-2 top-4 bottom-8 flex flex-col justify-between">
          {[0, 1, 2].map((line) => (
            <div
              key={line}
              className="w-full border-t border-dashed"
              style={{ borderColor: "var(--border-soft)" }}
            />
          ))}
        </div>

        <div className="relative z-10 flex items-end justify-between gap-3 h-44">
          {last7.map((item, idx) => {
            const total = item.completed + item.skipped;
            const completedPct = (item.completed / maxBreaks) * 100;
            const skippedPct = (item.skipped / maxBreaks) * 100;
            const isActive = hoveredIdx === idx || (hoveredIdx === null && item.isToday);

            return (
              <div
                key={item.date}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer"
              >
                <div
                  className="text-[11px] mb-1.5 font-semibold tabular-nums transition-opacity"
                  style={{
                    color: isActive ? "var(--accent)" : "var(--text-muted)",
                    opacity: total > 0 || isActive ? 1 : 0.45,
                  }}
                >
                  {total > 0 ? `${item.completed}` : "0"}
                </div>

                <div
                  className="w-full max-w-[34px] h-28 flex flex-col justify-end rounded-xl overflow-hidden transition-transform duration-200"
                  style={{
                    backgroundColor: "var(--bg-subtle)",
                    transform: isActive ? "scaleY(1.03)" : "scaleY(1)",
                    boxShadow: isActive ? "0 6px 16px -6px rgba(16,185,129,0.35)" : "none",
                  }}
                >
                  {item.skipped > 0 && (
                    <div
                      className="w-full bg-gradient-to-t from-amber-400 to-amber-300 transition-all duration-500"
                      style={{ height: `${Math.max(5, skippedPct)}%` }}
                    />
                  )}
                  {item.completed > 0 && (
                    <div
                      className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 transition-all duration-500"
                      style={{ height: `${Math.max(8, completedPct)}%` }}
                    />
                  )}
                </div>

                <div
                  className="text-[11px] mt-2 font-medium"
                  style={{
                    color: item.isToday ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  {item.weekday}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div
        className="flex items-center justify-end gap-5 text-[11px] font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 inline-block" />
          按时完成休息
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
          跳过休息
        </span>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Check, Eye, Maximize2, SkipForward, Timer } from "lucide-react";
import { api, formatMMSS } from "../lib/tauri";
import { getEyeCareTip } from "../lib/tips";
import type { AppConfig, TimerSnapshot } from "../types";

export function ReminderPopup() {
  const [snapshot, setSnapshot] = useState<TimerSnapshot | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    void Promise.all([api.getState(), api.getConfig()]).then(([snap, cfg]) => {
      setSnapshot(snap);
      setConfig(cfg);
    });

    const unsubState = api.onTimerState((snap) => setSnapshot(snap));
    const unsubCfg = api.onConfigUpdated((cfg) => setConfig(cfg));

    return () => {
      void unsubState.then((fn) => fn());
      void unsubCfg.then((fn) => fn());
    };
  }, []);

  if (!snapshot || !config) {
    return (
      <div className="w-full h-full p-2.5 flex items-center justify-center">
        <div className="w-full h-full rounded-3xl bg-[#0e221d]/95 text-emerald-50 border border-emerald-400/25 shadow-2xl p-4 flex items-center justify-center text-xs">
          正在加载护眼提醒…
        </div>
      </div>
    );
  }

  const tip = getEyeCareTip(snapshot.tipIndex);
  const pct = Math.min(
    100,
    Math.max(0, (snapshot.remainingSeconds / Math.max(1, snapshot.totalSeconds)) * 100)
  );

  return (
    <div className="w-full h-full p-2.5 flex items-center justify-center">
      <div
        className="w-full h-full rounded-3xl text-emerald-50 border border-emerald-300/25 shadow-2xl p-4 flex flex-col justify-between animate-float-in backdrop-blur-xl relative overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, rgba(16, 42, 35, 0.96) 0%, rgba(10, 26, 22, 0.97) 100%)",
        }}
      >
        {/* Soft corner glow */}
        <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-400/18 blur-2xl" />

        {/* Header Row */}
        <div className="relative z-10 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400/30 to-teal-500/20 border border-emerald-300/25 text-emerald-300 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight flex items-center gap-1.5">
                <span>护眼休息时间到</span>
                {snapshot.isPreview && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-200 font-semibold">
                    预览
                  </span>
                )}
              </div>
              <div className="text-[11px] text-emerald-200/70 mt-0.5">
                {snapshot.activePreset.name}
              </div>
            </div>
          </div>

          <div className="text-2xl font-bold tabular-nums text-emerald-300 tracking-tight">
            {formatMMSS(snapshot.remainingSeconds)}
          </div>
        </div>

        {/* Tip */}
        {config.enableEyeTips ? (
          <div className="relative z-10 rounded-2xl bg-white/[0.06] border border-white/10 px-3.5 py-2.5">
            <div className="text-xs font-semibold text-emerald-300">
              {tip.title}
            </div>
            <p className="text-[11px] text-emerald-100/80 mt-0.5 leading-relaxed line-clamp-2">
              {tip.detail}
            </p>
          </div>
        ) : (
          <div className="relative z-10 text-xs text-emerald-100/80">
            请将视线离开屏幕，远眺片刻并轻缓眨眼。
          </div>
        )}

        {/* Progress Bar */}
        <div className="relative z-10 w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-700 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Actions */}
        <div className="relative z-10 flex items-center justify-between gap-2 pt-0.5">
          <button
            onClick={() => void api.expandBreakToOverlay()}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/18 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="切换为全屏沉浸遮罩"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            全屏休息
          </button>

          <div className="flex items-center gap-1.5">
            {(config.allowPostpone || snapshot.isPreview) && (
              <button
                onClick={() => void api.postponeBreak()}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/18 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Timer className="w-3.5 h-3.5" />
                +{config.postponeMinutes}分
              </button>
            )}
            {(config.allowSkip || snapshot.isPreview) && (
              <button
                onClick={() => void api.skipBreak()}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/18 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" />
                {snapshot.isPreview ? "退出" : "跳过"}
              </button>
            )}
            <button
              onClick={() => void api.completeBreak()}
              className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

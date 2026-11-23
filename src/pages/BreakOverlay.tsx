import { useEffect, useState } from "react";
import { Eye, SkipForward, Timer, Wind, X } from "lucide-react";
import { api, formatMMSS } from "../lib/tauri";
import { getEyeCareTip } from "../lib/tips";
import type { AppConfig, TimerSnapshot } from "../types";

interface BreakOverlayProps {
  isPrimary: boolean;
}

export function BreakOverlay({ isPrimary }: BreakOverlayProps) {
  const [snapshot, setSnapshot] = useState<TimerSnapshot | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [inhale, setInhale] = useState(true);

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

  // Synchronized 4s inhale / 4s exhale cue matching the 8s breathe animation
  useEffect(() => {
    const timer = setInterval(() => setInhale((prev) => !prev), 4000);
    return () => clearInterval(timer);
  }, []);

  // Esc shortcut closes preview or skippable break immediately
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!snapshot || !config || snapshot.isPreview) {
        void api.completeBreak();
      } else if (config.allowSkip) {
        void api.skipBreak();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [snapshot, config]);

  if (!snapshot || !config) {
    return (
      <div
        className="w-screen h-screen flex flex-col items-center justify-center text-emerald-50 select-none"
        style={{ backgroundColor: "rgba(8, 26, 22, 0.92)" }}
      >
        <div className="text-sm text-emerald-200/80 mb-4">正在准备静谧护眼空间…</div>
        {isPrimary && (
          <button
            onClick={() => void api.completeBreak()}
            className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-xs font-medium cursor-pointer"
          >
            关闭 (Esc)
          </button>
        )}
      </div>
    );
  }

  const tip = getEyeCareTip(snapshot.tipIndex);
  const opacity = Math.min(0.96, Math.max(0.6, config.overlayOpacity));
  const pct = Math.min(
    100,
    Math.max(0, (snapshot.remainingSeconds / Math.max(1, snapshot.totalSeconds)) * 100)
  );

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center text-emerald-50 relative overflow-hidden select-none backdrop-blur-2xl"
      style={{
        background: `radial-gradient(circle at 50% 34%, rgba(18, 92, 72, ${opacity}), rgba(6, 20, 17, ${Math.min(
          0.98,
          opacity + 0.06
        )}) 78%)`,
      }}
    >
      {/* Layered botanical ambient aura */}
      <div className="pointer-events-none absolute w-[540px] h-[540px] rounded-full bg-emerald-400/14 blur-3xl animate-breathe" />
      <div
        className="pointer-events-none absolute w-[350px] h-[350px] rounded-full border border-emerald-200/15 animate-breathe"
        style={{ animationDelay: "0.35s" }}
      />
      <div className="pointer-events-none absolute w-[240px] h-[240px] rounded-full border border-teal-200/20 animate-breathe" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-xl px-8 animate-float-in">
        {/* Top pill badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.08] border border-white/15 text-xs font-medium text-emerald-100/90 mb-5 backdrop-blur-md">
          <Eye className="w-3.5 h-3.5 text-emerald-300" />
          <span>
            {snapshot.isPreview
              ? "全屏护眼遮罩预览 · 按 Esc 或下方按钮退出"
              : `护眼休息中 · ${snapshot.activePreset.name}`}
          </span>
        </div>

        {/* Breathing rhythm cue */}
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300/85 mb-3 transition-opacity duration-700">
          <Wind className="w-3.5 h-3.5" />
          <span>{inhale ? "跟随光环 · 缓慢吸气…" : "放松双肩 · 轻柔呼气…"}</span>
        </div>

        {/* Crisp large countdown */}
        <div className="text-7xl md:text-[88px] font-bold leading-none tracking-tight tabular-nums text-white drop-shadow-[0_6px_24px_rgba(16,185,129,0.28)]">
          {formatMMSS(snapshot.remainingSeconds)}
        </div>

        {/* Progress bar */}
        <div className="w-72 h-1.5 rounded-full bg-white/15 overflow-hidden mt-7 mb-8">
          <div
            className="h-full bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 transition-all duration-700 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Frosted Guidance Tip Card */}
        {config.enableEyeTips ? (
          <div className="rounded-3xl bg-white/[0.07] border border-white/12 px-7 py-5 backdrop-blur-md max-w-md space-y-2 shadow-2xl">
            <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/90 font-semibold">
              {tip.category}
            </div>
            <h2 className="text-xl font-semibold text-white">{tip.title}</h2>
            <p className="text-xs text-emerald-100/80 leading-relaxed">
              {tip.detail}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold text-white">请闭目养神或眺望远方</h2>
            <p className="text-sm text-emerald-100/75">
              倒计时结束后将自动柔和恢复桌面
            </p>
          </div>
        )}

        {/* Controls (primary monitor only) */}
        {isPrimary && (
          <div className="flex flex-wrap items-center justify-center gap-3 mt-9">
            {snapshot.isPreview ? (
              <button
                onClick={() => void api.completeBreak()}
                className="px-6 py-2.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/25"
              >
                <X className="w-4 h-4" />
                退出预览 (Esc)
              </button>
            ) : (
              <>
                {config.allowPostpone && (
                  <button
                    onClick={() => void api.postponeBreak()}
                    className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-medium flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md"
                  >
                    <Timer className="w-4 h-4" />
                    推迟 {config.postponeMinutes} 分钟
                  </button>
                )}

                {config.allowSkip && (
                  <button
                    onClick={() => void api.skipBreak()}
                    className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-medium flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md"
                  >
                    <SkipForward className="w-4 h-4" />
                    跳过本次休息 (Esc)
                  </button>
                )}

                {!config.allowSkip && !config.allowPostpone && (
                  <div className="text-xs text-emerald-200/70 px-4 py-2 rounded-full bg-white/[0.06] border border-white/10">
                    严格护眼模式已开启 · 请安心放松片刻
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

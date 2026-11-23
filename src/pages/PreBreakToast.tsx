import { useEffect, useState } from "react";
import { Eye, Timer } from "lucide-react";
import { api } from "../lib/tauri";
import type { AppConfig, TimerSnapshot } from "../types";

export function PreBreakToast() {
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

  if (!snapshot || !config) return null;

  return (
    <div className="w-full h-full p-2 flex items-center justify-center">
      <div
        className="w-full h-full rounded-2xl text-emerald-50 border border-emerald-300/25 shadow-2xl px-4 flex items-center justify-between gap-3 animate-float-in backdrop-blur-xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(16, 42, 35, 0.96) 0%, rgba(10, 26, 22, 0.97) 100%)",
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-300/25 text-amber-300 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="text-xs font-semibold">
              <span className="text-amber-300 tabular-nums font-bold">
                {snapshot.remainingSeconds} 秒
              </span>{" "}
              后开始护眼休息
            </div>
            <div className="text-[11px] text-emerald-200/70 truncate">
              请保存手头工作，准备远眺放松
            </div>
          </div>
        </div>

        {config.allowPostpone && (
          <button
            onClick={() => void api.postponeBreak()}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Timer className="w-3.5 h-3.5" />
            +{config.postponeMinutes}分
          </button>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Sidebar, type NavTab } from "./components/Sidebar";
import { playEyeCareCue } from "./lib/sound";
import { api } from "./lib/tauri";
import { Dashboard } from "./pages/Dashboard";
import { Presets } from "./pages/Presets";
import { Settings } from "./pages/Settings";
import { Statistics } from "./pages/Statistics";
import type { AppConfig, ThemeMode, TimerSnapshot } from "./types";

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
}

export function App() {
  const [tab, setTab] = useState<NavTab>("dashboard");
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [snapshot, setSnapshot] = useState<TimerSnapshot | null>(null);

  useEffect(() => {
    void Promise.all([api.getConfig(), api.getState()]).then(([cfg, snap]) => {
      setConfig(cfg);
      setSnapshot(snap);
      applyTheme(cfg.theme);
    });

    const unsubState = api.onTimerState((snap) => setSnapshot(snap));
    const unsubCfg = api.onConfigUpdated((cfg) => {
      setConfig(cfg);
      applyTheme(cfg.theme);
    });
    const unsubAudio = api.onAudioCue((payload) => {
      playEyeCareCue(payload.cue, payload.volume, payload.preset);
    });

    return () => {
      void unsubState.then((fn) => fn());
      void unsubCfg.then((fn) => fn());
      void unsubAudio.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (!config || config.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme("system");
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [config?.theme]);

  if (!config || !snapshot) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-sm opacity-75">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
        <span>正在唤醒明眸护眼…</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <Sidebar
        activeTab={tab}
        onSelect={setTab}
        snapshot={snapshot}
        autoStart={config.autoStart}
        closeToTray={config.closeToTray}
      />

      <main className="flex-1 overflow-y-auto px-8 py-7">
        <div className="animate-float-in">
          {tab === "dashboard" && (
            <Dashboard
              snapshot={snapshot}
              config={config}
              onConfigChange={setConfig}
            />
          )}
          {tab === "presets" && (
            <Presets config={config} onConfigChange={setConfig} />
          )}
          {tab === "stats" && <Statistics config={config} snapshot={snapshot} />}
          {tab === "settings" && (
            <Settings config={config} onConfigChange={setConfig} />
          )}
        </div>
      </main>
    </div>
  );
}

import { formatMMSS } from "../lib/tauri";
import type { TimerPhase } from "../types";

interface CountdownRingProps {
  remainingSeconds: number;
  totalSeconds: number;
  phase: TimerPhase;
  presetName: string;
}

const PHASE_SUBTITLE: Record<TimerPhase, string> = {
  focusing: "距离下次护眼休息",
  pre_break: "即将进入护眼休息",
  on_break: "放松双眼 · 远眺片刻",
  paused: "已手动暂停计时",
  idle_paused: "检测到离开 · 自动暂停",
  dnd_deferred: "免打扰中 · 稍后自动提醒",
};

const TICKS = Array.from({ length: 60 }, (_, i) => i);

export function CountdownRing({
  remainingSeconds,
  totalSeconds,
  phase,
  presetName,
}: CountdownRingProps) {
  const size = 276;
  const center = size / 2;
  const strokeWidth = 10;
  const radius = 114;
  const circumference = 2 * Math.PI * radius;

  const safeTotal = Math.max(1, totalSeconds);
  const progress = Math.min(1, Math.max(0, remainingSeconds / safeTotal));
  const dashOffset = circumference * (1 - progress);

  // Leading glowing dot position along the arc
  const angleRad = (-90 + progress * 360) * (Math.PI / 180);
  const dotX = center + radius * Math.cos(angleRad);
  const dotY = center + radius * Math.sin(angleRad);

  const gradColors: [string, string] =
    phase === "on_break"
      ? ["#2dd4bf", "#0d9488"]
      : phase === "pre_break"
        ? ["#fbbf24", "#f59e0b"]
        : phase === "paused" || phase === "idle_paused"
          ? ["#94a3b8", "#64748b"]
          : phase === "dnd_deferred"
            ? ["#a78bfa", "#7c3aed"]
            : ["#34d399", "#0f8a64"];

  const haloBg =
    phase === "pre_break"
      ? "rgba(245, 158, 11, 0.14)"
      : phase === "dnd_deferred"
        ? "rgba(139, 92, 246, 0.14)"
        : phase === "paused" || phase === "idle_paused"
          ? "rgba(148, 163, 184, 0.1)"
          : "rgba(16, 185, 129, 0.15)";

  return (
    <div className="relative flex items-center justify-center w-[276px] h-[276px]">
      {/* Soft breathing ambient aura behind the dial */}
      <div
        className="absolute w-52 h-52 rounded-full blur-2xl pointer-events-none animate-soft-halo"
        style={{ background: haloBg }}
      />

      <svg width={size} height={size} className="relative z-10 overflow-visible">
        <defs>
          <linearGradient id="eyerestDialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradColors[0]} />
            <stop offset="100%" stopColor={gradColors[1]} />
          </linearGradient>
          <filter id="eyerestGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Precision inner tick marks */}
        {TICKS.map((tick) => {
          const isMajor = tick % 5 === 0;
          const rad = ((tick * 6 - 90) * Math.PI) / 180;
          const rOuter = radius - 14;
          const rInner = rOuter - (isMajor ? 6 : 3);
          return (
            <line
              key={tick}
              x1={center + rInner * Math.cos(rad)}
              y1={center + rInner * Math.sin(rad)}
              x2={center + rOuter * Math.cos(rad)}
              y2={center + rOuter * Math.sin(rad)}
              stroke="var(--text-muted)"
              strokeOpacity={isMajor ? 0.35 : 0.16}
              strokeWidth={isMajor ? 1.5 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {/* Track circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={strokeWidth}
          strokeOpacity={0.55}
        />

        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#eyerestDialGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />

        {/* Leading luminous dot */}
        {progress > 0.01 && (
          <circle
            cx={dotX}
            cy={dotY}
            r={5.5}
            fill={gradColors[0]}
            stroke="var(--bg-surface-solid)"
            strokeWidth={2}
            filter="url(#eyerestGlow)"
            className="transition-all duration-700 ease-out"
          />
        )}
      </svg>

      {/* Center Readout */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-8">
        <span
          className="text-[11px] font-semibold px-3 py-1 rounded-full mb-2.5 border"
          style={{
            backgroundColor: "var(--accent-soft)",
            borderColor: "var(--border-soft)",
            color: "var(--accent)",
          }}
        >
          {presetName}
        </span>

        <div className="text-[52px] font-bold leading-none tracking-tight tabular-nums">
          {formatMMSS(remainingSeconds)}
        </div>

        <div
          className="text-xs font-medium mt-3 leading-snug max-w-[165px]"
          style={{ color: "var(--text-secondary)" }}
        >
          {PHASE_SUBTITLE[phase]}
        </div>
      </div>
    </div>
  );
}

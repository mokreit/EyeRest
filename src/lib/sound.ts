import type { SoundPresetId } from "../types";

export interface SoundPresetMeta {
  id: SoundPresetId;
  name: string;
  tagline: string;
  badge: string;
}

export const SOUND_PRESETS: SoundPresetMeta[] = [
  {
    id: "chime",
    name: "晨露风铃",
    tagline: "清脆空灵的五声音阶风铃，温柔唤醒",
    badge: "经典",
  },
  {
    id: "singing_bowl",
    name: "禅意颂钵",
    tagline: "温暖深沉的铜钵泛音共鸣，舒缓减压",
    badge: "冥想",
  },
  {
    id: "water_drop",
    name: "林间水滴",
    tagline: "清澈自然的水滴落涧回响，轻盈自然",
    badge: "自然",
  },
  {
    id: "kalimba",
    name: "暖木拇指琴",
    tagline: "轻快圆润的木质弹拨音色，治愈愉悦",
    badge: "温暖",
  },
  {
    id: "piano",
    name: "柔光钢琴",
    tagline: "柔和的大七度柔光和弦，优雅不突兀",
    badge: "办公",
  },
  {
    id: "zen_bell",
    name: "清心铃磬",
    tagline: "极简清透的单音余韵，尽量不打扰思路",
    badge: "极简",
  },
];

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedCtx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      sharedCtx = new Ctx();
    }
    if (sharedCtx.state === "suspended") {
      void sharedCtx.resume();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

function playFilteredTone(
  ctx: AudioContext,
  opts: {
    freq: number;
    endFreq?: number;
    startOffset: number;
    attack?: number;
    duration: number;
    peakGain: number;
    type?: OscillatorType;
    harmonicRatio?: number;
    harmonicLevel?: number;
    lowpassHz?: number;
    detuneCents?: number;
  }
) {
  const now = ctx.currentTime + opts.startOffset;
  const attack = opts.attack ?? 0.035;

  const osc = ctx.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, now);
  if (opts.endFreq) {
    osc.frequency.exponentialRampToValueAtTime(opts.endFreq, now + opts.duration * 0.65);
  }
  if (opts.detuneCents) {
    osc.detune.setValueAtTime(opts.detuneCents, now);
  }

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(opts.lowpassHz ?? 3400, now);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(Math.max(0.001, opts.peakGain), now + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration);

  osc.connect(filter);
  filter.connect(env);
  env.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + opts.duration + 0.05);

  if (opts.harmonicRatio && opts.harmonicLevel) {
    const harm = ctx.createOscillator();
    harm.type = "sine";
    harm.frequency.setValueAtTime(opts.freq * opts.harmonicRatio, now);
    const hGain = ctx.createGain();
    hGain.gain.setValueAtTime(0.0001, now);
    hGain.gain.exponentialRampToValueAtTime(
      Math.max(0.0005, opts.peakGain * opts.harmonicLevel),
      now + attack * 0.8
    );
    hGain.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration * 0.8);
    harm.connect(filter);
    harm.connect(hGain);
    hGain.connect(ctx.destination);
    harm.start(now);
    harm.stop(now + opts.duration + 0.05);
  }
}

function playChime(ctx: AudioContext, cue: string, gain: number) {
  if (cue === "pre_break") {
    playFilteredTone(ctx, { freq: 659.25, startOffset: 0, duration: 0.85, peakGain: gain * 0.7, harmonicRatio: 2, harmonicLevel: 0.14 });
  } else if (cue === "break_end") {
    playFilteredTone(ctx, { freq: 783.99, startOffset: 0, duration: 0.95, peakGain: gain * 0.72, harmonicRatio: 2, harmonicLevel: 0.14 });
    playFilteredTone(ctx, { freq: 1046.5, startOffset: 0.16, duration: 1.35, peakGain: gain * 0.8, harmonicRatio: 2, harmonicLevel: 0.12 });
  } else {
    playFilteredTone(ctx, { freq: 523.25, startOffset: 0, duration: 1.25, peakGain: gain * 0.78, harmonicRatio: 2, harmonicLevel: 0.15 });
    playFilteredTone(ctx, { freq: 659.25, startOffset: 0.16, duration: 1.35, peakGain: gain * 0.82, harmonicRatio: 2, harmonicLevel: 0.14 });
    playFilteredTone(ctx, { freq: 783.99, startOffset: 0.34, duration: 1.65, peakGain: gain * 0.88, harmonicRatio: 2, harmonicLevel: 0.12 });
  }
}

function playSingingBowl(ctx: AudioContext, cue: string, gain: number) {
  const base = cue === "break_end" ? 396 : cue === "pre_break" ? 329.63 : 264;
  const dur = cue === "pre_break" ? 1.4 : 2.6;
  // Warm dual-detuned singing bowl shimmer
  playFilteredTone(ctx, { freq: base, startOffset: 0, attack: 0.09, duration: dur, peakGain: gain * 0.85, lowpassHz: 1800 });
  playFilteredTone(ctx, { freq: base, detuneCents: 6, startOffset: 0.01, attack: 0.11, duration: dur * 0.95, peakGain: gain * 0.5, lowpassHz: 1800 });
  playFilteredTone(ctx, { freq: base * 2.756, startOffset: 0, attack: 0.04, duration: dur * 0.65, peakGain: gain * 0.22, lowpassHz: 2400 });
}

function playWaterDrop(ctx: AudioContext, cue: string, gain: number) {
  const drops =
    cue === "pre_break"
      ? [{ f1: 420, f2: 880, t: 0 }]
      : cue === "break_end"
        ? [
            { f1: 520, f2: 1080, t: 0 },
            { f1: 680, f2: 1360, t: 0.18 },
          ]
        : [
            { f1: 390, f2: 860, t: 0 },
            { f1: 500, f2: 1040, t: 0.19 },
            { f1: 620, f2: 1240, t: 0.38 },
          ];

  for (const d of drops) {
    playFilteredTone(ctx, {
      freq: d.f1,
      endFreq: d.f2,
      startOffset: d.t,
      attack: 0.012,
      duration: 0.34,
      peakGain: gain * 0.85,
      lowpassHz: 2800,
    });
    // Soft echo ripple
    playFilteredTone(ctx, {
      freq: d.f2 * 0.95,
      startOffset: d.t + 0.12,
      attack: 0.02,
      duration: 0.45,
      peakGain: gain * 0.22,
      lowpassHz: 2000,
    });
  }
}

function playKalimba(ctx: AudioContext, cue: string, gain: number) {
  const notes =
    cue === "pre_break"
      ? [440, 587.33]
      : cue === "break_end"
        ? [587.33, 739.99, 880]
        : [392, 493.88, 587.33, 783.99];

  notes.forEach((freq, idx) => {
    playFilteredTone(ctx, {
      freq,
      startOffset: idx * 0.13,
      attack: 0.008,
      duration: 0.95,
      peakGain: gain * 0.78,
      type: "triangle",
      harmonicRatio: 3,
      harmonicLevel: 0.08,
      lowpassHz: 2200,
    });
  });
}

function playPiano(ctx: AudioContext, cue: string, gain: number) {
  // Warm Fmaj7 / Cmaj7 mellow electric piano pad
  const chord =
    cue === "pre_break"
      ? [349.23, 523.25]
      : cue === "break_end"
        ? [392.0, 493.88, 587.33, 783.99]
        : [261.63, 329.63, 392.0, 493.88];

  chord.forEach((freq, idx) => {
    playFilteredTone(ctx, {
      freq,
      startOffset: idx * 0.07,
      attack: 0.025,
      duration: 1.75,
      peakGain: gain * 0.52,
      type: "triangle",
      harmonicRatio: 2,
      harmonicLevel: 0.12,
      lowpassHz: 1900,
    });
  });
}

function playZenBell(ctx: AudioContext, cue: string, gain: number) {
  const freq = cue === "break_end" ? 987.77 : cue === "pre_break" ? 740.0 : 880.0;
  playFilteredTone(ctx, {
    freq,
    startOffset: 0,
    attack: 0.01,
    duration: 1.9,
    peakGain: gain * 0.72,
    harmonicRatio: 2.003,
    harmonicLevel: 0.18,
    lowpassHz: 3200,
  });
}

export function playEyeCareCue(
  cue: string,
  volume = 0.55,
  preset: SoundPresetId | string = "chime"
) {
  const ctx = getAudioContext();
  if (!ctx || volume <= 0.01) return;
  const gain = Math.min(0.42, Math.max(0.02, volume * 0.4));

  switch (preset) {
    case "singing_bowl":
      playSingingBowl(ctx, cue, gain);
      break;
    case "water_drop":
      playWaterDrop(ctx, cue, gain);
      break;
    case "kalimba":
      playKalimba(ctx, cue, gain);
      break;
    case "piano":
      playPiano(ctx, cue, gain);
      break;
    case "zen_bell":
      playZenBell(ctx, cue, gain);
      break;
    default:
      playChime(ctx, cue, gain);
      break;
  }
}

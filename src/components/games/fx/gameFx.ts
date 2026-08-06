"use client";
/**
 * Shared game "juice": tiny synthesized sound effects + mobile haptics, gated by a
 * single per-device toggle (OFF by default, persisted in localStorage). No audio
 * assets — every SFX is generated with the Web Audio API, so it adds zero bytes and
 * works offline. Every game reads the flag through the same external store, so the
 * SoundToggle flips it everywhere at once.
 */
import { useCallback, useSyncExternalStore } from "react";

export type Sfx = "click" | "flip" | "correct" | "wrong" | "reveal" | "win" | "lose";
export type Haptic = "light" | "medium" | "success" | "error" | "flip";

const SFX_KEY = "fab-game-sfx";

// ── enabled flag (shared external store) ─────────────────────────────────────
let enabled = false;
if (typeof window !== "undefined") {
  try {
    enabled = localStorage.getItem(SFX_KEY) === "1";
  } catch {
    /* private mode / blocked storage */
  }
}
const subs = new Set<() => void>();
function subscribe(cb: () => void) {
  subs.add(cb);
  return () => subs.delete(cb);
}
const getSnapshot = () => enabled;
const getServerSnapshot = () => false;

export function setSfxEnabled(v: boolean) {
  enabled = v;
  try {
    localStorage.setItem(SFX_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (v) unlockAudio(); // toggling on is a user gesture — prime the context now
  subs.forEach((cb) => cb());
}

// ── Web Audio synth ──────────────────────────────────────────────────────────
let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}
/** Create/resume the context inside a user gesture so the first sound isn't blocked. */
export function unlockAudio() {
  audio();
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", when = 0, gain = 0.11) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

const PLAY: Record<Sfx, () => void> = {
  click: () => tone(300, 0.06, "triangle", 0, 0.07),
  flip: () => {
    tone(440, 0.06, "sine", 0, 0.08);
    tone(640, 0.06, "sine", 0.04, 0.07);
  },
  reveal: () => tone(560, 0.07, "triangle", 0, 0.08),
  correct: () => {
    tone(560, 0.09, "sine", 0, 0.1);
    tone(760, 0.11, "sine", 0.07, 0.1);
  },
  wrong: () => tone(150, 0.22, "sawtooth", 0, 0.08),
  win: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.17, "sine", i * 0.09, 0.12)),
  lose: () => [392, 311, 233].forEach((f, i) => tone(f, 0.24, "sine", i * 0.12, 0.09)),
};

const HAPTIC: Record<Haptic, number | number[]> = {
  light: 10,
  medium: 22,
  flip: 8,
  success: [14, 40, 16],
  error: [30, 30, 30],
};

/**
 * Game effects. `play` / `haptic` are no-ops unless the player enabled sound.
 * `enabled` / `setEnabled` back the SoundToggle. Everything is SSG-safe (server
 * snapshot is always OFF; localStorage is read only on the client).
 */
export function useGameFx() {
  const on = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const play = useCallback((s: Sfx) => {
    if (getSnapshot()) PLAY[s]?.();
  }, []);
  const haptic = useCallback((h: Haptic = "light") => {
    if (getSnapshot() && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(HAPTIC[h]);
      } catch {
        /* unsupported */
      }
    }
  }, []);
  return { enabled: on, setEnabled: setSfxEnabled, play, haptic };
}

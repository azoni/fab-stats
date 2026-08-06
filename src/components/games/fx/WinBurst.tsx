"use client";
/**
 * A one-shot celebration confetti burst for a game win. Pure CSS (see
 * .game-confetti-piece in globals.css), deterministic layout (no Math.random →
 * SSG-safe), and silent under prefers-reduced-motion. Mount it when the player
 * wins; it plays once and idles.
 */
const COLORS = ["var(--color-fab-gold)", "#38d3b1", "#f472b6", "#38bdf8", "#a78bfa", "#fb923c", "#facc15"];

export function WinBurst({ count = 26, className = "" }: { count?: number; className?: string }) {
  const pieces = Array.from({ length: count }, (_, i) => {
    const left = (i * 61) % 100; // spread across the width, deterministically
    const dx = ((i * 37) % 60) - 30; // -30..30px horizontal drift
    const fall = 180 + ((i * 53) % 220); // 180..400px
    const spin = 240 + ((i * 97) % 420);
    const delay = ((i * 29) % 45) / 100; // 0..0.45s
    const dur = 1.2 + ((i * 17) % 90) / 100; // 1.2..2.1s
    const w = 5 + (i % 3) * 3;
    const color = COLORS[i % COLORS.length];
    const round = i % 4 === 0;
    return { i, left, dx, fall, spin, delay, dur, w, color, round };
  });
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 z-20 overflow-hidden ${className}`}>
      {pieces.map((p) => (
        <span
          key={p.i}
          className="game-confetti-piece absolute -top-2"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.round ? p.w : p.w + 4,
            background: p.color,
            borderRadius: p.round ? "9999px" : "1px",
            ["--dx" as string]: `${p.dx}px`,
            ["--fall" as string]: `${p.fall}px`,
            ["--spin" as string]: `${p.spin}deg`,
            ["--delay" as string]: `${p.delay}s`,
            ["--dur" as string]: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

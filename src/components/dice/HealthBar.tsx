"use client";
import "./dice.css";

interface HealthBarProps {
  current: number;
  max: number;
  label?: string;
  /** When true, bar fills up to show damage dealt (higher = better) */
  invert?: boolean;
}

export function HealthBar({ current, max, label, invert }: HealthBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const isLow = !invert && pct <= 25;

  return (
    <div className="w-full">
      {label && (
        <p className="text-xs text-red-400/60 mb-0.5">{label}</p>
      )}
      <div className="relative h-7 bg-red-950 rounded-full overflow-hidden border border-red-900/40">
        <div
          className={`h-full rounded-full ${
            isLow
              ? "bg-gradient-to-r from-red-600 to-red-500 animate-hp-pulse"
              : "bg-gradient-to-r from-red-600 to-red-500"
          }`}
          style={{ width: `${pct}%`, transition: "width 0.6s ease-out" }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-red-100">
          {invert ? `DMG: ${current}/${max}` : `HP: ${current}/${max}`}
        </span>
      </div>
    </div>
  );
}

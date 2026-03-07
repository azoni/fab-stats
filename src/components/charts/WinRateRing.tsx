"use client";

interface WinRateRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  className?: string;
}

export function WinRateRing({
  value,
  size = 48,
  strokeWidth = 4,
  color,
  label,
  className = "",
}: WinRateRingProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const fillColor = color ?? (clamped >= 50 ? "var(--color-fab-win)" : "var(--color-fab-loss)");

  // Scale font based on size
  const fontSize = size <= 32 ? 9 : size <= 48 ? 11 : 14;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-fab-border)"
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span
        className="absolute font-bold tabular-nums text-fab-text"
        style={{ fontSize }}
      >
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}

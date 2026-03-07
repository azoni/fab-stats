"use client";

export const DONUT_COLORS = [
  "#c9a84c", "#60a5fa", "#f87171", "#34d399", "#a78bfa",
  "#fb923c", "#22d3ee", "#f472b6", "#facc15", "#818cf8",
  "#4ade80", "#e879f9", "#2dd4bf", "#fca5a5", "#93c5fd",
];

export interface DonutSegment {
  value: number;
  color: string;
  label?: string;
}

interface MiniDonutProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: React.ReactNode;
  className?: string;
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const sweep = Math.min(endAngle - startAngle, 359.99);
  const endA = startAngle + sweep;
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endA - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export function MiniDonut({
  segments,
  size = 64,
  strokeWidth = 8,
  centerLabel,
  className = "",
}: MiniDonutProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-fab-border)" strokeWidth={strokeWidth} />
        </svg>
        {centerLabel && (
          <span className="absolute text-fab-dim text-xs font-medium">{centerLabel}</span>
        )}
      </div>
    );
  }

  let currentAngle = 0;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-fab-border)" strokeWidth={strokeWidth} opacity={0.3} />
        {/* Segments */}
        {segments.map((seg, i) => {
          const pct = (seg.value / total) * 100;
          const sweep = (pct / 100) * 360;
          if (sweep < 0.5) { currentAngle += sweep; return null; }
          const path = describeArc(cx, cy, r, currentAngle, currentAngle + sweep);
          currentAngle += sweep;
          return (
            <path
              key={i}
              d={path}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      {centerLabel && (
        <span className="absolute flex flex-col items-center justify-center text-fab-text">
          {centerLabel}
        </span>
      )}
    </div>
  );
}

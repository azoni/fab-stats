interface SparkLineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDot?: boolean;
  className?: string;
}

export function SparkLine({
  data,
  width = 80,
  height = 24,
  color = "var(--color-fab-gold)",
  showDot = true,
  className = "",
}: SparkLineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const lastPoint = points[points.length - 1].split(",");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`shrink-0 ${className}`}
    >
      {/* Gradient fill */}
      <defs>
        <linearGradient id={`spark-grad-${width}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <polygon
        points={`${padding},${height - padding} ${points.join(" ")} ${width - padding},${height - padding}`}
        fill={`url(#spark-grad-${width})`}
      />
      {/* Line */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {showDot && (
        <circle
          cx={parseFloat(lastPoint[0])}
          cy={parseFloat(lastPoint[1])}
          r={2.5}
          fill={color}
        />
      )}
    </svg>
  );
}

interface BarSegment {
  value: number;
  color: string;
  label?: string;
}

interface SegmentedBarProps {
  segments: BarSegment[];
  height?: "sm" | "md" | "lg";
  showLabels?: boolean;
  className?: string;
}

const HEIGHT_MAP = { sm: "h-1.5", md: "h-3", lg: "h-5" };

export function SegmentedBar({
  segments,
  height = "sm",
  showLabels = false,
  className = "",
}: SegmentedBarProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  return (
    <div className={className}>
      {showLabels && (
        <div className="flex justify-between mb-1">
          {segments.map((seg, i) => (
            seg.value > 0 && (
              <span key={i} className="text-[10px] font-medium tabular-nums" style={{ color: seg.color }}>
                {seg.label ?? seg.value}
              </span>
            )
          ))}
        </div>
      )}
      <div className={`w-full ${HEIGHT_MAP[height]} bg-fab-bg rounded-full overflow-hidden flex`}>
        {segments.map((seg, i) => {
          const pct = (seg.value / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={i}
              className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
              style={{ width: `${pct}%`, backgroundColor: seg.color }}
            />
          );
        })}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  color?: string;
  chart?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  chart,
  className = "",
}: StatCardProps) {
  return (
    <div className={`bg-fab-surface border border-fab-border rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            {icon && <span className="text-fab-dim shrink-0">{icon}</span>}
            <p className="text-xs text-fab-muted truncate">{label}</p>
          </div>
          <p className="text-2xl font-bold tabular-nums" style={color ? { color } : undefined}>
            {value}
          </p>
          {sub && <p className="text-[10px] text-fab-dim mt-0.5">{sub}</p>}
        </div>
        {chart && <div className="shrink-0">{chart}</div>}
      </div>
    </div>
  );
}

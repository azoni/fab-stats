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
    <div className={`bg-fab-surface border border-fab-border rounded-lg px-3 py-2.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {icon && <span className="text-fab-dim shrink-0">{icon}</span>}
            <p className="text-[10px] text-fab-muted truncate">{label}</p>
          </div>
          <p className="text-lg font-bold tabular-nums leading-tight mt-0.5" style={color ? { color } : undefined}>
            {value}
          </p>
          {sub && <p className="text-[10px] text-fab-dim">{sub}</p>}
        </div>
        {chart && <div className="shrink-0">{chart}</div>}
      </div>
    </div>
  );
}

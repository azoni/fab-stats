import type { ReactNode } from "react";

interface PageHeroMetric {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}

interface PageHeroProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  metrics?: PageHeroMetric[];
  className?: string;
}

export function PageHero({
  eyebrow,
  title,
  description,
  icon,
  actions,
  metrics,
  className = "",
}: PageHeroProps) {
  return (
    <section className={`fab-page-hero rounded-lg border border-fab-border bg-fab-surface/95 p-5 sm:p-6 ${className}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            {icon && (
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-fab-border bg-fab-bg/80 text-fab-gold">
                {icon}
              </span>
            )}
            {eyebrow && (
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-fab-gold">
                {eyebrow}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-fab-text sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-fab-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {metrics && metrics.length > 0 && (
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <div key={index} className="fab-metric rounded-md border border-fab-border bg-fab-bg/70 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">{metric.label}</p>
              <p className="mt-1 text-lg font-black leading-none text-fab-text tabular-nums">{metric.value}</p>
              {metric.sub && <p className="mt-1 text-[11px] text-fab-muted">{metric.sub}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface MetricTileProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function MetricTile({ label, value, sub, icon, className = "" }: MetricTileProps) {
  return (
    <div className={`fab-metric rounded-lg border border-fab-border bg-fab-surface/95 px-3 py-2.5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-fab-muted">{label}</p>
          <p className="mt-1 text-xl font-black leading-none text-fab-text tabular-nums">{value}</p>
          {sub && <p className="mt-1 text-[11px] text-fab-dim">{sub}</p>}
        </div>
        {icon && <span className="shrink-0 text-fab-gold/80">{icon}</span>}
      </div>
    </div>
  );
}

interface FilterToolbarProps {
  children: ReactNode;
  className?: string;
}

export function FilterToolbar({ children, className = "" }: FilterToolbarProps) {
  return (
    <div className={`fab-filter-toolbar rounded-lg border border-fab-border bg-fab-surface/90 p-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

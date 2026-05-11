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
  const metricCols = (() => {
    if (!metrics?.length) return "";
    if (metrics.length === 1) return "grid-cols-1";
    if (metrics.length === 2) return "grid-cols-2";
    if (metrics.length === 3) return "grid-cols-3";
    return "grid-cols-2 lg:grid-cols-4";
  })();

  return (
    <section className={`fab-page-hero rounded-lg border border-fab-border bg-fab-surface/95 p-3 sm:p-4 ${className}`}>
      <div className="flex flex-col gap-2.5 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2 sm:mb-2">
            {icon && (
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-fab-border bg-fab-bg/80 text-fab-gold sm:h-8 sm:w-8">
                {icon}
              </span>
            )}
            {eyebrow && (
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-fab-gold sm:text-[11px]">
                {eyebrow}
              </span>
            )}
          </div>
          <h1 className="text-lg font-black tracking-tight text-fab-text sm:text-2xl">{title}</h1>
          {description && <p className="mt-1.5 hidden max-w-3xl text-sm leading-6 text-fab-muted sm:block">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {metrics && metrics.length > 0 && (
        <div className={`mt-2.5 grid gap-1.5 sm:mt-3.5 sm:gap-2 ${metricCols}`}>
          {metrics.map((metric, index) => (
            <div key={index} className="fab-metric min-w-0 rounded-md border border-fab-border bg-fab-bg/70 px-2.5 py-2 sm:px-3 sm:py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">{metric.label}</p>
              <p className="mt-1 truncate text-base font-black leading-none text-fab-text tabular-nums sm:text-lg">{metric.value}</p>
              {metric.sub && <p className="mt-1 hidden text-[11px] text-fab-muted sm:block">{metric.sub}</p>}
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

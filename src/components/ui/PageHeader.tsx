import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Action buttons / chips on the right side (desktop) or below (mobile) */
  actions?: ReactNode;
  /** Optional icon shown left of the title */
  icon?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, icon, className = "" }: PageHeaderProps) {
  return (
    <div className={`fab-page-header mb-6 rounded-lg border border-fab-border bg-fab-surface/90 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && <div className="flex-shrink-0 mt-0.5 rounded-md border border-fab-border/70 bg-fab-bg/70 p-2 text-fab-gold">{icon}</div>}
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-fab-text leading-tight tracking-tight">{title}</h1>
          {description && <p className="text-fab-muted text-sm mt-1.5 max-w-3xl">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">{actions}</div>}
    </div>
  );
}

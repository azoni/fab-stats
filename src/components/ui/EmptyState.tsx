interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  description?: string;
  action?: {
    href?: string;
    label: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    href?: string;
    label: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon, title, subtitle, description, action, secondaryAction }: EmptyStateProps) {
  const body = subtitle || description;
  const renderAction = (item: NonNullable<EmptyStateProps["action"]>, variant: "primary" | "secondary") => {
    const className =
      variant === "primary"
        ? "inline-flex min-h-10 items-center justify-center rounded-md bg-fab-gold px-4 text-sm font-semibold text-fab-bg transition-colors hover:bg-fab-gold-light"
        : "inline-flex min-h-10 items-center justify-center rounded-md border border-fab-border bg-fab-surface px-4 text-sm font-semibold text-fab-muted transition-colors hover:border-fab-gold/40 hover:text-fab-text";

    if (item.href) {
      return (
        <a href={item.href} className={className}>
          {item.label}
        </a>
      );
    }

    return (
      <button type="button" onClick={item.onClick} className={className}>
        {item.label}
      </button>
    );
  };

  return (
    <div className="fab-empty-state rounded-lg border border-fab-border bg-fab-surface/80 px-6 py-12 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-fab-gold/10 border border-fab-gold/20 mb-4 text-fab-gold">
        {icon || (
          <svg className="w-5 h-5 text-fab-gold/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        )}
      </div>
      <p className="text-lg font-bold text-fab-text mb-1">{title}</p>
      {body && <p className="mx-auto max-w-md text-sm leading-6 text-fab-muted">{body}</p>}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action && renderAction(action, "primary")}
          {secondaryAction && renderAction(secondaryAction, "secondary")}
        </div>
      )}
    </div>
  );
}

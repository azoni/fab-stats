interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-fab-gold/5 border border-fab-gold/15 mb-4">
        {icon || (
          <svg className="w-5 h-5 text-fab-gold/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        )}
      </div>
      <p className="text-lg text-fab-muted mb-1">{title}</p>
      {subtitle && <p className="text-sm text-fab-dim">{subtitle}</p>}
    </div>
  );
}

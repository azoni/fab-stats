const iconClass = "w-5 h-5";

export function DashboardIcon({ className = iconClass }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="4" rx="1" />
      <rect x="14" y="10" width="7" height="11" rx="1" />
      <rect x="3" y="13" width="7" height="8" rx="1" />
    </svg>
  );
}

export function SwordsIcon({ className = iconClass }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
      <path d="M9.5 17.5L21 6V3h-3L6.5 14.5" />
      <path d="M11 19l-6-6" />
      <path d="M8 16l-4 4" />
    </svg>
  );
}

export function PlusIcon({ className = iconClass }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function OpponentsIcon({ className = iconClass }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <path d="M17 11a4 4 0 014 4v2" />
    </svg>
  );
}

export function TrendsIcon({ className = iconClass }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function ImportIcon({ className = iconClass }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

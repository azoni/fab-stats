export function FirstMatchBadge({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <radialGradient id="fmGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#fmGlow)" />
      {/* Wobbly circle border */}
      <path
        d="M12 2.5c5.2.1 9.3 4.3 9.5 9.5.1 5.2-4.1 9.5-9.3 9.5S2.6 17.3 2.5 12.1C2.4 6.9 6.8 2.4 12 2.5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="currentColor"
        fillOpacity="0.08"
      />
      {/* Crossed swords */}
      <path
        d="M8.5 16.5l7-9.5M8 8l1.2 1.5M15 14l1 1.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 16.5l-7-9.5M16 8l-1.2 1.5M9 14l-1 1.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Small shield center */}
      <path
        d="M12 10l-2.2 1.2v1.8c0 1.3 1 2.4 2.2 2.8 1.2-.4 2.2-1.5 2.2-2.8v-1.8L12 10z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ContentCreatorBadge({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <radialGradient id="ccGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#f87171" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#ccGlow)" />
      {/* Camera/film border */}
      <path
        d="M12 2.5c5.2.1 9.3 4.3 9.5 9.5.1 5.2-4.1 9.5-9.3 9.5S2.6 17.3 2.5 12.1C2.4 6.9 6.8 2.4 12 2.5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="currentColor"
        fillOpacity="0.08"
      />
      {/* Play button triangle */}
      <path
        d="M10 8.5v7l6-3.5-6-3.5z"
        fill="currentColor"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Small star above */}
      <path
        d="M12 5.5l.6 1.2 1.3.2-1 .9.2 1.3-1.1-.6-1.1.6.2-1.3-1-.9 1.3-.2z"
        fill="currentColor"
        fillOpacity="0.4"
      />
    </svg>
  );
}

export function FaBdokuPlayerBadge({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <radialGradient id="fdGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#fdGlow)" />
      <path
        d="M12 2.5c5.2.1 9.3 4.3 9.5 9.5.1 5.2-4.1 9.5-9.3 9.5S2.6 17.3 2.5 12.1C2.4 6.9 6.8 2.4 12 2.5z"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
        fill="currentColor" fillOpacity="0.08"
      />
      {/* 3x3 grid — 8 green cells, 1 red center */}
      <rect x="5"   y="5"   width="3.5" height="3.5" rx="0.5" fill="#22c55e" fillOpacity="0.75" />
      <rect x="10"  y="5"   width="3.5" height="3.5" rx="0.5" fill="#22c55e" fillOpacity="0.75" />
      <rect x="15"  y="5"   width="3.5" height="3.5" rx="0.5" fill="#22c55e" fillOpacity="0.75" />
      <rect x="5"   y="10"  width="3.5" height="3.5" rx="0.5" fill="#22c55e" fillOpacity="0.75" />
      <rect x="10"  y="10"  width="3.5" height="3.5" rx="0.5" fill="#ef4444" fillOpacity="0.85" />
      <rect x="15"  y="10"  width="3.5" height="3.5" rx="0.5" fill="#22c55e" fillOpacity="0.75" />
      <rect x="5"   y="15"  width="3.5" height="3.5" rx="0.5" fill="#22c55e" fillOpacity="0.75" />
      <rect x="10"  y="15"  width="3.5" height="3.5" rx="0.5" fill="#22c55e" fillOpacity="0.75" />
      <rect x="15"  y="15"  width="3.5" height="3.5" rx="0.5" fill="#22c55e" fillOpacity="0.75" />
    </svg>
  );
}

export function CrosswordPlayerBadge({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <radialGradient id="cwGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#cwGlow)" />
      <path
        d="M12 2.5c5.2.1 9.3 4.3 9.5 9.5.1 5.2-4.1 9.5-9.3 9.5S2.6 17.3 2.5 12.1C2.4 6.9 6.8 2.4 12 2.5z"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
        fill="currentColor" fillOpacity="0.08"
      />
      {/* Crossword grid pattern — mix of filled and empty cells */}
      <rect x="5" y="7" width="3.5" height="3.5" rx="0.4" fill="#3b82f6" fillOpacity="0.7" />
      <rect x="8.5" y="7" width="3.5" height="3.5" rx="0.4" fill="#3b82f6" fillOpacity="0.7" />
      <rect x="12" y="7" width="3.5" height="3.5" rx="0.4" fill="#3b82f6" fillOpacity="0.7" />
      <rect x="15.5" y="7" width="3.5" height="3.5" rx="0.4" fill="currentColor" fillOpacity="0.06" />
      <rect x="5" y="10.5" width="3.5" height="3.5" rx="0.4" fill="currentColor" fillOpacity="0.06" />
      <rect x="8.5" y="10.5" width="3.5" height="3.5" rx="0.4" fill="#3b82f6" fillOpacity="0.7" />
      <rect x="12" y="10.5" width="3.5" height="3.5" rx="0.4" fill="currentColor" fillOpacity="0.06" />
      <rect x="15.5" y="10.5" width="3.5" height="3.5" rx="0.4" fill="currentColor" fillOpacity="0.06" />
      <rect x="8.5" y="14" width="3.5" height="3.5" rx="0.4" fill="#3b82f6" fillOpacity="0.7" />
      {/* Letters hint */}
      <text x="6.2" y="10" fill="white" fontSize="2.8" fontWeight="bold" fontFamily="sans-serif">F</text>
      <text x="9.7" y="10" fill="white" fontSize="2.8" fontWeight="bold" fontFamily="sans-serif">A</text>
      <text x="13.2" y="10" fill="white" fontSize="2.8" fontWeight="bold" fontFamily="sans-serif">B</text>
    </svg>
  );
}

export const BADGE_ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  "first-match": FirstMatchBadge,
  "content-creator": ContentCreatorBadge,
  "fabdoku-player": FaBdokuPlayerBadge,
  "crossword-player": CrosswordPlayerBadge,
};

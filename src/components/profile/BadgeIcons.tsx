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

export function HeroGuesserPlayerBadge({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <radialGradient id="hgGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#hgGlow)" />
      <path
        d="M12 2.5c5.2.1 9.3 4.3 9.5 9.5.1 5.2-4.1 9.5-9.3 9.5S2.6 17.3 2.5 12.1C2.4 6.9 6.8 2.4 12 2.5z"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
        fill="currentColor" fillOpacity="0.08"
      />
      {/* Question mark silhouette */}
      <path
        d="M9.5 9.5a2.5 2.5 0 114.2 1.8c-.7.5-1.2 1-1.2 1.7v.5"
        stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" fill="none"
      />
      <circle cx="12.5" cy="15.5" r="0.8" fill="#a855f7" />
      {/* Small shield behind */}
      <path
        d="M12 5l-4 2v3c0 3 1.8 5.5 4 6.5 2.2-1 4-3.5 4-6.5V7l-4-2z"
        fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="0.6"
      />
    </svg>
  );
}

export function MatchupManiaPlayerBadge({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <radialGradient id="mmGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#mmGlow)" />
      <path
        d="M12 2.5c5.2.1 9.3 4.3 9.5 9.5.1 5.2-4.1 9.5-9.3 9.5S2.6 17.3 2.5 12.1C2.4 6.9 6.8 2.4 12 2.5z"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
        fill="currentColor" fillOpacity="0.08"
      />
      {/* VS symbol */}
      <text x="5.5" y="15" fill="#f97316" fontSize="7" fontWeight="bold" fontFamily="sans-serif">VS</text>
      {/* Two small circles representing heroes */}
      <circle cx="8" cy="8" r="2.5" fill="#f97316" fillOpacity="0.3" stroke="#f97316" strokeWidth="0.6" />
      <circle cx="16" cy="8" r="2.5" fill="#f97316" fillOpacity="0.3" stroke="#f97316" strokeWidth="0.6" />
    </svg>
  );
}

export function TriviaPlayerBadge({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <radialGradient id="trGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#trGlow)" />
      <path
        d="M12 2.5c5.2.1 9.3 4.3 9.5 9.5.1 5.2-4.1 9.5-9.3 9.5S2.6 17.3 2.5 12.1C2.4 6.9 6.8 2.4 12 2.5z"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
        fill="currentColor" fillOpacity="0.08"
      />
      {/* Light bulb */}
      <path
        d="M12 5.5a4 4 0 00-1.5 7.7V15h3v-1.8A4 4 0 0012 5.5z"
        fill="#ef4444" fillOpacity="0.3" stroke="#ef4444" strokeWidth="0.8"
      />
      <line x1="10.5" y1="16" x2="13.5" y2="16" stroke="#ef4444" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="10.5" y1="17.2" x2="13.5" y2="17.2" stroke="#ef4444" strokeWidth="0.8" strokeLinecap="round" />
      {/* Rays */}
      <line x1="12" y1="3" x2="12" y2="4" stroke="#ef4444" strokeWidth="0.6" strokeLinecap="round" />
      <line x1="7" y1="9.5" x2="6" y2="9.5" stroke="#ef4444" strokeWidth="0.6" strokeLinecap="round" />
      <line x1="17" y1="9.5" x2="18" y2="9.5" stroke="#ef4444" strokeWidth="0.6" strokeLinecap="round" />
    </svg>
  );
}

export function TimelinePlayerBadge({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <radialGradient id="tlGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#tlGlow)" />
      <path
        d="M12 2.5c5.2.1 9.3 4.3 9.5 9.5.1 5.2-4.1 9.5-9.3 9.5S2.6 17.3 2.5 12.1C2.4 6.9 6.8 2.4 12 2.5z"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
        fill="currentColor" fillOpacity="0.08"
      />
      {/* Clock face */}
      <circle cx="12" cy="12" r="5.5" fill="#06b6d4" fillOpacity="0.15" stroke="#06b6d4" strokeWidth="0.8" />
      {/* Clock hands */}
      <line x1="12" y1="12" x2="12" y2="8.5" stroke="#06b6d4" strokeWidth="1" strokeLinecap="round" />
      <line x1="12" y1="12" x2="15" y2="12" stroke="#06b6d4" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="0.7" fill="#06b6d4" />
      {/* Arrow suggesting timeline */}
      <path d="M5 18h14l-2-1.5M19 18l-2 1.5" stroke="#06b6d4" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ConnectionsPlayerBadge({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <radialGradient id="cnGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#eab308" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#cnGlow)" />
      <path
        d="M12 2.5c5.2.1 9.3 4.3 9.5 9.5.1 5.2-4.1 9.5-9.3 9.5S2.6 17.3 2.5 12.1C2.4 6.9 6.8 2.4 12 2.5z"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
        fill="currentColor" fillOpacity="0.08"
      />
      {/* 4 colored squares in 2x2 grid */}
      <rect x="6" y="6" width="5" height="5" rx="1" fill="#eab308" fillOpacity="0.6" />
      <rect x="13" y="6" width="5" height="5" rx="1" fill="#22c55e" fillOpacity="0.6" />
      <rect x="6" y="13" width="5" height="5" rx="1" fill="#3b82f6" fillOpacity="0.6" />
      <rect x="13" y="13" width="5" height="5" rx="1" fill="#a855f7" fillOpacity="0.6" />
    </svg>
  );
}

export const BADGE_ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  "first-match": FirstMatchBadge,
  "content-creator": ContentCreatorBadge,
  "fabdoku-player": FaBdokuPlayerBadge,
  "crossword-player": CrosswordPlayerBadge,
  "heroguesser-player": HeroGuesserPlayerBadge,
  "matchupmania-player": MatchupManiaPlayerBadge,
  "trivia-player": TriviaPlayerBadge,
  "timeline-player": TimelinePlayerBadge,
  "connections-player": ConnectionsPlayerBadge,
};

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

export const BADGE_ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  "first-match": FirstMatchBadge,
};

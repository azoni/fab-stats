export function MeleeEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="meleeGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#991b1b" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {/* Background disc — dashed ring */}
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Shield body */}
      <path
        d="M24 10l-9 5v7c0 6.5 3.8 11.2 9 13 5.2-1.8 9-6.5 9-13v-7l-9-5z"
        fill="url(#meleeGrad)"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Shield cross detail */}
      <path d="M24 15v16M18 24h12" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.25" />
      {/* Sword blade */}
      <path d="M24 5v34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Sword guard */}
      <path d="M19 16.5h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Sword pommel */}
      <circle cx="24" cy="40" r="1.8" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="0.8" />
      {/* Hatch marks */}
      <path d="M18 19l2.5 2.5M27.5 19l2.5 2.5M18 28l2 2M28 28l2 2" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" strokeLinecap="round" />
    </svg>
  );
}

export function RangedEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="rangedGrad" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      {/* Background disc */}
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Bow stave */}
      <path
        d="M16 9c-6 7.5-6 22.5 0 30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Bowstring */}
      <path
        d="M16 9l10 15-10 15"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="url(#rangedGrad)"
        fillOpacity="0.25"
      />
      {/* Arrow shaft */}
      <path d="M15 24h26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Arrowhead */}
      <path d="M41 24l-5-3v6z" fill="currentColor" fillOpacity="0.45" stroke="currentColor" strokeWidth="0.7" strokeLinejoin="round" />
      {/* Arrow fletching */}
      <path d="M15 24l3-2.5M15 24l3 2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {/* Motion lines */}
      <path d="M34 18h3.5M35.5 21.5h3M34 30h3.5M35.5 26.5h3" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.2" strokeLinecap="round" />
      {/* Bow grip texture */}
      <path d="M15 21.5l1.5.3M15 24l1.5 0M15 26.5l1.5-.3" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.25" strokeLinecap="round" />
    </svg>
  );
}

export function MagicEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <radialGradient id="magicGrad" cx="0.4" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.1" />
        </radialGradient>
      </defs>
      {/* Background disc */}
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Orb body */}
      <circle cx="24" cy="24" r="11" fill="url(#magicGrad)" stroke="currentColor" strokeWidth="1.4" />
      {/* Inner swirl */}
      <path
        d="M20 20c2-2 6-2 8 0s2 6 0 8-6 2-8 0"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeOpacity="0.35"
        strokeLinecap="round"
      />
      {/* Second swirl */}
      <path
        d="M22 18c4-1 7 2 6 6s-5 5-8 3"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeOpacity="0.2"
        strokeLinecap="round"
      />
      {/* Orb highlight */}
      <ellipse cx="20.5" cy="20.5" rx="2.5" ry="1.8" fill="white" opacity="0.12" transform="rotate(-30 20.5 20.5)" />
      {/* Orbiting rune marks */}
      <path d="M24 8v2.5M24 37.5v2.5M8 24h2.5M37.5 24h2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.35" />
      {/* Diagonal rune marks */}
      <path d="M11.5 11.5l1.8 1.8M34.7 34.7l1.8 1.8M34.7 11.5l-1.8 1.8M11.5 34.7l1.8-1.8" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" strokeOpacity="0.25" />
      {/* Spark particles */}
      <circle cx="10" cy="15" r="0.8" fill="currentColor" fillOpacity="0.25" />
      <circle cx="38" cy="18" r="0.6" fill="currentColor" fillOpacity="0.2" />
      <circle cx="14" cy="36" r="0.7" fill="currentColor" fillOpacity="0.2" />
      <circle cx="36" cy="34" r="0.85" fill="currentColor" fillOpacity="0.25" />
      <circle cx="8" cy="27" r="0.5" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

export const EMBLEM_COMPONENTS: Record<string, React.FC<{ className?: string }>> = {
  melee: MeleeEmblem,
  ranged: RangedEmblem,
  magic: MagicEmblem,
};

export const EMBLEM_COLORS: Record<string, { text: string; glow: string }> = {
  melee: { text: "text-red-400", glow: "hover:drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]" },
  ranged: { text: "text-teal-400", glow: "hover:drop-shadow-[0_0_10px_rgba(45,212,191,0.4)]" },
  magic: { text: "text-violet-400", glow: "hover:drop-shadow-[0_0_10px_rgba(167,139,250,0.4)]" },
};

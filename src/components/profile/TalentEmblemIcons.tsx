// Talent Emblem SVGs — 48x48 viewBox, dashed ring background, gradient fills
// Each follows the same pattern as the original MeleeEmblem/RangedEmblem/MagicEmblem

export function GenericTalentEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <radialGradient id="genericGrad" cx="0.5" cy="0.4" r="0.5">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4" />
          <stop offset="70%" stopColor="#64748b" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#475569" stopOpacity="0.08" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Diamond shape */}
      <path d="M24 8l12 16-12 16-12-16z" fill="url(#genericGrad)" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Inner facets */}
      <path d="M24 8l4 10H16z" fill="currentColor" fillOpacity="0.12" />
      <path d="M16 18h16L24 40z" fill="currentColor" fillOpacity="0.06" />
      {/* Center highlight */}
      <circle cx="24" cy="22" r="3" fill="currentColor" fillOpacity="0.15" />
      <circle cx="24" cy="22" r="1.2" fill="currentColor" fillOpacity="0.25" />
      {/* Sparkle accents */}
      <path d="M14 14l1 1M34 14l-1 1M14 34l1-1M34 34l-1-1" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" strokeOpacity="0.25" />
    </svg>
  );
}

export function LightEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <radialGradient id="lightGrad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
          <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#d97706" stopOpacity="0.05" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Sun core */}
      <circle cx="24" cy="24" r="8" fill="url(#lightGrad)" stroke="currentColor" strokeWidth="1.4" />
      {/* Inner glow ring */}
      <circle cx="24" cy="24" r="5" fill="currentColor" fillOpacity="0.15" />
      {/* Radiant rays */}
      <path d="M24 8v5M24 35v5M8 24h5M35 24h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12.7 12.7l3.5 3.5M31.8 31.8l3.5 3.5M35.3 12.7l-3.5 3.5M12.7 35.3l3.5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {/* Secondary rays */}
      <path d="M24 5v2M24 41v2M5 24h2M41 24h2" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" strokeOpacity="0.3" />
      {/* Core highlight */}
      <ellipse cx="22" cy="22" rx="2" ry="1.5" fill="white" opacity="0.15" transform="rotate(-25 22 22)" />
    </svg>
  );
}

export function ShadowEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <radialGradient id="shadowGrad" cx="0.4" cy="0.4" r="0.65">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
          <stop offset="60%" stopColor="#4c1d95" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.15" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Void crescent */}
      <path d="M30 12a12 12 0 010 24 12 12 0 100-24z" fill="url(#shadowGrad)" stroke="currentColor" strokeWidth="1.4" />
      {/* Dark wisps */}
      <path d="M18 18c-2 3-3 7-1 11" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.3" />
      <path d="M15 22c-1 2-1 5 0 7" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" strokeOpacity="0.2" />
      {/* Shadow particles */}
      <circle cx="14" cy="16" r="1" fill="currentColor" fillOpacity="0.2" />
      <circle cx="11" cy="24" r="0.8" fill="currentColor" fillOpacity="0.15" />
      <circle cx="13" cy="32" r="0.9" fill="currentColor" fillOpacity="0.2" />
      <circle cx="16" cy="37" r="0.6" fill="currentColor" fillOpacity="0.12" />
      {/* Crescent inner glow */}
      <path d="M32 16a9 9 0 010 16" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" strokeLinecap="round" />
    </svg>
  );
}

export function DraconicEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="draconicGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Dragon flame */}
      <path d="M24 8c-3 5-8 10-8 16a8 8 0 0016 0c0-6-5-11-8-16z" fill="url(#draconicGrad)" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Inner flame */}
      <path d="M24 16c-2 3-4 6-4 10a4 4 0 008 0c0-4-2-7-4-10z" fill="currentColor" fillOpacity="0.15" />
      {/* Flame core */}
      <path d="M24 22c-1 2-2 3-2 5a2 2 0 004 0c0-2-1-3-2-5z" fill="currentColor" fillOpacity="0.25" />
      {/* Scale texture */}
      <path d="M19 28l2-1M21 30l2-1M27 28l-2-1M25 30l-2-1" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" strokeLinecap="round" />
      {/* Heat shimmer */}
      <path d="M18 12c1-1 2 0 3-1M27 12c1-1 2 0 3-1" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.15" strokeLinecap="round" />
    </svg>
  );
}

export function ElementalEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="elemGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#34d399" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Swirling elements — triple spiral */}
      <path d="M24 12a12 12 0 016 10.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M30 22.4a12 12 0 01-9 8.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M21 31a12 12 0 013-19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {/* Inner spiral fill */}
      <circle cx="24" cy="22" r="6" fill="url(#elemGrad)" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.3" />
      {/* Element dots */}
      <circle cx="24" cy="10" r="1.5" fill="currentColor" fillOpacity="0.3" />
      <circle cx="32" cy="28" r="1.5" fill="currentColor" fillOpacity="0.3" />
      <circle cx="16" cy="28" r="1.5" fill="currentColor" fillOpacity="0.3" />
      {/* Core */}
      <circle cx="24" cy="22" r="2" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export function IceEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="iceGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Snowflake — 6-fold symmetry */}
      <path d="M24 8v32" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.1 16l27.8 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.1 32l27.8-16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Branch details */}
      <path d="M24 13l-3 2M24 13l3 2M24 35l-3-2M24 35l3-2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M14 18l1 3M14 18l3 1M34 30l-1-3M34 30l-3-1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M14 30l1-3M14 30l3-1M34 18l-1 3M34 18l-3 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {/* Crystal center */}
      <circle cx="24" cy="24" r="4" fill="url(#iceGrad)" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="24" cy="24" r="1.5" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export function LightningEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="lightningGrad" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#facc15" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#eab308" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Lightning bolt */}
      <path d="M28 6L18 24h8l-6 18 16-22h-9L28 6z" fill="url(#lightningGrad)" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Inner bolt highlight */}
      <path d="M26 10l-7 13h5l-4 12" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.3" strokeLinecap="round" />
      {/* Static sparks */}
      <circle cx="12" cy="18" r="0.8" fill="currentColor" fillOpacity="0.25" />
      <circle cx="36" cy="14" r="0.7" fill="currentColor" fillOpacity="0.2" />
      <circle cx="10" cy="30" r="0.6" fill="currentColor" fillOpacity="0.15" />
      <circle cx="38" cy="32" r="0.8" fill="currentColor" fillOpacity="0.2" />
      {/* Electric arcs */}
      <path d="M14 14l2 1M33 11l1 2M36 28l-2 1M12 34l2-1" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" strokeLinecap="round" />
    </svg>
  );
}

export function EarthEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="earthGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#d97706" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#92400e" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Mountain */}
      <path d="M8 36l10-20 6 8 6-8 10 20H8z" fill="url(#earthGrad)" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Snow cap */}
      <path d="M18 16l3 6 3-4 3 4 3-6" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.3" strokeLinecap="round" />
      {/* Stone crystal */}
      <path d="M24 10l-3 6h6l-3-6z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
      {/* Terrain lines */}
      <path d="M12 32l5-4M22 28l4 4M30 28l5 4" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" strokeLinecap="round" />
      {/* Ground pebbles */}
      <circle cx="12" cy="38" r="0.8" fill="currentColor" fillOpacity="0.15" />
      <circle cx="36" cy="38" r="0.7" fill="currentColor" fillOpacity="0.12" />
    </svg>
  );
}

export function MysticEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <radialGradient id="mysticGrad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#4f46e5" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#312e81" stopOpacity="0.1" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* All-seeing eye — outer */}
      <path d="M6 24s8-12 18-12 18 12 18 12-8 12-18 12S6 24 6 24z" fill="url(#mysticGrad)" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Iris */}
      <circle cx="24" cy="24" r="6" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" />
      {/* Pupil */}
      <circle cx="24" cy="24" r="3" fill="currentColor" fillOpacity="0.35" />
      {/* Pupil highlight */}
      <circle cx="22.5" cy="22.5" r="1" fill="white" opacity="0.15" />
      {/* Cosmic dots */}
      <circle cx="10" cy="14" r="0.7" fill="currentColor" fillOpacity="0.2" />
      <circle cx="38" cy="14" r="0.6" fill="currentColor" fillOpacity="0.15" />
      <circle cx="10" cy="34" r="0.6" fill="currentColor" fillOpacity="0.15" />
      <circle cx="38" cy="34" r="0.7" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export function RoyalEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="royalGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#a16207" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Crown */}
      <path d="M10 30l4-14 5 7 5-10 5 10 5-7 4 14H10z" fill="url(#royalGrad)" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Crown band */}
      <path d="M10 30h28" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="30" width="28" height="4" rx="1" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="0.8" />
      {/* Crown jewels */}
      <circle cx="24" cy="32" r="1.2" fill="currentColor" fillOpacity="0.35" />
      <circle cx="18" cy="32" r="0.8" fill="currentColor" fillOpacity="0.25" />
      <circle cx="30" cy="32" r="0.8" fill="currentColor" fillOpacity="0.25" />
      {/* Crown point gems */}
      <circle cx="14" cy="16" r="1" fill="currentColor" fillOpacity="0.2" />
      <circle cx="24" cy="13" r="1.2" fill="currentColor" fillOpacity="0.3" />
      <circle cx="34" cy="16" r="1" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export function ChaosEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <radialGradient id="chaosGrad" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#991b1b" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#450a0a" stopOpacity="0.1" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Entropy spiral */}
      <path d="M24 8a16 16 0 0112 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M36 14a16 16 0 012 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M38 28a16 16 0 01-10 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M28 40a16 16 0 01-16-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 34a16 16 0 01-2-14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.7" />
      {/* Fractured core */}
      <circle cx="24" cy="24" r="7" fill="url(#chaosGrad)" stroke="currentColor" strokeWidth="1.2" />
      {/* Crack lines */}
      <path d="M21 20l3 4 3-4M21 28l3-4 3 4" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.4" />
      {/* Chaos sparks */}
      <circle cx="16" cy="10" r="0.9" fill="currentColor" fillOpacity="0.25" />
      <circle cx="38" cy="20" r="0.7" fill="currentColor" fillOpacity="0.2" />
      <circle cx="8" cy="28" r="0.8" fill="currentColor" fillOpacity="0.2" />
      <circle cx="34" cy="38" r="0.7" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

export function ReveredEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <radialGradient id="reveredGrad" cx="0.5" cy="0.35" r="0.5">
          <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.15" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Sacred halo */}
      <ellipse cx="24" cy="18" rx="12" ry="4" fill="url(#reveredGrad)" stroke="currentColor" strokeWidth="1.2" />
      {/* Divine light pillar */}
      <path d="M20 18v18M28 18v18" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.2" />
      <path d="M24 10v26" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* Wings */}
      <path d="M12 24c-2-4-1-8 2-10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" />
      <path d="M36 24c2-4 1-8-2-10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" />
      {/* Sacred star */}
      <path d="M24 8l1.5 3-1.5 3-1.5-3z" fill="currentColor" fillOpacity="0.25" />
      {/* Light particles */}
      <circle cx="14" cy="12" r="0.6" fill="currentColor" fillOpacity="0.2" />
      <circle cx="34" cy="12" r="0.6" fill="currentColor" fillOpacity="0.2" />
      <circle cx="24" cy="40" r="0.8" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

export function ReviledEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <radialGradient id="reviledGrad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#dc2626" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#7f1d1d" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#1c1917" stopOpacity="0.1" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Corrupted mark — inverted star */}
      <path d="M24 36l-4.5-9-9.5 2 6-8.5-6-8.5 9.5 2L24 5l4.5 9 9.5-2-6 8.5 6 8.5-9.5-2z" fill="url(#reviledGrad)" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Thorns */}
      <path d="M12 18l-3-1M36 18l3-1M12 30l-3 1M36 30l3 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.35" />
      {/* Inner corruption */}
      <circle cx="24" cy="22" r="4" fill="currentColor" fillOpacity="0.15" />
      <circle cx="24" cy="22" r="1.5" fill="currentColor" fillOpacity="0.3" />
      {/* Dark particles */}
      <circle cx="10" cy="10" r="0.7" fill="currentColor" fillOpacity="0.2" />
      <circle cx="38" cy="38" r="0.7" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export const TALENT_EMBLEM_COMPONENTS: Record<string, React.FC<{ className?: string }>> = {
  "t-generic": GenericTalentEmblem,
  "t-light": LightEmblem,
  "t-shadow": ShadowEmblem,
  "t-draconic": DraconicEmblem,
  "t-elemental": ElementalEmblem,
  "t-ice": IceEmblem,
  "t-lightning": LightningEmblem,
  "t-earth": EarthEmblem,
  "t-mystic": MysticEmblem,
  "t-royal": RoyalEmblem,
  "t-chaos": ChaosEmblem,
  "t-revered": ReveredEmblem,
  "t-reviled": ReviledEmblem,
};

export const TALENT_EMBLEM_COLORS: Record<string, { text: string; glow: string }> = {
  "t-generic":   { text: "text-slate-400",   glow: "hover:drop-shadow-[0_0_10px_rgba(148,163,184,0.4)]" },
  "t-light":     { text: "text-yellow-400",  glow: "hover:drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]" },
  "t-shadow":    { text: "text-purple-400",  glow: "hover:drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]" },
  "t-draconic":  { text: "text-red-400",     glow: "hover:drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]" },
  "t-elemental": { text: "text-emerald-400", glow: "hover:drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]" },
  "t-ice":       { text: "text-cyan-400",    glow: "hover:drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]" },
  "t-lightning": { text: "text-yellow-300",  glow: "hover:drop-shadow-[0_0_10px_rgba(253,224,71,0.4)]" },
  "t-earth":     { text: "text-amber-500",   glow: "hover:drop-shadow-[0_0_10px_rgba(217,119,6,0.4)]" },
  "t-mystic":    { text: "text-indigo-400",  glow: "hover:drop-shadow-[0_0_10px_rgba(129,140,248,0.4)]" },
  "t-royal":     { text: "text-yellow-500",  glow: "hover:drop-shadow-[0_0_10px_rgba(201,168,76,0.4)]" },
  "t-chaos":     { text: "text-rose-500",    glow: "hover:drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]" },
  "t-revered":   { text: "text-slate-300",   glow: "hover:drop-shadow-[0_0_10px_rgba(203,213,225,0.4)]" },
  "t-reviled":   { text: "text-red-600",     glow: "hover:drop-shadow-[0_0_10px_rgba(220,38,38,0.4)]" },
};

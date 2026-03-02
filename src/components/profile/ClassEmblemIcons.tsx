// Class Emblem SVGs — 48x48 viewBox, dashed ring background, gradient fills

export function WarriorClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="cWarriorGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#991b1b" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Crossed swords */}
      <path d="M12 36L28 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 36L20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Guards */}
      <path d="M25 14h6M17 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Blade fill */}
      <path d="M14 32l10-20 4 2-10 20z" fill="url(#cWarriorGrad)" fillOpacity="0.3" />
      <path d="M34 32L24 12l-4 2 10 20z" fill="url(#cWarriorGrad)" fillOpacity="0.3" />
      {/* Pommel gems */}
      <circle cx="12" cy="37" r="1.5" fill="currentColor" fillOpacity="0.25" />
      <circle cx="36" cy="37" r="1.5" fill="currentColor" fillOpacity="0.25" />
    </svg>
  );
}

export function GuardianClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="cGuardianGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Tower shield */}
      <path d="M24 7l-12 6v11c0 8.5 5 15 12 17 7-2 12-8.5 12-17V13l-12-6z" fill="url(#cGuardianGrad)" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Shield cross */}
      <path d="M24 12v22M14 22h20" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
      {/* Shield boss */}
      <circle cx="24" cy="22" r="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.35" />
      <circle cx="24" cy="22" r="1.5" fill="currentColor" fillOpacity="0.25" />
      {/* Rivets */}
      <circle cx="16" cy="16" r="0.8" fill="currentColor" fillOpacity="0.2" />
      <circle cx="32" cy="16" r="0.8" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export function BruteClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="cBruteGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#fb923c" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#c2410c" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Spiked fist */}
      <path d="M16 20v-4a1.5 1.5 0 013 0v3M19 16v-3a1.5 1.5 0 013 0v5M22 13v-2a1.5 1.5 0 013 0v7M25 14v-2a1.5 1.5 0 013 0v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Fist body */}
      <path d="M28 18l2 2v5a6 6 0 01-6 6h-4a6 6 0 01-6-6v-3l2.5-4" fill="url(#cBruteGrad)" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Spikes */}
      <path d="M15 10l1 4M18 8l0.5 5M22 7l0 4M26 8l-0.5 5M29 10l-1 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.4" />
      {/* Impact lines */}
      <path d="M10 32l3-1M35 30l3 1M12 36l2-2M34 36l-2-2" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.2" strokeLinecap="round" />
    </svg>
  );
}

export function NinjaClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <radialGradient id="cNinjaGrad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3730a3" stopOpacity="0.2" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Shuriken */}
      <circle cx="24" cy="24" r="3.5" fill="url(#cNinjaGrad)" stroke="currentColor" strokeWidth="1.2" />
      {/* Shuriken blades */}
      <path d="M24 6c0 7-3 10-3 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M24 42c0-7 3-10 3-14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 24c7 0 10 3 14.5 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M42 24c-7 0-10-3-14.5-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Blade fills */}
      <path d="M24 6c0 7-3 10-3 14.5L24 24l3-3.5C27 16 24 13 24 6z" fill="currentColor" fillOpacity="0.12" />
      <path d="M24 42c0-7 3-10 3-14.5L24 24l-3 3.5C21 32 24 35 24 42z" fill="currentColor" fillOpacity="0.12" />
      {/* Center dot */}
      <circle cx="24" cy="24" r="1.5" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

export function RangerClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="cRangerGrad" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Bow */}
      <path d="M16 8c-7 8-7 24 0 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Bowstring */}
      <path d="M16 8l10 16-10 16" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" fill="url(#cRangerGrad)" fillOpacity="0.2" />
      {/* Arrow */}
      <path d="M14 24h28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M42 24l-5-3.5v7z" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="0.7" strokeLinejoin="round" />
      {/* Fletching */}
      <path d="M14 24l3-3M14 24l3 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {/* Leaf detail */}
      <path d="M8 18c2-1 3 0 4 1M8 30c2 1 3 0 4-1" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.25" strokeLinecap="round" />
    </svg>
  );
}

export function WizardClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <radialGradient id="cWizardGrad" cx="0.5" cy="0.3" r="0.4">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.2" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Staff */}
      <path d="M24 42V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Orb */}
      <circle cx="24" cy="12" r="7" fill="url(#cWizardGrad)" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="24" cy="12" r="3.5" fill="currentColor" fillOpacity="0.15" />
      {/* Orb highlight */}
      <ellipse cx="22" cy="10" rx="2" ry="1.5" fill="white" opacity="0.12" transform="rotate(-25 22 10)" />
      {/* Staff base */}
      <path d="M20 42h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Arcane sparks */}
      <circle cx="14" cy="8" r="0.7" fill="currentColor" fillOpacity="0.2" />
      <circle cx="34" cy="8" r="0.6" fill="currentColor" fillOpacity="0.15" />
      <circle cx="16" cy="16" r="0.5" fill="currentColor" fillOpacity="0.15" />
      <circle cx="32" cy="16" r="0.5" fill="currentColor" fillOpacity="0.15" />
      {/* Staff rune */}
      <path d="M22 28h4M23 24v8" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.25" strokeLinecap="round" />
    </svg>
  );
}

export function MechanologistClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="cMechGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#a1a1aa" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#71717a" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Main gear */}
      <circle cx="24" cy="24" r="9" fill="url(#cMechGrad)" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="24" cy="24" r="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="0.8" />
      {/* Gear teeth */}
      <path d="M22 7h4v4h-4zM22 37h4v4h-4zM7 22v4h4v-4zM37 22v4h4v-4z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="0.7" />
      <path d="M11.5 9.5l2.8 2.8-2.8 2.8-2.8-2.8zM33.7 9.5l2.8 2.8-2.8 2.8-2.8-2.8zM11.5 31.7l2.8 2.8-2.8 2.8-2.8-2.8zM33.7 31.7l2.8 2.8-2.8 2.8-2.8-2.8z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="0.5" />
      {/* Center bolt */}
      <circle cx="24" cy="24" r="1.5" fill="currentColor" fillOpacity="0.35" />
    </svg>
  );
}

export function RunebladeClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="cRuneGrad" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Blade */}
      <path d="M24 5L16 32h16L24 5z" fill="url(#cRuneGrad)" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Guard */}
      <path d="M14 32h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Grip */}
      <path d="M24 34v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Pommel */}
      <circle cx="24" cy="43" r="1.5" fill="currentColor" fillOpacity="0.25" />
      {/* Rune inscriptions */}
      <path d="M24 12v8M21 16h6" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.35" strokeLinecap="round" />
      <path d="M22 22l4 4M22 26l4-4" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.25" strokeLinecap="round" />
      {/* Rune glow */}
      <circle cx="24" cy="18" r="1" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export function IllusionistClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <radialGradient id="cIlluGrad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#f0abfc" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#c026d3" stopOpacity="0.15" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Prismatic eye */}
      <path d="M6 24s8-13 18-13 18 13 18 13-8 13-18 13S6 24 6 24z" fill="url(#cIlluGrad)" stroke="currentColor" strokeWidth="1.4" />
      {/* Iris — prismatic */}
      <circle cx="24" cy="24" r="7" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1" />
      {/* Prism facets */}
      <path d="M24 17l-5 7 5 7 5-7z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.3" />
      {/* Pupil */}
      <circle cx="24" cy="24" r="2.5" fill="currentColor" fillOpacity="0.3" />
      <circle cx="23" cy="23" r="0.8" fill="white" opacity="0.15" />
      {/* Sparkle motes */}
      <circle cx="12" cy="18" r="0.7" fill="currentColor" fillOpacity="0.25" />
      <circle cx="36" cy="18" r="0.6" fill="currentColor" fillOpacity="0.2" />
      <circle cx="12" cy="30" r="0.6" fill="currentColor" fillOpacity="0.2" />
      <circle cx="36" cy="30" r="0.7" fill="currentColor" fillOpacity="0.25" />
    </svg>
  );
}

export function AssassinClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="cAssassinGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#6b7280" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#374151" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Twin daggers — left */}
      <path d="M18 6l-2 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 6l-3 12 2 2z" fill="url(#cAssassinGrad)" />
      <path d="M13 22h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 22v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {/* Twin daggers — right */}
      <path d="M30 6l2 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M30 6l3 12-2 2z" fill="url(#cAssassinGrad)" />
      <path d="M29 22h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 22v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {/* Poison drops */}
      <circle cx="16" cy="32" r="1.2" fill="currentColor" fillOpacity="0.2" />
      <circle cx="32" cy="32" r="1.2" fill="currentColor" fillOpacity="0.2" />
      {/* Shadow line */}
      <path d="M12 38h24" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.15" strokeDasharray="2 2" />
    </svg>
  );
}

export function BardClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="cBardGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Lyre frame */}
      <path d="M16 36c0-8 3-14 8-18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 36c0-8-3-14-8-18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Lyre base */}
      <path d="M14 36h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Lyre top */}
      <path d="M18 18c-3-3-3-8 0-10 2-1.5 4 0 6 2 2-2 4-3.5 6-2 3 2 3 7 0 10" fill="url(#cBardGrad)" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Strings */}
      <path d="M20 18v16M24 16v18M28 18v16" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.3" />
      {/* Music notes */}
      <circle cx="10" cy="14" r="1.2" fill="currentColor" fillOpacity="0.25" />
      <path d="M11.2 14v-5" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.25" />
      <circle cx="38" cy="12" r="1" fill="currentColor" fillOpacity="0.2" />
      <path d="M39 12v-4" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.2" />
    </svg>
  );
}

export function NecromancerClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <radialGradient id="cNecroGrad" cx="0.5" cy="0.4" r="0.5">
          <stop offset="0%" stopColor="#d946ef" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#701a75" stopOpacity="0.2" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Skull */}
      <path d="M14 18c0-6 4.5-11 10-11s10 5 10 11c0 4-2.5 7-4 8.5v4.5H18v-4.5c-1.5-1.5-4-4.5-4-8.5z" fill="url(#cNecroGrad)" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Eye sockets */}
      <circle cx="20" cy="17" r="3" fill="currentColor" fillOpacity="0.35" />
      <circle cx="28" cy="17" r="3" fill="currentColor" fillOpacity="0.35" />
      {/* Eye glow */}
      <circle cx="20" cy="17" r="1.2" fill="currentColor" fillOpacity="0.15" />
      <circle cx="28" cy="17" r="1.2" fill="currentColor" fillOpacity="0.15" />
      {/* Nose */}
      <path d="M23 22l1 2 1-2" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" strokeOpacity="0.4" />
      {/* Teeth */}
      <path d="M19 31v-3h2v3M21 31v-3h2v3M25 31v-3h2v3M27 31v-3h2v3" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.3" />
      {/* Spirit wisps */}
      <path d="M10 30c1-2 2-1 3-3M38 28c-1-2-2-1-3-3" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.2" strokeLinecap="round" />
    </svg>
  );
}

export function ShapeshifterClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="cShapeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Morphing forms — overlapping shapes */}
      <circle cx="18" cy="18" r="9" fill="url(#cShapeGrad)" stroke="currentColor" strokeWidth="1.2" />
      <rect x="21" y="21" width="16" height="16" rx="3" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.2" />
      {/* Transition particles */}
      <circle cx="24" cy="24" r="2" fill="currentColor" fillOpacity="0.2" />
      <circle cx="20" cy="28" r="1" fill="currentColor" fillOpacity="0.15" />
      <circle cx="28" cy="20" r="1" fill="currentColor" fillOpacity="0.15" />
      {/* Morph lines */}
      <path d="M14 28c2 2 4 3 7 3M28 14c-2-2-3-4-3-7" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.2" strokeLinecap="round" />
    </svg>
  );
}

export function MerchantClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="cMerchGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#b45309" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Coin */}
      <circle cx="24" cy="24" r="12" fill="url(#cMerchGrad)" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="24" cy="24" r="9.5" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.3" />
      {/* Dollar/coin symbol */}
      <path d="M24 14v20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M20 18c0-2 2-3 4-3s4 1 4 3-2 2.5-4 3.5-4 1.5-4 3.5 2 3 4 3 4-1 4-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {/* Coin shine */}
      <path d="M18 16c1-1 2-2 4-2.5" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" strokeLinecap="round" />
    </svg>
  );
}

export function PirateClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <radialGradient id="cPirateGrad" cx="0.5" cy="0.4" r="0.4">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0891b2" stopOpacity="0.2" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Skull */}
      <circle cx="24" cy="16" r="9" fill="url(#cPirateGrad)" stroke="currentColor" strokeWidth="1.4" />
      {/* Eye sockets */}
      <circle cx="20.5" cy="15" r="2.5" fill="currentColor" fillOpacity="0.35" />
      <circle cx="27.5" cy="15" r="2.5" fill="currentColor" fillOpacity="0.35" />
      {/* Nose */}
      <path d="M23 19l1 1.5 1-1.5" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.4" strokeLinecap="round" />
      {/* Grin */}
      <path d="M19 22h10" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.3" />
      {/* Crossbones */}
      <path d="M10 32l28-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 24l28 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Bone ends */}
      <circle cx="10" cy="32" r="1.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="38" cy="24" r="1.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="10" cy="24" r="1.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="38" cy="32" r="1.5" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export function AdjudicatorClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="cAdjGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#d97706" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Scales beam */}
      <path d="M10 16h28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Pillar */}
      <path d="M24 10v28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Base */}
      <path d="M18 38h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Left pan */}
      <path d="M7 24l3-8 3 8a4.5 4.5 0 01-6 0z" fill="url(#cAdjGrad)" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      {/* Right pan */}
      <path d="M35 24l3-8 3 8a4.5 4.5 0 01-6 0z" fill="url(#cAdjGrad)" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      {/* Chains */}
      <path d="M10 16v0M38 16v0" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />
      {/* Top ornament */}
      <circle cx="24" cy="10" r="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}

export function ThiefClassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id="cThiefGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#475569" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />
      {/* Mask */}
      <path d="M6 20c0-5 8-9 18-9s18 4 18 9-8 9-18 9S6 25 6 20z" fill="url(#cThiefGrad)" stroke="currentColor" strokeWidth="1.4" />
      {/* Eye holes */}
      <ellipse cx="16" cy="20" rx="4.5" ry="3.5" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />
      <ellipse cx="32" cy="20" rx="4.5" ry="3.5" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />
      {/* Bridge */}
      <path d="M20.5 20h7" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.3" />
      {/* Smirk */}
      <path d="M18 30c3 2.5 9 2.5 12 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {/* Mask ties */}
      <path d="M6 20c-1 1-2 3-1 5M42 20c1 1 2 3 1 5" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.25" strokeLinecap="round" />
    </svg>
  );
}

export const CLASS_EMBLEM_COMPONENTS: Record<string, React.FC<{ className?: string }>> = {
  "c-warrior": WarriorClassEmblem,
  "c-guardian": GuardianClassEmblem,
  "c-brute": BruteClassEmblem,
  "c-ninja": NinjaClassEmblem,
  "c-ranger": RangerClassEmblem,
  "c-wizard": WizardClassEmblem,
  "c-mechanologist": MechanologistClassEmblem,
  "c-runeblade": RunebladeClassEmblem,
  "c-illusionist": IllusionistClassEmblem,
  "c-assassin": AssassinClassEmblem,
  "c-bard": BardClassEmblem,
  "c-necromancer": NecromancerClassEmblem,
  "c-shapeshifter": ShapeshifterClassEmblem,
  "c-merchant": MerchantClassEmblem,
  "c-pirate": PirateClassEmblem,
  "c-adjudicator": AdjudicatorClassEmblem,
  "c-thief": ThiefClassEmblem,
};

export const CLASS_EMBLEM_COLORS: Record<string, { text: string; glow: string }> = {
  "c-warrior":       { text: "text-red-400",     glow: "hover:drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]" },
  "c-guardian":      { text: "text-sky-400",     glow: "hover:drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]" },
  "c-brute":         { text: "text-orange-400",  glow: "hover:drop-shadow-[0_0_10px_rgba(251,146,60,0.4)]" },
  "c-ninja":         { text: "text-indigo-400",  glow: "hover:drop-shadow-[0_0_10px_rgba(129,140,248,0.4)]" },
  "c-ranger":        { text: "text-green-400",   glow: "hover:drop-shadow-[0_0_10px_rgba(74,222,128,0.4)]" },
  "c-wizard":        { text: "text-purple-400",  glow: "hover:drop-shadow-[0_0_10px_rgba(167,139,250,0.4)]" },
  "c-mechanologist": { text: "text-zinc-300",    glow: "hover:drop-shadow-[0_0_10px_rgba(161,161,170,0.4)]" },
  "c-runeblade":     { text: "text-violet-400",  glow: "hover:drop-shadow-[0_0_10px_rgba(139,92,246,0.4)]" },
  "c-illusionist":   { text: "text-pink-400",    glow: "hover:drop-shadow-[0_0_10px_rgba(240,171,252,0.4)]" },
  "c-assassin":      { text: "text-gray-400",    glow: "hover:drop-shadow-[0_0_10px_rgba(156,163,175,0.4)]" },
  "c-bard":          { text: "text-teal-400",    glow: "hover:drop-shadow-[0_0_10px_rgba(45,212,191,0.4)]" },
  "c-necromancer":   { text: "text-fuchsia-400", glow: "hover:drop-shadow-[0_0_10px_rgba(217,70,239,0.4)]" },
  "c-shapeshifter":  { text: "text-emerald-400", glow: "hover:drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]" },
  "c-merchant":      { text: "text-yellow-400",  glow: "hover:drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]" },
  "c-pirate":        { text: "text-cyan-400",    glow: "hover:drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]" },
  "c-adjudicator":   { text: "text-amber-400",   glow: "hover:drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]" },
  "c-thief":         { text: "text-slate-300",   glow: "hover:drop-shadow-[0_0_10px_rgba(148,163,184,0.4)]" },
};

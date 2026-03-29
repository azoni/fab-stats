import type { PlayoffFinish } from "@/lib/stats";
import { col, PLACEMENT_TEXT } from "../TrophyCase";

type DesignProps = { type: PlayoffFinish["type"]; id: string; idx?: number };

const MARBLE_PALETTES = [
  { from: "#a78bfa", to: "#6d28d9", swirl: "#c4b5fd", shine: "#ede9fe" },
  { from: "#f472b6", to: "#be185d", swirl: "#fbcfe8", shine: "#fce7f3" },
  { from: "#34d399", to: "#047857", swirl: "#6ee7b7", shine: "#d1fae5" },
  { from: "#38bdf8", to: "#0369a1", swirl: "#7dd3fc", shine: "#e0f2fe" },
  { from: "#fb923c", to: "#c2410c", swirl: "#fdba74", shine: "#fff7ed" },
  { from: "#f87171", to: "#b91c1c", swirl: "#fca5a5", shine: "#fef2f2" },
];

// ── Other ──

/** Design 0: Glass Marble (enhanced) */
export function OtherMarble({ type, id, idx }: DesignProps) {
  const pal = MARBLE_PALETTES[(idx ?? 0) % MARBLE_PALETTES.length];
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 32 32" className={ch ? "w-6 h-6" : "w-5 h-5"} style={{ filter: `drop-shadow(0 0 4px ${pal.from}55)` }}>
      <defs>
        <radialGradient id={`${id}mg`} cx="0.35" cy="0.3" r="0.65">
          <stop offset="0%" stopColor={pal.shine} />
          <stop offset="40%" stopColor={pal.from} />
          <stop offset="100%" stopColor={pal.to} />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill={`url(#${id}mg)`} stroke={pal.to} strokeWidth="0.8" />
      <path d="M10 20Q14 10 22 14Q26 18 18 24Q14 26 10 20Z" fill={pal.swirl} opacity="0.25" />
      <path d="M14 8Q18 12 24 10" fill="none" stroke={pal.swirl} strokeWidth="1.2" opacity="0.3" strokeLinecap="round" />
      <ellipse cx="12" cy="11" rx="4" ry="2.5" fill="white" opacity="0.45" transform="rotate(-20 12 11)" />
      <ellipse cx="11" cy="10.5" rx="1.8" ry="1" fill="white" opacity="0.6" transform="rotate(-20 11 10.5)" />
      <text x="16" y="18" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="7.5" fontWeight="700" fontFamily="system-ui,sans-serif" opacity="0.85">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 1: Crystal Orb — faceted crystal */
export function OtherCrystal({ type, id, idx }: DesignProps) {
  const pal = MARBLE_PALETTES[(idx ?? 0) % MARBLE_PALETTES.length];
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 32 32" className={ch ? "w-6 h-6" : "w-5 h-5"} style={{ filter: `drop-shadow(0 0 4px ${pal.from}55)` }}>
      <defs>
        <linearGradient id={`${id}cg`} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={pal.shine} /><stop offset="50%" stopColor={pal.from} /><stop offset="100%" stopColor={pal.to} />
        </linearGradient>
      </defs>
      {/* Faceted diamond shape */}
      <path d="M16 2L28 12L22 30L10 30L4 12Z" fill={`url(#${id}cg)`} stroke={pal.to} strokeWidth="0.8" />
      {/* Facet lines */}
      <line x1="16" y1="2" x2="16" y2="30" stroke={pal.swirl} strokeWidth="0.4" opacity="0.2" />
      <line x1="4" y1="12" x2="28" y2="12" stroke={pal.swirl} strokeWidth="0.4" opacity="0.2" />
      <line x1="16" y1="2" x2="10" y2="30" stroke={pal.swirl} strokeWidth="0.3" opacity="0.1" />
      <line x1="16" y1="2" x2="22" y2="30" stroke={pal.swirl} strokeWidth="0.3" opacity="0.1" />
      {/* Highlight */}
      <path d="M10 6L16 2L20 8Z" fill="white" opacity="0.15" />
      <text x="16" y="20" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="7" fontWeight="700" fontFamily="system-ui,sans-serif" opacity="0.85">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 2: Ancient Coin — weathered coin */
export function OtherCoin({ type, id, idx }: DesignProps) {
  const pal = MARBLE_PALETTES[(idx ?? 0) % MARBLE_PALETTES.length];
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 32 32" className={ch ? "w-6 h-6" : "w-5 h-5"} style={{ filter: `drop-shadow(0 0 4px ${pal.from}55)` }}>
      <defs>
        <radialGradient id={`${id}coin`} cx="0.4" cy="0.35" r="0.6">
          <stop offset="0%" stopColor={pal.from} /><stop offset="100%" stopColor={pal.to} />
        </radialGradient>
      </defs>
      {/* Coin body */}
      <circle cx="16" cy="16" r="14" fill={`url(#${id}coin)`} stroke={pal.to} strokeWidth="1" />
      <circle cx="16" cy="16" r="11" fill="none" stroke={pal.shine} strokeWidth="0.5" opacity="0.3" />
      {/* Star imprint */}
      <path d="M16 8L17.5 13L22.5 13L18.5 16L20 21L16 18L12 21L13.5 16L9.5 13L14.5 13Z" fill={pal.shine} opacity="0.2" />
      {/* Edge detail */}
      <circle cx="16" cy="16" r="13" fill="none" stroke={pal.swirl} strokeWidth="0.3" opacity="0.15" strokeDasharray="1.5 1.5" />
      {ch && <circle cx="16" cy="16" r="5" fill={pal.shine} opacity="0.08" />}
      <text x="16" y="18" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="7" fontWeight="700" fontFamily="system-ui,sans-serif" opacity="0.85">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

// ── Championship ──

/** Design 0: Championship Ring */
export function ChRing({ type, id, idx }: DesignProps) {
  const pal = MARBLE_PALETTES[(idx ?? 0) % MARBLE_PALETTES.length];
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 32 32" className={ch ? "w-6 h-6" : "w-5 h-5"} style={{ filter: `drop-shadow(0 0 4px ${pal.from}55)` }}>
      <defs>
        <linearGradient id={`${id}rg`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={pal.from} /><stop offset="100%" stopColor={pal.to} />
        </linearGradient>
      </defs>
      {/* Ring band */}
      <ellipse cx="16" cy="18" rx="12" ry="10" fill="none" stroke={`url(#${id}rg)`} strokeWidth="4" />
      {/* Gemstone setting */}
      <rect x="12" y="6" width="8" height="8" rx="1" fill={pal.from} stroke={pal.to} strokeWidth="0.8" transform="rotate(45 16 10)" />
      {/* Gem highlight */}
      <rect x="14" y="8" width="4" height="4" rx="0.5" fill={pal.shine} opacity="0.3" transform="rotate(45 16 10)" />
      {ch && (
        <>
          <circle cx="10" cy="8" r="0.8" fill={pal.shine} opacity="0.4" />
          <circle cx="22" cy="8" r="0.8" fill={pal.shine} opacity="0.4" />
        </>
      )}
      <text x="16" y="22" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="7" fontWeight="700" fontFamily="system-ui,sans-serif" opacity="0.85">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 1: Victory Wreath — laurel wreath circle */
export function ChWreath({ type, id, idx }: DesignProps) {
  const pal = MARBLE_PALETTES[(idx ?? 0) % MARBLE_PALETTES.length];
  const c = col(type);
  return (
    <svg viewBox="0 0 32 32" className={type === "champion" ? "w-6 h-6" : "w-5 h-5"} style={{ filter: `drop-shadow(0 0 4px ${pal.from}55)` }}>
      <defs>
        <radialGradient id={`${id}wg`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={pal.from} stopOpacity="0.3" /><stop offset="100%" stopColor={pal.to} stopOpacity="0.1" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill={`url(#${id}wg)`} />
      {/* Left laurel */}
      <path d="M8 24Q6 16 10 10Q12 12 10 16Q12 14 12 18Q14 16 13 20Q15 18 14 22" fill="none" stroke={pal.from} strokeWidth="1" strokeLinecap="round" />
      {/* Right laurel */}
      <path d="M24 24Q26 16 22 10Q20 12 22 16Q20 14 20 18Q18 16 19 20Q17 18 18 22" fill="none" stroke={pal.from} strokeWidth="1" strokeLinecap="round" />
      {/* Ribbon at bottom */}
      <path d="M12 26Q16 24 20 26" fill="none" stroke={pal.from} strokeWidth="1.5" strokeLinecap="round" />
      <text x="16" y="18" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="7.5" fontWeight="700" fontFamily="system-ui,sans-serif" opacity="0.85">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 2: Star Medallion */
export function ChStar({ type, id, idx }: DesignProps) {
  const pal = MARBLE_PALETTES[(idx ?? 0) % MARBLE_PALETTES.length];
  const c = col(type);
  return (
    <svg viewBox="0 0 32 32" className={type === "champion" ? "w-6 h-6" : "w-5 h-5"} style={{ filter: `drop-shadow(0 0 4px ${pal.from}55)` }}>
      <defs>
        <linearGradient id={`${id}sg`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={pal.from} /><stop offset="100%" stopColor={pal.to} />
        </linearGradient>
      </defs>
      {/* Star shape */}
      <path d="M16 2L19.5 11L29 11L21.5 17.5L24 27L16 22L8 27L10.5 17.5L3 11L12.5 11Z" fill={`url(#${id}sg)`} stroke={pal.to} strokeWidth="0.8" />
      {/* Inner star */}
      <path d="M16 7L18 13L23 13L19 16.5L20.5 22L16 19L11.5 22L13 16.5L9 13L14 13Z" fill={pal.shine} opacity="0.12" />
      {/* Highlight */}
      <path d="M14 6L16 2L17 8Z" fill="white" opacity="0.15" />
      <text x="16" y="17" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="7" fontWeight="700" fontFamily="system-ui,sans-serif" opacity="0.85">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

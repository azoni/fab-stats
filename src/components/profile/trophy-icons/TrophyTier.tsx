import type { PlayoffFinish } from "@/lib/stats";
import { col, glowFilter, PLACEMENT_TEXT } from "../TrophyCase";

type DesignProps = { type: PlayoffFinish["type"]; id: string };

// ── Worlds ──

/** Design 0: Golden Globe — ornate globe trophy with laurel wreath base */
export function WorldsGlobe({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 56 68" className={ch ? "w-10 h-12" : "w-[34px] h-10"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="50%" stopColor={c.to} /><stop offset="100%" stopColor={c.from} />
        </linearGradient>
        <radialGradient id={`${id}r`} cx="0.4" cy="0.35" r="0.6">
          <stop offset="0%" stopColor={c.text} stopOpacity="0.15" /><stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      {/* Globe */}
      <circle cx="28" cy="24" r="18" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.2" />
      <circle cx="28" cy="24" r="18" fill={`url(#${id}r)`} />
      {/* Longitude lines */}
      <ellipse cx="28" cy="24" rx="8" ry="18" fill="none" stroke={c.text} strokeWidth="0.4" opacity="0.2" />
      <ellipse cx="28" cy="24" rx="14" ry="18" fill="none" stroke={c.text} strokeWidth="0.3" opacity="0.15" />
      {/* Latitude lines */}
      <ellipse cx="28" cy="16" rx="16" ry="4" fill="none" stroke={c.text} strokeWidth="0.3" opacity="0.15" />
      <ellipse cx="28" cy="32" rx="16" ry="4" fill="none" stroke={c.text} strokeWidth="0.3" opacity="0.15" />
      {/* Highlight */}
      <ellipse cx="22" cy="18" rx="5" ry="3" fill="white" opacity="0.15" transform="rotate(-20 22 18)" />
      {/* Stem */}
      <rect x="25" y="42" width="6" height="8" rx="1" fill={c.to} stroke={c.stroke} strokeWidth="0.8" />
      {/* Laurel base */}
      <path d="M14 56Q20 50 28 52Q36 50 42 56" fill="none" stroke={c.stroke} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 56Q20 58 28 56Q36 58 42 56" fill="none" stroke={c.stroke} strokeWidth="1" opacity="0.5" />
      <rect x="16" y="55" width="24" height="5" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="0.8" />
      {ch && <path d="M28 12L30 17L35 17.5L31 21L32 26L28 23.5L24 26L25 21L21 17.5L26 17Z" fill={c.text} opacity="0.2" />}
      <text x="28" y="26" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "9" : "8"} fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 1: Celestial Crown — ornate crown with gemstone points */
export function WorldsCrown({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 56 64" className={ch ? "w-10 h-12" : "w-[34px] h-10"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Crown base band */}
      <path d="M10 36L10 28L18 18L28 26L38 18L46 28L46 36Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.2" />
      {/* Crown inner shine */}
      <path d="M13 35L13 29L19 21L28 28L37 21L43 29L43 35Z" fill={c.text} opacity="0.08" />
      {/* Gemstones on points */}
      <circle cx="18" cy="17" r="3" fill={c.from} stroke={c.stroke} strokeWidth="0.8" />
      <circle cx="28" cy="12" r="3.5" fill={c.from} stroke={c.stroke} strokeWidth="0.8" />
      <circle cx="38" cy="17" r="3" fill={c.from} stroke={c.stroke} strokeWidth="0.8" />
      {/* Gem highlights */}
      <circle cx="17" cy="16" r="1" fill="white" opacity="0.3" />
      <circle cx="27" cy="11" r="1.2" fill="white" opacity="0.3" />
      <circle cx="37" cy="16" r="1" fill="white" opacity="0.3" />
      {/* Base */}
      <rect x="8" y="36" width="40" height="6" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1" />
      {/* Pedestal */}
      <rect x="14" y="42" width="28" height="5" rx="1.5" fill={c.to} stroke={c.stroke} strokeWidth="0.8" />
      <rect x="10" y="47" width="36" height="6" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1" />
      {ch && (
        <>
          <circle cx="28" cy="12" r="5" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.3" strokeDasharray="1.5 1.5" />
          <path d="M28 8L28.5 10.5L31 11L28.5 11.5L28 14L27.5 11.5L25 11L27.5 10.5Z" fill={c.text} opacity="0.3" />
        </>
      )}
      <text x="28" y="32" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "9" : "8"} fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 2: Phoenix Rising — phoenix silhouette with flame wings */
export function WorldsPhoenix({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 56 68" className={ch ? "w-10 h-12" : "w-[34px] h-10"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
        <radialGradient id={`${id}glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={c.from} stopOpacity="0.3" /><stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      {/* Aura */}
      <circle cx="28" cy="30" r="24" fill={`url(#${id}glow)`} />
      {/* Phoenix body */}
      <path d="M28 8L32 16L38 12L34 22L44 18L36 28L46 28L36 34L42 40L32 36L34 46L28 38L22 46L24 36L14 40L20 34L10 28L20 28L12 18L22 22L18 12L24 16Z"
        fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="0.8" strokeLinejoin="round" />
      {/* Inner detail */}
      <path d="M28 14L30 20L34 18L32 24L28 22L24 24L22 18L26 20Z" fill={c.text} opacity="0.1" />
      {/* Eye */}
      <circle cx="28" cy="20" r="1.5" fill={c.text} opacity="0.4" />
      {/* Base flame */}
      <path d="M20 48Q24 42 28 48Q32 42 36 48Q32 52 28 50Q24 52 20 48Z" fill={c.to} stroke={c.stroke} strokeWidth="0.6" opacity="0.6" />
      {/* Pedestal */}
      <rect x="16" y="50" width="24" height="5" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="0.8" />
      {ch && (
        <>
          <circle cx="16" cy="14" r="1" fill={c.text} opacity="0.4" />
          <circle cx="40" cy="14" r="0.8" fill={c.text} opacity="0.3" />
          <circle cx="12" cy="24" r="0.6" fill={c.text} opacity="0.25" />
          <circle cx="44" cy="24" r="0.6" fill={c.text} opacity="0.25" />
        </>
      )}
      <text x="28" y="34" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "9" : "7.5"} fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

// ── Pro Tour ──

/** Design 0: Classic Chalice — ornate cup with wing handles */
export function PTChalice({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 56 64" className={ch ? "w-10 h-12" : "w-[34px] h-10"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Cup body */}
      <path d="M13 6L43 6L40 30Q38 38 28 40Q18 38 16 30Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.2" />
      <path d="M17 9L39 9L37 28Q36 34 28 36Q20 34 19 28Z" fill={c.text} opacity="0.08" />
      {/* Wing handles */}
      <path d="M13 10Q1 10 3 20Q5 28 16 28" fill="none" stroke={c.stroke} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M43 10Q55 10 53 20Q51 28 40 28" fill="none" stroke={c.stroke} strokeWidth="1.8" strokeLinecap="round" />
      {/* Feather details on handles */}
      <path d="M5 14Q8 14 10 18" fill="none" stroke={c.text} strokeWidth="0.4" opacity="0.2" />
      <path d="M51 14Q48 14 46 18" fill="none" stroke={c.text} strokeWidth="0.4" opacity="0.2" />
      {/* Stem */}
      <path d="M24 40L24 48L32 48L32 40" fill={c.to} stroke={c.stroke} strokeWidth="0.8" />
      {/* Ornate base */}
      <rect x="17" y="48" width="22" height="6" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1" />
      <rect x="14" y="54" width="28" height="4" rx="1.5" fill={c.to} stroke={c.stroke} strokeWidth="0.6" />
      {ch && (
        <>
          <path d="M28 12L30.2 17.5L36 18L31.5 22L32.8 28L28 25L23.2 28L24.5 22L20 18L25.8 17.5Z" fill={c.text} opacity="0.2" />
          <rect x="19" y="50" width="18" height="2" rx="1" fill={c.text} opacity="0.12" />
        </>
      )}
      <text x="28" y="24" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "10" : "8.5"} fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 1: War Standard — crossed swords behind a vertical banner */
export function PTStandard({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 56 68" className={ch ? "w-10 h-12" : "w-[34px] h-10"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Crossed swords behind */}
      <line x1="10" y1="10" x2="46" y2="55" stroke={c.stroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="46" y1="10" x2="10" y2="55" stroke={c.stroke} strokeWidth="2" strokeLinecap="round" />
      {/* Sword pommels */}
      <circle cx="10" cy="10" r="3" fill={c.from} stroke={c.stroke} strokeWidth="0.8" />
      <circle cx="46" cy="10" r="3" fill={c.from} stroke={c.stroke} strokeWidth="0.8" />
      {/* Banner */}
      <path d="M20 8L36 8L36 42L28 36L20 42Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1" />
      <path d="M22 10L34 10L34 38L28 33L22 38Z" fill={c.text} opacity="0.06" />
      {/* Banner ornament */}
      <line x1="22" y1="14" x2="34" y2="14" stroke={c.text} strokeWidth="0.5" opacity="0.2" />
      <line x1="22" y1="30" x2="34" y2="30" stroke={c.text} strokeWidth="0.5" opacity="0.2" />
      {/* Base */}
      <rect x="14" y="52" width="28" height="5" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="0.8" />
      {ch && <path d="M28 16L29.5 20L34 20.5L30.5 23.5L31.5 28L28 26L24.5 28L25.5 23.5L22 20.5L26.5 20Z" fill={c.text} opacity="0.2" />}
      <text x="28" y="24" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "9" : "8"} fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 2: Crystal Spire — tall crystalline tower with facets */
export function PTSpire({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 48 72" className={ch ? "w-8 h-12" : "w-7 h-10"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="50%" stopColor={c.text} stopOpacity="0.3" /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Main crystal */}
      <path d="M24 4L34 24L32 50L24 56L16 50L14 24Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1" />
      {/* Facet lines */}
      <line x1="24" y1="4" x2="24" y2="56" stroke={c.text} strokeWidth="0.4" opacity="0.15" />
      <line x1="14" y1="24" x2="34" y2="24" stroke={c.text} strokeWidth="0.3" opacity="0.12" />
      <line x1="15" y1="38" x2="33" y2="38" stroke={c.text} strokeWidth="0.3" opacity="0.12" />
      {/* Light facets */}
      <path d="M24 4L34 24L24 24Z" fill={c.text} opacity="0.08" />
      <path d="M24 24L34 24L32 50L24 56Z" fill={c.text} opacity="0.04" />
      {/* Highlight */}
      <path d="M18 10L22 8L20 18Z" fill="white" opacity="0.12" />
      {/* Base ring */}
      <ellipse cx="24" cy="58" rx="14" ry="4" fill={c.to} stroke={c.stroke} strokeWidth="0.8" />
      {/* Pedestal */}
      <rect x="12" y="60" width="24" height="5" rx="2" fill={c.to} stroke={c.stroke} strokeWidth="0.8" />
      {ch && (
        <>
          <circle cx="18" cy="14" r="1" fill={c.text} opacity="0.4" />
          <circle cx="30" cy="18" r="0.8" fill={c.text} opacity="0.3" />
          <circle cx="20" cy="44" r="0.6" fill={c.text} opacity="0.25" />
        </>
      )}
      <text x="24" y="36" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "9" : "7.5"} fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

// ── Nationals ──

/** Design 0: Flag Shield — shield with draped flag */
export function NatShield({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 52 64" className={ch ? "w-9 h-11" : "w-8 h-10"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Shield */}
      <path d="M26 4L48 14L48 36L26 56L4 36L4 14Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.2" />
      <path d="M26 8L44 16L44 34L26 52L8 34L8 16Z" fill={c.text} opacity="0.06" />
      {/* Inner border */}
      <path d="M26 12L40 18L40 32L26 48L12 32L12 18Z" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.2" />
      {/* Flag drape */}
      <path d="M18 18L34 18L36 22L32 20L28 22L24 20L20 22L16 20Z" fill={c.to} stroke={c.stroke} strokeWidth="0.5" opacity="0.4" />
      {ch && <path d="M26 20L28 25L33 25.5L29 29L30 34L26 31.5L22 34L23 29L19 25.5L24 25Z" fill={c.text} opacity="0.2" />}
      <text x="26" y="34" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "10" : "8"} fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 1: Heraldic Eagle — eagle with spread wings on pedestal */
export function NatEagle({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 56 64" className={ch ? "w-10 h-12" : "w-[34px] h-10"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Wings */}
      <path d="M28 18L6 8L10 28L20 32Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="0.8" />
      <path d="M28 18L50 8L46 28L36 32Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="0.8" />
      {/* Feather lines */}
      <line x1="12" y1="14" x2="22" y2="28" stroke={c.text} strokeWidth="0.3" opacity="0.15" />
      <line x1="44" y1="14" x2="34" y2="28" stroke={c.text} strokeWidth="0.3" opacity="0.15" />
      {/* Body */}
      <ellipse cx="28" cy="28" rx="8" ry="12" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1" />
      {/* Head */}
      <circle cx="28" cy="16" r="5" fill={c.from} stroke={c.stroke} strokeWidth="0.8" />
      <circle cx="28" cy="15" r="1" fill={c.text} opacity="0.5" />
      {/* Beak */}
      <path d="M28 18L30 22L28 21L26 22Z" fill={c.to} />
      {/* Pedestal */}
      <rect x="18" y="42" width="20" height="4" rx="1.5" fill={c.to} stroke={c.stroke} strokeWidth="0.6" />
      <rect x="14" y="46" width="28" height="5" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="0.8" />
      {ch && (
        <>
          <circle cx="28" cy="12" r="2" fill={c.text} opacity="0.15" />
          <path d="M24 6L28 4L32 6" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.3" />
        </>
      )}
      <text x="28" y="32" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "8" : "7"} fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 2: Forge & Anvil — hammer and anvil on pedestal */
export function NatForge({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 56 64" className={ch ? "w-10 h-12" : "w-[34px] h-10"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Hammer handle (diagonal) */}
      <line x1="16" y1="8" x2="34" y2="32" stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round" />
      {/* Hammer head */}
      <rect x="32" y="26" width="14" height="8" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1" transform="rotate(-10 39 30)" />
      {/* Anvil */}
      <path d="M12 38L44 38L48 44L8 44Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1" />
      <rect x="14" y="44" width="28" height="4" fill={c.to} stroke={c.stroke} strokeWidth="0.6" />
      {/* Anvil horn */}
      <path d="M12 38L6 36L8 44" fill={c.to} stroke={c.stroke} strokeWidth="0.8" />
      {/* Anvil highlight */}
      <line x1="16" y1="40" x2="40" y2="40" stroke={c.text} strokeWidth="0.4" opacity="0.15" />
      {/* Sparks (champion only) */}
      {ch && (
        <>
          <circle cx="38" cy="24" r="1.2" fill={c.from} opacity="0.6" />
          <circle cx="42" cy="20" r="0.8" fill={c.text} opacity="0.4" />
          <circle cx="36" cy="18" r="0.6" fill={c.text} opacity="0.3" />
          <circle cx="44" cy="26" r="0.5" fill={c.from} opacity="0.4" />
        </>
      )}
      {/* Base */}
      <rect x="10" y="50" width="36" height="5" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="0.8" />
      <text x="28" y="42" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "8" : "7"} fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

// ── The Calling ──

/** Design 0: Mystic Chalice — chalice with eye motif */
export function TCChalice({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 56 64" className={ch ? "w-10 h-12" : "w-[34px] h-10"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Chalice cup */}
      <path d="M14 8L42 8L38 32Q36 38 28 40Q20 38 18 32Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.2" />
      <path d="M18 11L38 11L35 30Q34 34 28 36Q22 34 21 30Z" fill={c.text} opacity="0.06" />
      {/* Eye motif */}
      <ellipse cx="28" cy="22" rx="8" ry="5" fill="none" stroke={c.text} strokeWidth="0.6" opacity="0.3" />
      <circle cx="28" cy="22" r="2.5" fill={c.text} opacity="0.15" />
      <circle cx="28" cy="22" r="1" fill={c.text} opacity="0.3" />
      {/* Stem */}
      <rect x="25" y="40" width="6" height="8" rx="1" fill={c.to} stroke={c.stroke} strokeWidth="0.6" />
      {/* Base */}
      <ellipse cx="28" cy="50" rx="12" ry="3" fill={c.to} stroke={c.stroke} strokeWidth="0.8" />
      <rect x="16" y="50" width="24" height="5" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="0.8" />
      {ch && (
        <>
          <path d="M28 14L29.5 18L33.5 18.5L30.5 21L31 25L28 23L25 25L25.5 21L22.5 18.5L26.5 18Z" fill={c.text} opacity="0.15" />
          <circle cx="28" cy="22" r="6" fill="none" stroke={c.text} strokeWidth="0.3" opacity="0.2" strokeDasharray="1.5 1.5" />
        </>
      )}
      <text x="28" y="24" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "9" : "8"} fontWeight="700" fontFamily="system-ui,sans-serif" opacity="0">{PLACEMENT_TEXT[type]}</text>
      <text x="28" y="30" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "9" : "8"} fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 1: Arcane Tome — book with glowing seal */
export function TCTome({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 52 60" className={ch ? "w-9 h-11" : "w-8 h-9"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Book back cover */}
      <rect x="8" y="6" width="36" height="44" rx="2" fill={c.to} stroke={c.stroke} strokeWidth="1" />
      {/* Book spine */}
      <rect x="8" y="6" width="5" height="44" fill={c.stroke} />
      {/* Book front cover */}
      <rect x="10" y="4" width="34" height="44" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1" />
      {/* Page edges */}
      <line x1="14" y1="8" x2="14" y2="44" stroke={c.text} strokeWidth="0.3" opacity="0.15" />
      {/* Seal/emblem on cover */}
      <circle cx="27" cy="26" r="10" fill="none" stroke={c.text} strokeWidth="0.8" opacity="0.3" />
      <circle cx="27" cy="26" r="7" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.2" />
      {/* Rune in center */}
      <path d="M27 19L30 24L27 29L24 24Z" fill={c.text} opacity="0.2" />
      {ch && (
        <>
          <circle cx="27" cy="26" r="12" fill="none" stroke={c.text} strokeWidth="0.4" opacity="0.15" strokeDasharray="2 2" />
          <circle cx="20" cy="16" r="1" fill={c.text} opacity="0.3" />
          <circle cx="34" cy="16" r="0.8" fill={c.text} opacity="0.25" />
        </>
      )}
      {/* Clasp */}
      <rect x="40" y="22" width="4" height="8" rx="1" fill={c.from} stroke={c.stroke} strokeWidth="0.6" />
      {/* Base */}
      <rect x="6" y="50" width="40" height="4" rx="1.5" fill={c.to} stroke={c.stroke} strokeWidth="0.6" />
      <text x="27" y="28" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "8" : "7"} fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 2: Summoning Circle — glowing arcane circle pendant */
export function TCCircle({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 48 56" className={ch ? "w-9 h-10" : "w-7 h-9"} style={{ filter: glowFilter(type) }}>
      <defs>
        <radialGradient id={`${id}g`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={c.from} stopOpacity="0.4" /><stop offset="100%" stopColor={c.to} stopOpacity="0.1" />
        </radialGradient>
      </defs>
      {/* Chain */}
      <path d="M14 4Q24 10 34 4" fill="none" stroke={c.stroke} strokeWidth="1.5" />
      {/* Outer circle */}
      <circle cx="24" cy="30" r="18" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.2" />
      {/* Inner arcane rings */}
      <circle cx="24" cy="30" r="14" fill="none" stroke={c.from} strokeWidth="0.6" opacity="0.4" />
      <circle cx="24" cy="30" r="10" fill="none" stroke={c.from} strokeWidth="0.4" opacity="0.3" />
      {/* Pentagram/star */}
      <path d="M24 16L27.5 25L37 25L29.5 31L32 40L24 34.5L16 40L18.5 31L11 25L20.5 25Z" fill="none" stroke={c.from} strokeWidth="0.6" opacity="0.35" />
      {/* Center glow */}
      <circle cx="24" cy="30" r="4" fill={c.from} opacity="0.2" />
      {ch && (
        <>
          <circle cx="24" cy="30" r="20" fill="none" stroke={c.text} strokeWidth="0.3" opacity="0.15" strokeDasharray="2.5 2.5" />
          <circle cx="14" cy="18" r="0.8" fill={c.text} opacity="0.3" />
          <circle cx="34" cy="18" r="0.8" fill={c.text} opacity="0.3" />
          <circle cx="10" cy="36" r="0.6" fill={c.text} opacity="0.2" />
          <circle cx="38" cy="36" r="0.6" fill={c.text} opacity="0.2" />
        </>
      )}
      <text x="24" y="32" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "9" : "7.5"} fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

// ── Battle Hardened ──

/** Design 0: War Trophy — crossed axes trophy */
export function BHAxes({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 56 64" className={ch ? "w-10 h-12" : "w-[34px] h-10"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Crossed axe handles */}
      <line x1="12" y1="8" x2="44" y2="44" stroke={c.stroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="8" x2="12" y2="44" stroke={c.stroke} strokeWidth="2" strokeLinecap="round" />
      {/* Axe heads */}
      <path d="M8 6Q4 2 8 0Q16 4 18 12Q12 12 8 6Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="0.8" />
      <path d="M48 6Q52 2 48 0Q40 4 38 12Q44 12 48 6Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="0.8" />
      {/* Center shield */}
      <circle cx="28" cy="26" r="10" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.2" />
      <circle cx="28" cy="26" r="7" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.2" />
      {ch && <path d="M28 20L29.5 24L34 24.5L30.5 27L31.5 31.5L28 29L24.5 31.5L25.5 27L22 24.5L26.5 24Z" fill={c.text} opacity="0.2" />}
      {/* Base */}
      <rect x="14" y="48" width="28" height="5" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="0.8" />
      <text x="28" y="28" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "8" : "7"} fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 1: Battle Helm — warrior helmet on pedestal */
export function BHHelm({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 52 64" className={ch ? "w-9 h-11" : "w-8 h-10"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Plume */}
      <path d="M26 4Q22 8 20 4Q24 0 28 2Q32 0 36 4Q34 8 30 4Q28 6 26 4Z" fill={c.from} stroke={c.stroke} strokeWidth="0.6" opacity="0.7" />
      {/* Helmet dome */}
      <path d="M10 28Q10 8 26 6Q42 8 42 28Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.2" />
      {/* Visor slit */}
      <path d="M14 24L38 24L36 28L16 28Z" fill={c.stroke} opacity="0.6" />
      <rect x="20" y="24" width="12" height="3" fill={c.text} opacity="0.08" />
      {/* Nose guard */}
      <line x1="26" y1="18" x2="26" y2="28" stroke={c.stroke} strokeWidth="1.5" />
      {/* Cheek guards */}
      <path d="M10 28L8 38L18 36L14 28Z" fill={c.to} stroke={c.stroke} strokeWidth="0.6" />
      <path d="M42 28L44 38L34 36L38 28Z" fill={c.to} stroke={c.stroke} strokeWidth="0.6" />
      {/* Highlight */}
      <path d="M16 12Q20 10 26 10" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.15" />
      {ch && <circle cx="26" cy="14" r="3" fill={c.text} opacity="0.1" />}
      {/* Pedestal */}
      <rect x="12" y="42" width="28" height="4" rx="1.5" fill={c.to} stroke={c.stroke} strokeWidth="0.6" />
      <rect x="8" y="46" width="36" height="5" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="0.8" />
      <text x="26" y="34" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "8" : "7"} fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 2: Gauntlet Fist — armored fist with ring */
export function BHGauntlet({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 48 64" className={ch ? "w-8 h-11" : "w-7 h-10"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Fist */}
      <path d="M14 16L18 8L22 8L22 14L26 8L30 8L30 14L34 10L38 12L36 20L36 32L28 38L20 38L14 32Z"
        fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1" />
      {/* Knuckle lines */}
      <line x1="18" y1="14" x2="18" y2="20" stroke={c.text} strokeWidth="0.4" opacity="0.2" />
      <line x1="22" y1="14" x2="22" y2="20" stroke={c.text} strokeWidth="0.4" opacity="0.2" />
      <line x1="26" y1="14" x2="26" y2="20" stroke={c.text} strokeWidth="0.4" opacity="0.2" />
      <line x1="30" y1="14" x2="30" y2="20" stroke={c.text} strokeWidth="0.4" opacity="0.2" />
      {/* Wrist guard */}
      <rect x="14" y="32" width="22" height="6" rx="1" fill={c.to} stroke={c.stroke} strokeWidth="0.8" />
      {/* Ring on finger */}
      <circle cx="26" cy="12" r="3" fill="none" stroke={c.from} strokeWidth="1.5" />
      {ch && (
        <>
          <circle cx="26" cy="12" r="1.5" fill={c.text} opacity="0.3" />
          <circle cx="18" cy="6" r="0.8" fill={c.text} opacity="0.3" />
          <circle cx="34" cy="8" r="0.6" fill={c.text} opacity="0.25" />
        </>
      )}
      {/* Pedestal */}
      <rect x="10" y="42" width="28" height="4" rx="1.5" fill={c.to} stroke={c.stroke} strokeWidth="0.6" />
      <rect x="6" y="46" width="36" height="5" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="0.8" />
      <text x="24" y="26" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "8" : "7"} fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

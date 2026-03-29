import type { PlayoffFinish } from "@/lib/stats";
import { col, glowFilter, PLACEMENT_TEXT } from "../TrophyCase";

type DesignProps = { type: PlayoffFinish["type"]; id: string };

// ── ProQuest ──

/** Design 0: Compass Shield — diamond shield with compass rose */
export function PQCompass({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 40 48" className={ch ? "w-6 h-7" : "w-5 h-6"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      <path d="M20 2L37 10L37 28L20 46L3 28L3 10Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.5" />
      <path d="M20 6L34 12.5L34 27L20 42.5L6 27L6 12.5Z" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.25" />
      {/* Compass rose */}
      <path d="M20 14L22 24L20 26L18 24Z" fill={c.text} opacity="0.2" />
      <path d="M14 22L18 20L20 22L18 24Z" fill={c.text} opacity="0.15" />
      <path d="M26 22L22 20L20 22L22 24Z" fill={c.text} opacity="0.15" />
      <circle cx="20" cy="22" r="2" fill={c.text} opacity="0.1" />
      {ch && <path d="M20 11L22.5 16.5L28.5 17L24 21L25 27L20 24L15 27L16 21L11.5 17L17.5 16.5Z" fill={c.text} opacity="0.15" />}
      <text x="20" y="32" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="10" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 1: Treasure Scroll — rolled scroll badge */
export function PQScroll({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 40 48" className={ch ? "w-6 h-7" : "w-5 h-6"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Scroll body */}
      <rect x="8" y="8" width="24" height="32" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1" />
      {/* Top roll */}
      <ellipse cx="20" cy="8" rx="14" ry="4" fill={c.from} stroke={c.stroke} strokeWidth="1" />
      {/* Bottom roll */}
      <ellipse cx="20" cy="40" rx="14" ry="4" fill={c.to} stroke={c.stroke} strokeWidth="1" />
      {/* Text lines */}
      <line x1="12" y1="16" x2="28" y2="16" stroke={c.text} strokeWidth="0.4" opacity="0.15" />
      <line x1="12" y1="20" x2="28" y2="20" stroke={c.text} strokeWidth="0.4" opacity="0.12" />
      <line x1="12" y1="24" x2="28" y2="24" stroke={c.text} strokeWidth="0.4" opacity="0.1" />
      {/* Seal */}
      <circle cx="20" cy="32" r="4" fill={c.to} stroke={c.stroke} strokeWidth="0.6" />
      {ch && <circle cx="20" cy="32" r="2" fill={c.text} opacity="0.2" />}
      <text x="20" y="28" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="9" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 2: Explorer's Pack — backpack emblem */
export function PQPack({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 40 48" className={ch ? "w-6 h-7" : "w-5 h-6"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Pack body */}
      <path d="M8 16L32 16L34 40L6 40Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1" />
      {/* Flap */}
      <path d="M8 16Q8 8 20 6Q32 8 32 16" fill={c.to} stroke={c.stroke} strokeWidth="1" />
      {/* Buckle */}
      <rect x="16" y="14" width="8" height="5" rx="1" fill={c.stroke} />
      <rect x="17" y="15" width="6" height="3" rx="0.5" fill={c.from} />
      {/* Straps */}
      <line x1="12" y1="16" x2="10" y2="40" stroke={c.stroke} strokeWidth="1.5" />
      <line x1="28" y1="16" x2="30" y2="40" stroke={c.stroke} strokeWidth="1.5" />
      {/* Pocket */}
      <rect x="14" y="24" width="12" height="8" rx="1" fill={c.to} stroke={c.stroke} strokeWidth="0.5" />
      {ch && <path d="M20 26L21 28.5L24 29L21.5 30.5L22 33L20 31.5L18 33L18.5 30.5L16 29L19 28.5Z" fill={c.text} opacity="0.2" />}
      <text x="20" y="30" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="8" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

// ── Road to Nationals ──

/** Design 0: Road Shield — shield with arrow pointing up */
export function RTNRoad({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 40 48" className={ch ? "w-6 h-7" : "w-5 h-6"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      <path d="M20 2L37 10L37 28L20 46L3 28L3 10Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.5" />
      <path d="M20 6L34 12.5L34 27L20 42.5L6 27L6 12.5Z" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.25" />
      {/* Upward arrow */}
      <path d="M20 12L28 22L23 22L23 32L17 32L17 22L12 22Z" fill={c.text} opacity="0.2" />
      {ch && <path d="M20 11L22.5 16.5L28.5 17L24 21L25 27L20 24L15 27L16 21L11.5 17L17.5 16.5Z" fill={c.text} opacity="0.12" />}
      <text x="20" y="28" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="10" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 1: Milestone Stone — stone marker badge */
export function RTNStone({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 36 48" className={ch ? "w-6 h-7" : "w-5 h-6"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Stone body — rounded rectangle with pointed top */}
      <path d="M8 44L8 14Q8 4 18 4Q28 4 28 14L28 44Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.2" />
      {/* Stone texture lines */}
      <line x1="10" y1="18" x2="26" y2="18" stroke={c.text} strokeWidth="0.4" opacity="0.12" />
      <line x1="10" y1="36" x2="26" y2="36" stroke={c.text} strokeWidth="0.4" opacity="0.12" />
      {/* Carved detail */}
      <rect x="12" y="20" width="12" height="14" rx="1" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.2" />
      {ch && <circle cx="18" cy="10" r="3" fill={c.text} opacity="0.15" />}
      <text x="18" y="28" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="9" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 2: Journey Compass — compass medallion */
export function RTNCompass({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 40 44" className={ch ? "w-6 h-7" : "w-5 h-6"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Compass body */}
      <circle cx="20" cy="22" r="18" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.2" />
      <circle cx="20" cy="22" r="14" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.2" />
      {/* Cardinal points */}
      <path d="M20 6L22 18L20 20L18 18Z" fill={c.text} opacity="0.25" />
      <path d="M20 38L18 26L20 24L22 26Z" fill={c.text} opacity="0.12" />
      <path d="M4 22L16 20L18 22L16 24Z" fill={c.text} opacity="0.12" />
      <path d="M36 22L24 24L22 22L24 20Z" fill={c.text} opacity="0.12" />
      {/* Center */}
      <circle cx="20" cy="22" r="3" fill={c.to} stroke={c.stroke} strokeWidth="0.5" />
      {ch && (
        <>
          <circle cx="20" cy="22" r="16" fill="none" stroke={c.text} strokeWidth="0.4" opacity="0.12" strokeDasharray="2 2" />
          <circle cx="20" cy="22" r="1.5" fill={c.text} opacity="0.3" />
        </>
      )}
      <text x="20" y="24" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="8" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

// ── Skirmish ──

/** Design 0: Round Shield — simple shield with chevron */
export function SKShield({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 40 48" className={ch ? "w-6 h-7" : "w-5 h-6"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      <path d="M20 2L37 10L37 28L20 46L3 28L3 10Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.5" />
      <path d="M20 6L34 12.5L34 27L20 42.5L6 27L6 12.5Z" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.25" />
      {/* Chevron */}
      <path d="M12 20L20 14L28 20L20 26Z" fill={c.text} opacity="0.15" />
      {ch && <path d="M20 11L22.5 16.5L28.5 17L24 21L25 27L20 24L15 27L16 21L11.5 17L17.5 16.5Z" fill={c.text} opacity="0.15" />}
      <text x="20" y="32" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="10" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 1: Dagger & Cloak — crossed daggers emblem */
export function SKDagger({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 40 48" className={ch ? "w-6 h-7" : "w-5 h-6"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Circle base */}
      <circle cx="20" cy="24" r="18" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.2" />
      <circle cx="20" cy="24" r="14" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.2" />
      {/* Crossed daggers */}
      <line x1="12" y1="14" x2="28" y2="34" stroke={c.text} strokeWidth="1.2" opacity="0.3" strokeLinecap="round" />
      <line x1="28" y1="14" x2="12" y2="34" stroke={c.text} strokeWidth="1.2" opacity="0.3" strokeLinecap="round" />
      {/* Guards */}
      <line x1="14" y1="18" x2="18" y2="16" stroke={c.text} strokeWidth="0.8" opacity="0.25" />
      <line x1="26" y1="18" x2="22" y2="16" stroke={c.text} strokeWidth="0.8" opacity="0.25" />
      {ch && <path d="M20 18L21.5 22L25.5 22.5L22.5 25L23 28.5L20 27L17 28.5L17.5 25L14.5 22.5L18.5 22Z" fill={c.text} opacity="0.15" />}
      <text x="20" y="26" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="9" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 2: Lightning Strike — bolt in circle */
export function SKBolt({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 40 48" className={ch ? "w-6 h-7" : "w-5 h-6"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Shield shape */}
      <path d="M20 2L37 10L37 28L20 46L3 28L3 10Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.5" />
      <path d="M20 6L34 12.5L34 27L20 42.5L6 27L6 12.5Z" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.2" />
      {/* Lightning bolt */}
      <path d="M18 10L24 10L20 20L26 20L16 36L20 24L14 24Z" fill={c.text} opacity="0.25" />
      {ch && (
        <>
          <circle cx="20" cy="24" r="12" fill="none" stroke={c.text} strokeWidth="0.4" opacity="0.12" strokeDasharray="1.5 1.5" />
          <circle cx="12" cy="14" r="0.8" fill={c.text} opacity="0.3" />
          <circle cx="28" cy="14" r="0.8" fill={c.text} opacity="0.3" />
        </>
      )}
      <text x="20" y="30" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="9" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

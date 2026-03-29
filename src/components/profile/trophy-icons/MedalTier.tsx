import type { PlayoffFinish } from "@/lib/stats";
import { col, glowFilter, PLACEMENT_TEXT } from "../TrophyCase";

type DesignProps = { type: PlayoffFinish["type"]; id: string };

// ── Showdown ──

/** Design 0: Versus Medal — lightning bolt medal */
export function SDVersus({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 48 58" className={ch ? "w-8 h-10" : "w-7 h-[34px]"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} stopOpacity="0.6" /><stop offset="100%" stopColor={c.to} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {/* V-ribbon */}
      <path d="M14 0L18 0L24 20L20 20Z" fill={`url(#${id}r)`} />
      <path d="M30 0L34 0L28 20L24 20Z" fill={`url(#${id}r)`} />
      {/* Medal body */}
      <circle cx="24" cy="38" r="17" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="24" cy="38" r="13.5" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.3" />
      {/* Lightning bolt */}
      <path d="M22 28L28 28L24 36L30 36L20 48L24 40L18 40Z" fill={c.text} opacity="0.25" />
      {ch && (
        <>
          <circle cx="24" cy="38" r="15.5" fill="none" stroke={c.text} strokeWidth="0.7" opacity="0.15" strokeDasharray="2 2" />
          <path d="M24 28L26 32L30 32.5L27 35L28 39L24 37L20 39L21 35L18 32.5L22 32Z" fill={c.text} opacity="0.12" />
        </>
      )}
      <text x="24" y="40" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="10" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 1: Dueling Swords — two swords with ribbon */
export function SDSwords({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 48 58" className={ch ? "w-8 h-10" : "w-7 h-[34px]"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Ribbon */}
      <path d="M8 12L18 8L24 14L30 8L40 12L38 18L24 22L10 18Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="0.8" />
      {/* Crossed swords */}
      <line x1="10" y1="14" x2="38" y2="50" stroke={c.stroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="14" x2="10" y2="50" stroke={c.stroke} strokeWidth="2" strokeLinecap="round" />
      {/* Guards */}
      <ellipse cx="16" cy="22" rx="4" ry="2" fill={c.from} stroke={c.stroke} strokeWidth="0.6" transform="rotate(-40 16 22)" />
      <ellipse cx="32" cy="22" rx="4" ry="2" fill={c.from} stroke={c.stroke} strokeWidth="0.6" transform="rotate(40 32 22)" />
      {/* Center medallion */}
      <circle cx="24" cy="32" r="8" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1" />
      <circle cx="24" cy="32" r="5.5" fill="none" stroke={c.text} strokeWidth="0.4" opacity="0.25" />
      {ch && <path d="M24 26L25.5 30L30 30.5L26.5 33L27.5 37.5L24 35L20.5 37.5L21.5 33L18 30.5L22.5 30Z" fill={c.text} opacity="0.18" />}
      <text x="24" y="34" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="8" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 2: Arena Gates — ornate gate medallion */
export function SDArena({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 48 58" className={ch ? "w-8 h-10" : "w-7 h-[34px]"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Ribbon */}
      <path d="M14 0L18 0L24 16L20 16Z" fill={c.from} opacity="0.5" />
      <path d="M30 0L34 0L28 16L24 16Z" fill={c.from} opacity="0.5" />
      {/* Gate arch */}
      <path d="M8 48L8 24Q8 12 24 12Q40 12 40 24L40 48Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.2" />
      {/* Gate door */}
      <rect x="14" y="28" width="8" height="20" rx="1" fill={c.to} stroke={c.stroke} strokeWidth="0.6" />
      <rect x="26" y="28" width="8" height="20" rx="1" fill={c.to} stroke={c.stroke} strokeWidth="0.6" />
      {/* Door details */}
      <circle cx="21" cy="38" r="1" fill={c.text} opacity="0.3" />
      <circle cx="27" cy="38" r="1" fill={c.text} opacity="0.3" />
      {/* Arch keystone */}
      <path d="M22 14L26 14L26 18L22 18Z" fill={c.from} stroke={c.stroke} strokeWidth="0.5" />
      {/* Inner arch */}
      <path d="M14 48L14 28Q14 20 24 20Q34 20 34 28L34 48" fill="none" stroke={c.text} strokeWidth="0.4" opacity="0.2" />
      {ch && (
        <>
          <path d="M24 16L25 18L27 18.5L25.5 20L26 22L24 21L22 22L22.5 20L21 18.5L23 18Z" fill={c.text} opacity="0.25" />
          <line x1="8" y1="24" x2="40" y2="24" stroke={c.text} strokeWidth="0.3" opacity="0.15" />
        </>
      )}
      <text x="24" y="36" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="8" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

// ── Battlegrounds ──

/** Design 0: Crossed Swords Medal — swords with round medal */
export function BGSwords({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 48 58" className={ch ? "w-8 h-10" : "w-7 h-[34px]"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} stopOpacity="0.6" /><stop offset="100%" stopColor={c.to} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {/* V-ribbon */}
      <path d="M14 0L18 0L24 20L20 20Z" fill={`url(#${id}r)`} />
      <path d="M30 0L34 0L28 20L24 20Z" fill={`url(#${id}r)`} />
      {/* Crossed swords behind medal */}
      <line x1="8" y1="22" x2="40" y2="54" stroke={c.stroke} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="22" x2="8" y2="54" stroke={c.stroke} strokeWidth="1.5" strokeLinecap="round" />
      {/* Medal body */}
      <circle cx="24" cy="38" r="14" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="24" cy="38" r="10.5" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.25" />
      {ch && (
        <>
          <circle cx="24" cy="38" r="12.5" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.15" strokeDasharray="2 2" />
          <path d="M24 30L25.5 34L30 34.5L26.5 37L27.5 41.5L24 39L20.5 41.5L21.5 37L18 34.5L22.5 34Z" fill={c.text} opacity="0.15" />
        </>
      )}
      <text x="24" y="40" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="9" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 1: Arena Shield — hexagonal shield with banner */
export function BGShield({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 48 58" className={ch ? "w-8 h-10" : "w-7 h-[34px]"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Banner ribbon top */}
      <path d="M6 10L18 6L24 10L30 6L42 10L40 16L24 20L8 16Z" fill={c.from} opacity="0.4" stroke={c.stroke} strokeWidth="0.6" />
      {/* Shield body — hexagonal */}
      <path d="M24 12L40 20L40 38L24 50L8 38L8 20Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.2" />
      {/* Inner shield */}
      <path d="M24 16L36 22L36 36L24 46L12 36L12 22Z" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.2" />
      {/* Center battle emblem */}
      <circle cx="24" cy="32" r="6" fill={c.to} stroke={c.text} strokeWidth="0.5" opacity="0.3" />
      <path d="M21 32L24 28L27 32L24 36Z" fill={c.text} opacity="0.2" />
      {ch && (
        <>
          <path d="M24 26L25 29L28 29.5L26 31.5L26.5 34.5L24 33L21.5 34.5L22 31.5L20 29.5L23 29Z" fill={c.text} opacity="0.15" />
          <line x1="12" y1="22" x2="36" y2="22" stroke={c.text} strokeWidth="0.3" opacity="0.12" />
        </>
      )}
      <text x="24" y="34" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="8" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/** Design 2: War Banner — pennant flag medal */
export function BGBanner({ type, id }: DesignProps) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 48 62" className={ch ? "w-8 h-10" : "w-7 h-[34px]"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Pole */}
      <line x1="16" y1="4" x2="16" y2="56" stroke={c.stroke} strokeWidth="2" strokeLinecap="round" />
      {/* Pole top ornament */}
      <circle cx="16" cy="4" r="3" fill={c.from} stroke={c.stroke} strokeWidth="0.8" />
      {/* Banner flag */}
      <path d="M18 8L42 12L40 28L18 32Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1" />
      {/* Banner tail */}
      <path d="M18 32L42 28L40 36L18 40Z" fill={c.to} stroke={c.stroke} strokeWidth="0.6" opacity="0.6" />
      {/* Banner detail lines */}
      <line x1="22" y1="12" x2="22" y2="30" stroke={c.text} strokeWidth="0.3" opacity="0.15" />
      <line x1="20" y1="18" x2="38" y2="20" stroke={c.text} strokeWidth="0.3" opacity="0.12" />
      {/* Banner emblem */}
      <circle cx="30" cy="20" r="5" fill={c.to} stroke={c.text} strokeWidth="0.4" opacity="0.3" />
      {ch && <path d="M30 16L31 19L34 19.5L31.5 21.5L32 24.5L30 23L28 24.5L28.5 21.5L26 19.5L29 19Z" fill={c.text} opacity="0.2" />}
      {/* Base */}
      <rect x="8" y="52" width="32" height="5" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="0.8" />
      <text x="30" y="22" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="7" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

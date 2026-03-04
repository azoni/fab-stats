/**
 * Shared ornamental SVG elements for share cards.
 * All elements are inline SVG so they render reliably with html-to-image.
 */

/** Corner filigree ornaments — positioned absolute in each corner */
export function CornerFiligree({ color, size = 24, opacity = 0.2 }: { color: string; size?: number; opacity?: number }) {
  return (
    <>
      {/* Top-left */}
      <svg className="absolute top-2.5 left-2.5" width={size} height={size} viewBox="0 0 24 24" style={{ opacity }}>
        <path d="M2 14 L2 5 C2 3 3 2 5 2 L14 2" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M2 8 C2 5 5 2 8 2" fill="none" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
        <circle cx="2" cy="2" r="1.5" fill={color} />
      </svg>
      {/* Top-right */}
      <svg className="absolute top-2.5 right-2.5" width={size} height={size} viewBox="0 0 24 24" style={{ opacity }}>
        <path d="M22 14 L22 5 C22 3 21 2 19 2 L10 2" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M22 8 C22 5 19 2 16 2" fill="none" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
        <circle cx="22" cy="2" r="1.5" fill={color} />
      </svg>
      {/* Bottom-left */}
      <svg className="absolute bottom-2.5 left-2.5" width={size} height={size} viewBox="0 0 24 24" style={{ opacity }}>
        <path d="M2 10 L2 19 C2 21 3 22 5 22 L14 22" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M2 16 C2 19 5 22 8 22" fill="none" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
        <circle cx="2" cy="22" r="1.5" fill={color} />
      </svg>
      {/* Bottom-right */}
      <svg className="absolute bottom-2.5 right-2.5" width={size} height={size} viewBox="0 0 24 24" style={{ opacity }}>
        <path d="M22 10 L22 19 C22 21 21 22 19 22 L10 22" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M22 16 C22 19 19 22 16 22" fill="none" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
        <circle cx="22" cy="22" r="1.5" fill={color} />
      </svg>
    </>
  );
}

/** Ornamental horizontal divider — line with center diamond and accent dots */
export function OrnamentalDivider({ color, className }: { color: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className || ""}`}>
      <svg viewBox="0 0 200 12" className="w-full" style={{ height: 12 }} preserveAspectRatio="xMidYMid meet">
        {/* Left line */}
        <line x1="20" y1="6" x2="88" y2="6" stroke={color} strokeWidth="0.5" opacity="0.25" />
        {/* Left accent dot */}
        <circle cx="91" cy="6" r="1" fill={color} opacity="0.35" />
        {/* Center diamond */}
        <rect x="97" y="3" width="6" height="6" rx="0.5" transform="rotate(45 100 6)" fill={color} opacity="0.4" />
        {/* Right accent dot */}
        <circle cx="109" cy="6" r="1" fill={color} opacity="0.35" />
        {/* Right line */}
        <line x1="112" y1="6" x2="180" y2="6" stroke={color} strokeWidth="0.5" opacity="0.25" />
      </svg>
    </div>
  );
}

/** Subtle background pattern overlay — faint geometric diamonds/dots */
export function CardBackgroundPattern({ color, id, opacity = 0.035 }: { color: string; id: string; opacity?: number }) {
  const patternId = `card-pat-${id}`;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity }}>
      <defs>
        <pattern id={patternId} x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
          {/* Center diamond */}
          <rect x="14.5" y="14.5" width="3" height="3" rx="0.3" transform="rotate(45 16 16)" fill={color} />
          {/* Corner dots */}
          <circle cx="0" cy="0" r="0.8" fill={color} />
          <circle cx="32" cy="0" r="0.8" fill={color} />
          <circle cx="0" cy="32" r="0.8" fill={color} />
          <circle cx="32" cy="32" r="0.8" fill={color} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

/** Accent top bar with gradient shine */
export function AccentTopBar({ color, rgb, height = 3 }: { color: string; rgb?: string; height?: number }) {
  return (
    <div className="relative" style={{ height }}>
      <div className="absolute inset-0" style={{ background: color }} />
      {/* Shine highlight in center */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.25) 50%, transparent 80%)`,
        }}
      />
      {rgb && (
        <div
          className="absolute inset-0"
          style={{
            boxShadow: `0 1px 6px rgba(${rgb},0.4), 0 2px 12px rgba(${rgb},0.15)`,
          }}
        />
      )}
    </div>
  );
}

/** Inner vignette overlay — subtle darkening at edges */
export function InnerVignette({ opacity = 0.3 }: { opacity?: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${opacity}) 100%)`,
      }}
    />
  );
}

"use client";

import type { ReactNode } from "react";

export interface CardBorderConfig {
  border: string;
  shadow: string;
  rgb: string;
  placement: number;
}

export interface UnderlineConfig {
  color: string;
  rgb: string;
  placement: number;
}

export type BorderStyleType = "beam" | "glow";

// ── Shared decoration helpers ──

function CornerDecor({ rgb, p }: { rgb: string; p: number }) {
  if (p < 3) return null;
  const s = p >= 4 ? 24 : 16;
  const t = p >= 4 ? 3 : 2;
  const o = p >= 4 ? -10 : -6;
  const c = `rgba(${rgb},${p >= 4 ? 0.9 : 0.6})`;

  return (
    <>
      {[
        { top: o, left: o, borderTop: `${t}px solid ${c}`, borderLeft: `${t}px solid ${c}` },
        { top: o, right: o, borderTop: `${t}px solid ${c}`, borderRight: `${t}px solid ${c}` },
        { bottom: o, left: o, borderBottom: `${t}px solid ${c}`, borderLeft: `${t}px solid ${c}` },
        { bottom: o, right: o, borderBottom: `${t}px solid ${c}`, borderRight: `${t}px solid ${c}` },
      ].map((style, i) => (
        <div key={i} className="absolute pointer-events-none z-10" style={{ ...style, width: s, height: s }} />
      ))}
      {p >= 4 &&
        [
          { top: -5, left: -5 },
          { top: -5, right: -5 },
          { bottom: -5, left: -5 },
          { bottom: -5, right: -5 },
        ].map((pos, i) => (
          <div
            key={`sp-${i}`}
            className="absolute w-2.5 h-2.5 rounded-full pointer-events-none z-10"
            style={{
              ...pos,
              background: `rgba(${rgb},0.95)`,
              boxShadow: `0 0 10px rgba(${rgb},0.8), 0 0 20px rgba(${rgb},0.3)`,
              animation: `cb-sparkle-dot 1.8s ease-in-out ${i * 0.45}s infinite`,
            }}
          />
        ))}
      {p >= 4 &&
        [
          { top: -4, left: "50%" },
          { bottom: -4, left: "50%" },
          { top: "50%", left: -4 },
          { top: "50%", right: -4 },
        ].map((pos, i) => (
          <div
            key={`esp-${i}`}
            className="absolute w-1.5 h-1.5 rounded-full pointer-events-none z-10"
            style={{
              ...pos,
              background: `rgba(${rgb},0.75)`,
              boxShadow: `0 0 6px rgba(${rgb},0.5)`,
              animation: `cb-sparkle-dot 2.5s ease-in-out ${i * 0.7 + 0.3}s infinite`,
            }}
          />
        ))}
    </>
  );
}

function InnerAccent({ p }: { p: number }) {
  if (p < 3) return null;

  if (p === 3) {
    return (
      <div className="absolute top-0 left-0 right-0 h-[2px] z-10 pointer-events-none overflow-hidden rounded-t-lg">
        <div
          style={{
            position: "absolute",
            top: 0,
            width: "25%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
            animation: "accent-sweep 4s ease-in-out infinite",
          }}
        />
      </div>
    );
  }

  // Champion: bright sweep on top + gold sweep on bottom + inner aura
  return (
    <>
      <div className="absolute top-0 left-0 right-0 h-[3px] z-10 pointer-events-none overflow-hidden rounded-t-lg">
        <div
          style={{
            position: "absolute",
            top: 0,
            width: "30%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), rgba(255,215,0,0.4), transparent)",
            animation: "accent-sweep 3s ease-in-out infinite",
          }}
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[2px] z-10 pointer-events-none overflow-hidden rounded-b-lg">
        <div
          style={{
            position: "absolute",
            top: 0,
            width: "20%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent)",
            animation: "accent-sweep 3.5s ease-in-out 1.2s infinite",
          }}
        />
      </div>
      <div
        className="absolute inset-0 z-10 pointer-events-none rounded-lg"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, rgba(255,215,0,0.04), transparent 60%)",
          animation: "accent-aura 3s ease-in-out infinite",
        }}
      />
    </>
  );
}

// ── Underline bar — SVG ornamental dividers ──

function UnderlineBar({ underline }: { underline: UnderlineConfig | null | undefined }) {
  if (!underline) return null;
  const p = underline.placement;
  const { color, rgb } = underline;

  // ── T8 / Undefeated: Simple line with center diamond ──
  if (p <= 1) {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none" style={{ height: 10 }}>
        <svg
          viewBox="0 0 400 10"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          fill="none"
        >
          {/* Thin horizontal line */}
          <line x1="0" y1="7" x2="400" y2="7" stroke={color} strokeWidth="1.5" opacity="0.7" />
          {/* Center diamond */}
          <rect x="196" y="3" width="8" height="8" rx="1" transform="rotate(45 200 7)" fill={color} opacity="0.85" />
        </svg>
      </div>
    );
  }

  // ── Top 4: Line with scrollwork curl accents ──
  if (p === 2) {
    return (
      <>
        <style>{`
          @keyframes ul-glow-t4 {
            0%, 100% { filter: drop-shadow(0 0 2px rgba(${rgb},0.3)); }
            50% { filter: drop-shadow(0 0 6px rgba(${rgb},0.6)) drop-shadow(0 0 12px rgba(${rgb},0.2)); }
          }
        `}</style>
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none" style={{ height: 16 }}>
          <svg
            viewBox="0 0 400 16"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
            fill="none"
            style={{ animation: "ul-glow-t4 4s ease-in-out infinite" }}
          >
            {/* Lines extending to edges */}
            <line x1="0" y1="10" x2="155" y2="10" stroke={color} strokeWidth="1.5" opacity="0.5" />
            <line x1="245" y1="10" x2="400" y2="10" stroke={color} strokeWidth="1.5" opacity="0.5" />
          </svg>
          {/* Center ornament — fixed size, centered */}
          <svg
            viewBox="0 0 90 16"
            className="absolute left-1/2 top-0 h-full"
            style={{ width: 90, transform: "translateX(-50%)" }}
            fill="none"
          >
            {/* Left scroll curl */}
            <path d="M10,10 Q10,4 18,4 Q14,4 14,8 Q14,11 18,11" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
            {/* Right scroll curl (mirrored) */}
            <path d="M80,10 Q80,4 72,4 Q76,4 76,8 Q76,11 72,11" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
            {/* Connecting lines to center */}
            <line x1="18" y1="10" x2="38" y2="10" stroke={color} strokeWidth="1.5" opacity="0.6" />
            <line x1="52" y1="10" x2="72" y2="10" stroke={color} strokeWidth="1.5" opacity="0.6" />
            {/* Center diamond */}
            <rect x="41" y="6" width="8" height="8" rx="1" transform="rotate(45 45 10)" fill={color} opacity="0.9" />
            {/* Small accent dots */}
            <circle cx="25" cy="10" r="1.5" fill={color} opacity="0.5" />
            <circle cx="65" cy="10" r="1.5" fill={color} opacity="0.5" />
          </svg>
        </div>
      </>
    );
  }

  // ── Finalist: Winged filigree ornament ──
  if (p === 3) {
    return (
      <>
        <style>{`
          @keyframes ul-shimmer-f {
            0% { left: -20%; opacity: 0; }
            15% { opacity: 0.8; }
            85% { opacity: 0.8; }
            100% { left: 120%; opacity: 0; }
          }
        `}</style>
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none" style={{ height: 24 }}>
          {/* Edge lines — stretched */}
          <svg
            viewBox="0 0 400 24"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
            fill="none"
          >
            <line x1="0" y1="16" x2="120" y2="16" stroke={color} strokeWidth="1.5" opacity="0.4" />
            <line x1="280" y1="16" x2="400" y2="16" stroke={color} strokeWidth="1.5" opacity="0.4" />
          </svg>
          {/* Center filigree ornament — fixed width */}
          <svg
            viewBox="0 0 160 24"
            className="absolute left-1/2 top-0 h-full"
            style={{ width: 160, transform: "translateX(-50%)", filter: `drop-shadow(0 0 4px rgba(${rgb},0.4))` }}
            fill="none"
          >
            {/* Left wing flourish */}
            <path
              d="M30,16 C30,16 24,16 20,14 C16,12 12,8 8,8 C4,8 4,12 8,13 C12,14 16,13 20,14 C24,15 22,18 18,18"
              stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.75"
            />
            <path
              d="M36,16 C32,14 28,10 24,10 C20,10 22,14 26,14"
              stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.5"
            />
            {/* Right wing flourish (mirrored) */}
            <path
              d="M130,16 C130,16 136,16 140,14 C144,12 148,8 152,8 C156,8 156,12 152,13 C148,14 144,13 140,14 C136,15 138,18 142,18"
              stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.75"
            />
            <path
              d="M124,16 C128,14 132,10 136,10 C140,10 138,14 134,14"
              stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.5"
            />
            {/* Center connecting lines */}
            <line x1="36" y1="16" x2="70" y2="16" stroke={color} strokeWidth="1.5" opacity="0.6" />
            <line x1="90" y1="16" x2="124" y2="16" stroke={color} strokeWidth="1.5" opacity="0.6" />
            {/* Center ornamental diamond with ring */}
            <circle cx="80" cy="14" r="6" stroke={color} strokeWidth="1.2" opacity="0.5" />
            <rect x="76.5" y="10.5" width="7" height="7" rx="1" transform="rotate(45 80 14)" fill={color} opacity="0.9" />
            {/* Small accent dots along wings */}
            <circle cx="14" cy="10" r="1.2" fill={color} opacity="0.45" />
            <circle cx="146" cy="10" r="1.2" fill={color} opacity="0.45" />
            <circle cx="48" cy="16" r="1.5" fill={color} opacity="0.4" />
            <circle cx="112" cy="16" r="1.5" fill={color} opacity="0.4" />
          </svg>
        </div>
      </>
    );
  }

  // ── Champion: Crown filigree banner ──
  return (
    <>
      <style>{`
        @keyframes ul-shimmer-w {
          0% { left: -15%; opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { left: 115%; opacity: 0; }
        }
        @keyframes ul-crown-glow {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(${rgb},0.5)); }
          50% { filter: drop-shadow(0 0 8px rgba(${rgb},0.8)) drop-shadow(0 0 16px rgba(${rgb},0.3)); }
        }
      `}</style>
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none" style={{ height: 32 }}>
        {/* Edge lines — stretched */}
        <svg
          viewBox="0 0 400 32"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          fill="none"
        >
          {/* Double lines for richness */}
          <line x1="0" y1="21" x2="90" y2="21" stroke={color} strokeWidth="1.5" opacity="0.35" />
          <line x1="0" y1="24" x2="70" y2="24" stroke={color} strokeWidth="0.75" opacity="0.2" />
          <line x1="310" y1="21" x2="400" y2="21" stroke={color} strokeWidth="1.5" opacity="0.35" />
          <line x1="330" y1="24" x2="400" y2="24" stroke={color} strokeWidth="0.75" opacity="0.2" />
        </svg>
        {/* Center ornament — fixed width, animated glow */}
        <svg
          viewBox="0 0 220 32"
          className="absolute left-1/2 top-0 h-full"
          style={{
            width: 220,
            transform: "translateX(-50%)",
            animation: "ul-crown-glow 4s ease-in-out infinite",
          }}
          fill="none"
        >
          {/* Crown center — three pointed peaks */}
          <path
            d="M100,8 L104,4 L108,8 L112,2 L116,8 L120,4 L124,8"
            stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9"
          />
          {/* Crown base arc */}
          <path
            d="M98,10 Q112,14 126,10"
            stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.8"
          />
          {/* Crown jewel */}
          <circle cx="112" cy="7" r="1.5" fill="rgba(255,255,255,0.8)" />

          {/* Left elaborate flourish — outer sweep */}
          <path
            d="M92,20 C88,18 80,14 72,10 C64,6 56,6 52,10 C48,14 52,16 58,15 C64,14 68,12 72,14 C76,16 72,20 66,20"
            stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"
          />
          {/* Left inner flourish */}
          <path
            d="M90,22 C84,20 76,16 68,14 C60,12 58,16 64,17 C70,18 74,16 76,18"
            stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.45"
          />
          {/* Left extended vine */}
          <path
            d="M52,10 C48,8 40,10 36,14 C32,18 28,18 24,16"
            stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.35"
          />

          {/* Right elaborate flourish — outer sweep (mirrored) */}
          <path
            d="M132,20 C136,18 144,14 152,10 C160,6 168,6 172,10 C176,14 172,16 166,15 C160,14 156,12 152,14 C148,16 152,20 158,20"
            stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"
          />
          {/* Right inner flourish */}
          <path
            d="M134,22 C140,20 148,16 156,14 C164,12 166,16 160,17 C154,18 150,16 148,18"
            stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.45"
          />
          {/* Right extended vine */}
          <path
            d="M172,10 C176,8 184,10 188,14 C192,18 196,18 200,16"
            stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.35"
          />

          {/* Connecting lines from flourish to crown */}
          <line x1="92" y1="20" x2="98" y2="14" stroke={color} strokeWidth="1.5" opacity="0.6" />
          <line x1="132" y1="20" x2="126" y2="14" stroke={color} strokeWidth="1.5" opacity="0.6" />

          {/* Ornamental ring around crown base */}
          <ellipse cx="112" cy="14" rx="18" ry="8" stroke={color} strokeWidth="1" opacity="0.25" />

          {/* Accent dots at flourish tips */}
          <circle cx="24" cy="16" r="1.5" fill={color} opacity="0.4" />
          <circle cx="200" cy="16" r="1.5" fill={color} opacity="0.4" />
          <circle cx="66" cy="20" r="1.5" fill={color} opacity="0.35" />
          <circle cx="158" cy="20" r="1.5" fill={color} opacity="0.35" />
          {/* Gold/white accent dots near crown */}
          <circle cx="104" cy="4" r="1" fill="rgba(255,215,0,0.7)" />
          <circle cx="120" cy="4" r="1" fill="rgba(255,215,0,0.7)" />
        </svg>
      </div>
    </>
  );
}

// ── Main wrapper ──

export function CardBorderWrapper({
  cardBorder,
  borderStyle = "beam",
  underline,
  contentClassName = "",
  children,
}: {
  cardBorder: CardBorderConfig | null;
  borderStyle?: BorderStyleType;
  underline?: UnderlineConfig | null;
  contentClassName?: string;
  children: ReactNode;
}) {
  const p = cardBorder?.placement ?? 0;
  const rgb = cardBorder?.rgb;

  const keyframes = `
    @keyframes cb-spin { to { transform: rotate(1turn); } }
    @keyframes cb-sparkle-dot { 0%, 100% { opacity: 0.1; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.5); } }
    @keyframes accent-sweep {
      0% { left: -30%; opacity: 0; }
      15% { opacity: 1; }
      85% { opacity: 1; }
      100% { left: 110%; opacity: 0; }
    }
    @keyframes accent-aura {
      0%, 100% { opacity: 0; }
      50% { opacity: 1; }
    }
  `;

  // No playoff finish: default border
  if (!cardBorder) {
    return (
      <div className={`relative border border-fab-border rounded-lg overflow-hidden ${contentClassName}`}>
        {children}
        <UnderlineBar underline={underline} />
      </div>
    );
  }

  // --- T8 (p=1): Thin colored border, subtle static glow ---
  if (p <= 1) {
    return (
      <div
        className={`relative rounded-lg overflow-hidden ${contentClassName}`}
        style={{
          borderWidth: 1.5,
          borderStyle: "solid",
          borderColor: cardBorder.border,
          boxShadow: `0 0 6px rgba(${rgb},0.2)`,
        }}
      >
        {children}
        <UnderlineBar underline={underline} />
      </div>
    );
  }

  // --- T4 (p=2): Animated glow/beam — same intensity both styles ---
  if (p === 2) {
    if (borderStyle === "glow") {
      const initialShadow = `0 0 8px rgba(${rgb},0.25), 0 0 16px rgba(${rgb},0.12)`;
      const peakShadow = `0 0 14px rgba(${rgb},0.45), 0 0 28px rgba(${rgb},0.22)`;
      return (
        <>
          <style>{`@keyframes cb-glow-t4 {
            0%, 100% { box-shadow: ${initialShadow}; }
            50% { box-shadow: ${peakShadow}; }
          }`}</style>
          <div
            className={`relative rounded-lg overflow-hidden ${contentClassName}`}
            style={{
              borderWidth: 2,
              borderStyle: "solid",
              borderColor: cardBorder.border,
              boxShadow: initialShadow,
              animation: "cb-glow-t4 5s ease-in-out infinite",
            }}
          >
            {children}
            <UnderlineBar underline={underline} />
          </div>
        </>
      );
    }
    // Beam T4
    return (
      <>
        <style>{`@keyframes cb-spin { to { transform: rotate(1turn); } }`}</style>
        <div className="relative rounded-lg" style={{ padding: 2, boxShadow: `0 0 8px rgba(${rgb},0.25), 0 0 16px rgba(${rgb},0.12)` }}>
          <div className="absolute inset-0 rounded-lg overflow-hidden">
            <div
              style={{
                position: "absolute",
                inset: "-200%",
                background: `conic-gradient(from 0deg, transparent 42%, rgba(${rgb},0.5) 50%, transparent 58%)`,
                animation: "cb-spin 6s linear infinite",
              }}
            />
          </div>
          <div className={`relative rounded-[6px] overflow-hidden ${contentClassName}`}>
            {children}
            <UnderlineBar underline={underline} />
          </div>
        </div>
      </>
    );
  }

  // --- Finalist (p=3) and Champion (p=4) ---
  // Both beam and glow share: corner brackets, inner accent, outer glow

  if (borderStyle === "glow") {
    const bw = p >= 4 ? 3 : 2.5;
    const speed = p >= 4 ? "2.5s" : "3.5s";
    const initialShadow =
      p >= 4
        ? `0 0 20px rgba(${rgb},0.6), 0 0 40px rgba(${rgb},0.32), 0 0 64px rgba(${rgb},0.14), inset 0 0 22px rgba(${rgb},0.06)`
        : `0 0 14px rgba(${rgb},0.45), 0 0 28px rgba(${rgb},0.22), inset 0 0 14px rgba(${rgb},0.04)`;
    const peakShadow =
      p >= 4
        ? `0 0 32px rgba(${rgb},0.85), 0 0 64px rgba(${rgb},0.45), 0 0 90px rgba(${rgb},0.2), inset 0 0 32px rgba(${rgb},0.08)`
        : `0 0 24px rgba(${rgb},0.65), 0 0 48px rgba(${rgb},0.32), inset 0 0 22px rgba(${rgb},0.06)`;
    const glowName = p >= 4 ? "cb-glow-w" : "cb-glow-f";

    return (
      <>
        <style>{`
          ${keyframes}
          @keyframes ${glowName} {
            0%, 100% { box-shadow: ${initialShadow}; }
            50% { box-shadow: ${peakShadow}; }
          }
        `}</style>
        <div className="relative">
          <CornerDecor rgb={rgb!} p={p} />
          <div
            className={`relative rounded-lg overflow-hidden ${contentClassName}`}
            style={{
              borderWidth: bw,
              borderStyle: "solid",
              borderColor: cardBorder.border,
              boxShadow: initialShadow,
              animation: `${glowName} ${speed} ease-in-out infinite`,
            }}
          >
            {children}
            <InnerAccent p={p} />
            <UnderlineBar underline={underline} />
          </div>
        </div>
      </>
    );
  }

  // Beam style: Finalist (p=3) and Champion (p=4)
  const speed = p >= 4 ? "2.5s" : "3.5s";
  const pad = p >= 4 ? 3 : 2.5;

  const outerGlow =
    p >= 4
      ? `0 0 24px rgba(${rgb},0.6), 0 0 48px rgba(${rgb},0.32), 0 0 80px rgba(${rgb},0.14)`
      : `0 0 14px rgba(${rgb},0.4), 0 0 30px rgba(${rgb},0.2), 0 0 48px rgba(${rgb},0.08)`;

  const innerGlow =
    p >= 4
      ? `inset 0 0 28px rgba(${rgb},0.06)`
      : `inset 0 0 14px rgba(${rgb},0.03)`;

  return (
    <>
      <style>{keyframes}</style>
      <div className="relative rounded-lg" style={{ padding: pad, boxShadow: outerGlow }}>
        {/* Spinning gradient beam(s) */}
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          <div
            style={{
              position: "absolute",
              inset: "-200%",
              background: `conic-gradient(from 0deg, transparent ${p >= 4 ? "26%" : "34%"}, rgba(${rgb},${p >= 4 ? 0.95 : 0.85}) 50%, transparent ${p >= 4 ? "74%" : "66%"})`,
              animation: `cb-spin ${speed} linear infinite`,
            }}
          />
          {/* Second counter-rotating beam — champion only */}
          {p >= 4 && (
            <div
              style={{
                position: "absolute",
                inset: "-200%",
                background: `conic-gradient(from 180deg, transparent 30%, rgba(${rgb},0.6) 50%, transparent 70%)`,
                animation: "cb-spin 3.5s linear infinite reverse",
              }}
            />
          )}
          {/* Third beam — champion only */}
          {p >= 4 && (
            <div
              style={{
                position: "absolute",
                inset: "-200%",
                background: `conic-gradient(from 90deg, transparent 38%, rgba(${rgb},0.3) 50%, transparent 62%)`,
                animation: "cb-spin 5.5s linear infinite",
              }}
            />
          )}
          {/* White accent beam — champion only */}
          {p >= 4 && (
            <div
              style={{
                position: "absolute",
                inset: "-200%",
                background: "conic-gradient(from 270deg, transparent 42%, rgba(255,255,255,0.15) 50%, transparent 58%)",
                animation: "cb-spin 7s linear infinite reverse",
              }}
            />
          )}
        </div>

        {/* Corner brackets + sparkles */}
        <CornerDecor rgb={rgb!} p={p} />

        {/* Inner content */}
        <div
          className={`relative rounded-[7px] overflow-hidden ${contentClassName}`}
          style={{ boxShadow: innerGlow }}
        >
          {children}
          <InnerAccent p={p} />
          <UnderlineBar underline={underline} />
        </div>
      </div>
    </>
  );
}

// ── Major event border constants ──

const TIER_STYLE: Record<string, { border: string; rgb: string }> = {
  "Battle Hardened": { border: "#cd7f32", rgb: "205,127,50" },
  "The Calling": { border: "#60a5fa", rgb: "96,165,250" },
  Nationals: { border: "#f87171", rgb: "248,113,113" },
  "Pro Tour": { border: "#a78bfa", rgb: "167,139,250" },
  Worlds: { border: "#fbbf24", rgb: "251,191,36" },
};

const EVENT_ABBR: Record<string, string> = {
  "Battle Hardened": "BH",
  "The Calling": "TC",
  Nationals: "NAT",
  "Pro Tour": "PT",
  Worlds: "WLD",
};

const PLACEMENT_ABBR: Record<string, string> = {
  top8: "T8",
  top4: "T4",
  finalist: "F",
  champion: "W",
};

const PLACEMENT_RANK: Record<string, number> = { top8: 1, top4: 2, finalist: 3, champion: 4 };
const TIER_RANK: Record<string, number> = { "Battle Hardened": 1, "The Calling": 2, Nationals: 3, "Pro Tour": 4, Worlds: 5 };

export interface BorderSelection {
  eventType: string;
  placement: string;
  style: BorderStyleType;
}

export function BorderPicker({
  playoffFinishes,
  current,
  onChange,
}: {
  playoffFinishes: { type: string; eventType: string }[];
  current: BorderSelection;
  onChange: (sel: BorderSelection) => void;
}) {
  // Deduplicate by eventType + placement, keep highest tier first
  const uniqueBorders: { eventType: string; placement: string }[] = [];
  const seen = new Set<string>();
  for (const f of playoffFinishes) {
    const key = `${f.eventType}|${f.type}`;
    if (!seen.has(key) && TIER_STYLE[f.eventType]) {
      seen.add(key);
      uniqueBorders.push({ eventType: f.eventType, placement: f.type });
    }
  }
  // Sort: highest tier first, then highest placement
  uniqueBorders.sort((a, b) => {
    const td = (TIER_RANK[b.eventType] || 0) - (TIER_RANK[a.eventType] || 0);
    if (td !== 0) return td;
    return (PLACEMENT_RANK[b.placement] || 0) - (PLACEMENT_RANK[a.placement] || 0);
  });

  if (uniqueBorders.length === 0) return null;

  const selectedRgb = TIER_STYLE[current.eventType]?.rgb || uniqueBorders[0] && TIER_STYLE[uniqueBorders[0].eventType]?.rgb || "201,168,76";

  return (
    <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
      {/* Event+placement options */}
      <div className="flex gap-1 flex-wrap">
        {/* "None" option */}
        <button
          onClick={() => onChange({ eventType: "", placement: "", style: current.style })}
          className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors border ${
            !current.eventType
              ? "border-fab-gold/50 bg-fab-surface text-fab-text shadow-sm"
              : "border-fab-border text-fab-dim hover:text-fab-muted hover:border-fab-border"
          }`}
        >
          None
        </button>
        {uniqueBorders.map(({ eventType, placement }) => {
          const tier = TIER_STYLE[eventType];
          if (!tier) return null;
          const isSelected = current.eventType === eventType && current.placement === placement;
          return (
            <button
              key={`${eventType}-${placement}`}
              onClick={() => onChange({ ...current, eventType, placement })}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors border ${
                isSelected
                  ? "border-fab-gold/50 bg-fab-surface text-fab-text shadow-sm"
                  : "border-fab-border text-fab-dim hover:text-fab-muted hover:border-fab-border"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: tier.border }}
              />
              {EVENT_ABBR[eventType] || eventType.slice(0, 3)} {PLACEMENT_ABBR[placement] || placement}
            </button>
          );
        })}
      </div>
      {/* Style toggle — only show if selected placement >= top4 */}
      {(PLACEMENT_RANK[current.placement] || 0) >= 2 && (
        <div className="flex gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border">
          <button
            onClick={() => onChange({ ...current, style: "beam" })}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
              current.style === "beam"
                ? "bg-fab-surface text-fab-text shadow-sm"
                : "text-fab-dim hover:text-fab-muted"
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                border: `1px solid rgba(${selectedRgb},0.5)`,
                background: `conic-gradient(from 0deg, transparent 30%, rgba(${selectedRgb},0.6) 50%, transparent 70%)`,
              }}
            />
            Beam
          </button>
          <button
            onClick={() => onChange({ ...current, style: "glow" })}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
              current.style === "glow"
                ? "bg-fab-surface text-fab-text shadow-sm"
                : "text-fab-dim hover:text-fab-muted"
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                background: `rgba(${selectedRgb},0.4)`,
                boxShadow: `0 0 4px rgba(${selectedRgb},0.6)`,
              }}
            />
            Classic
          </button>
        </div>
      )}
    </div>
  );
}

// ── Minor event underline constants ──

const UNDERLINE_STYLE: Record<string, { color: string; rgb: string }> = {
  Armory:              { color: "#d4975a", rgb: "212,151,90" },
  Skirmish:            { color: "#93c5fd", rgb: "147,197,253" },
  "Road to Nationals": { color: "#fca5a5", rgb: "252,165,165" },
  ProQuest:            { color: "#c4b5fd", rgb: "196,181,253" },
};

const UNDERLINE_EVENT_ABBR: Record<string, string> = {
  Armory: "ARM",
  Skirmish: "SKR",
  "Road to Nationals": "RTN",
  ProQuest: "PQ",
};

const UNDERLINE_PLACEMENT_ABBR: Record<string, string> = {
  undefeated: "UD",
  top8: "T8",
  top4: "T4",
  finalist: "F",
  champion: "W",
};

const UNDERLINE_PLACEMENT_RANK: Record<string, number> = {
  undefeated: 1, top8: 1, top4: 2, finalist: 3, champion: 4,
};

const UNDERLINE_TIER_RANK: Record<string, number> = {
  Armory: 1, Skirmish: 2, "Road to Nationals": 3, ProQuest: 4,
};

export interface UnderlineSelection {
  eventType: string;
  placement: string;
}

export function UnderlinePicker({
  minorFinishes,
  current,
  onChange,
}: {
  minorFinishes: { type: string; eventType: string }[];
  current: UnderlineSelection;
  onChange: (sel: UnderlineSelection) => void;
}) {
  // Deduplicate by eventType + placement, keep highest tier first
  const uniqueUnderlines: { eventType: string; placement: string }[] = [];
  const seen = new Set<string>();
  for (const f of minorFinishes) {
    const key = `${f.eventType}|${f.type}`;
    if (!seen.has(key) && UNDERLINE_STYLE[f.eventType]) {
      seen.add(key);
      uniqueUnderlines.push({ eventType: f.eventType, placement: f.type });
    }
  }
  // Sort: highest tier first, then highest placement
  uniqueUnderlines.sort((a, b) => {
    const td = (UNDERLINE_TIER_RANK[b.eventType] || 0) - (UNDERLINE_TIER_RANK[a.eventType] || 0);
    if (td !== 0) return td;
    return (UNDERLINE_PLACEMENT_RANK[b.placement] || 0) - (UNDERLINE_PLACEMENT_RANK[a.placement] || 0);
  });

  if (uniqueUnderlines.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
      {/* "None" option */}
      <button
        onClick={() => onChange({ eventType: "", placement: "" })}
        className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors border ${
          !current.eventType
            ? "border-fab-gold/50 bg-fab-surface text-fab-text shadow-sm"
            : "border-fab-border text-fab-dim hover:text-fab-muted hover:border-fab-border"
        }`}
      >
        None
      </button>
      {uniqueUnderlines.map(({ eventType, placement }) => {
        const style = UNDERLINE_STYLE[eventType];
        if (!style) return null;
        const isSelected = current.eventType === eventType && current.placement === placement;
        return (
          <button
            key={`${eventType}-${placement}`}
            onClick={() => onChange({ eventType, placement })}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors border ${
              isSelected
                ? "border-fab-gold/50 bg-fab-surface text-fab-text shadow-sm"
                : "border-fab-border text-fab-dim hover:text-fab-muted hover:border-fab-border"
            }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: style.color }}
            />
            {UNDERLINE_EVENT_ABBR[eventType] || eventType.slice(0, 3)} {UNDERLINE_PLACEMENT_ABBR[placement] || placement}
          </button>
        );
      })}
    </div>
  );
}

export function buildCardBorder(eventType: string, placement: string): CardBorderConfig | null {
  const tier = TIER_STYLE[eventType];
  if (!tier) return null;
  const rank = PLACEMENT_RANK[placement] ?? 0;
  return {
    border: tier.border,
    shadow: `0 0 8px rgba(${tier.rgb},0.3)`,
    rgb: tier.rgb,
    placement: rank,
  };
}

export function buildUnderline(eventType: string, placement: string): UnderlineConfig | null {
  const style = UNDERLINE_STYLE[eventType];
  if (!style) return null;
  const rank = UNDERLINE_PLACEMENT_RANK[placement] ?? 0;
  return {
    color: style.color,
    rgb: style.rgb,
    placement: rank,
  };
}

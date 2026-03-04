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

// ── Underline bar ──

function UnderlineBar({ underline }: { underline: UnderlineConfig | null | undefined }) {
  if (!underline) return null;
  const p = underline.placement;
  const { color, rgb } = underline;

  // ── T8 / Undefeated: Solid colored bar with subtle glow ──
  if (p <= 1) {
    return (
      <div
        className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
        style={{
          height: 2.5,
          background: color,
          boxShadow: `0 0 4px rgba(${rgb},0.3)`,
          borderRadius: "0 0 7px 7px",
        }}
      />
    );
  }

  // ── Top 4: Thicker bar with animated glow pulse ──
  if (p === 2) {
    return (
      <>
        <style>{`
          @keyframes ul-pulse-t4 {
            0%, 100% { box-shadow: 0 0 4px rgba(${rgb},0.3); }
            50% { box-shadow: 0 0 12px rgba(${rgb},0.55), 0 0 24px rgba(${rgb},0.25); }
          }
        `}</style>
        <div
          className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
          style={{
            height: 4,
            background: color,
            animation: "ul-pulse-t4 3.5s ease-in-out infinite",
            borderRadius: "0 0 7px 7px",
          }}
        />
      </>
    );
  }

  // ── Finalist: Shimmer sweep + diamond accents + strong glow ──
  if (p === 3) {
    return (
      <>
        <style>{`
          @keyframes ul-shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
          {/* Diamond accents — 7 diamonds, bigger */}
          {[6, 20, 38, 50, 62, 80, 94].map((pos) => (
            <div
              key={pos}
              style={{
                position: "absolute",
                left: `${pos}%`,
                top: -5,
                width: 7,
                height: 7,
                transform: "rotate(45deg)",
                background: color,
                boxShadow: `0 0 8px rgba(${rgb},0.8)`,
                opacity: 0.85,
              }}
            />
          ))}
          {/* Main bar with animated shimmer */}
          <div
            style={{
              height: 5.5,
              background: `linear-gradient(90deg, ${color} 0%, ${color} 25%, rgba(255,255,255,0.55) 50%, ${color} 75%, ${color} 100%)`,
              backgroundSize: "200% 100%",
              animation: "ul-shimmer 2s ease-in-out infinite",
              boxShadow: `0 0 12px rgba(${rgb},0.6), 0 0 28px rgba(${rgb},0.3)`,
              borderRadius: "0 0 7px 7px",
            }}
          />
        </div>
      </>
    );
  }

  // ── Champion: Flames + sparkles + flowing gradient + white/gold accents ──
  return (
    <>
      <style>{`
        @keyframes ul-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes ul-sparkle {
          0%, 100% { opacity: 0.05; transform: scale(0.2); }
          50% { opacity: 1; transform: scale(1.6); }
        }
        @keyframes ul-flame-flicker {
          0%, 100% { opacity: 0.45; transform: scaleY(1); }
          50% { opacity: 0.95; transform: scaleY(1.6); }
        }
      `}</style>
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        {/* Double flame layers — taller */}
        <svg
          className="absolute left-0 right-0"
          style={{ bottom: 7, height: 16, width: "100%", animation: "ul-flame-flicker 1.6s ease-in-out infinite" }}
          viewBox="0 0 200 8"
          preserveAspectRatio="none"
          fill={color}
          opacity={0.55}
        >
          <path d="M0,8 Q5,2 10,8 Q15,0 20,8 Q25,3 30,8 Q35,1 40,8 Q45,2 50,8 Q55,0 60,8 Q65,3 70,8 Q75,1 80,8 Q85,2 90,8 Q95,0 100,8 Q105,3 110,8 Q115,1 120,8 Q125,2 130,8 Q135,0 140,8 Q145,3 150,8 Q155,1 160,8 Q165,2 170,8 Q175,0 180,8 Q185,3 190,8 Q195,1 200,8 Z" />
        </svg>
        <svg
          className="absolute left-0 right-0"
          style={{ bottom: 4, height: 12, width: "100%", animation: "ul-flame-flicker 2.2s ease-in-out 0.4s infinite" }}
          viewBox="0 0 200 8"
          preserveAspectRatio="none"
          fill={color}
          opacity={0.35}
        >
          <path d="M5,8 Q10,1 15,8 Q20,3 25,8 Q30,0 35,8 Q40,2 45,8 Q50,1 55,8 Q60,3 65,8 Q70,0 75,8 Q80,2 85,8 Q90,1 95,8 Q100,3 105,8 Q110,0 115,8 Q120,2 125,8 Q130,1 135,8 Q140,3 145,8 Q150,0 155,8 Q160,2 165,8 Q170,1 175,8 Q180,3 185,8 Q190,0 195,8 Z" />
        </svg>
        {/* Colored sparkle dots — 10 */}
        {[4, 14, 24, 34, 44, 54, 64, 74, 84, 94].map((pos, i) => (
          <div
            key={pos}
            style={{
              position: "absolute",
              left: `${pos}%`,
              bottom: 14,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: `rgba(${rgb},0.95)`,
              boxShadow: `0 0 8px rgba(${rgb},0.9), 0 0 16px rgba(${rgb},0.4)`,
              animation: `ul-sparkle 1.6s ease-in-out ${i * 0.16}s infinite`,
            }}
          />
        ))}
        {/* White/gold accent sparkles — interspersed */}
        {[9, 29, 49, 69, 89].map((pos, i) => (
          <div
            key={`w-${pos}`}
            style={{
              position: "absolute",
              left: `${pos}%`,
              bottom: 16,
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.9)",
              boxShadow: "0 0 6px rgba(255,255,255,0.7), 0 0 12px rgba(255,215,0,0.3)",
              animation: `ul-sparkle 2s ease-in-out ${i * 0.35 + 0.2}s infinite`,
            }}
          />
        ))}
        {/* Main bar with flowing gradient + gold accent */}
        <div
          style={{
            height: 8,
            background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.45), ${color}, rgba(255,215,0,0.3), ${color}, rgba(255,255,255,0.4), ${color})`,
            backgroundSize: "400% 100%",
            animation: "ul-flow 2.5s ease infinite",
            boxShadow: `0 0 14px rgba(${rgb},0.75), 0 0 32px rgba(${rgb},0.4), 0 0 56px rgba(${rgb},0.18)`,
            borderRadius: "0 0 7px 7px",
          }}
        />
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

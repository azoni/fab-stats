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

function UnderlineBar({ underline }: { underline: UnderlineConfig | null | undefined }) {
  if (!underline) return null;
  const p = underline.placement;
  const { color, rgb } = underline;

  // ── Placement 1 (top8 / undefeated): Clean solid bar ──
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

  // ── Placement 2 (top4): Diagonal stripes texture ──
  if (p === 2) {
    return (
      <div
        className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
        style={{
          height: 3.5,
          background: `repeating-linear-gradient(
            -45deg,
            ${color},
            ${color} 3px,
            rgba(255,255,255,0.18) 3px,
            rgba(255,255,255,0.18) 5px
          ), ${color}`,
          backgroundBlendMode: "overlay, normal",
          boxShadow: `0 0 6px rgba(${rgb},0.4), 0 0 12px rgba(${rgb},0.15)`,
          borderRadius: "0 0 7px 7px",
        }}
      />
    );
  }

  // ── Placement 3 (finalist): Shimmer sweep + diamond accents ──
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
          {/* Diamond accents along the top edge */}
          {[8, 25, 50, 75, 92].map((pos) => (
            <div
              key={pos}
              style={{
                position: "absolute",
                left: `${pos}%`,
                top: -3,
                width: 5,
                height: 5,
                transform: "rotate(45deg)",
                background: color,
                boxShadow: `0 0 4px rgba(${rgb},0.6)`,
                opacity: 0.7,
              }}
            />
          ))}
          {/* Main bar with animated shimmer */}
          <div
            style={{
              height: 4,
              background: `linear-gradient(90deg, ${color} 0%, ${color} 35%, rgba(255,255,255,0.45) 50%, ${color} 65%, ${color} 100%)`,
              backgroundSize: "200% 100%",
              animation: "ul-shimmer 3s ease-in-out infinite",
              boxShadow: `0 0 8px rgba(${rgb},0.5), 0 0 18px rgba(${rgb},0.2)`,
              borderRadius: "0 0 7px 7px",
            }}
          />
        </div>
      </>
    );
  }

  // ── Placement 4 (champion): Flame waves + flowing gradient + sparkles ──
  return (
    <>
      <style>{`
        @keyframes ul-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes ul-sparkle {
          0%, 100% { opacity: 0.2; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes ul-flame-flicker {
          0%, 100% { opacity: 0.5; transform: scaleY(1); }
          50% { opacity: 0.8; transform: scaleY(1.3); }
        }
      `}</style>
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        {/* Flame-like waves above the bar */}
        <svg
          className="absolute left-0 right-0"
          style={{ bottom: 4, height: 8, width: "100%", animation: "ul-flame-flicker 2s ease-in-out infinite" }}
          viewBox="0 0 200 8"
          preserveAspectRatio="none"
          fill={color}
          opacity={0.45}
        >
          <path d="M0,8 Q5,2 10,8 Q15,0 20,8 Q25,3 30,8 Q35,1 40,8 Q45,2 50,8 Q55,0 60,8 Q65,3 70,8 Q75,1 80,8 Q85,2 90,8 Q95,0 100,8 Q105,3 110,8 Q115,1 120,8 Q125,2 130,8 Q135,0 140,8 Q145,3 150,8 Q155,1 160,8 Q165,2 170,8 Q175,0 180,8 Q185,3 190,8 Q195,1 200,8 Z" />
        </svg>
        {/* Sparkle dots */}
        {[6, 22, 38, 54, 70, 86].map((pos, i) => (
          <div
            key={pos}
            style={{
              position: "absolute",
              left: `${pos}%`,
              bottom: 7,
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: `rgba(${rgb},0.9)`,
              boxShadow: `0 0 5px rgba(${rgb},0.8)`,
              animation: `ul-sparkle 2s ease-in-out ${i * 0.3}s infinite`,
            }}
          />
        ))}
        {/* Main bar with flowing animated gradient */}
        <div
          style={{
            height: 5,
            background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.35), ${color}, rgba(255,255,255,0.2), ${color})`,
            backgroundSize: "300% 100%",
            animation: "ul-flow 4s ease infinite",
            boxShadow: `0 0 10px rgba(${rgb},0.6), 0 0 22px rgba(${rgb},0.3), 0 0 40px rgba(${rgb},0.1)`,
            borderRadius: "0 0 7px 7px",
          }}
        />
      </div>
    </>
  );
}

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

  // No playoff finish or only top 8: static border
  if (!cardBorder || p <= 1) {
    return (
      <div
        className={`relative border border-fab-border rounded-lg overflow-hidden ${contentClassName}`}
        style={cardBorder ? { borderColor: cardBorder.border, boxShadow: cardBorder.shadow } : undefined}
      >
        {children}
        <UnderlineBar underline={underline} />
      </div>
    );
  }

  // --- Glow style ---
  if (borderStyle === "glow") {
    const borderWidth = p >= 3 ? 3 : 2;
    const speed = p >= 4 ? "3s" : p >= 3 ? "4s" : "5s";

    // Initial box-shadow (matches 0% keyframe to avoid flash)
    const initialShadow =
      p >= 4
        ? `0 0 16px rgba(${rgb},0.5), 0 0 32px rgba(${rgb},0.25), 0 0 50px rgba(${rgb},0.1), inset 0 0 16px rgba(${rgb},0.04)`
        : p >= 3
          ? `0 0 12px rgba(${rgb},0.4), 0 0 24px rgba(${rgb},0.2), inset 0 0 12px rgba(${rgb},0.03)`
          : `0 0 8px rgba(${rgb},0.3), 0 0 18px rgba(${rgb},0.15)`;

    const peakShadow =
      p >= 4
        ? `0 0 24px rgba(${rgb},0.7), 0 0 48px rgba(${rgb},0.35), 0 0 70px rgba(${rgb},0.15), inset 0 0 24px rgba(${rgb},0.06)`
        : p >= 3
          ? `0 0 20px rgba(${rgb},0.6), 0 0 40px rgba(${rgb},0.3), inset 0 0 20px rgba(${rgb},0.05)`
          : `0 0 14px rgba(${rgb},0.5), 0 0 28px rgba(${rgb},0.25)`;

    const glowKeyframes = `@keyframes cb-glow {
      0%, 100% { box-shadow: ${initialShadow}; }
      50% { box-shadow: ${peakShadow}; }
    }`;

    return (
      <>
        <style>{glowKeyframes}</style>
        <div
          className={`relative rounded-lg overflow-hidden ${contentClassName}`}
          style={{
            borderWidth,
            borderStyle: "solid",
            borderColor: cardBorder.border,
            boxShadow: initialShadow,
            animation: `cb-glow ${speed} ease-in-out infinite`,
          }}
        >
          {children}
          <UnderlineBar underline={underline} />
        </div>
      </>
    );
  }

  // --- Beam style (default) ---
  const speed = p >= 4 ? "3s" : p >= 3 ? "4s" : "5s";

  const outerGlow =
    p >= 4
      ? `0 0 20px rgba(${rgb},0.5), 0 0 40px rgba(${rgb},0.25), 0 0 70px rgba(${rgb},0.1)`
      : p >= 3
        ? `0 0 14px rgba(${rgb},0.4), 0 0 30px rgba(${rgb},0.2), 0 0 50px rgba(${rgb},0.08)`
        : `0 0 10px rgba(${rgb},0.3), 0 0 20px rgba(${rgb},0.15)`;

  const innerGlow =
    p >= 4
      ? `inset 0 0 20px rgba(${rgb},0.04)`
      : p >= 3
        ? `inset 0 0 12px rgba(${rgb},0.03)`
        : undefined;

  return (
    <>
      <style>{`
        @keyframes cb-spin { to { transform: rotate(1turn); } }
        @keyframes cb-sparkle-dot { 0%, 100% { opacity: 0.2; transform: scale(0.5); } 50% { opacity: 1; transform: scale(1.2); } }
      `}</style>
      <div className="relative rounded-lg" style={{ padding: 2, boxShadow: outerGlow }}>
        {/* Spinning gradient beam(s) */}
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          <div
            style={{
              position: "absolute",
              inset: "-200%",
              background: `conic-gradient(from 0deg, transparent ${p >= 4 ? "30%" : "40%"}, rgba(${rgb},${p >= 3 ? 0.9 : 0.7}) 50%, transparent ${p >= 4 ? "70%" : "60%"})`,
              animation: `cb-spin ${speed} linear infinite`,
            }}
          />
          {p >= 4 && (
            <div
              style={{
                position: "absolute",
                inset: "-200%",
                background: `conic-gradient(from 180deg, transparent 35%, rgba(${rgb},0.5) 50%, transparent 65%)`,
                animation: "cb-spin 4.5s linear infinite reverse",
              }}
            />
          )}
        </div>

        {/* Corner brackets for finalist+ */}
        {p >= 3 &&
          (() => {
            const s = p >= 4 ? 20 : 14;
            const t = p >= 4 ? 2.5 : 1.5;
            const o = p >= 4 ? -8 : -5;
            const c = `rgba(${rgb},${p >= 4 ? 0.8 : 0.5})`;
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
                    { top: -3, left: -3 },
                    { top: -3, right: -3 },
                    { bottom: -3, left: -3 },
                    { bottom: -3, right: -3 },
                  ].map((pos, i) => (
                    <div
                      key={`sp-${i}`}
                      className="absolute w-1.5 h-1.5 rounded-full pointer-events-none z-10"
                      style={{
                        ...pos,
                        background: `rgba(${rgb},0.9)`,
                        boxShadow: `0 0 6px rgba(${rgb},0.6)`,
                        animation: `cb-sparkle-dot 2.5s ease-in-out ${i * 0.6}s infinite`,
                      }}
                    />
                  ))}
              </>
            );
          })()}

        {/* Inner content */}
        <div
          className={`relative rounded-[7px] overflow-hidden ${contentClassName}`}
          style={innerGlow ? { boxShadow: innerGlow } : undefined}
        >
          {children}
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

"use client";

import { useId, type ReactNode } from "react";
import { HeraldicFrame, FiligreeUnderline } from "@/components/cosmetics/Ornaments";
import { materialForRgb, materialForEvent, spec, type Material } from "@/components/cosmetics/materials";

export interface CardBorderConfig {
  border: string;
  shadow: string;
  rgb: string;
  placement: number;
  /** Heraldic material (ornate redesign). Optional for back-compat. */
  material?: Material;
}

export interface UnderlineConfig {
  color: string;
  rgb: string;
  placement: number;
}

export type BorderStyleType = "beam" | "glow";

// ── Underline bar — heraldic filigree, tier-scaled, engraved (no glow) ──

function UnderlineBar({ underline }: { underline: UnderlineConfig | null | undefined }) {
  const uid = useId().replace(/:/g, "");
  if (!underline) return null;
  return <FiligreeUnderline idPrefix={`${uid}ul`} material={materialForRgb(underline.rgb)} tier={underline.placement} />;
}

// ── Main wrapper — heraldic frame across all tiers ──
//
// Tier ladder is ornament density, not glow: tier 0/1 → engraved keyline,
// tier 2 → corner flourishes, tier 3 → flourishes + star crest, tier 4 →
// flourishes + crown crest. Fully static so it holds up under every live theme.

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
  const uid = useId().replace(/:/g, "");

  // No playoff finish: default border
  if (!cardBorder) {
    return (
      <div className={`relative border border-fab-border rounded-lg overflow-hidden ${contentClassName}`}>
        {children}
        <UnderlineBar underline={underline} />
      </div>
    );
  }

  const material = cardBorder.material ?? materialForRgb(cardBorder.rgb);
  const s = spec(material);
  const finish: "engraved" | "inlaid" = borderStyle === "glow" ? "inlaid" : "engraved";
  const borderWidth = p >= 3 ? 2 : 1.5;

  return (
    <div className="relative">
      <div
        className={`relative rounded-lg overflow-hidden ${contentClassName}`}
        style={{ borderWidth, borderStyle: "solid", borderColor: s.edge }}
      >
        {children}
        <UnderlineBar underline={underline} />
      </div>
      <HeraldicFrame idPrefix={uid} material={material} tier={p} finish={finish} />
    </div>
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

  const selectedMaterial = current.eventType ? materialForEvent(current.eventType) : "gold";
  const sm = spec(selectedMaterial);

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
      {/* Finish toggle — only show if selected placement >= top4 */}
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
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ border: `1.5px solid ${sm.mid}` }} />
            Engraved
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
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: `linear-gradient(135deg, ${sm.stops[0]}, ${sm.stops[2]}, ${sm.stops[4]})` }}
            />
            Inlaid
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
    material: materialForEvent(eventType),
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

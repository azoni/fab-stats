"use client";

import { useState } from "react";
import type { PlayoffFinish } from "@/lib/stats";
import { localDate } from "@/lib/constants";
import { getSelectedDesign } from "@/lib/trophy-designs";
import { TrophyDesignPicker } from "./TrophyDesignPicker";
import { Palette } from "lucide-react";

// Trophy tier icons
import { WorldsGlobe, WorldsCrown, WorldsPhoenix, PTChalice, PTStandard, PTSpire, NatShield, NatEagle, NatForge, TCChalice, TCTome, TCCircle, BHAxes, BHHelm, BHGauntlet } from "./trophy-icons/TrophyTier";
// Medal tier icons
import { SDVersus, SDSwords, SDArena, BGSwords, BGShield, BGBanner } from "./trophy-icons/MedalTier";
// Badge tier icons
import { PQCompass, PQScroll, PQPack, RTNRoad, RTNStone, RTNCompass, SKShield, SKDagger, SKBolt } from "./trophy-icons/BadgeTier";
// Marble tier icons
import { OtherMarble, OtherCrystal, OtherCoin, ChRing, ChWreath, ChStar } from "./trophy-icons/MarbleTier";

type FinishTier = "badge" | "medal" | "trophy" | "marble";

const TIER_MAP: Record<string, FinishTier> = {
  // Badge tier — Tier 2 qualifiers + Tier 1
  Skirmish: "badge",
  "Road to Nationals": "badge",
  ProQuest: "badge",
  // Medal tier — Tier 2 Competitive
  Showdown: "medal",
  Battlegrounds: "medal",
  // Trophy tier — Tier 3 + Tier 4 Professional
  "Battle Hardened": "trophy",
  "The Calling": "trophy",
  Nationals: "trophy",
  "Pro Tour": "trophy",
  Worlds: "trophy",
};

const EVENT_ABBR: Record<string, string> = {
  Skirmish: "SK",
  "Road to Nationals": "RTN",
  ProQuest: "PQ",
  Showdown: "SD",
  Battlegrounds: "BG",
  "Battle Hardened": "BH",
  "The Calling": "TC",
  Nationals: "NAT",
  "Pro Tour": "PT",
  Worlds: "WLD",
  Championship: "CH",
  Other: "OTH",
};

const PLACEMENT_TEXT: Record<PlayoffFinish["type"], string> = {
  champion: "1st",
  finalist: "2nd",
  top4: "T4",
  top8: "T8",
};

const TIER_SORT: Record<FinishTier, number> = { trophy: 0, medal: 1, badge: 2, marble: 3 };
const TYPE_SORT: Record<PlayoffFinish["type"], number> = { champion: 0, finalist: 1, top4: 2, top8: 3 };

function col(type: PlayoffFinish["type"]) {
  switch (type) {
    case "champion": return { from: "#FFD700", to: "#B8860B", stroke: "#8B6914", text: "#FFF8DC" };
    case "finalist": return { from: "#E5E7EB", to: "#9CA3AF", stroke: "#6B7280", text: "#F9FAFB" };
    case "top4":     return { from: "#F59E0B", to: "#92400E", stroke: "#78350F", text: "#FFFBEB" };
    case "top8":     return { from: "#60A5FA", to: "#1E40AF", stroke: "#1E3A8A", text: "#EFF6FF" };
  }
}

function glowFilter(type: PlayoffFinish["type"]) {
  switch (type) {
    case "champion": return "drop-shadow(0 0 8px rgba(255,215,0,0.5)) drop-shadow(0 0 3px rgba(255,215,0,0.3))";
    case "finalist": return "drop-shadow(0 0 4px rgba(192,192,192,0.25))";
    case "top4":     return "drop-shadow(0 0 4px rgba(245,158,11,0.25))";
    case "top8":     return "drop-shadow(0 0 4px rgba(96,165,250,0.25))";
  }
}

// Exports for reuse (e.g. share cards, design picker)
export { TIER_MAP, EVENT_ABBR, PLACEMENT_TEXT, col, glowFilter };
export type { FinishTier };

// ── Design rendering ──

type DesignMap = Record<string, [
  (props: { type: PlayoffFinish["type"]; id: string; idx?: number }) => React.JSX.Element,
  (props: { type: PlayoffFinish["type"]; id: string; idx?: number }) => React.JSX.Element,
  (props: { type: PlayoffFinish["type"]; id: string; idx?: number }) => React.JSX.Element,
]>;

const EVENT_DESIGNS: DesignMap = {
  // Trophy tier
  Worlds:            [WorldsGlobe, WorldsCrown, WorldsPhoenix],
  "Pro Tour":        [PTChalice, PTStandard, PTSpire],
  Nationals:         [NatShield, NatEagle, NatForge],
  "The Calling":     [TCChalice, TCTome, TCCircle],
  "Battle Hardened": [BHAxes, BHHelm, BHGauntlet],
  // Medal tier
  Showdown:          [SDVersus, SDSwords, SDArena],
  Battlegrounds:     [BGSwords, BGShield, BGBanner],
  // Badge tier
  ProQuest:          [PQCompass, PQScroll, PQPack],
  "Road to Nationals": [RTNRoad, RTNStone, RTNCompass],
  Skirmish:          [SKShield, SKDagger, SKBolt],
  // Marble tier
  Other:             [OtherMarble, OtherCrystal, OtherCoin],
  Championship:      [ChRing, ChWreath, ChStar],
};

/** Render a trophy design for a given event type + design index */
export function renderTrophyDesign(
  eventType: string,
  designIndex: number,
  placementType: PlayoffFinish["type"],
  id: string,
  idx: number,
): React.JSX.Element {
  const designs = EVENT_DESIGNS[eventType];
  if (designs) {
    const Component = designs[designIndex] || designs[0];
    return <Component type={placementType} id={id} idx={idx} />;
  }
  // Fallback: use Other marble designs
  const fallbackDesigns = EVENT_DESIGNS.Other;
  const FallbackComponent = fallbackDesigns[designIndex] || fallbackDesigns[0];
  return <FallbackComponent type={placementType} id={id} idx={idx} />;
}

// ── TrophyCase component ──

const GROUP_LABEL: Record<PlayoffFinish["type"], string> = {
  champion: "Wins", finalist: "Finals", top4: "Top 4", top8: "Top 8",
};
const GROUP_COLOR: Record<PlayoffFinish["type"], string> = {
  champion: "text-amber-400", finalist: "text-gray-400", top4: "text-amber-600", top8: "text-blue-400",
};

export function TrophyCase({
  finishes,
  trophyDesigns,
  isOwner,
  isAdmin,
  onDesignChange,
}: {
  finishes: PlayoffFinish[];
  trophyDesigns?: Record<string, number>;
  isOwner?: boolean;
  isAdmin?: boolean;
  onDesignChange?: (eventType: string, designIndex: number) => void;
}) {
  const [pickerEventType, setPickerEventType] = useState<string | null>(null);

  if (finishes.length === 0) return null;

  const sorted = [...finishes].sort((a, b) => {
    const tA = TIER_SORT[TIER_MAP[a.eventType] || "marble"];
    const tB = TIER_SORT[TIER_MAP[b.eventType] || "marble"];
    if (tA !== tB) return tA - tB;
    return TYPE_SORT[a.type] - TYPE_SORT[b.type];
  });

  const placementOrder: PlayoffFinish["type"][] = ["champion", "finalist", "top4", "top8"];
  const groups = placementOrder
    .map(type => ({ type, items: sorted.filter(f => f.type === type) }))
    .filter(g => g.items.length > 0);

  let idx = 0;

  return (
    <>
      <div className="bg-fab-surface/50 border border-fab-border rounded-lg px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-fab-muted uppercase tracking-wider font-medium">Trophy Case</p>
          <div className="flex items-center gap-2">
            {isOwner && onDesignChange && (
              <button
                onClick={() => {
                  // Open picker for the first trophy's event type
                  const first = sorted[0]?.eventType;
                  if (first) setPickerEventType(first);
                }}
                className="flex items-center gap-1 text-[10px] text-fab-dim hover:text-fab-gold transition-colors px-1.5 py-0.5 rounded hover:bg-fab-gold/10"
                title="Customize trophy designs"
              >
                <Palette className="w-3 h-3" />
                <span>Customize</span>
              </button>
            )}
            <p className="text-[10px] text-fab-dim">{finishes.length} finish{finishes.length !== 1 ? "es" : ""}</p>
          </div>
        </div>
        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g.type}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-[9px] font-semibold uppercase tracking-wider ${GROUP_COLOR[g.type]}`}>
                  {GROUP_LABEL[g.type]}
                </span>
                <span className="text-[9px] text-fab-dim">({g.items.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5 items-end">
                {g.items.map((f) => {
                  const abbr = EVENT_ABBR[f.eventType] || f.eventType.slice(0, 3).toUpperCase();
                  const id = `tc${idx}`;
                  const i = idx++;
                  const designIndex = getSelectedDesign(f.eventType, trophyDesigns);
                  const date = (() => { try { return localDate(f.eventDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }); } catch { return ""; } })();
                  return (
                    <div
                      key={`${f.eventName}-${f.eventDate}-${i}`}
                      className="relative group flex flex-col items-center cursor-pointer"
                      onClick={() => { if (isOwner) setPickerEventType(f.eventType); }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-fab-bg border border-fab-border shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap z-20">
                        <p className="text-[10px] font-semibold text-fab-text">{f.eventName}</p>
                        <p className="text-[9px] text-fab-dim">{PLACEMENT_TEXT[f.type]} place{date ? ` — ${date}` : ""}</p>
                      </div>
                      {renderTrophyDesign(f.eventType, designIndex, f.type, id, i)}
                      <span className="text-[8px] text-fab-dim font-medium mt-0.5 leading-none">{abbr}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Design picker modal */}
      {pickerEventType && onDesignChange && (
        <TrophyDesignPicker
          trophyDesigns={trophyDesigns}
          isAdmin={isAdmin}
          highlightEventType={pickerEventType}
          onSelect={(eventType, index) => {
            onDesignChange(eventType, index);
          }}
          onClose={() => setPickerEventType(null)}
        />
      )}
    </>
  );
}

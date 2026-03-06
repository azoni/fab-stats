"use client";
import { useState, useMemo } from "react";
import { AchievementIcon } from "@/components/gamification/AchievementIcons";
import { BadgeTierWrapper } from "./BadgeTierWrapper";
import { RARITY_VISUALS } from "@/lib/badge-tiers";
import { getAllAchievements } from "@/lib/achievements";
import { getAllBadges } from "@/lib/badges";
import type { Achievement } from "@/types";

interface BadgeStripProps {
  selectedBadgeIds?: string[];
  earnedAchievementIds?: string[];
  className?: string;
  isOwner?: boolean;
  onEdit?: () => void;
}

const RARITY_LABELS: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export function BadgeStrip({ selectedBadgeIds, earnedAchievementIds, className, isOwner, onEdit }: BadgeStripProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const achMap = useMemo(() => {
    const all: Achievement[] = [...getAllAchievements(), ...getAllBadges()];
    return new Map(all.map((a) => [a.id, a]));
  }, []);

  const earnedSet = useMemo(
    () => (earnedAchievementIds ? new Set(earnedAchievementIds) : null),
    [earnedAchievementIds],
  );

  const badges = useMemo(() => {
    if (!selectedBadgeIds?.length) return [];
    return selectedBadgeIds
      .map((id) => achMap.get(id))
      .filter((a): a is Achievement => !!a && (earnedSet === null || earnedSet.has(a.id)));
  }, [selectedBadgeIds, achMap, earnedSet]);

  // Owner with no badges: show prompt
  if (badges.length === 0) {
    if (isOwner && onEdit) {
      return (
        <button
          onClick={onEdit}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md border border-dashed border-fab-border hover:border-fab-gold/40 transition-colors group ${className || ""}`}
        >
          <svg className="w-3.5 h-3.5 text-fab-dim group-hover:text-fab-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="text-[10px] text-fab-dim group-hover:text-fab-gold transition-colors">Add badges</span>
        </button>
      );
    }
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className || ""}`}>
      {badges.map((ach) => {
        const visual = RARITY_VISUALS[ach.rarity] || RARITY_VISUALS.common;
        const rarityLabel = RARITY_LABELS[ach.rarity] || ach.rarity;
        const tooltip = `${ach.name} — ${ach.description} (${rarityLabel})`;

        return (
          <div
            key={ach.id}
            className="relative"
            onMouseEnter={() => setHoveredId(ach.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <BadgeTierWrapper visual={visual} size="sm">
              <div
                className="transition-all hover:scale-110"
                style={{ color: visual.ringColor, opacity: 0.85 }}
              >
                <AchievementIcon icon={ach.icon} className="w-5 h-5" />
              </div>
            </BadgeTierWrapper>
            {hoveredId === ach.id && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-fab-bg border border-fab-border text-[10px] text-fab-text whitespace-nowrap z-20 shadow-lg max-w-[200px]">
                <span className="font-semibold">{ach.name}</span>
                <span className="text-fab-dim"> — {ach.description}</span>
                <span className="ml-1" style={{ color: visual.ringColor }}>({rarityLabel})</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-fab-border" />
              </div>
            )}
          </div>
        );
      })}
      {isOwner && onEdit && (
        <button
          onClick={onEdit}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-fab-surface transition-colors group"
          title="Edit badges"
        >
          <svg className="w-3 h-3 text-fab-dim group-hover:text-fab-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
        </button>
      )}
    </div>
  );
}

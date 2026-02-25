"use client";
import { useState } from "react";
import type { Achievement } from "@/types";
import { rarityColors, getAllAchievements } from "@/lib/achievements";
import { AchievementIcon } from "./AchievementIcons";

export function AchievementShowcase({ earned }: { earned: Achievement[] }) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (earned.length === 0) return null;

  const all = getAllAchievements();
  const earnedIds = new Set(earned.map((a) => a.id));
  const displayed = showAll ? all : earned;

  const sorted = [...displayed].sort((a, b) => {
    const aEarned = earnedIds.has(a.id) ? 1 : 0;
    const bEarned = earnedIds.has(b.id) ? 1 : 0;
    if (aEarned !== bEarned) return bEarned - aEarned;
    const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
    return rarityOrder[b.rarity] - rarityOrder[a.rarity];
  });

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <h2 className="text-lg font-semibold text-fab-text flex items-center gap-2">
          <AchievementIcon icon="section-achievements" className="w-5 h-5 text-fab-gold" />
          Achievements
          <span className="text-sm font-normal text-fab-dim">
            {earned.length}/{all.length}
          </span>
        </h2>
        <svg
          className={`w-4 h-4 text-fab-muted group-hover:text-fab-text transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {expanded && (
        <>
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors"
            >
              {showAll ? "Show Earned" : "Show All"}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {sorted.map((a) => {
              const isEarned = earnedIds.has(a.id);
              const colors = rarityColors[a.rarity];
              return (
                <div
                  key={a.id}
                  className={`relative rounded-lg border p-3 transition-colors ${
                    isEarned
                      ? `${colors.bg} ${colors.border}`
                      : "bg-fab-surface/50 border-fab-border opacity-40"
                  }`}
                  title={`${a.name}: ${a.description}${!isEarned ? " (Locked)" : ""}`}
                >
                  <AchievementIcon
                    icon={a.icon}
                    className={`w-6 h-6 mb-1 ${isEarned ? colors.text : "text-fab-dim"}`}
                  />
                  <p className={`text-xs font-semibold truncate ${isEarned ? colors.text : "text-fab-dim"}`}>
                    {a.name}
                  </p>
                  <p className="text-[10px] text-fab-dim truncate">{a.description}</p>
                  {isEarned && (
                    <span className={`absolute top-1.5 right-1.5 text-[8px] font-bold uppercase ${colors.text}`}>
                      {a.rarity}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** Compact inline badges for profile headers */
export function AchievementBadges({ earned, max = 5 }: { earned: Achievement[]; max?: number }) {
  if (earned.length === 0) return null;

  const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
  const top = [...earned]
    .sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity])
    .slice(0, max);

  const remaining = earned.length - top.length;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {top.map((a) => (
        <span
          key={a.id}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${rarityColors[a.rarity].bg} ${rarityColors[a.rarity].text} ${rarityColors[a.rarity].border} border`}
          title={`${a.name}: ${a.description}`}
        >
          <AchievementIcon icon={a.icon} className="w-3 h-3" />
          {a.name}
        </span>
      ))}
      {remaining > 0 && (
        <span className="text-[10px] text-fab-dim">+{remaining} more</span>
      )}
    </div>
  );
}

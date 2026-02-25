"use client";
import { useState } from "react";
import type { Achievement } from "@/types";
import { rarityColors, getAllAchievements } from "@/lib/achievements";

export function AchievementShowcase({ earned }: { earned: Achievement[] }) {
  const [showAll, setShowAll] = useState(false);

  if (earned.length === 0) return null;

  const all = getAllAchievements();
  const earnedIds = new Set(earned.map((a) => a.id));
  const displayed = showAll ? all : earned;

  // Sort: earned first (by rarity desc), then locked
  const sorted = [...displayed].sort((a, b) => {
    const aEarned = earnedIds.has(a.id) ? 1 : 0;
    const bEarned = earnedIds.has(b.id) ? 1 : 0;
    if (aEarned !== bEarned) return bEarned - aEarned;
    const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
    return rarityOrder[b.rarity] - rarityOrder[a.rarity];
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-fab-text flex items-center gap-2">
          <span className="text-xl">🏅</span>
          Achievements
          <span className="text-sm font-normal text-fab-dim">
            {earned.length}/{all.length}
          </span>
        </h2>
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
              <div className="text-2xl mb-1">{a.icon}</div>
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
    </div>
  );
}

/** Compact inline badges for profile headers */
export function AchievementBadges({ earned, max = 5 }: { earned: Achievement[]; max?: number }) {
  if (earned.length === 0) return null;

  // Show highest rarity first
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
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${rarityColors[a.rarity].bg} ${rarityColors[a.rarity].text} ${rarityColors[a.rarity].border} border`}
          title={`${a.name}: ${a.description}`}
        >
          {a.icon} {a.name}
        </span>
      ))}
      {remaining > 0 && (
        <span className="text-[10px] text-fab-dim">+{remaining} more</span>
      )}
    </div>
  );
}

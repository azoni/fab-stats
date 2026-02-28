"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import type { Achievement } from "@/types";
import { rarityColors, getAllAchievements } from "@/lib/achievements";
import { getAllBadges } from "@/lib/badges";
import { AchievementIcon } from "./AchievementIcons";

interface GroupedAchievement {
  /** The achievement to display (highest earned tier, or next target if none earned) */
  display: Achievement;
  /** All tiers in this group */
  tiers: Achievement[];
  /** Number of tiers earned */
  earnedCount: number;
  /** Total tiers in group */
  totalCount: number;
  /** Whether the displayed tier is earned */
  isEarned: boolean;
}

function groupAchievements(all: Achievement[], earnedIds: Set<string>): GroupedAchievement[] {
  const groups = new Map<string, Achievement[]>();
  const ungrouped: Achievement[] = [];

  for (const a of all) {
    if (a.group) {
      const list = groups.get(a.group) || [];
      list.push(a);
      groups.set(a.group, list);
    } else {
      ungrouped.push(a);
    }
  }

  const result: GroupedAchievement[] = [];

  for (const [, tiers] of groups) {
    // Sort by tier
    tiers.sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0));
    const earned = tiers.filter((t) => earnedIds.has(t.id));
    const earnedCount = earned.length;

    // Show highest earned tier, or the first unearneed tier as next target
    let display: Achievement;
    if (earnedCount > 0) {
      display = earned[earned.length - 1]; // highest earned
    } else {
      display = tiers[0]; // first tier as target
    }

    result.push({
      display,
      tiers,
      earnedCount,
      totalCount: tiers.length,
      isEarned: earnedCount > 0,
    });
  }

  // Add ungrouped as single-item groups
  for (const a of ungrouped) {
    result.push({
      display: a,
      tiers: [a],
      earnedCount: earnedIds.has(a.id) ? 1 : 0,
      totalCount: 1,
      isEarned: earnedIds.has(a.id),
    });
  }

  return result;
}

export function AchievementShowcase({ earned, progress, forceExpanded }: { earned: Achievement[]; progress?: Record<string, { current: number; target: number }>; forceExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const wasForced = useRef(false);

  useEffect(() => {
    if (forceExpanded && !wasForced.current) {
      setExpanded(true);
      wasForced.current = true;
    }
  }, [forceExpanded]);
  const [showAll, setShowAll] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const all = useMemo(() => [...getAllAchievements(), ...getAllBadges()], []);
  const earnedIds = useMemo(() => new Set(earned.map((a) => a.id)), [earned]);
  const totalEarned = earned.length;
  // Don't count hidden admin badges in the denominator
  const totalVisible = useMemo(() => {
    const earnedSpecial = earned.filter((a) => a.category === "special").length;
    return getAllAchievements().length + earnedSpecial;
  }, [earned]);

  const grouped = useMemo(() => groupAchievements(all, earnedIds), [all, earnedIds]);

  // Filter: show all or only groups with at least one earned
  // Always hide unearned admin-assigned (special) badges — they should only appear when assigned
  const displayed = (showAll ? grouped : grouped.filter((g) => g.isEarned))
    .filter((g) => g.isEarned || g.display.category !== "special");

  // Sort: earned first, special badges above regular, then by rarity
  const sorted = useMemo(() => {
    const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
    return [...displayed].sort((a, b) => {
      if (a.isEarned !== b.isEarned) return a.isEarned ? -1 : 1;
      const aSpecial = a.display.category === "special" ? 1 : 0;
      const bSpecial = b.display.category === "special" ? 1 : 0;
      if (aSpecial !== bSpecial) return bSpecial - aSpecial;
      return rarityOrder[b.display.rarity] - rarityOrder[a.display.rarity];
    });
  }, [displayed]);

  if (totalEarned === 0) return null;

  return (
    <div id="achievements" className="bg-fab-surface/50 border border-fab-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 group hover:bg-fab-surface/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AchievementIcon icon="section-achievements" className="w-4 h-4 text-fab-gold" />
          <h2 className="text-sm font-semibold text-fab-text">Achievements</h2>
          <span className="text-xs text-fab-dim">
            {totalEarned}/{totalVisible}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-fab-muted group-hover:text-fab-text transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors"
            >
              {showAll ? "Earned Only" : "Show All"}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {sorted.map((g) => {
              const a = g.display;
              const colors = rarityColors[a.rarity];
              const isGrouped = g.totalCount > 1;
              const isExpGroup = expandedGroup === (a.group ?? a.id);
              const isSpecial = a.category === "special";

              return (
                <div key={a.group ?? a.id}>
                  <div
                    className={`relative rounded-lg border p-3 transition-colors ${
                      g.isEarned
                        ? isSpecial ? "badge-special-card" : `${colors.bg} ${colors.border}`
                        : "bg-fab-surface/30 border-fab-border/50"
                    } ${isGrouped ? "cursor-pointer" : ""}`}
                    title={`${a.name}: ${a.description}${!g.isEarned ? " (Locked)" : ""}`}
                    onClick={isGrouped ? () => setExpandedGroup(isExpGroup ? null : (a.group ?? a.id)) : undefined}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <AchievementIcon
                        icon={a.icon}
                        className={`w-6 h-6 ${g.isEarned ? (isSpecial ? "text-violet-300" : colors.text) : "text-fab-dim/50"}`}
                      />
                      {!g.isEarned && (
                        <svg className="w-3.5 h-3.5 text-fab-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      )}
                    </div>
                    <p className={`text-xs font-semibold truncate ${g.isEarned ? (isSpecial ? "text-violet-300" : colors.text) : "text-fab-dim/60"}`}>
                      {a.name}
                    </p>
                    <p className={`text-[10px] truncate ${g.isEarned ? "text-fab-dim" : "text-fab-dim/40"}`}>{a.description}</p>

                    {/* Progress bar for unearned */}
                    {!g.isEarned && progress?.[a.id] && (() => {
                      const p = progress[a.id];
                      const pct = Math.min(100, Math.round((p.current / p.target) * 100));
                      return (
                        <div className="mt-1.5">
                          <div className="h-1 rounded-full bg-fab-border/50 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-fab-dim/60 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-fab-dim/50 mt-0.5">{p.current}/{p.target}</p>
                        </div>
                      );
                    })()}

                    {/* Tier indicator for grouped */}
                    {isGrouped && (
                      <div className="flex items-center gap-0.5 mt-1.5">
                        {g.tiers.map((t, i) => (
                          <div
                            key={t.id}
                            className={`w-1.5 h-1.5 rounded-full ${
                              earnedIds.has(t.id)
                                ? `bg-current ${rarityColors[t.rarity].text}`
                                : "bg-fab-border/50"
                            }`}
                            title={`Tier ${i + 1}: ${t.name}`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Rarity badge — sparkle for special, text for regular */}
                    {g.isEarned && (
                      isSpecial ? (
                        <svg className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-violet-300" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l2.09 6.26L20.18 9.27l-4.64 4.14L16.82 20 12 16.77 7.18 20l1.27-6.59L3.82 9.27l6.09-1.01L12 2z" />
                        </svg>
                      ) : (
                        <span className={`absolute top-1.5 right-1.5 text-[8px] font-bold uppercase ${colors.text}`}>
                          {a.rarity}
                        </span>
                      )
                    )}
                  </div>

                  {/* Expanded tier list */}
                  {isGrouped && isExpGroup && (
                    <div className="mt-1 space-y-0.5">
                      {g.tiers.map((t) => {
                        const tEarned = earnedIds.has(t.id);
                        const tc = rarityColors[t.rarity];
                        const tp = progress?.[t.id];
                        return (
                          <div
                            key={t.id}
                            className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] ${
                              tEarned
                                ? `${tc.bg} ${tc.border} border`
                                : "bg-fab-surface/20 border border-fab-border/30"
                            }`}
                          >
                            <AchievementIcon
                              icon={t.icon}
                              className={`w-3.5 h-3.5 shrink-0 ${tEarned ? tc.text : "text-fab-dim/40"}`}
                            />
                            <span className={`truncate ${tEarned ? tc.text : "text-fab-dim/50"} font-medium`}>
                              {t.name}
                            </span>
                            <span className={`ml-auto shrink-0 ${tEarned ? "text-fab-dim" : "text-fab-dim/40"}`}>
                              {t.description}
                            </span>
                            {!tEarned && tp && (
                              <span className="text-fab-dim/40 shrink-0">{tp.current}/{tp.target}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Compact inline badges for profile headers */
export function AchievementBadges({ earned, max = 5, mobileMax, onShowMore }: { earned: Achievement[]; max?: number; mobileMax?: number; onShowMore?: () => void }) {
  if (earned.length === 0) return null;

  const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
  const top = [...earned]
    .sort((a, b) => {
      const aSpecial = a.category === "special" ? 1 : 0;
      const bSpecial = b.category === "special" ? 1 : 0;
      if (aSpecial !== bSpecial) return bSpecial - aSpecial;
      return rarityOrder[b.rarity] - rarityOrder[a.rarity];
    })
    .slice(0, max);

  const remaining = earned.length - top.length;
  const effectiveMobileMax = mobileMax !== undefined ? Math.min(mobileMax, max) : max;
  const mobileRemaining = earned.length - effectiveMobileMax;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {top.map((a, i) => {
        const isSpecial = a.category === "special";
        return (
          <span
            key={a.id}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium max-w-[130px] border ${
              isSpecial
                ? "badge-special-inline text-violet-300"
                : `${rarityColors[a.rarity].bg} ${rarityColors[a.rarity].text} ${rarityColors[a.rarity].border}`
            } ${i >= effectiveMobileMax ? "hidden sm:inline-flex" : ""}`}
            title={`${a.name}: ${a.description}`}
          >
            <AchievementIcon icon={a.icon} className="w-3 h-3 shrink-0" />
            <span className="truncate">{a.name}</span>
          </span>
        );
      })}
      {mobileMax !== undefined && mobileRemaining > remaining && mobileRemaining > 0 && (
        <button
          onClick={onShowMore}
          className="text-[10px] text-fab-dim hover:text-fab-gold transition-colors cursor-pointer sm:hidden"
        >
          +{mobileRemaining} more
        </button>
      )}
      {remaining > 0 && (
        <button
          onClick={onShowMore}
          className={`text-[10px] text-fab-dim hover:text-fab-gold transition-colors cursor-pointer ${mobileMax !== undefined && mobileRemaining > remaining ? "hidden sm:inline" : ""}`}
        >
          +{remaining} more
        </button>
      )}
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import type { SessionRecap } from "@/lib/session-recap";
import type { Achievement } from "@/types";
import type { PlayoffFinish } from "@/lib/stats";
import type { BadgeTierInfo } from "@/lib/badge-tiers";
import { TIER_VISUALS } from "@/lib/badge-tiers";
import { tierConfig } from "@/lib/mastery";
import { rarityColors } from "@/lib/achievements";
import { getCommunityMatchups } from "@/lib/hero-matchups";
import { AchievementIcon } from "@/components/gamification/AchievementIcons";
import { HeroImg } from "@/components/heroes/HeroImg";
import { BADGE_ICON_MAP } from "@/components/profile/BadgeIcons";
import { BadgeTierWrapper } from "@/components/profile/BadgeTierWrapper";
import { PlacementShareModal } from "./PlacementShareCard";

const placementConfig: Record<PlayoffFinish["type"], { label: string; icon: string; color: string; bg: string; border: string }> = {
  champion: { label: "Event Champion!", icon: "crown", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/40" },
  finalist: { label: "Finalist!", icon: "medal", color: "text-gray-300", bg: "bg-gray-300/10", border: "border-gray-300/30" },
  top4: { label: "Top 4 Finish!", icon: "star", color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-600/30" },
  top8: { label: "Top 8 Finish!", icon: "shield", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
};

const rarityOrder: Record<Achievement["rarity"], number> = {
  legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4,
};

interface Props {
  recap: SessionRecap;
  onViewOpponents: () => void;
  onDashboard: () => void;
  onImportMore: () => void;
  skippedCount: number;
  newAchievements?: Achievement[];
  newPlacements?: PlayoffFinish[];
  playerName?: string;
  matchBadgeTierUp?: { tier: BadgeTierInfo; count: number } | null;
  quickMode?: boolean;
}

export function PostEventRecap({ recap, onViewOpponents, onDashboard, onImportMore, skippedCount, newAchievements, newPlacements, playerName, matchBadgeTierUp, quickMode }: Props) {
  const { wins, losses, draws, winRate, bestStreak, heroInsights, newOpponents, sessionMatchups, missingOpponentHeroCount, eventCount, day2EventCount, newOverallWinRate, newTotalMatches, currentStreak } = recap;
  const total = wins + losses + draws;

  // Big imports (a new user dumping years of history) get a compact recap so
  // the celebration isn't a mile long. ≤10 events → full recap.
  const compact = eventCount > 10;

  const hasPlacement = newPlacements && newPlacements.length > 0;
  const hasNewAchievements = newAchievements && newAchievements.length > 0;

  // Share modal state — auto-open for the best placement
  const [shareFinish, setShareFinish] = useState<PlayoffFinish | null>(null);
  const [autoOpened, setAutoOpened] = useState(false);
  const [visiblePlacements, setVisiblePlacements] = useState(3);
  const [showAllAchievements, setShowAllAchievements] = useState(false);

  // Community win-rate context for the session's matchups (best-effort).
  const [communityMatchups, setCommunityMatchups] = useState<Map<string, { winRate: number; total: number }>>(new Map());
  useEffect(() => {
    if (compact || sessionMatchups.length === 0) return;
    let cancelled = false;
    getCommunityMatchups(sessionMatchups.map((m) => ({ heroPlayed: m.heroPlayed, opponentHero: m.opponentHero })))
      .then((map) => { if (!cancelled) setCommunityMatchups(map); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [compact, sessionMatchups]);

  useEffect(() => {
    if (hasPlacement && !autoOpened && playerName) {
      // Auto-open share for the best placement (champion > finalist > top4 > top8)
      const priority: Record<PlayoffFinish["type"], number> = { champion: 0, finalist: 1, top4: 2, top8: 3 };
      const best = [...newPlacements].sort((a, b) => priority[a.type] - priority[b.type])[0];
      // Small delay so the user sees the celebration first
      const timer = setTimeout(() => {
        setShareFinish(best);
        setAutoOpened(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [hasPlacement, autoOpened, newPlacements, playerName]);

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
          hasPlacement ? "bg-amber-400/20" : "bg-fab-gold/15"
        }`}>
          <AchievementIcon
            icon={hasPlacement ? "crown" : hasNewAchievements ? "star" : "trophy"}
            className={`w-8 h-8 ${hasPlacement ? "text-amber-400" : "text-fab-gold"}`}
          />
        </div>
        <h1 className="text-2xl font-bold text-fab-gold mb-1">
          {hasPlacement ? "What a Finish!" : hasNewAchievements ? "Nice Session!" : quickMode ? "Sync Complete!" : "Import Complete!"}
        </h1>
        <p className="text-fab-muted text-sm">
          {total} match{total === 1 ? "" : "es"} imported
          {skippedCount > 0 && <span className="text-fab-dim"> ({skippedCount} duplicate{skippedCount === 1 ? "" : "s"} skipped)</span>}
        </p>
      </div>

      {/* Placement Celebrations */}
      {hasPlacement && (
        <div className="space-y-3">
          {newPlacements.slice(0, visiblePlacements).map((finish, i) => {
            const config = placementConfig[finish.type];
            return (
              <div
                key={`${finish.eventName}-${finish.eventDate}-${i}`}
                className={`relative overflow-hidden rounded-xl p-5 text-center ${config.bg} border ${config.border}`}
              >
                <div className="absolute inset-0 opacity-[0.03]">
                  <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-current" />
                  <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-current" />
                </div>
                <div className="relative">
                  <AchievementIcon icon={config.icon} className={`w-12 h-12 mx-auto mb-2 ${config.color}`} />
                  <p className={`text-2xl font-bold ${config.color} mb-1`}>{config.label}</p>
                  <p className="text-sm text-fab-text font-medium">{finish.eventName}</p>
                  <p className="text-xs text-fab-muted mt-0.5">
                    {finish.format}{finish.eventType && ` \u00b7 ${finish.eventType}`}
                  </p>
                  {playerName && (
                    <button
                      onClick={() => setShareFinish(finish)}
                      className={`mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${config.bg} ${config.border} border ${config.color} hover:opacity-80`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {newPlacements.length > 3 && (
            <div className="flex justify-center">
              {visiblePlacements < newPlacements.length ? (
                <button
                  onClick={() => setVisiblePlacements((c) => Math.min(c + 5, newPlacements.length))}
                  className="px-4 py-2 rounded-lg bg-fab-surface border border-fab-border text-fab-text text-sm font-medium hover:bg-fab-surface-hover transition-colors"
                >
                  Show more finishes ({newPlacements.length - visiblePlacements} remaining)
                </button>
              ) : (
                <button
                  onClick={() => setVisiblePlacements(3)}
                  className="px-4 py-2 rounded-lg bg-fab-surface border border-fab-border text-fab-dim text-sm font-medium hover:bg-fab-surface-hover transition-colors"
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Day 2 celebration — making day two is a big deal */}
      {day2EventCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-500/40 bg-indigo-500/10 p-4">
          <AchievementIcon icon="trophy" className="w-6 h-6 text-indigo-300 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-indigo-200">
              You made Day 2{day2EventCount > 1 ? ` ×${day2EventCount}` : ""}!
            </p>
            <p className="text-xs text-fab-muted">
              {day2EventCount > 1 ? "Multi-day runs" : "A multi-day run"} — only the top players grind into day two.
            </p>
          </div>
        </div>
      )}

      {/* Session Record Card — hidden in quick mode */}
      {!quickMode && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-5">
          <h2 className="text-xs font-semibold text-fab-dim uppercase tracking-wider mb-3">Session Record</h2>
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-fab-win">{wins}</p>
              <p className="text-xs text-fab-muted">Wins</p>
            </div>
            <div className="text-4xl font-light text-fab-border">-</div>
            <div className="text-center">
              <p className="text-3xl font-bold text-fab-loss">{losses}</p>
              <p className="text-xs text-fab-muted">Losses</p>
            </div>
            {draws > 0 && (
              <>
                <div className="text-4xl font-light text-fab-border">-</div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-fab-draw">{draws}</p>
                  <p className="text-xs text-fab-muted">Draws</p>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-center gap-4 text-sm">
            <span className={`font-semibold ${winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
              {winRate.toFixed(0)}% Win Rate
            </span>
            {bestStreak >= 3 && (
              <span className="text-fab-gold flex items-center gap-1">
                <AchievementIcon icon="flame" className="w-4 h-4" />
                {bestStreak} Win Streak
              </span>
            )}
          </div>
        </div>
      )}

      {/* Insight Pills — hidden in quick mode + compact (large) imports */}
      {!quickMode && !compact && (heroInsights.length > 0 || currentStreak) && (
        <div className="space-y-2">
          {/* Tier-ups */}
          {heroInsights.filter((h) => h.tierUp).map((h) => {
            const config = tierConfig[h.newTier.tier];
            return (
              <div key={`tier-${h.heroName}`} className={`flex items-center gap-3 rounded-lg p-3 ${config.bg} border ${config.border}`}>
                <AchievementIcon icon="star" className={`w-5 h-5 ${config.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-fab-text">
                    {h.heroName} — <span className={config.color}>{config.label}</span>
                  </p>
                  <p className="text-xs text-fab-muted">
                    Mastery tier up! Now at {h.newTotalMatches} matches.
                  </p>
                </div>
              </div>
            );
          })}

          {/* Win rate changes */}
          {heroInsights.filter((h) => h.previousWinRate !== null && !h.tierUp).map((h) => {
            const delta = h.newWinRate - (h.previousWinRate ?? 0);
            const isUp = delta > 0;
            if (Math.abs(delta) < 1) return null;
            return (
              <div key={`wr-${h.heroName}`} className="flex items-center gap-3 rounded-lg p-3 bg-fab-surface border border-fab-border">
                <AchievementIcon icon={isUp ? "trending" : "chart"} className={`w-5 h-5 ${isUp ? "text-fab-win" : "text-fab-loss"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-fab-text">
                    {h.heroName} win rate{" "}
                    <span className={isUp ? "text-fab-win" : "text-fab-loss"}>
                      {isUp ? "+" : ""}{delta.toFixed(0)}%
                    </span>
                  </p>
                  <p className="text-xs text-fab-muted">
                    Now {h.newWinRate.toFixed(0)}% over {h.newTotalMatches} matches
                  </p>
                </div>
              </div>
            );
          })}

          {/* New heroes */}
          {heroInsights.filter((h) => h.previousWinRate === null).map((h) => (
            <div key={`new-${h.heroName}`} className="flex items-center gap-3 rounded-lg p-3 bg-fab-surface border border-fab-border">
              <AchievementIcon icon="sword" className="w-5 h-5 text-fab-gold" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fab-text">
                  New hero: {h.heroName}
                </p>
                <p className="text-xs text-fab-muted">
                  {h.sessionWins}W-{h.sessionMatches - h.sessionWins}L in first matches
                </p>
              </div>
            </div>
          ))}

          {/* Current streak */}
          {currentStreak && currentStreak.count >= 3 && (
            <div className={`flex items-center gap-3 rounded-lg p-3 ${
              currentStreak.type === "win" ? "bg-fab-win/10 border border-fab-win/30" : "bg-fab-loss/10 border border-fab-loss/30"
            }`}>
              <AchievementIcon icon="flame" className={`w-5 h-5 ${currentStreak.type === "win" ? "text-fab-win" : "text-fab-loss"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fab-text">
                  {currentStreak.count}-game {currentStreak.type} streak
                </p>
                <p className="text-xs text-fab-muted">
                  {currentStreak.type === "win" ? "You're on fire!" : "Time to turn it around!"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compact summary line for large imports */}
      {compact && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4 text-center">
          <p className="text-sm text-fab-muted">
            Imported <span className="font-semibold text-fab-text">{total}</span> matches across{" "}
            <span className="font-semibold text-fab-text">{eventCount}</span> events
            {newOpponents.length > 0 && (
              <> · <span className="font-semibold text-fab-text">{newOpponents.length}</span> new opponents</>
            )}
            .
          </p>
        </div>
      )}

      {/* New opponents — full recap only */}
      {!compact && !quickMode && newOpponents.length > 0 && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-5">
          <h2 className="text-xs font-semibold text-fab-dim uppercase tracking-wider mb-3">
            {newOpponents.length} New Opponent{newOpponents.length === 1 ? "" : "s"} Faced
          </h2>
          <div className="flex flex-wrap gap-2">
            {newOpponents.slice(0, 12).map((o) => (
              <span key={o.name} className="inline-flex items-center gap-1.5 rounded-full border border-fab-border bg-fab-bg px-2.5 py-1 text-xs text-fab-text">
                {o.hero && <HeroImg name={o.hero} size="sm" />}
                {o.name}
              </span>
            ))}
            {newOpponents.length > 12 && (
              <span className="inline-flex items-center rounded-full border border-fab-border bg-fab-bg px-2.5 py-1 text-xs text-fab-dim">
                +{newOpponents.length - 12} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Session matchups with community context — full recap only */}
      {!compact && !quickMode && sessionMatchups.length > 0 && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-5">
          <h2 className="text-xs font-semibold text-fab-dim uppercase tracking-wider mb-3">Your Matchups This Session</h2>
          <div className="space-y-2">
            {sessionMatchups.slice(0, 8).map((m) => {
              const community = communityMatchups.get(`${m.heroPlayed}|${m.opponentHero}`);
              const mTotal = m.wins + m.losses + m.draws;
              return (
                <div key={`${m.heroPlayed}|${m.opponentHero}`} className="flex items-center gap-2 rounded-lg bg-fab-bg/60 p-2.5">
                  <HeroImg name={m.heroPlayed} size="sm" />
                  <span className="text-xs text-fab-dim">vs</span>
                  <HeroImg name={m.opponentHero} size="sm" />
                  <span className="ml-1 min-w-0 flex-1 truncate text-xs text-fab-muted">
                    {m.heroPlayed.split(",")[0]} <span className="text-fab-dim">into</span> {m.opponentHero.split(",")[0]}
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${m.wins >= m.losses ? "text-fab-win" : "text-fab-loss"}`}>
                    {m.wins}-{m.losses}{m.draws > 0 ? `-${m.draws}` : ""}
                  </span>
                  {community && community.total >= 5 && (
                    <span className="hidden sm:inline text-[11px] text-fab-dim whitespace-nowrap" title={`${community.total} community matches`}>
                      · community {community.winRate}%
                    </span>
                  )}
                  <span className="sr-only">{mTotal} matches</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fill-the-gaps nudge — encourage adding opponent heroes to unlock data */}
      {!quickMode && missingOpponentHeroCount > 0 && (
        <Link
          href="/matches"
          className="block rounded-lg border border-fab-gold/40 bg-fab-gold/[0.06] p-4 transition-colors hover:border-fab-gold/60 hover:bg-fab-gold/10"
        >
          <p className="text-sm font-semibold text-fab-gold">
            {missingOpponentHeroCount} match{missingOpponentHeroCount === 1 ? "" : "es"} missing opponent heroes
          </p>
          <p className="mt-0.5 text-xs text-fab-muted">
            Add them on the Matches page to unlock matchup win rates and richer stats →
          </p>
        </Link>
      )}

      {/* Badge Tier Up */}
      {matchBadgeTierUp && (() => {
        const Icon = BADGE_ICON_MAP["first-match"];
        const visual = TIER_VISUALS[matchBadgeTierUp.tier.tier];
        const isFirst = matchBadgeTierUp.tier.level === 1;
        return (
          <div className="flex items-center gap-3 rounded-lg p-4 bg-fab-gold/10 border border-fab-gold/30">
            <BadgeTierWrapper tier={matchBadgeTierUp.tier.tier} size="md">
              <div style={{ color: visual.ringColor !== "transparent" ? visual.ringColor : "#C9A84C" }}>
                {Icon && <Icon className="w-6 h-6" />}
              </div>
            </BadgeTierWrapper>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fab-gold">
                {isFirst ? "Badge Earned: First Blood!" : `Badge Upgraded: ${matchBadgeTierUp.tier.label} Tier!`}
              </p>
              <p className="text-xs text-fab-muted">
                {matchBadgeTierUp.count} matches logged
                {matchBadgeTierUp.tier.nextThreshold && ` \u00b7 Next tier at ${matchBadgeTierUp.tier.nextThreshold}`}
              </p>
            </div>
          </div>
        );
      })()}

      {/* New Achievements */}
      {hasNewAchievements && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-fab-dim uppercase tracking-wider">
            {newAchievements.length === 1 ? "Achievement Unlocked!" : `${newAchievements.length} Achievements Unlocked!`}
          </h2>
          {[...newAchievements]
            .sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity])
            .slice(0, showAllAchievements ? newAchievements.length : 4)
            .map((achievement) => {
              const colors = rarityColors[achievement.rarity];
              return (
                <div
                  key={achievement.id}
                  className={`flex items-center gap-3 rounded-lg p-3 ${colors.bg} border ${colors.border}`}
                >
                  <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                    <AchievementIcon icon={achievement.icon} className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${colors.text}`}>{achievement.name}</p>
                      <span className={`text-[10px] font-medium uppercase tracking-wider ${colors.text} opacity-70`}>
                        {achievement.rarity}
                      </span>
                    </div>
                    <p className="text-xs text-fab-muted">{achievement.description}</p>
                  </div>
                </div>
              );
            })}
          {newAchievements.length > 4 && (
            <button
              type="button"
              onClick={() => setShowAllAchievements((value) => !value)}
              className="text-xs font-semibold text-fab-gold hover:text-fab-gold-light transition-colors"
            >
              {showAllAchievements ? "Show fewer" : `View ${newAchievements.length - 4} more`}
            </button>
          )}
        </div>
      )}

      {/* Overall Stats — hidden in quick mode */}
      {!quickMode && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <h2 className="text-xs font-semibold text-fab-dim uppercase tracking-wider mb-3">Your Overall Stats</h2>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-fab-text">{newTotalMatches}</p>
              <p className="text-xs text-fab-muted">Total Matches</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${newOverallWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                {newOverallWinRate.toFixed(1)}%
              </p>
              <p className="text-xs text-fab-muted">Overall Win Rate</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        {!quickMode && (
          <button onClick={onViewOpponents} className="px-6 min-h-[48px] py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light active:bg-fab-gold-light transition-colors">
            View Opponent Stats
          </button>
        )}
        <button onClick={onDashboard} className={`px-6 min-h-[48px] py-3 rounded-md font-semibold transition-colors ${quickMode ? "bg-fab-gold text-fab-bg hover:bg-fab-gold-light active:bg-fab-gold-light" : "bg-fab-surface border border-fab-border text-fab-text hover:bg-fab-surface-hover active:bg-fab-surface-hover"}`}>
          Dashboard
        </button>
        {!quickMode && (
          <button onClick={onImportMore} className="px-6 min-h-[48px] py-3 rounded-md font-semibold bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text active:bg-fab-surface-hover transition-colors">
            Import More
          </button>
        )}
      </div>

      {/* Placement Share Modal */}
      {shareFinish && playerName && (
        <PlacementShareModal
          playerName={playerName}
          finish={shareFinish}
          onClose={() => setShareFinish(null)}
        />
      )}
    </div>
  );
}

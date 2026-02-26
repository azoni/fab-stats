"use client";
import type { SessionRecap } from "@/lib/session-recap";
import { tierConfig } from "@/lib/mastery";
import { AchievementIcon } from "@/components/gamification/AchievementIcons";

interface Props {
  recap: SessionRecap;
  onViewOpponents: () => void;
  onDashboard: () => void;
  onImportMore: () => void;
  skippedCount: number;
}

export function PostEventRecap({ recap, onViewOpponents, onDashboard, onImportMore, skippedCount }: Props) {
  const { wins, losses, draws, winRate, bestStreak, heroInsights, newOverallWinRate, newTotalMatches, currentStreak } = recap;
  const total = wins + losses + draws;

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-fab-gold/15 flex items-center justify-center mx-auto mb-3">
          <AchievementIcon icon="trophy" className="w-8 h-8 text-fab-gold" />
        </div>
        <h1 className="text-2xl font-bold text-fab-gold mb-1">Import Complete!</h1>
        <p className="text-fab-muted text-sm">
          {total} match{total === 1 ? "" : "es"} imported
          {skippedCount > 0 && <span className="text-fab-dim"> ({skippedCount} duplicate{skippedCount === 1 ? "" : "s"} skipped)</span>}
        </p>
      </div>

      {/* Session Record Card */}
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

      {/* Insight Pills */}
      {(heroInsights.length > 0 || currentStreak) && (
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

      {/* Overall Stats */}
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

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button onClick={onViewOpponents} className="px-6 min-h-[48px] py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light active:bg-fab-gold-light transition-colors">
          View Opponent Stats
        </button>
        <button onClick={onDashboard} className="px-6 min-h-[48px] py-3 rounded-md font-semibold bg-fab-surface border border-fab-border text-fab-text hover:bg-fab-surface-hover active:bg-fab-surface-hover transition-colors">
          Dashboard
        </button>
        <button onClick={onImportMore} className="px-6 min-h-[48px] py-3 rounded-md font-semibold bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text active:bg-fab-surface-hover transition-colors">
          Import More
        </button>
      </div>
    </div>
  );
}

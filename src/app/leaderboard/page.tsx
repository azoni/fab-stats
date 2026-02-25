"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { TrophyIcon } from "@/components/icons/NavIcons";
import type { LeaderboardEntry } from "@/types";

type Tab = "winrate" | "volume" | "streaks" | "draws" | "events" | "rated";

const tabs: { id: Tab; label: string }[] = [
  { id: "winrate", label: "Win Rate" },
  { id: "volume", label: "Most Matches" },
  { id: "streaks", label: "Streaks" },
  { id: "draws", label: "Draws" },
  { id: "events", label: "Events" },
  { id: "rated", label: "Rated" },
];

function formatRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

export default function LeaderboardPage() {
  const { entries, loading } = useLeaderboard();
  const [activeTab, setActiveTab] = useState<Tab>("winrate");

  const ranked = useMemo(() => {
    switch (activeTab) {
      case "winrate":
        return [...entries]
          .filter((e) => e.totalMatches >= 10)
          .sort((a, b) => b.winRate - a.winRate || b.totalMatches - a.totalMatches);
      case "volume":
        return [...entries].sort((a, b) => b.totalMatches - a.totalMatches);
      case "streaks":
        return [...entries]
          .filter((e) => e.longestWinStreak > 0)
          .sort((a, b) => b.longestWinStreak - a.longestWinStreak || b.totalMatches - a.totalMatches);
      case "draws":
        return [...entries]
          .filter((e) => e.totalDraws > 0)
          .sort((a, b) => b.totalDraws - a.totalDraws || b.totalMatches - a.totalMatches);
      case "events":
        return [...entries]
          .filter((e) => e.eventsPlayed > 0)
          .sort((a, b) => b.eventWins - a.eventWins || b.eventsPlayed - a.eventsPlayed);
      case "rated":
        return [...entries]
          .filter((e) => e.ratedMatches >= 5)
          .sort((a, b) => b.ratedWinRate - a.ratedWinRate || b.ratedMatches - a.ratedMatches);
      default:
        return entries;
    }
  }, [entries, activeTab]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-fab-gold mb-2">Leaderboard</h1>
      <p className="text-fab-muted text-sm mb-6">
        See how public players stack up across different categories.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-fab-gold/15 text-fab-gold"
                : "bg-fab-surface text-fab-muted hover:text-fab-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-16 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && ranked.length === 0 && (
        <div className="text-center py-16">
          <TrophyIcon className="w-14 h-14 text-fab-muted mb-4 mx-auto" />
          <h2 className="text-lg font-semibold text-fab-text mb-2">No entries yet</h2>
          <p className="text-fab-muted text-sm">
            {activeTab === "winrate"
              ? "Players need at least 10 matches to appear here."
              : activeTab === "rated"
                ? "Players need at least 5 rated matches to appear here."
                : "Import matches to appear on the leaderboard."}
          </p>
        </div>
      )}

      {!loading && ranked.length > 0 && (
        <div className="space-y-2">
          {ranked.map((entry, i) => (
            <LeaderboardRow key={entry.userId} entry={entry} rank={i + 1} tab={activeTab} />
          ))}
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({
  entry,
  rank,
  tab,
}: {
  entry: LeaderboardEntry;
  rank: number;
  tab: Tab;
}) {
  const initials = entry.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const medal =
    rank === 1
      ? "text-yellow-400"
      : rank === 2
        ? "text-gray-300"
        : rank === 3
          ? "text-amber-600"
          : "text-fab-dim";

  return (
    <Link
      href={`/player/${entry.username}`}
      className="flex items-center gap-3 bg-fab-surface border border-fab-border rounded-lg p-4 hover:border-fab-gold/30 transition-colors"
    >
      {/* Rank */}
      <span className={`text-lg font-black w-8 text-center shrink-0 ${medal}`}>
        {rank}
      </span>

      {/* Avatar */}
      {entry.photoUrl ? (
        <img src={entry.photoUrl} alt="" className="w-10 h-10 rounded-full shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-sm font-bold shrink-0">
          {initials}
        </div>
      )}

      {/* Name */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fab-text truncate">{entry.displayName}</p>
        <p className="text-xs text-fab-dim truncate">@{entry.username}</p>
      </div>

      {/* Stat */}
      <div className="text-right shrink-0">
        {tab === "winrate" && (
          <>
            <p className={`text-lg font-bold ${entry.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
              {formatRate(entry.winRate)}
            </p>
            <p className="text-xs text-fab-dim">{entry.totalWins}W-{entry.totalLosses}L{entry.totalDraws > 0 ? `-${entry.totalDraws}D` : ""}</p>
          </>
        )}
        {tab === "volume" && (
          <>
            <p className="text-lg font-bold text-fab-text">{entry.totalMatches}</p>
            <p className="text-xs text-fab-dim">
              {entry.totalWins}W-{entry.totalLosses}L{entry.totalDraws > 0 ? `-${entry.totalDraws}D` : ""} ({formatRate(entry.winRate)})
            </p>
          </>
        )}
        {tab === "streaks" && (
          <>
            <p className="text-lg font-bold text-fab-win">{entry.longestWinStreak}</p>
            <p className="text-xs text-fab-dim">
              best streak
              {entry.currentStreakType === "win" && entry.currentStreakCount > 1
                ? ` / ${entry.currentStreakCount} current`
                : ""}
            </p>
          </>
        )}
        {tab === "draws" && (
          <>
            <p className="text-lg font-bold text-fab-text">{entry.totalDraws}</p>
            <p className="text-xs text-fab-dim">
              {entry.totalMatches} matches ({formatRate(entry.winRate)})
            </p>
          </>
        )}
        {tab === "events" && (
          <>
            <p className="text-lg font-bold text-fab-gold">{entry.eventWins}</p>
            <p className="text-xs text-fab-dim">
              wins / {entry.eventsPlayed} events
            </p>
          </>
        )}
        {tab === "rated" && (
          <>
            <p className={`text-lg font-bold ${entry.ratedWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
              {formatRate(entry.ratedWinRate)}
            </p>
            <p className="text-xs text-fab-dim">
              {entry.ratedWins}W / {entry.ratedMatches} rated
              {entry.ratedWinStreak > 0 ? ` / ${entry.ratedWinStreak} streak` : ""}
            </p>
          </>
        )}
      </div>
    </Link>
  );
}

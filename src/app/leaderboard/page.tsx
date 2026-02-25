"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeOpponentStats } from "@/lib/stats";
import { getWeekStart } from "@/lib/leaderboard";
import { TrophyIcon } from "@/components/icons/NavIcons";
import type { LeaderboardEntry, OpponentStats } from "@/types";

const SITE_CREATOR = "azoni";

type Tab = "winrate" | "volume" | "mostwins" | "streaks" | "draws" | "events" | "eventgrinder" | "rated" | "heroes" | "dedication" | "hotstreak" | "weeklymatches" | "weeklywins" | "earnings" | "armorywinrate" | "armoryattendance";

const tabs: { id: Tab; label: string }[] = [
  { id: "winrate", label: "Win Rate" },
  { id: "volume", label: "Most Matches" },
  { id: "mostwins", label: "Most Wins" },
  { id: "weeklymatches", label: "Weekly Matches" },
  { id: "weeklywins", label: "Weekly Wins" },
  { id: "streaks", label: "Streaks" },
  { id: "hotstreak", label: "Hot Streak" },
  { id: "events", label: "Event Wins" },
  { id: "eventgrinder", label: "Event Grinder" },
  { id: "rated", label: "Rated" },
  { id: "heroes", label: "Hero Variety" },
  { id: "dedication", label: "Hero Loyalty" },
  { id: "earnings", label: "Earnings" },
  { id: "armorywinrate", label: "Armory Win %" },
  { id: "armoryattendance", label: "Armory Attendance" },
  { id: "draws", label: "Draws" },
];

function formatRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

const PAGE_SIZE = 50;

export default function LeaderboardPage() {
  const { entries, loading } = useLeaderboard();
  const { matches } = useMatches();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("winrate");
  const [page, setPage] = useState(0);

  // Build h2h lookup: opponent display name → stats from the current user's matches
  const h2hMap = useMemo(() => {
    if (!user || matches.length === 0) return new Map<string, OpponentStats>();
    const oppStats = computeOpponentStats(matches);
    const map = new Map<string, OpponentStats>();
    for (const opp of oppStats) {
      map.set(opp.opponentName.toLowerCase(), opp);
    }
    return map;
  }, [user, matches]);

  const currentWeekStart = useMemo(() => getWeekStart(), []);

  const ranked = useMemo(() => {
    switch (activeTab) {
      case "winrate":
        return [...entries]
          .filter((e) => e.totalMatches >= 10)
          .sort((a, b) => b.winRate - a.winRate || b.totalMatches - a.totalMatches);
      case "volume":
        return [...entries].sort((a, b) => b.totalMatches - a.totalMatches);
      case "mostwins":
        return [...entries]
          .filter((e) => e.totalWins > 0)
          .sort((a, b) => b.totalWins - a.totalWins || b.winRate - a.winRate);
      case "weeklymatches":
        return [...entries]
          .filter((e) => e.weekStart === currentWeekStart && e.weeklyMatches > 0)
          .sort((a, b) => b.weeklyMatches - a.weeklyMatches || b.weeklyWins - a.weeklyWins);
      case "weeklywins":
        return [...entries]
          .filter((e) => e.weekStart === currentWeekStart && e.weeklyWins > 0)
          .sort((a, b) => b.weeklyWins - a.weeklyWins || b.weeklyMatches - a.weeklyMatches);
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
      case "heroes":
        return [...entries]
          .filter((e) => e.uniqueHeroes > 0)
          .sort((a, b) => b.uniqueHeroes - a.uniqueHeroes || b.totalMatches - a.totalMatches);
      case "dedication":
        return [...entries]
          .filter((e) => e.topHeroMatches > 0)
          .sort((a, b) => b.topHeroMatches - a.topHeroMatches || b.totalMatches - a.totalMatches);
      case "hotstreak":
        return [...entries]
          .filter((e) => e.currentStreakType === "win" && e.currentStreakCount >= 2)
          .sort((a, b) => b.currentStreakCount - a.currentStreakCount || b.winRate - a.winRate);
      case "eventgrinder":
        return [...entries]
          .filter((e) => e.eventsPlayed > 0)
          .sort((a, b) => b.eventsPlayed - a.eventsPlayed || b.eventWins - a.eventWins);
      case "earnings":
        return [...entries]
          .filter((e) => (e.earnings ?? 0) > 0)
          .sort((a, b) => (b.earnings ?? 0) - (a.earnings ?? 0));
      case "armorywinrate":
        return [...entries]
          .filter((e) => e.armoryMatches >= 5)
          .sort((a, b) => b.armoryWinRate - a.armoryWinRate || b.armoryMatches - a.armoryMatches);
      case "armoryattendance":
        return [...entries]
          .filter((e) => e.armoryMatches > 0)
          .sort((a, b) => b.armoryMatches - a.armoryMatches || b.armoryWins - a.armoryWins);
      default:
        return entries;
    }
  }, [entries, activeTab, currentWeekStart]);

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
            onClick={() => { setActiveTab(tab.id); setPage(0); }}
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
                : activeTab === "hotstreak"
                  ? "No one is on a 2+ win streak right now."
                  : activeTab === "weeklymatches" || activeTab === "weeklywins"
                    ? "No one has logged matches this week yet."
                    : activeTab === "earnings"
                      ? "No players have entered their earnings yet."
                      : activeTab === "armorywinrate"
                        ? "Players need at least 5 Armory matches to appear here."
                        : activeTab === "armoryattendance"
                          ? "No players have Armory matches yet."
                          : "Import matches to appear on the leaderboard."}
          </p>
        </div>
      )}

      {!loading && ranked.length > 0 && (() => {
        const pageStart = page * PAGE_SIZE;
        const pageEntries = ranked.slice(pageStart, pageStart + PAGE_SIZE);
        const totalPages = Math.ceil(ranked.length / PAGE_SIZE);
        return (
          <>
            <div className="space-y-2">
              {pageEntries.map((entry, i) => (
                <LeaderboardRow key={entry.userId} entry={entry} rank={pageStart + i + 1} tab={activeTab} h2h={h2hMap.get(entry.displayName.toLowerCase())} isMe={entry.userId === user?.uid} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-fab-muted">
                  {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

function LeaderboardRow({
  entry,
  rank,
  tab,
  h2h,
  isMe,
}: {
  entry: LeaderboardEntry;
  rank: number;
  tab: Tab;
  h2h?: OpponentStats;
  isMe?: boolean;
}) {
  const initials = entry.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const medal =
    rank === 1
      ? "text-fuchsia-400"
      : rank === 2
        ? "text-sky-400"
        : rank === 3
          ? "text-yellow-400"
          : rank === 4
            ? "text-gray-300"
            : rank === 5
              ? "text-amber-600"
              : "text-fab-dim";

  const isCreator = entry.username === SITE_CREATOR;

  const rankBorder =
    rank === 1 ? "rank-border-grandmaster"
    : rank === 2 ? "rank-border-diamond"
    : rank === 3 ? "rank-border-gold"
    : rank === 4 ? "rank-border-silver"
    : rank === 5 ? "rank-border-bronze"
    : "";

  const cardClass =
    rank === 1 ? "leaderboard-card-grandmaster"
    : rank === 2 ? "leaderboard-card-diamond"
    : rank === 3 ? "leaderboard-card-gold"
    : rank === 4 ? "leaderboard-card-silver"
    : rank === 5 ? "leaderboard-card-bronze"
    : "bg-fab-surface border border-fab-border";

  return (
    <Link
      href={`/player/${entry.username}`}
      className={`flex items-center gap-3 rounded-lg p-4 hover:border-fab-gold/30 transition-colors ${cardClass}`}
    >
      {/* Rank */}
      <span className={`text-lg font-black w-8 text-center shrink-0 ${medal}`}>
        {rank}
      </span>

      {/* Avatar */}
      <div className="relative shrink-0">
        {isCreator && (
          <svg className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 text-fab-gold drop-shadow-[0_0_4px_rgba(201,168,76,0.6)]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.5 19h19v3h-19zM22.5 7l-5 4-5.5-7-5.5 7-5-4 2 12h17z" />
          </svg>
        )}
        {entry.photoUrl ? (
          <img src={entry.photoUrl} alt="" className={`w-10 h-10 rounded-full ${rankBorder}`} />
        ) : (
          <div className={`w-10 h-10 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-sm font-bold ${rankBorder}`}>
            {initials}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fab-text truncate">{entry.displayName}</p>
        <p className="text-xs text-fab-dim truncate">@{entry.username}</p>
        {h2h && !isMe && (
          <Link
            href={`/opponents?q=${encodeURIComponent(entry.displayName)}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 mt-1 text-[10px] px-1.5 py-0.5 rounded bg-fab-bg border border-fab-border hover:border-fab-gold/30 transition-colors"
            title={`Your record: ${h2h.wins}W ${h2h.losses}L across ${h2h.totalMatches} matches`}
          >
            <span className="text-fab-muted">H2H</span>
            <span className={h2h.winRate >= 50 ? "text-fab-win font-semibold" : "text-fab-loss font-semibold"}>
              {h2h.wins}-{h2h.losses}{h2h.draws > 0 ? `-${h2h.draws}` : ""}
            </span>
          </Link>
        )}
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
        {tab === "weeklymatches" && (
          <>
            <p className="text-lg font-bold text-fab-text">{entry.weeklyMatches}</p>
            <p className="text-xs text-fab-dim">
              {entry.weeklyWins}W this week
            </p>
          </>
        )}
        {tab === "weeklywins" && (
          <>
            <p className="text-lg font-bold text-fab-win">{entry.weeklyWins}</p>
            <p className="text-xs text-fab-dim">
              of {entry.weeklyMatches} matches
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
        {tab === "heroes" && (
          <>
            <p className="text-lg font-bold text-purple-400">{entry.uniqueHeroes}</p>
            <p className="text-xs text-fab-dim">heroes played</p>
          </>
        )}
        {tab === "dedication" && (
          <>
            <p className="text-lg font-bold text-fab-gold">{entry.topHeroMatches}</p>
            <p className="text-xs text-fab-dim truncate max-w-[120px]">{entry.topHero}</p>
          </>
        )}
        {tab === "hotstreak" && (
          <>
            <p className="text-lg font-bold text-fab-win">{entry.currentStreakCount}</p>
            <p className="text-xs text-fab-dim">wins running</p>
          </>
        )}
        {tab === "mostwins" && (
          <>
            <p className="text-lg font-bold text-fab-win">{entry.totalWins}</p>
            <p className="text-xs text-fab-dim">
              wins ({formatRate(entry.winRate)})
            </p>
          </>
        )}
        {tab === "eventgrinder" && (
          <>
            <p className="text-lg font-bold text-fab-gold">{entry.eventsPlayed}</p>
            <p className="text-xs text-fab-dim">
              events ({entry.eventWins} wins)
            </p>
          </>
        )}
        {tab === "earnings" && (
          <>
            <p className="text-lg font-bold text-fab-gold">${(entry.earnings ?? 0).toLocaleString()}</p>
            <p className="text-xs text-fab-dim">lifetime earnings</p>
          </>
        )}
        {tab === "armorywinrate" && (
          <>
            <p className={`text-lg font-bold ${entry.armoryWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
              {formatRate(entry.armoryWinRate)}
            </p>
            <p className="text-xs text-fab-dim">{entry.armoryWins}W / {entry.armoryMatches} armory</p>
          </>
        )}
        {tab === "armoryattendance" && (
          <>
            <p className="text-lg font-bold text-fab-text">{entry.armoryMatches}</p>
            <p className="text-xs text-fab-dim">{entry.armoryWins} wins ({entry.armoryMatches > 0 ? formatRate(entry.armoryWinRate) : "0%"})</p>
          </>
        )}
      </div>
    </Link>
  );
}

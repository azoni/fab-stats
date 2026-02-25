"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeOpponentStats } from "@/lib/stats";
import { TrophyIcon } from "@/components/icons/NavIcons";
import type { LeaderboardEntry, OpponentStats } from "@/types";

type Tab = "winrate" | "volume" | "streaks" | "draws" | "events" | "rated" | "heroes" | "dedication" | "hotstreak" | "nemesis";

const tabs: { id: Tab; label: string }[] = [
  { id: "winrate", label: "Win Rate" },
  { id: "volume", label: "Most Matches" },
  { id: "streaks", label: "Streaks" },
  { id: "draws", label: "Draws" },
  { id: "events", label: "Events" },
  { id: "rated", label: "Rated" },
  { id: "heroes", label: "Hero Variety" },
  { id: "dedication", label: "Hero Loyalty" },
  { id: "hotstreak", label: "Hot Streak" },
  { id: "nemesis", label: "Nemesis" },
];

interface NemesisRanking {
  name: string;
  count: number;
  victims: { username: string; displayName: string; winRate: number }[];
}

function formatRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

export default function LeaderboardPage() {
  const { entries, loading } = useLeaderboard();
  const { matches } = useMatches();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("winrate");

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
      default:
        return entries;
    }
  }, [entries, activeTab]);

  // Aggregate nemesis data: count how many players each opponent is nemesis to
  const nemesisRankings = useMemo<NemesisRanking[]>(() => {
    const map = new Map<string, NemesisRanking>();
    for (const e of entries) {
      if (!e.nemesis) continue;
      const existing = map.get(e.nemesis);
      const victim = { username: e.username, displayName: e.displayName, winRate: e.nemesisWinRate ?? 0 };
      if (existing) {
        existing.count++;
        existing.victims.push(victim);
      } else {
        map.set(e.nemesis, { name: e.nemesis, count: 1, victims: [victim] });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [entries]);

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

      {!loading && activeTab === "nemesis" && (
        nemesisRankings.length === 0 ? (
          <div className="text-center py-16">
            <TrophyIcon className="w-14 h-14 text-fab-muted mb-4 mx-auto" />
            <h2 className="text-lg font-semibold text-fab-text mb-2">No nemesis data yet</h2>
            <p className="text-fab-muted text-sm">
              Players need at least 3 matches against an opponent to establish a nemesis.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {nemesisRankings.map((n, i) => (
              <NemesisRow key={n.name} nemesis={n} rank={i + 1} />
            ))}
          </div>
        )
      )}

      {!loading && activeTab !== "nemesis" && ranked.length === 0 && (
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
                  : "Import matches to appear on the leaderboard."}
          </p>
        </div>
      )}

      {!loading && activeTab !== "nemesis" && ranked.length > 0 && (
        <div className="space-y-2">
          {ranked.map((entry, i) => (
            <LeaderboardRow key={entry.userId} entry={entry} rank={i + 1} tab={activeTab} h2h={h2hMap.get(entry.displayName.toLowerCase())} isMe={entry.userId === user?.uid} />
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
        <img src={entry.photoUrl} alt="" className={`w-10 h-10 rounded-full shrink-0 ${rank === 1 ? "rank-border-gold" : rank === 2 ? "rank-border-silver" : rank === 3 ? "rank-border-bronze" : ""}`} />
      ) : (
        <div className={`w-10 h-10 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-sm font-bold shrink-0 ${rank === 1 ? "rank-border-gold" : rank === 2 ? "rank-border-silver" : rank === 3 ? "rank-border-bronze" : ""}`}>
          {initials}
        </div>
      )}

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
      </div>
    </Link>
  );
}

function NemesisRow({ nemesis, rank }: { nemesis: NemesisRanking; rank: number }) {
  const medal =
    rank === 1
      ? "text-yellow-400"
      : rank === 2
        ? "text-gray-300"
        : rank === 3
          ? "text-amber-600"
          : "text-fab-dim";

  return (
    <div className="flex items-center gap-3 bg-fab-surface border border-fab-border rounded-lg p-4">
      <span className={`text-lg font-black w-8 text-center shrink-0 ${medal}`}>
        {rank}
      </span>
      <div className="w-10 h-10 rounded-full bg-fab-loss/20 flex items-center justify-center text-fab-loss text-lg shrink-0">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fab-text truncate">{nemesis.name}</p>
        <p className="text-xs text-fab-dim truncate">
          feared by {nemesis.victims.map((v) => v.displayName).join(", ")}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-lg font-bold text-fab-loss">{nemesis.count}</p>
        <p className="text-xs text-fab-dim">{nemesis.count === 1 ? "player" : "players"} fear them</p>
      </div>
    </div>
  );
}

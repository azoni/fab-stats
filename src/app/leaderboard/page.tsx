"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeOpponentStats } from "@/lib/stats";
import { getWeekStart, getMonthStart } from "@/lib/leaderboard";
import { TrophyIcon } from "@/components/icons/NavIcons";
import type { LeaderboardEntry, OpponentStats } from "@/types";

const SITE_CREATOR = "azoni";

type Tab = "winrate" | "volume" | "mostwins" | "streaks" | "draws" | "drawrate" | "byes" | "byerate" | "events" | "eventgrinder" | "rated" | "heroes" | "dedication" | "loyaltyrate" | "hotstreak" | "weeklymatches" | "weeklywins" | "monthlymatches" | "monthlywins" | "monthlywinrate" | "earnings" | "armorywinrate" | "armoryattendance" | "armorymatches" | "top8s" | "top8s_armory" | "top8s_skirmish" | "top8s_pq" | "top8s_bh" | "top8s_rtn" | "top8s_calling" | "top8s_nationals";

const tabs: { id: Tab; label: string; description: string }[] = [
  { id: "winrate", label: "Win Rate", description: "Highest overall win percentage. Requires 100+ matches." },
  { id: "top8s", label: "Top 8s", description: "Most playoff finishes (Top 8 or better) across all events." },
  { id: "top8s_armory", label: "Armory Top 8s", description: "Most Top 8+ finishes at Armory events." },
  { id: "top8s_skirmish", label: "Skirmish Top 8s", description: "Most Top 8+ finishes at Skirmish events." },
  { id: "top8s_pq", label: "PQ Top 8s", description: "Most Top 8+ finishes at ProQuest events." },
  { id: "top8s_bh", label: "BH Top 8s", description: "Most Top 8+ finishes at Battle Hardened events." },
  { id: "top8s_rtn", label: "RTN Top 8s", description: "Most Top 8+ finishes at Road to Nationals events." },
  { id: "top8s_calling", label: "Calling Top 8s", description: "Most Top 8+ finishes at The Calling events." },
  { id: "top8s_nationals", label: "Nationals Top 8s", description: "Most Top 8+ finishes at Nationals events." },
  { id: "volume", label: "Most Matches", description: "Players who have logged the most matches." },
  { id: "mostwins", label: "Most Wins", description: "Players with the most total wins." },
  { id: "weeklymatches", label: "Weekly Matches", description: "Most matches played this week." },
  { id: "weeklywins", label: "Weekly Wins", description: "Most wins this week." },
  { id: "monthlymatches", label: "Monthly Matches", description: "Most matches played this month." },
  { id: "monthlywins", label: "Monthly Wins", description: "Most wins this month." },
  { id: "monthlywinrate", label: "Monthly Win %", description: "Highest win rate this month. Requires 5+ matches." },
  { id: "streaks", label: "Streaks", description: "Longest win streak of all time." },
  { id: "hotstreak", label: "Hot Streak", description: "Longest active win streak right now." },
  { id: "events", label: "Event Wins", description: "Most event tournament victories." },
  { id: "eventgrinder", label: "Event Grinder", description: "Most events attended." },
  { id: "rated", label: "Rated", description: "Highest win rate in rated matches. Requires 5+ rated matches." },
  { id: "heroes", label: "Hero Variety", description: "Most unique heroes played." },
  { id: "dedication", label: "Hero Loyalty", description: "Most matches played with a single hero." },
  { id: "loyaltyrate", label: "Loyalty %", description: "Highest percentage of matches with a single hero. Requires 20+ matches." },
  { id: "earnings", label: "Earnings", description: "Highest lifetime prize earnings." },
  { id: "armorywinrate", label: "Armory Win %", description: "Highest win rate at Armory events. Requires 5+ matches." },
  { id: "armoryattendance", label: "Armory Attendance", description: "Most Armory events attended." },
  { id: "armorymatches", label: "Armory Matches", description: "Most matches played at Armory events." },
  { id: "draws", label: "Draws", description: "Most draws of all time." },
  { id: "drawrate", label: "Draw %", description: "Highest draw rate. Requires 10+ matches." },
  { id: "byes", label: "Byes", description: "Most byes received." },
  { id: "byerate", label: "Bye %", description: "Highest bye rate. Requires 10+ matches." },
];

const TOP8_EVENT_TYPE_MAP: Record<string, string> = {
  top8s_armory: "Armory",
  top8s_skirmish: "Skirmish",
  top8s_pq: "ProQuest",
  top8s_bh: "Battle Hardened",
  top8s_rtn: "Road to Nationals",
  top8s_calling: "The Calling",
  top8s_nationals: "Nationals",
};

function getTop8Count(entry: LeaderboardEntry, eventType?: string): number {
  if (!eventType) return entry.totalTop8s ?? 0;
  return entry.top8sByEventType?.[eventType] ?? 0;
}

function formatRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

const PAGE_SIZE = 50;

export default function LeaderboardPage() {
  const { entries, loading } = useLeaderboard();
  const { matches } = useMatches();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "winrate";
  const [activeTab, setActiveTab] = useState<Tab>(tabs.some((t) => t.id === initialTab) ? initialTab : "winrate");
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
  const currentMonthStart = useMemo(() => getMonthStart(), []);

  const ranked = useMemo(() => {
    switch (activeTab) {
      case "winrate":
        return [...entries]
          .filter((e) => e.totalMatches >= 100)
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
      case "monthlymatches":
        return [...entries]
          .filter((e) => e.monthStart === currentMonthStart && (e.monthlyMatches ?? 0) > 0)
          .sort((a, b) => (b.monthlyMatches ?? 0) - (a.monthlyMatches ?? 0) || (b.monthlyWins ?? 0) - (a.monthlyWins ?? 0));
      case "monthlywins":
        return [...entries]
          .filter((e) => e.monthStart === currentMonthStart && (e.monthlyWins ?? 0) > 0)
          .sort((a, b) => (b.monthlyWins ?? 0) - (a.monthlyWins ?? 0) || (b.monthlyMatches ?? 0) - (a.monthlyMatches ?? 0));
      case "monthlywinrate":
        return [...entries]
          .filter((e) => e.monthStart === currentMonthStart && (e.monthlyMatches ?? 0) >= 5)
          .sort((a, b) => (b.monthlyWinRate ?? 0) - (a.monthlyWinRate ?? 0) || (b.monthlyMatches ?? 0) - (a.monthlyMatches ?? 0));
      case "streaks":
        return [...entries]
          .filter((e) => e.longestWinStreak > 0)
          .sort((a, b) => b.longestWinStreak - a.longestWinStreak || b.totalMatches - a.totalMatches);
      case "draws":
        return [...entries]
          .filter((e) => e.totalDraws > 0)
          .sort((a, b) => b.totalDraws - a.totalDraws || b.totalMatches - a.totalMatches);
      case "drawrate":
        return [...entries]
          .filter((e) => e.totalDraws > 0 && e.totalMatches >= 10)
          .sort((a, b) => {
            const aRate = (a.totalDraws / a.totalMatches) * 100;
            const bRate = (b.totalDraws / b.totalMatches) * 100;
            return bRate - aRate || b.totalDraws - a.totalDraws;
          });
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
      case "loyaltyrate":
        return [...entries]
          .filter((e) => e.topHeroMatches > 0 && e.totalMatches >= 20)
          .sort((a, b) => {
            const aRate = (a.topHeroMatches / a.totalMatches) * 100;
            const bRate = (b.topHeroMatches / b.totalMatches) * 100;
            return bRate - aRate || b.topHeroMatches - a.topHeroMatches;
          });
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
          .filter((e) => (e.armoryEvents ?? 0) > 0)
          .sort((a, b) => (b.armoryEvents ?? 0) - (a.armoryEvents ?? 0) || b.armoryMatches - a.armoryMatches);
      case "armorymatches":
        return [...entries]
          .filter((e) => e.armoryMatches > 0)
          .sort((a, b) => b.armoryMatches - a.armoryMatches || b.armoryWins - a.armoryWins);
      case "byes":
        return [...entries]
          .filter((e) => (e.totalByes ?? 0) > 0)
          .sort((a, b) => (b.totalByes ?? 0) - (a.totalByes ?? 0) || b.totalMatches - a.totalMatches);
      case "byerate":
        return [...entries]
          .filter((e) => (e.totalByes ?? 0) > 0 && e.totalMatches >= 10)
          .sort((a, b) => {
            const aRate = ((a.totalByes ?? 0) / a.totalMatches) * 100;
            const bRate = ((b.totalByes ?? 0) / b.totalMatches) * 100;
            return bRate - aRate || (b.totalByes ?? 0) - (a.totalByes ?? 0);
          });
      case "top8s":
        return [...entries]
          .filter((e) => (e.totalTop8s ?? 0) > 0)
          .sort((a, b) => (b.totalTop8s ?? 0) - (a.totalTop8s ?? 0) || b.eventWins - a.eventWins);
      case "top8s_armory":
      case "top8s_skirmish":
      case "top8s_pq":
      case "top8s_bh":
      case "top8s_rtn":
      case "top8s_calling":
      case "top8s_nationals": {
        const eventType = TOP8_EVENT_TYPE_MAP[activeTab];
        return [...entries]
          .filter((e) => getTop8Count(e, eventType) > 0)
          .sort((a, b) => getTop8Count(b, eventType) - getTop8Count(a, eventType) || (b.totalTop8s ?? 0) - (a.totalTop8s ?? 0));
      }
      default:
        return entries;
    }
  }, [entries, activeTab, currentWeekStart, currentMonthStart]);

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

      <p className="text-fab-muted text-sm mb-4">
        {tabs.find((t) => t.id === activeTab)?.description}
      </p>

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
              ? "Players need at least 100 matches to appear here."
              : activeTab === "rated"
                ? "Players need at least 5 rated matches to appear here."
                : activeTab === "hotstreak"
                  ? "No one is on a 2+ win streak right now."
                  : activeTab === "weeklymatches" || activeTab === "weeklywins"
                    ? "No one has logged matches this week yet."
                    : activeTab === "monthlymatches" || activeTab === "monthlywins"
                      ? "No one has logged matches this month yet."
                      : activeTab === "monthlywinrate"
                        ? "Players need at least 5 matches this month to appear here."
                    : activeTab === "earnings"
                      ? "No players have entered their earnings yet."
                      : activeTab === "armorywinrate"
                        ? "Players need at least 5 Armory matches to appear here."
                        : activeTab === "armoryattendance"
                          ? "No players have attended Armory events yet."
                          : activeTab === "armorymatches"
                            ? "No players have Armory matches yet."
                            : activeTab === "drawrate"
                              ? "Players need at least 10 matches and 1 draw to appear here."
                              : activeTab === "byes"
                                ? "No players have received byes yet."
                                : activeTab === "byerate"
                                  ? "Players need at least 10 matches and 1 bye to appear here."
                                  : activeTab === "loyaltyrate"
                                    ? "Players need at least 20 matches to appear here."
                                    : activeTab.startsWith("top8s")
                                      ? "No players have Top 8 finishes in this category yet."
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
        {tab === "monthlymatches" && (
          <>
            <p className="text-lg font-bold text-fab-text">{entry.monthlyMatches ?? 0}</p>
            <p className="text-xs text-fab-dim">
              {entry.monthlyWins ?? 0}W this month
            </p>
          </>
        )}
        {tab === "monthlywins" && (
          <>
            <p className="text-lg font-bold text-fab-win">{entry.monthlyWins ?? 0}</p>
            <p className="text-xs text-fab-dim">
              of {entry.monthlyMatches ?? 0} matches
            </p>
          </>
        )}
        {tab === "monthlywinrate" && (
          <>
            <p className={`text-lg font-bold ${(entry.monthlyWinRate ?? 0) >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
              {formatRate(entry.monthlyWinRate ?? 0)}
            </p>
            <p className="text-xs text-fab-dim">
              {entry.monthlyWins ?? 0}W / {entry.monthlyMatches ?? 0} this month
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
        {tab === "drawrate" && (
          <>
            <p className="text-lg font-bold text-fab-draw">
              {formatRate((entry.totalDraws / entry.totalMatches) * 100)}
            </p>
            <p className="text-xs text-fab-dim">
              {entry.totalDraws} draws / {entry.totalMatches} matches
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
        {tab === "loyaltyrate" && (
          <>
            <p className="text-lg font-bold text-fab-gold">{entry.totalMatches > 0 ? formatRate((entry.topHeroMatches / entry.totalMatches) * 100) : "0%"}</p>
            <p className="text-xs text-fab-dim truncate max-w-[120px]">{entry.topHero} ({entry.topHeroMatches}/{entry.totalMatches})</p>
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
            <p className="text-lg font-bold text-fab-text">{entry.armoryEvents ?? 0}</p>
            <p className="text-xs text-fab-dim">{entry.armoryMatches} matches across events</p>
          </>
        )}
        {tab === "armorymatches" && (
          <>
            <p className="text-lg font-bold text-fab-text">{entry.armoryMatches}</p>
            <p className="text-xs text-fab-dim">{entry.armoryWins} wins ({entry.armoryMatches > 0 ? formatRate(entry.armoryWinRate) : "0%"})</p>
          </>
        )}
        {tab === "byes" && (
          <>
            <p className="text-lg font-bold text-fab-text">{entry.totalByes ?? 0}</p>
            <p className="text-xs text-fab-dim">
              {entry.totalMatches} matches ({entry.totalMatches > 0 ? formatRate(((entry.totalByes ?? 0) / entry.totalMatches) * 100) : "0%"})
            </p>
          </>
        )}
        {tab === "byerate" && (
          <>
            <p className="text-lg font-bold text-fab-text">{entry.totalMatches > 0 ? formatRate(((entry.totalByes ?? 0) / entry.totalMatches) * 100) : "0%"}</p>
            <p className="text-xs text-fab-dim">
              {entry.totalByes ?? 0} byes in {entry.totalMatches} matches
            </p>
          </>
        )}
        {tab === "top8s" && (
          <>
            <p className="text-lg font-bold text-fab-gold">{entry.totalTop8s ?? 0}</p>
            <p className="text-xs text-fab-dim">playoff finishes</p>
          </>
        )}
        {tab.startsWith("top8s_") && TOP8_EVENT_TYPE_MAP[tab] && (
          <>
            <p className="text-lg font-bold text-fab-gold">{getTop8Count(entry, TOP8_EVENT_TYPE_MAP[tab])}</p>
            <p className="text-xs text-fab-dim">{(entry.totalTop8s ?? 0)} total Top 8s</p>
          </>
        )}
      </div>
    </Link>
  );
}

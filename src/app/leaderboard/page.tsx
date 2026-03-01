"use client";
import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeOpponentStats } from "@/lib/stats";
import { getWeekStart, getMonthStart } from "@/lib/leaderboard";
import { computePowerLevel, getPowerTier } from "@/lib/power-level";
import { TrophyIcon } from "@/components/icons/NavIcons";
import type { LeaderboardEntry, OpponentStats } from "@/types";

const SITE_CREATOR = "azoni";

type Tab = "winrate" | "volume" | "mostwins" | "mostlosses" | "streaks" | "draws" | "drawrate" | "fewestdraws" | "byes" | "byerate" | "balanced" | "events" | "eventgrinder" | "rated" | "ratedstreak" | "heroes" | "dedication" | "loyaltyrate" | "hotstreak" | "coldstreak" | "weeklymatches" | "weeklywins" | "monthlymatches" | "monthlywins" | "monthlywinrate" | "earnings" | "armorywinrate" | "armoryattendance" | "armorymatches" | "top8s" | "top8s_skirmish" | "top8s_pq" | "top8s_bh" | "top8s_rtn" | "top8s_calling" | "top8s_nationals" | "powerlevel";

// ── Tab definitions ──

const tabs: { id: Tab; label: string; description: string }[] = [
  { id: "winrate", label: "Win Rate", description: "Highest overall win percentage. Requires 100+ matches." },
  { id: "volume", label: "Most Matches", description: "Players who have logged the most matches." },
  { id: "mostwins", label: "Most Wins", description: "Players with the most total wins." },
  { id: "mostlosses", label: "Most Losses", description: "Players with the most total losses. Dedication personified." },
  { id: "weeklymatches", label: "Weekly Matches", description: "Most matches played this week." },
  { id: "weeklywins", label: "Weekly Wins", description: "Most wins this week." },
  { id: "monthlymatches", label: "Monthly Matches", description: "Most matches played this month." },
  { id: "monthlywins", label: "Monthly Wins", description: "Most wins this month." },
  { id: "monthlywinrate", label: "Monthly Win %", description: "Highest win rate this month. Requires 5+ matches." },
  { id: "events", label: "Event Wins", description: "Most event tournament victories." },
  { id: "eventgrinder", label: "Event Grinder", description: "Most events attended." },
  { id: "top8s", label: "Top 8s", description: "Most playoff finishes (Top 8 or better) across all events." },
  { id: "top8s_skirmish", label: "Skirmish", description: "Most Top 8+ finishes at Skirmish events." },
  { id: "top8s_pq", label: "ProQuest", description: "Most Top 8+ finishes at ProQuest events." },
  { id: "top8s_bh", label: "Battle Hardened", description: "Most Top 8+ finishes at Battle Hardened events." },
  { id: "top8s_rtn", label: "RTN", description: "Most Top 8+ finishes at Road to Nationals events." },
  { id: "top8s_calling", label: "Calling", description: "Most Top 8+ finishes at The Calling events." },
  { id: "top8s_nationals", label: "Nationals", description: "Most Top 8+ finishes at Nationals events." },
  { id: "earnings", label: "Earnings", description: "Highest lifetime prize earnings." },
  { id: "streaks", label: "Best Streak", description: "Longest win streak of all time." },
  { id: "hotstreak", label: "Hot Streak", description: "Longest active win streak right now." },
  { id: "coldstreak", label: "Cold Streak", description: "Longest active losing streak. Nowhere to go but up." },
  { id: "heroes", label: "Variety", description: "Most unique heroes played." },
  { id: "dedication", label: "Loyalty", description: "Most matches played with a single hero." },
  { id: "loyaltyrate", label: "Loyalty %", description: "Highest percentage of matches with a single hero. Requires 20+ matches." },
  { id: "rated", label: "Win %", description: "Highest win rate in rated matches. Requires 5+ rated matches." },
  { id: "ratedstreak", label: "Streak", description: "Best rated match win streak." },
  { id: "armorywinrate", label: "Win %", description: "Highest win rate at Armory events. Requires 5+ matches." },
  { id: "armoryattendance", label: "Attendance", description: "Most Armory events attended." },
  { id: "armorymatches", label: "Matches", description: "Most matches played at Armory events." },
  { id: "draws", label: "Draws", description: "Most draws of all time." },
  { id: "drawrate", label: "Draw %", description: "Highest draw rate. Requires 10+ matches." },
  { id: "fewestdraws", label: "Fewest Draws", description: "Most matches played without drawing. Decisive players. Requires 50+ matches." },
  { id: "byes", label: "Byes", description: "Most byes received." },
  { id: "byerate", label: "Bye %", description: "Highest bye rate. Requires 10+ matches." },
  { id: "balanced", label: "Balanced", description: "Closest win rate to 50%. Perfectly balanced. Requires 20+ matches." },
  { id: "powerlevel", label: "Power Level", description: "Composite score (0–99) based on win rate, match volume, events, streaks, heroes, rated performance, and earnings." },
];

const tabMap = Object.fromEntries(tabs.map((t) => [t.id, t]));

// ── Category grouping ──

interface Category {
  id: string;
  label: string;
  tabs: Tab[];
  adminOnly?: boolean;
}

const allCategories: Category[] = [
  { id: "overall", label: "Overall", tabs: ["winrate", "volume", "mostwins", "mostlosses"] },
  { id: "time", label: "Weekly & Monthly", tabs: ["weeklymatches", "weeklywins", "monthlymatches", "monthlywins", "monthlywinrate"] },
  { id: "events", label: "Events & Top 8s", tabs: ["events", "eventgrinder", "top8s", "top8s_skirmish", "top8s_pq", "top8s_bh", "top8s_rtn", "top8s_calling", "top8s_nationals", "earnings"] },
  { id: "streaks", label: "Streaks", tabs: ["streaks", "hotstreak", "coldstreak"] },
  { id: "heroes", label: "Heroes", tabs: ["heroes", "dedication", "loyaltyrate"] },
  { id: "armory", label: "Armory", tabs: ["armorywinrate", "armoryattendance", "armorymatches"] },
  { id: "rated", label: "Rated", tabs: ["rated", "ratedstreak"] },
  { id: "fun", label: "Fun", tabs: ["draws", "drawrate", "fewestdraws", "byes", "byerate", "balanced"] },
  { id: "power", label: "Power Level", tabs: ["powerlevel"], adminOnly: true },
];

function categoryForTab(tab: Tab): string {
  return allCategories.find((c) => c.tabs.includes(tab))?.id || "overall";
}

// ── Helpers ──

const TOP8_EVENT_TYPE_MAP: Record<string, string> = {
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

// Unified stat extraction for any entry + tab
function getStat(entry: LeaderboardEntry, tab: Tab): { value: string; sub: string; color: string; rate?: number } {
  switch (tab) {
    case "winrate":
      return { value: formatRate(entry.winRate), sub: `${entry.totalWins}W-${entry.totalLosses}L${entry.totalDraws > 0 ? `-${entry.totalDraws}D` : ""}`, color: entry.winRate >= 50 ? "text-fab-win" : "text-fab-loss", rate: entry.winRate };
    case "volume":
      return { value: String(entry.totalMatches), sub: `${entry.totalWins}W-${entry.totalLosses}L (${formatRate(entry.winRate)})`, color: "text-fab-text" };
    case "mostwins":
      return { value: String(entry.totalWins), sub: `wins (${formatRate(entry.winRate)})`, color: "text-fab-win" };
    case "mostlosses":
      return { value: String(entry.totalLosses), sub: `${entry.totalMatches} matches (${formatRate(entry.winRate)})`, color: "text-fab-loss" };
    case "weeklymatches":
      return { value: String(entry.weeklyMatches), sub: `${entry.weeklyWins}W this week`, color: "text-fab-text" };
    case "weeklywins":
      return { value: String(entry.weeklyWins), sub: `of ${entry.weeklyMatches} matches`, color: "text-fab-win" };
    case "monthlymatches":
      return { value: String(entry.monthlyMatches ?? 0), sub: `${entry.monthlyWins ?? 0}W this month`, color: "text-fab-text" };
    case "monthlywins":
      return { value: String(entry.monthlyWins ?? 0), sub: `of ${entry.monthlyMatches ?? 0} matches`, color: "text-fab-win" };
    case "monthlywinrate": {
      const mr = entry.monthlyWinRate ?? 0;
      return { value: formatRate(mr), sub: `${entry.monthlyWins ?? 0}W / ${entry.monthlyMatches ?? 0} this month`, color: mr >= 50 ? "text-fab-win" : "text-fab-loss", rate: mr };
    }
    case "streaks":
      return { value: String(entry.longestWinStreak), sub: `best streak${entry.currentStreakType === "win" && entry.currentStreakCount > 1 ? ` / ${entry.currentStreakCount} current` : ""}`, color: "text-fab-win" };
    case "hotstreak":
      return { value: String(entry.currentStreakCount), sub: "wins running", color: "text-fab-win" };
    case "coldstreak":
      return { value: String(entry.currentStreakCount), sub: "losses running", color: "text-fab-loss" };
    case "draws":
      return { value: String(entry.totalDraws), sub: `${entry.totalMatches} matches (${formatRate(entry.winRate)})`, color: "text-fab-text" };
    case "drawrate": {
      const dr = entry.totalMatches > 0 ? (entry.totalDraws / entry.totalMatches) * 100 : 0;
      return { value: formatRate(dr), sub: `${entry.totalDraws} draws / ${entry.totalMatches} matches`, color: "text-fab-draw", rate: dr };
    }
    case "events":
      return { value: String(entry.eventWins), sub: `wins / ${entry.eventsPlayed} events`, color: "text-fab-gold" };
    case "eventgrinder":
      return { value: String(entry.eventsPlayed), sub: `events (${entry.eventWins} wins)`, color: "text-fab-gold" };
    case "rated":
      return { value: formatRate(entry.ratedWinRate), sub: `${entry.ratedWins}W / ${entry.ratedMatches} rated${entry.ratedWinStreak > 0 ? ` / ${entry.ratedWinStreak} streak` : ""}`, color: entry.ratedWinRate >= 50 ? "text-fab-win" : "text-fab-loss", rate: entry.ratedWinRate };
    case "ratedstreak":
      return { value: String(entry.ratedWinStreak), sub: `rated wins in a row (${formatRate(entry.ratedWinRate)})`, color: "text-fab-win" };
    case "heroes":
      return { value: String(entry.uniqueHeroes), sub: "heroes played", color: "text-purple-400" };
    case "dedication":
      return { value: String(entry.topHeroMatches), sub: entry.topHero, color: "text-fab-gold" };
    case "loyaltyrate": {
      const lr = entry.totalMatches > 0 ? (entry.topHeroMatches / entry.totalMatches) * 100 : 0;
      return { value: formatRate(lr), sub: `${entry.topHero} (${entry.topHeroMatches}/${entry.totalMatches})`, color: "text-fab-gold", rate: lr };
    }
    case "earnings":
      return { value: `$${(entry.earnings ?? 0).toLocaleString()}`, sub: "lifetime earnings", color: "text-fab-gold" };
    case "armorywinrate":
      return { value: formatRate(entry.armoryWinRate), sub: `${entry.armoryWins}W / ${entry.armoryMatches} armory`, color: entry.armoryWinRate >= 50 ? "text-fab-win" : "text-fab-loss", rate: entry.armoryWinRate };
    case "armoryattendance":
      return { value: String(entry.armoryEvents ?? 0), sub: `${entry.armoryMatches} matches across events`, color: "text-fab-text" };
    case "armorymatches":
      return { value: String(entry.armoryMatches), sub: `${entry.armoryWins} wins (${entry.armoryMatches > 0 ? formatRate(entry.armoryWinRate) : "0%"})`, color: "text-fab-text" };
    case "fewestdraws":
      return { value: String(entry.totalDraws), sub: `in ${entry.totalMatches} matches (${formatRate(entry.winRate)})`, color: entry.totalDraws === 0 ? "text-fab-win" : "text-fab-text" };
    case "balanced": {
      const dist = Math.abs(entry.winRate - 50);
      return { value: formatRate(entry.winRate), sub: `${entry.totalWins}W-${entry.totalLosses}L (${dist.toFixed(1)}% from 50%)`, color: "text-purple-400", rate: entry.winRate };
    }
    case "byes":
      return { value: String(entry.totalByes ?? 0), sub: `${entry.totalMatches} matches`, color: "text-fab-text" };
    case "byerate": {
      const br = entry.totalMatches > 0 ? ((entry.totalByes ?? 0) / entry.totalMatches) * 100 : 0;
      return { value: formatRate(br), sub: `${entry.totalByes ?? 0} byes in ${entry.totalMatches} matches`, color: "text-fab-text", rate: br };
    }
    case "top8s":
      return { value: String(entry.totalTop8s ?? 0), sub: "playoff finishes", color: "text-fab-gold" };
    case "powerlevel": {
      const pl = computePowerLevel(entry);
      const tier = getPowerTier(pl);
      return { value: String(pl), sub: `${tier.label} · ${formatRate(entry.winRate)} WR`, color: tier.textColor };
    }
    default:
      if (tab.startsWith("top8s_") && TOP8_EVENT_TYPE_MAP[tab]) {
        return { value: String(getTop8Count(entry, TOP8_EVENT_TYPE_MAP[tab])), sub: `${entry.totalTop8s ?? 0} total Top 8s`, color: "text-fab-gold" };
      }
      return { value: "—", sub: "", color: "text-fab-dim" };
  }
}

// Check if tab shows a rate (for progress bars)
function isRateTab(tab: Tab): boolean {
  return ["winrate", "monthlywinrate", "rated", "armorywinrate", "loyaltyrate", "drawrate", "byerate", "balanced"].includes(tab);
}

// ── Empty state messages ──

function getEmptyMessage(tab: Tab): string {
  switch (tab) {
    case "winrate": return "Players need at least 100 matches to appear here.";
    case "rated": return "Players need at least 5 rated matches to appear here.";
    case "hotstreak": return "No one is on a 2+ win streak right now.";
    case "coldstreak": return "No one is on a 2+ loss streak right now. Lucky them.";
    case "ratedstreak": return "No players have a rated win streak yet.";
    case "mostlosses": return "No players have any losses yet.";
    case "fewestdraws": return "Players need at least 50 matches to appear here.";
    case "balanced": return "Players need at least 20 matches to appear here.";
    case "weeklymatches": case "weeklywins": return "No one has logged matches this week yet.";
    case "monthlymatches": case "monthlywins": return "No one has logged matches this month yet.";
    case "monthlywinrate": return "Players need at least 5 matches this month to appear here.";
    case "earnings": return "No players have entered their earnings yet.";
    case "armorywinrate": return "Players need at least 5 Armory matches to appear here.";
    case "armoryattendance": return "No players have attended Armory events yet.";
    case "armorymatches": return "No players have Armory matches yet.";
    case "drawrate": return "Players need at least 10 matches and 1 draw to appear here.";
    case "byes": return "No players have received byes yet.";
    case "byerate": return "Players need at least 10 matches and 1 bye to appear here.";
    case "loyaltyrate": return "Players need at least 20 matches to appear here.";
    case "powerlevel": return "Players need at least 10 matches to get a Power Level.";
    default:
      if (tab.startsWith("top8s")) return "No players have Top 8 finishes in this category yet.";
      return "Import matches to appear on the leaderboard.";
  }
}

const PAGE_SIZE = 50;

// ── Main Page ──

export default function LeaderboardPage() {
  const { user, isAdmin } = useAuth();
  const { entries, loading } = useLeaderboard(isAdmin);
  const { matches } = useMatches();
  const searchParams = useSearchParams();

  const initialTab = (searchParams.get("tab") as Tab) || "winrate";
  const validInitialTab = tabs.some((t) => t.id === initialTab) ? initialTab : "winrate";

  const [activeTab, setActiveTab] = useState<Tab>(validInitialTab);
  const [activeCategory, setActiveCategory] = useState(categoryForTab(validInitialTab));
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Filter categories by admin access
  const categories = useMemo(() => isAdmin ? allCategories : allCategories.filter((c) => !c.adminOnly), [isAdmin]);

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

  // Filter out hideFromGuests entries when viewer is not logged in
  const visibleEntries = useMemo(() => {
    if (user || isAdmin) return entries;
    return entries.filter((e) => !e.hideFromGuests);
  }, [entries, user, isAdmin]);

  const ranked = useMemo(() => {
    switch (activeTab) {
      case "winrate":
        return [...visibleEntries].filter((e) => e.totalMatches >= 100).sort((a, b) => b.winRate - a.winRate || b.totalMatches - a.totalMatches);
      case "volume":
        return [...visibleEntries].sort((a, b) => b.totalMatches - a.totalMatches);
      case "mostwins":
        return [...visibleEntries].filter((e) => e.totalWins > 0).sort((a, b) => b.totalWins - a.totalWins || b.winRate - a.winRate);
      case "mostlosses":
        return [...visibleEntries].filter((e) => e.totalLosses > 0).sort((a, b) => b.totalLosses - a.totalLosses || b.totalMatches - a.totalMatches);
      case "weeklymatches":
        return [...visibleEntries].filter((e) => e.weekStart === currentWeekStart && e.weeklyMatches > 0).sort((a, b) => b.weeklyMatches - a.weeklyMatches || b.weeklyWins - a.weeklyWins);
      case "weeklywins":
        return [...visibleEntries].filter((e) => e.weekStart === currentWeekStart && e.weeklyWins > 0).sort((a, b) => b.weeklyWins - a.weeklyWins || b.weeklyMatches - a.weeklyMatches);
      case "monthlymatches":
        return [...visibleEntries].filter((e) => e.monthStart === currentMonthStart && (e.monthlyMatches ?? 0) > 0).sort((a, b) => (b.monthlyMatches ?? 0) - (a.monthlyMatches ?? 0) || (b.monthlyWins ?? 0) - (a.monthlyWins ?? 0));
      case "monthlywins":
        return [...visibleEntries].filter((e) => e.monthStart === currentMonthStart && (e.monthlyWins ?? 0) > 0).sort((a, b) => (b.monthlyWins ?? 0) - (a.monthlyWins ?? 0) || (b.monthlyMatches ?? 0) - (a.monthlyMatches ?? 0));
      case "monthlywinrate":
        return [...visibleEntries].filter((e) => e.monthStart === currentMonthStart && (e.monthlyMatches ?? 0) >= 5).sort((a, b) => (b.monthlyWinRate ?? 0) - (a.monthlyWinRate ?? 0) || (b.monthlyMatches ?? 0) - (a.monthlyMatches ?? 0));
      case "streaks":
        return [...visibleEntries].filter((e) => e.longestWinStreak > 0).sort((a, b) => b.longestWinStreak - a.longestWinStreak || b.totalMatches - a.totalMatches);
      case "draws":
        return [...visibleEntries].filter((e) => e.totalDraws > 0).sort((a, b) => b.totalDraws - a.totalDraws || b.totalMatches - a.totalMatches);
      case "drawrate":
        return [...visibleEntries].filter((e) => e.totalDraws > 0 && e.totalMatches >= 10).sort((a, b) => {
          const aRate = (a.totalDraws / a.totalMatches) * 100;
          const bRate = (b.totalDraws / b.totalMatches) * 100;
          return bRate - aRate || b.totalDraws - a.totalDraws;
        });
      case "events":
        return [...visibleEntries].filter((e) => e.eventsPlayed > 0).sort((a, b) => b.eventWins - a.eventWins || b.eventsPlayed - a.eventsPlayed);
      case "rated":
        return [...visibleEntries].filter((e) => e.ratedMatches >= 5).sort((a, b) => b.ratedWinRate - a.ratedWinRate || b.ratedMatches - a.ratedMatches);
      case "ratedstreak":
        return [...visibleEntries].filter((e) => e.ratedWinStreak > 0).sort((a, b) => b.ratedWinStreak - a.ratedWinStreak || b.ratedWinRate - a.ratedWinRate);
      case "heroes":
        return [...visibleEntries].filter((e) => e.uniqueHeroes > 0).sort((a, b) => b.uniqueHeroes - a.uniqueHeroes || b.totalMatches - a.totalMatches);
      case "dedication":
        return [...visibleEntries].filter((e) => e.topHeroMatches > 0).sort((a, b) => b.topHeroMatches - a.topHeroMatches || b.totalMatches - a.totalMatches);
      case "loyaltyrate":
        return [...visibleEntries].filter((e) => e.topHeroMatches > 0 && e.totalMatches >= 20).sort((a, b) => {
          const aRate = (a.topHeroMatches / a.totalMatches) * 100;
          const bRate = (b.topHeroMatches / b.totalMatches) * 100;
          return bRate - aRate || b.topHeroMatches - a.topHeroMatches;
        });
      case "hotstreak":
        return [...visibleEntries].filter((e) => e.currentStreakType === "win" && e.currentStreakCount >= 2).sort((a, b) => b.currentStreakCount - a.currentStreakCount || b.winRate - a.winRate);
      case "coldstreak":
        return [...visibleEntries].filter((e) => e.currentStreakType === "loss" && e.currentStreakCount >= 2).sort((a, b) => b.currentStreakCount - a.currentStreakCount || a.winRate - b.winRate);
      case "eventgrinder":
        return [...visibleEntries].filter((e) => e.eventsPlayed > 0).sort((a, b) => b.eventsPlayed - a.eventsPlayed || b.eventWins - a.eventWins);
      case "earnings":
        return [...visibleEntries].filter((e) => (e.earnings ?? 0) > 0).sort((a, b) => (b.earnings ?? 0) - (a.earnings ?? 0));
      case "armorywinrate":
        return [...visibleEntries].filter((e) => e.armoryMatches >= 5).sort((a, b) => b.armoryWinRate - a.armoryWinRate || b.armoryMatches - a.armoryMatches);
      case "armoryattendance":
        return [...visibleEntries].filter((e) => (e.armoryEvents ?? 0) > 0).sort((a, b) => (b.armoryEvents ?? 0) - (a.armoryEvents ?? 0) || b.armoryMatches - a.armoryMatches);
      case "armorymatches":
        return [...visibleEntries].filter((e) => e.armoryMatches > 0).sort((a, b) => b.armoryMatches - a.armoryMatches || b.armoryWins - a.armoryWins);
      case "fewestdraws":
        return [...visibleEntries].filter((e) => e.totalMatches >= 50).sort((a, b) => a.totalDraws - b.totalDraws || b.totalMatches - a.totalMatches);
      case "balanced":
        return [...visibleEntries].filter((e) => e.totalMatches >= 20).sort((a, b) => Math.abs(a.winRate - 50) - Math.abs(b.winRate - 50) || b.totalMatches - a.totalMatches);
      case "byes":
        return [...visibleEntries].filter((e) => (e.totalByes ?? 0) > 0).sort((a, b) => (b.totalByes ?? 0) - (a.totalByes ?? 0) || b.totalMatches - a.totalMatches);
      case "byerate":
        return [...visibleEntries].filter((e) => (e.totalByes ?? 0) > 0 && e.totalMatches >= 10).sort((a, b) => {
          const aRate = ((a.totalByes ?? 0) / a.totalMatches) * 100;
          const bRate = ((b.totalByes ?? 0) / b.totalMatches) * 100;
          return bRate - aRate || (b.totalByes ?? 0) - (a.totalByes ?? 0);
        });
      case "top8s":
        return [...visibleEntries].filter((e) => (e.totalTop8s ?? 0) > 0).sort((a, b) => (b.totalTop8s ?? 0) - (a.totalTop8s ?? 0) || b.eventWins - a.eventWins);
      case "top8s_skirmish":
      case "top8s_pq":
      case "top8s_bh":
      case "top8s_rtn":
      case "top8s_calling":
      case "top8s_nationals": {
        const eventType = TOP8_EVENT_TYPE_MAP[activeTab];
        return [...visibleEntries].filter((e) => getTop8Count(e, eventType) > 0).sort((a, b) => getTop8Count(b, eventType) - getTop8Count(a, eventType) || (b.totalTop8s ?? 0) - (a.totalTop8s ?? 0));
      }
      case "powerlevel":
        return [...visibleEntries].filter((e) => e.totalMatches >= 10).sort((a, b) => computePowerLevel(b) - computePowerLevel(a) || b.totalMatches - a.totalMatches);
      default:
        return visibleEntries;
    }
  }, [visibleEntries, activeTab, currentWeekStart, currentMonthStart]);

  // Search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return ranked;
    const q = search.trim().toLowerCase();
    return ranked.filter((e) =>
      e.displayName.toLowerCase().includes(q) || e.username.toLowerCase().includes(q)
    );
  }, [ranked, search]);

  // Current user's rank
  const myRank = useMemo(() => {
    if (!user) return null;
    const idx = ranked.findIndex((e) => e.userId === user.uid);
    return idx >= 0 ? idx + 1 : null;
  }, [ranked, user]);

  const isSearching = search.trim().length > 0;
  const activeCategoryObj = categories.find((c) => c.id === activeCategory) || categories[0];
  const tabLabel = tabMap[activeTab]?.label || "";

  function selectCategory(catId: string) {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    setActiveCategory(catId);
    setActiveTab(cat.tabs[0]);
    setPage(0);
    setSearch("");
  }

  function selectTab(tabId: Tab) {
    setActiveTab(tabId);
    setPage(0);
    setSearch("");
  }

  // Podium entries (top 3 when not searching and on page 0)
  const showPodium = !isSearching && page === 0 && filtered.length >= 3;
  const podium = showPodium ? filtered.slice(0, 3) : [];
  const listEntries = showPodium ? filtered.slice(3) : filtered;

  const pageStart = page === 0 && showPodium ? 0 : page * PAGE_SIZE;
  const pageEntries = showPodium && page === 0
    ? listEntries.slice(0, PAGE_SIZE)
    : filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const totalFiltered = isSearching ? filtered.length : (showPodium ? listEntries.length : filtered.length);
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fab-gold mb-1">Leaderboard</h1>
          <p className="text-fab-muted text-sm">
            {ranked.length} player{ranked.length !== 1 ? "s" : ""} ranked
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fab-dim pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search players..."
            className="w-full bg-fab-surface border border-fab-border rounded-lg pl-9 pr-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/50 transition-colors"
          />
        </div>
      </div>

      {/* ── Category pills ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => selectCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? "bg-fab-gold text-fab-bg"
                : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Sub-tabs for selected category ── */}
      {activeCategoryObj.tabs.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {activeCategoryObj.tabs.map((tabId) => (
            <button
              key={tabId}
              onClick={() => selectTab(tabId)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tabId
                  ? "bg-fab-gold/15 text-fab-gold"
                  : "text-fab-muted hover:text-fab-text"
              }`}
            >
              {tabMap[tabId]?.label || tabId}
            </button>
          ))}
        </div>
      )}

      {/* ── Description ── */}
      <p className="text-fab-dim text-xs mb-5">
        {tabMap[activeTab]?.description}
      </p>

      {/* ── Loading ── */}
      {loading && (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-16 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <TrophyIcon className="w-14 h-14 text-fab-dim mb-4 mx-auto" />
          <h2 className="text-lg font-semibold text-fab-text mb-2">
            {isSearching ? "No matches" : "No entries yet"}
          </h2>
          <p className="text-fab-muted text-sm">
            {isSearching ? `No players matching "${search}" in this category.` : getEmptyMessage(activeTab)}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          {/* ── Your Rank ── */}
          {myRank && !isSearching && (
            <button
              onClick={() => {
                const myPage = showPodium && myRank <= 3 ? 0 : Math.floor((showPodium ? myRank - 4 : myRank - 1) / PAGE_SIZE);
                setPage(myPage);
                setTimeout(() => {
                  const el = document.getElementById(`lb-row-${user?.uid}`);
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 100);
              }}
              className="w-full bg-fab-gold/8 border border-fab-gold/20 rounded-lg px-4 py-2.5 mb-5 flex items-center gap-3 hover:border-fab-gold/40 transition-colors group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-fab-gold/15 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-sm text-fab-muted">Your rank</span>
              <span className="text-sm font-bold text-fab-gold">#{myRank}</span>
              <span className="text-sm text-fab-muted">in {tabLabel}</span>
              <svg className="w-3.5 h-3.5 text-fab-dim ml-auto group-hover:text-fab-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* ── Podium ── */}
          {showPodium && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[podium[1], podium[0], podium[2]].map((entry, i) => {
                const place = [2, 1, 3][i];
                const stat = getStat(entry, activeTab);
                const isCenter = place === 1;
                return (
                  <Link
                    key={entry.userId}
                    href={`/player/${entry.username}`}
                    className={`flex flex-col items-center text-center rounded-xl transition-all hover:scale-[1.02] ${
                      isCenter ? "pt-4 pb-5 px-3" : "pt-6 pb-4 px-3 mt-4"
                    } ${
                      place === 1 ? "leaderboard-card-grandmaster"
                      : place === 2 ? "leaderboard-card-diamond"
                      : "leaderboard-card-gold"
                    }`}
                  >
                    {/* Place indicator */}
                    <span className={`text-xs font-bold uppercase tracking-widest mb-2 ${
                      place === 1 ? "text-fuchsia-400" : place === 2 ? "text-sky-400" : "text-yellow-400"
                    }`}>
                      {place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"}
                    </span>

                    {/* Avatar */}
                    <div className="relative mb-2">
                      {entry.username === SITE_CREATOR && (
                        <svg className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-5 h-5 text-fab-gold drop-shadow-[0_0_4px_rgba(201,168,76,0.6)]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2.5 19h19v3h-19zM22.5 7l-5 4-5.5-7-5.5 7-5-4 2 12h17z" />
                        </svg>
                      )}
                      {entry.photoUrl ? (
                        <img
                          src={entry.photoUrl}
                          alt=""
                          className={`rounded-full border-2 ${
                            isCenter ? "w-16 h-16" : "w-12 h-12"
                          } ${
                            place === 1 ? "border-fuchsia-400/60" : place === 2 ? "border-sky-400/60" : "border-yellow-400/60"
                          }`}
                        />
                      ) : (
                        <div className={`rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold font-bold border-2 ${
                          isCenter ? "w-16 h-16 text-xl" : "w-12 h-12 text-sm"
                        } ${
                          place === 1 ? "border-fuchsia-400/60" : place === 2 ? "border-sky-400/60" : "border-yellow-400/60"
                        }`}>
                          {entry.displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <p className={`font-semibold text-fab-text truncate w-full ${isCenter ? "text-sm" : "text-xs"}`}>
                      {entry.displayName}
                    </p>
                    <p className="text-[10px] text-fab-dim truncate w-full">
                      @{entry.username}
                      {!entry.isPublic && <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-fab-dim/10 text-fab-dim">Private</span>}
                    </p>

                    {/* Stat */}
                    <p className={`font-bold mt-2 ${isCenter ? "text-2xl" : "text-lg"} ${stat.color}`}>
                      {stat.value}
                    </p>
                    <p className="text-[10px] text-fab-dim truncate w-full mt-0.5">{stat.sub}</p>

                    {/* Top hero pill */}
                    {entry.topHero && entry.topHero !== "—" && entry.topHero !== "Unknown" && (
                      <span className="mt-2 text-[10px] px-2 py-0.5 rounded-full bg-fab-bg/80 text-fab-muted border border-fab-border/50 truncate max-w-full">
                        {entry.topHero}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* ── List ── */}
          <div ref={listRef} className="space-y-1.5">
            {pageEntries.map((entry, i) => {
              const globalRank = showPodium && page === 0
                ? i + 4
                : isSearching
                  ? ranked.indexOf(entry) + 1
                  : pageStart + i + 1;
              return (
                <LeaderboardRow
                  key={entry.userId}
                  entry={entry}
                  rank={globalRank}
                  tab={activeTab}
                  h2h={h2hMap.get(entry.displayName.toLowerCase())}
                  isMe={entry.userId === user?.uid}
                />
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                disabled={page === 0}
                onClick={() => { setPage((p) => p - 1); listRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-fab-muted">
                {page + 1} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => { setPage((p) => p + 1); listRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Row Component ──

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

  const stat = getStat(entry, tab);
  const showBar = isRateTab(tab) && stat.rate !== undefined;
  const isCreator = entry.username === SITE_CREATOR;

  const medal =
    rank === 1 ? "text-fuchsia-400"
    : rank === 2 ? "text-sky-400"
    : rank === 3 ? "text-yellow-400"
    : rank === 4 ? "text-gray-300"
    : rank === 5 ? "text-amber-600"
    : "text-fab-dim";

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
      id={`lb-row-${entry.userId}`}
      href={`/player/${entry.username}`}
      className={`flex items-center gap-3 rounded-lg px-4 py-3 hover:border-fab-gold/30 transition-colors ${cardClass} ${isMe ? "ring-1 ring-fab-gold/30" : ""}`}
    >
      {/* Rank */}
      <span className={`text-sm font-black w-7 text-center shrink-0 ${medal}`}>
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
          <img src={entry.photoUrl} alt="" className={`w-9 h-9 rounded-full ${rankBorder}`} />
        ) : (
          <div className={`w-9 h-9 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-xs font-bold ${rankBorder}`}>
            {initials}
          </div>
        )}
      </div>

      {/* Name + H2H */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-fab-text text-sm truncate">{entry.displayName}</p>
          {entry.topHero && entry.topHero !== "—" && entry.topHero !== "Unknown" && (
            <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-fab-bg text-fab-dim border border-fab-border/50 truncate max-w-[100px]">
              {entry.topHero}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[11px] text-fab-dim">@{entry.username}</p>
          {!entry.isPublic && <span className="text-[9px] px-1.5 py-0.5 rounded bg-fab-dim/10 text-fab-dim">Private</span>}
          {h2h && !isMe && (
            <Link
              href={`/opponents?q=${encodeURIComponent(entry.displayName)}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-fab-bg border border-fab-border hover:border-fab-gold/30 transition-colors"
              title={`Your record: ${h2h.wins}W ${h2h.losses}L across ${h2h.totalMatches} matches`}
            >
              <span className="text-fab-muted">H2H</span>
              <span className={h2h.winRate >= 50 ? "text-fab-win font-semibold" : "text-fab-loss font-semibold"}>
                {h2h.wins}-{h2h.losses}{h2h.draws > 0 ? `-${h2h.draws}` : ""}
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Stat */}
      <div className="text-right shrink-0 min-w-[80px]">
        {showBar ? (
          <div className="flex flex-col items-end gap-1">
            <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
            <div className="w-16 h-1 bg-fab-bg rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${(stat.rate ?? 0) >= 50 ? "bg-fab-win/50" : "bg-fab-loss/50"}`}
                style={{ width: `${Math.max(stat.rate ?? 0, 2)}%` }}
              />
            </div>
            <p className="text-[10px] text-fab-dim truncate max-w-[120px]">{stat.sub}</p>
          </div>
        ) : (
          <>
            <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-fab-dim truncate max-w-[120px]">{stat.sub}</p>
          </>
        )}
      </div>
    </Link>
  );
}

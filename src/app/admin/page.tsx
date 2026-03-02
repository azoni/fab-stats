"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminDashboardData, getChatGlobalStats, backfillLeaderboard, broadcastMessage, fixMatchDates, backfillGemIds, backfillMatchLinking, backfillH2H, type AdminDashboardData, type AdminUserStats, type ChatGlobalStats } from "@/lib/admin";
import { getAllFeedback, updateFeedbackStatus } from "@/lib/feedback";
import { getCreators, saveCreators } from "@/lib/creators";
import { getEvents, saveEvents } from "@/lib/featured-events";
import { lookupEvents, type LookupEvent } from "@/lib/event-lookup";
import { getOrCreateConversation, sendMessage, sendMessageNotification } from "@/lib/messages";
import { getAnalytics, type AnalyticsTimeRange } from "@/lib/analytics";
import { getBanner, saveBanner, type BannerConfig } from "@/lib/banner";
import { getAllPolls, getPollResults, getPollVoters, savePoll, removePoll, clearVotes, mergeOptions, closePredictionVoting, reopenPredictionVoting, resolvePrediction } from "@/lib/polls";
import { grantPredictionAchievements } from "@/lib/prediction-service";
import { searchHeroes } from "@/lib/heroes";
import { getAllBadgeAssignments, assignBadge, revokeBadge } from "@/lib/badge-service";
import { getMutedUserIds, muteUser, unmuteUser } from "@/lib/mute-service";
import { getEventShowcase, saveEventShowcase } from "@/lib/event-showcase";
import { getSeasons, saveSeasons, slugify } from "@/lib/seasons";
import { getDefaultTheme, saveDefaultTheme, resetAllUserThemes, THEME_OPTIONS, type ThemeName } from "@/lib/theme-config";
import { ADMIN_BADGES } from "@/lib/badges";
import { GameFormat } from "@/types";
import type { Season } from "@/types";
import type { EventShowcaseConfig, EventShowcaseImage } from "@/types";
import type { FeedbackItem, Creator, FeaturedEvent, FeaturedEventPlayer, UserProfile, Poll, PollResults, PollVoter } from "@/types";

const FEATURED_EVENT_TYPES = [
  "Armory",
  "Skirmish",
  "ProQuest",
  "Road to Nationals",
  "Battle Hardened",
  "The Calling",
  "Nationals",
  "Pro Tour",
  "Worlds",
] as const;

type SortKey = "matchCount" | "createdAt" | "username" | "lastActive" | "weekly" | "monthly" | "visits";
type SortDir = "asc" | "desc";

export default function AdminPage() {
  const { user, profile, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastActive");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "public" | "private" | "chat">("all");
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<"all" | "new" | "reviewed" | "done">("new");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replySent, setReplySent] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState("");
  const [creatorsList, setCreatorsList] = useState<Creator[]>([]);
  const [savingCreators, setSavingCreators] = useState(false);
  const [creatorsSaved, setCreatorsSaved] = useState(false);
  const [eventsList, setEventsList] = useState<FeaturedEvent[]>([]);
  const [savingEvents, setSavingEvents] = useState(false);
  const [eventsSaved, setEventsSaved] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<LookupEvent[]>([]);
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState("");
  const [broadcastResult, setBroadcastResult] = useState("");
  const [analyticsData, setAnalyticsData] = useState<{ pageViews: Record<string, number>; creatorClicks: Record<string, number> } | null>(null);
  const [fixingDates, setFixingDates] = useState(false);
  const [fixDatesProgress, setFixDatesProgress] = useState("");
  const [linkingMatches, setLinkingMatches] = useState(false);
  const [linkProgress, setLinkProgress] = useState("");
  const [backfillingGemIds, setBackfillingGemIds] = useState(false);
  const [gemIdProgress, setGemIdProgress] = useState("");
  const [resyncingH2H, setResyncingH2H] = useState(false);
  const [h2hProgress, setH2hProgress] = useState("");
  // Poll: new poll form
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState<string[]>(["", ""]);
  const [newPollShowResults, setNewPollShowResults] = useState(false);
  const [savingPoll, setSavingPoll] = useState(false);
  const [pollSaved, setPollSaved] = useState(false);
  // Poll: history
  const [allPolls, setAllPolls] = useState<Poll[]>([]);
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const [expandedPollResults, setExpandedPollResults] = useState<PollResults | null>(null);
  const [expandedPollVoters, setExpandedPollVoters] = useState<PollVoter[]>([]);
  const [expandedOption, setExpandedOption] = useState<number | null>(null);
  // Prediction
  const [predQuestion, setPredQuestion] = useState("");
  const [predOptions, setPredOptions] = useState<string[]>(["", ""]);
  const [savingPred, setSavingPred] = useState(false);
  const [predSaved, setPredSaved] = useState(false);
  const [mergeSource, setMergeSource] = useState<number | null>(null);
  const [mergeTarget, setMergeTarget] = useState<number | null>(null);
  const [merging, setMerging] = useState(false);
  const [resolveIdx, setResolveIdx] = useState<number | null>(null);
  const [resolving, setResolving] = useState(false);
  const [granting, setGranting] = useState(false);
  const [grantResult, setGrantResult] = useState<{ granted: number; alreadyHad: number } | null>(null);
  const [bannerText, setBannerText] = useState("");
  const [bannerActive, setBannerActive] = useState(false);
  const [bannerType, setBannerType] = useState<BannerConfig["type"]>("info");
  const [bannerScope, setBannerScope] = useState<BannerConfig["scope"]>("all");
  const [bannerLink, setBannerLink] = useState("");
  const [bannerLinkText, setBannerLinkText] = useState("");
  const [savingBanner, setSavingBanner] = useState(false);
  const [bannerSaved, setBannerSaved] = useState(false);
  // Event Showcase
  const [showcaseActive, setShowcaseActive] = useState(false);
  const [showcaseTitle, setShowcaseTitle] = useState("");
  const [showcaseImages, setShowcaseImages] = useState<EventShowcaseImage[]>([]);
  const [showcaseImageLink, setShowcaseImageLink] = useState("");
  const [showcaseAutoAdvance, setShowcaseAutoAdvance] = useState(0);
  const [showcaseYoutubeUrl, setShowcaseYoutubeUrl] = useState("");
  const [showcaseYoutubeEnabled, setShowcaseYoutubeEnabled] = useState(false);
  const [showcaseDiscussionId, setShowcaseDiscussionId] = useState("");
  const [showcaseDiscussionEnabled, setShowcaseDiscussionEnabled] = useState(false);
  const [savingShowcase, setSavingShowcase] = useState(false);
  const [showcaseSaved, setShowcaseSaved] = useState(false);
  // Seasons
  const [seasonsList, setSeasonsList] = useState<Season[]>([]);
  const [savingSeasons, setSavingSeasons] = useState(false);
  const [seasonsSaved, setSeasonsSaved] = useState(false);
  // Default theme
  const [defaultTheme, setDefaultTheme] = useState<ThemeName>("grimoire");
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);
  const [resettingThemes, setResettingThemes] = useState(false);
  const [themesReset, setThemesReset] = useState(false);
  const [badgeAssignments, setBadgeAssignments] = useState<Record<string, string[]>>({});
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  const [aiCost, setAiCost] = useState<ChatGlobalStats>({ totalMessages: 0, totalCost: 0, users: {} });
  const anyToolRunning = fixingDates || backfilling || backfillingGemIds || linkingMatches || resyncingH2H;
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "feedback" | "content" | "poll" | "tools">(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (["overview", "users", "feedback", "content", "poll", "tools"].includes(hash)) return hash as any;
    }
    return "overview";
  });

  // Redirect non-admins
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace("/");
    }
  }, [loading, user, isAdmin, router]);

  const fetchData = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const [result, fb, cr, ev, analytics, polls, bannerData, badges, muted, showcaseData, themeDefault, chatStats, seasonsData] = await Promise.all([getAdminDashboardData(), getAllFeedback(), getCreators(), getEvents(), getAnalytics(), getAllPolls(), getBanner(), getAllBadgeAssignments(), getMutedUserIds(), getEventShowcase(), getDefaultTheme(), getChatGlobalStats(), getSeasons()]);
      setData(result);
      setAiCost(chatStats);
      setFeedback(fb);
      setCreatorsList(cr);
      setEventsList(ev.map((e: any) => ({
        name: e.name || "",
        date: e.date || "",
        format: e.format || "",
        eventType: e.eventType || "",
        description: e.description,
        imageUrl: e.imageUrl,
        players: e.players || (e.playerUsernames || []).map((u: string) => ({ name: u, username: u })),
      })));
      setAnalyticsData(analytics);
      setAllPolls(polls);
      setBadgeAssignments(badges);
      setMutedIds(new Set(muted));
      setDefaultTheme(themeDefault);
      if (bannerData) {
        setBannerText(bannerData.text);
        setBannerActive(bannerData.active);
        setBannerType(bannerData.type);
        setBannerScope(bannerData.scope || "all");
        setBannerLink(bannerData.link || "");
        setBannerLinkText(bannerData.linkText || "");
      }
      if (showcaseData) {
        setShowcaseActive(showcaseData.active);
        setShowcaseTitle(showcaseData.title || "");
        setShowcaseImages(showcaseData.images || []);
        setShowcaseImageLink(showcaseData.imageLink || "");
        setShowcaseAutoAdvance(showcaseData.autoAdvanceSeconds || 0);
        setShowcaseYoutubeUrl(showcaseData.youtube?.url || "");
        setShowcaseYoutubeEnabled(showcaseData.youtube?.enabled ?? false);
        setShowcaseDiscussionId(showcaseData.discussion?.eventId || "");
        setShowcaseDiscussionEnabled(showcaseData.discussion?.enabled ?? false);
      }
      setSeasonsList(seasonsData);
    } catch {
      setError("Failed to load admin data.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  if (loading || !isAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-fab-muted animate-pulse">Loading...</div>
      </div>
    );
  }

  function sortedUsers(users: AdminUserStats[]): AdminUserStats[] {
    return [...users].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "matchCount") cmp = a.matchCount - b.matchCount;
      else if (sortKey === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortKey === "lastActive") cmp = new Date(a.updatedAt || "").getTime() - new Date(b.updatedAt || "").getTime();
      else if (sortKey === "weekly") cmp = (a.weeklyMatches || 0) - (b.weeklyMatches || 0);
      else if (sortKey === "monthly") cmp = (a.monthlyMatches || 0) - (b.monthlyMatches || 0);
      else if (sortKey === "visits") cmp = (a.visitCount || 0) - (b.visitCount || 0);
      else cmp = a.username.localeCompare(b.username);
      return sortDir === "desc" ? -cmp : cmp;
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortArrow({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return <span className="ml-1">{sortDir === "desc" ? "\u25BC" : "\u25B2"}</span>;
  }

  function daysAgo(dateStr: string) {
    const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (d === 0) return "today";
    if (d === 1) return "1 day ago";
    return `${d} days ago`;
  }

  function timeAgo(dateStr?: string) {
    if (!dateStr) return { label: "Never", color: "text-fab-dim" };
    const ms = Date.now() - new Date(dateStr).getTime();
    const hours = ms / 3600000;
    const days = hours / 24;
    let label: string;
    if (hours < 1) label = `${Math.floor(ms / 60000)}m ago`;
    else if (hours < 24) label = `${Math.floor(hours)}h ago`;
    else if (days < 7) label = `${Math.floor(days)}d ago`;
    else if (days < 30) label = `${Math.floor(days / 7)}w ago`;
    else label = `${Math.floor(days / 30)}mo ago`;
    const color = hours < 24 ? "text-fab-win" : days < 7 ? "text-yellow-400" : days < 30 ? "text-fab-muted" : "text-fab-dim";
    return { label, color };
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-fab-gold">Admin Dashboard</h1>
        <button
          onClick={fetchData}
          disabled={fetching}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-fab-surface border border-fab-border text-fab-text hover:border-fab-gold transition-colors disabled:opacity-50"
        >
          {fetching ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {([
          { id: "overview", label: "Overview" },
          { id: "users", label: "Users" },
          { id: "feedback", label: "Feedback", badge: feedback.filter((f) => f.status === "new").length },
          { id: "content", label: "Content" },
          { id: "poll", label: "Poll" },
          { id: "tools", label: "Tools" },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); window.history.replaceState(null, "", `#${tab.id}`); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-fab-gold/15 text-fab-gold"
                : "text-fab-muted hover:text-fab-text hover:bg-fab-surface"
            }`}
          >
            {tab.label}
            {"badge" in tab && tab.badge > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-fab-gold/20 text-fab-gold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "tools" && (
        <div className="mb-6 p-4 rounded-lg bg-fab-surface border border-fab-border space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={async () => {
                setFixingDates(true);
                setFixDatesProgress("Starting...");
                try {
                  const { usersChecked, matchesFixed, usersAffected, usersFailed } = await fixMatchDates((done, total, log) => {
                    setFixDatesProgress(`${done}/${total} — ${log}`);
                  });
                  setFixDatesProgress(`Done: ${matchesFixed} matches fixed across ${usersAffected} users (${usersChecked} checked${usersFailed > 0 ? `, ${usersFailed} failed` : ""})`);
                } catch (err) {
                  setFixDatesProgress(`Fix dates failed: ${err instanceof Error ? err.message : String(err)}`);
                } finally {
                  setFixingDates(false);
                }
              }}
              disabled={anyToolRunning}
              className="px-3 py-1.5 rounded text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold transition-colors disabled:opacity-50"
            >
              {fixingDates ? "Fixing..." : "Fix Match Dates"}
            </button>
            <button
              onClick={async () => {
                setBackfilling(true);
                setBackfillProgress("Starting...");
                try {
                  const { updated, skipped, failed } = await backfillLeaderboard((done, total) => {
                    setBackfillProgress(`${done}/${total} users`);
                  });
                  setBackfillProgress(`Done: ${updated} updated, ${skipped} skipped, ${failed} failed`);
                } catch {
                  setBackfillProgress("Backfill failed");
                } finally {
                  setBackfilling(false);
                }
              }}
              disabled={anyToolRunning}
              className="px-3 py-1.5 rounded text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold transition-colors disabled:opacity-50"
            >
              {backfilling ? "Backfilling..." : "Backfill Leaderboard"}
            </button>
            <button
              onClick={async () => {
                setBackfillingGemIds(true);
                setGemIdProgress("Starting...");
                try {
                  const { registered, skipped, failed } = await backfillGemIds((done, total, msg) => {
                    setGemIdProgress(`${done}/${total} — ${msg}`);
                  });
                  setGemIdProgress(`Done: ${registered} registered, ${skipped} skipped, ${failed} failed`);
                } catch {
                  setGemIdProgress("GEM ID backfill failed");
                } finally {
                  setBackfillingGemIds(false);
                }
              }}
              disabled={anyToolRunning}
              className="px-3 py-1.5 rounded text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold transition-colors disabled:opacity-50"
            >
              {backfillingGemIds ? "Registering..." : "Backfill GEM IDs"}
            </button>
            <button
              onClick={async () => {
                setLinkingMatches(true);
                setLinkProgress("Starting...");
                try {
                  const { usersProcessed, totalLinked, heroesShared, heroesReceived, failed } = await backfillMatchLinking((done, total, msg) => {
                    setLinkProgress(`${done}/${total} — ${msg}`);
                  });
                  setLinkProgress(`Done: ${usersProcessed} users, ${totalLinked} linked, ${heroesShared + heroesReceived} heroes exchanged${failed > 0 ? `, ${failed} failed` : ""}`);
                } catch {
                  setLinkProgress("Match linking failed");
                } finally {
                  setLinkingMatches(false);
                }
              }}
              disabled={anyToolRunning}
              className="px-3 py-1.5 rounded text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold transition-colors disabled:opacity-50"
            >
              {linkingMatches ? "Linking..." : "Link Matches"}
            </button>
            <button
              onClick={async () => {
                setResyncingH2H(true);
                setH2hProgress("Starting...");
                try {
                  const { usersProcessed, h2hWritten, failed } = await backfillH2H((done, total, msg) => {
                    setH2hProgress(`${done}/${total} — ${msg}`);
                  });
                  setH2hProgress(`Done: ${usersProcessed} users, ~${h2hWritten} H2H pairs${failed > 0 ? `, ${failed} failed` : ""}`);
                } catch {
                  setH2hProgress("H2H resync failed");
                } finally {
                  setResyncingH2H(false);
                }
              }}
              disabled={anyToolRunning}
              className="px-3 py-1.5 rounded text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold transition-colors disabled:opacity-50"
            >
              {resyncingH2H ? "Syncing..." : "Resync H2H"}
            </button>
          </div>
          {(backfillProgress || fixDatesProgress || linkProgress || gemIdProgress || h2hProgress) && (
            <p className="text-xs text-fab-dim">{h2hProgress || linkProgress || gemIdProgress || fixDatesProgress || backfillProgress}</p>
          )}
        </div>
      )}

      {error && (
        <div className="bg-fab-loss/10 border border-fab-loss/30 rounded-lg p-3 mb-4 text-fab-loss text-sm">
          {error}
        </div>
      )}

      {fetching && !data ? (
        <div className="text-center py-16 text-fab-muted animate-pulse">
          Aggregating stats...
        </div>
      ) : data ? (
        <>
          {/* ── Overview Tab ── */}
          {activeTab === "overview" && <>
          {/* Key metrics */}
          {(() => {
            const activePlayers = data.users.filter((u) => u.matchCount > 0).length;
            const publicUsers = data.users.filter((u) => u.isPublic).length;
            const privateUsers = data.totalUsers - publicUsers;
            const avgMatches = activePlayers > 0 ? Math.round(data.totalMatches / activePlayers) : 0;
            const now = Date.now();
            const onlineNow = data.users.filter((u) => u.lastSiteVisit && (now - new Date(u.lastSiteVisit).getTime()) < 15 * 60_000).length;
            const activeToday = data.users.filter((u) => u.lastSiteVisit && (now - new Date(u.lastSiteVisit).getTime()) < 24 * 60 * 60_000).length;
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <MetricCard label="Online Now" value={onlineNow} subtext={`${activeToday} active today`} highlight />
                <MetricCard label="Total Users" value={data.totalUsers} />
                <MetricCard label="Active Players" value={activePlayers} subtext={`${data.totalUsers - activePlayers} with 0 matches`} />
                <MetricCard label="Public" value={publicUsers} subtext={`${privateUsers} private`} />
                <MetricCard label="Total Matches" value={data.totalMatches} subtext={`${avgMatches} avg per player`} />
                <MetricCard label="New (7d)" value={data.newUsersThisWeek} />
                <MetricCard label="New (30d)" value={data.newUsersThisMonth} />
                <MetricCard label="Avg Win Rate" value={(() => {
                  const withWr = data.users.filter((u) => u.winRate !== undefined && u.matchCount >= 10);
                  if (withWr.length === 0) return 0;
                  return Math.round((withWr.reduce((s, u) => s + (u.winRate ?? 0), 0) / withWr.length) * 10) / 10;
                })()} subtext="players with 10+ matches" suffix="%" />
                <MetricCard label="AI Chat Cost" value={aiCost.totalCost.toFixed(2)} prefix="$" subtext={`${aiCost.totalMessages} messages`} />
              </div>
            );
          })()}

          {/* Page Activity */}
          {analyticsData && <ActivitySection analytics={analyticsData} />}
          </>}

          {/* ── Users Tab ── */}
          {activeTab === "users" && <>
          {/* Users table */}
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-fab-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fab-text">All Users ({data.users.length})</h2>
              <div className="flex gap-1">
                {(["all", "public", "private"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      statusFilter === f
                        ? "bg-fab-gold/20 text-fab-gold"
                        : "text-fab-muted hover:text-fab-text"
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {f !== "all" && ` (${data.users.filter((u) => f === "public" ? u.isPublic : !u.isPublic).length})`}
                  </button>
                ))}
                {Object.keys(aiCost.users).length > 0 && (
                  <button
                    onClick={() => setStatusFilter("chat")}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      statusFilter === "chat"
                        ? "bg-fab-gold/20 text-fab-gold"
                        : "text-fab-muted hover:text-fab-text"
                    }`}
                  >
                    Chat ({Object.keys(aiCost.users).length})
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-fab-border text-fab-muted text-left">
                    <th className="px-4 py-2 font-medium">#</th>
                    <th
                      className="px-4 py-2 font-medium cursor-pointer hover:text-fab-text select-none"
                      onClick={() => toggleSort("username")}
                    >
                      User<SortArrow col="username" />
                    </th>
                    <th
                      className="px-4 py-2 font-medium cursor-pointer hover:text-fab-text select-none text-right"
                      onClick={() => toggleSort("matchCount")}
                    >
                      Matches<SortArrow col="matchCount" />
                    </th>
                    <th
                      className="px-4 py-2 font-medium cursor-pointer hover:text-fab-text select-none text-right"
                      onClick={() => toggleSort("weekly")}
                    >
                      7d<SortArrow col="weekly" />
                    </th>
                    <th
                      className="px-4 py-2 font-medium cursor-pointer hover:text-fab-text select-none text-right"
                      onClick={() => toggleSort("monthly")}
                    >
                      30d<SortArrow col="monthly" />
                    </th>
                    <th
                      className="px-4 py-2 font-medium cursor-pointer hover:text-fab-text select-none text-right"
                      onClick={() => toggleSort("visits")}
                    >
                      Visits<SortArrow col="visits" />
                    </th>
                    {statusFilter === "chat" && (
                      <th className="px-4 py-2 font-medium text-right">Chat</th>
                    )}
                    <th
                      className="px-4 py-2 font-medium cursor-pointer hover:text-fab-text select-none"
                      onClick={() => toggleSort("lastActive")}
                    >
                      Last Active<SortArrow col="lastActive" />
                    </th>
                    <th
                      className="px-4 py-2 font-medium cursor-pointer hover:text-fab-text select-none"
                      onClick={() => toggleSort("createdAt")}
                    >
                      Joined<SortArrow col="createdAt" />
                    </th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers(data.users).filter((u) => statusFilter === "all" ? true : statusFilter === "chat" ? !!aiCost.users[u.uid] : statusFilter === "public" ? u.isPublic : !u.isPublic).map((u, i) => {
                    const isExpanded = expandedUid === u.uid;
                    return (
                      <React.Fragment key={u.uid}>
                        <tr
                          className="border-b border-fab-border/50 hover:bg-fab-surface-hover transition-colors cursor-pointer"
                          onClick={() => setExpandedUid(isExpanded ? null : u.uid)}
                        >
                          <td className="px-4 py-2 text-fab-dim">{i + 1}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {u.photoUrl ? (
                                <img src={u.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-fab-bg border border-fab-border flex items-center justify-center text-fab-gold text-[10px] font-bold">
                                  {u.displayName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="text-fab-text">@{u.username}</span>
                                <div className="text-xs text-fab-dim">{u.displayName}</div>
                              </div>
                              <span className="text-fab-dim text-xs ml-auto">{isExpanded ? "\u25B2" : "\u25BC"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-fab-text">{u.matchCount}</td>
                          <td className="px-4 py-2 text-right font-mono">
                            <span className={`${(u.weeklyMatches || 0) > 0 ? "text-fab-win" : "text-fab-dim"}`}>{u.weeklyMatches || 0}</span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            <span className={`${(u.monthlyMatches || 0) > 0 ? "text-fab-text" : "text-fab-dim"}`}>{u.monthlyMatches || 0}</span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            <span className={`${(u.visitCount || 0) > 10 ? "text-fab-win" : (u.visitCount || 0) > 0 ? "text-fab-text" : "text-fab-dim"}`}>{u.visitCount || 0}</span>
                          </td>
                          {statusFilter === "chat" && (() => {
                            const cs = aiCost.users[u.uid];
                            return (
                              <td className="px-4 py-2 text-right font-mono">
                                <span className="text-fab-text">{cs?.messages || 0}</span>
                                {(cs?.cost || 0) > 0 && <div className="text-[10px] text-fab-dim">${cs.cost.toFixed(3)}</div>}
                              </td>
                            );
                          })()}
                          <td className="px-4 py-2">
                            {(() => { const ta = timeAgo(u.updatedAt); return <span className={`text-xs font-medium ${ta.color}`}>{ta.label}</span>; })()}
                          </td>
                          <td className="px-4 py-2">
                            <div className="text-fab-text">{new Date(u.createdAt).toLocaleDateString()}</div>
                            <div className="text-xs text-fab-dim">{daysAgo(u.createdAt)}</div>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              u.isPublic
                                ? "bg-fab-win/10 text-fab-win"
                                : "bg-fab-dim/10 text-fab-dim"
                            }`}>
                              {u.isPublic ? "Public" : "Private"}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-fab-border/50 bg-fab-bg/50">
                            <td colSpan={statusFilter === "chat" ? 10 : 9} className="px-4 py-3">
                              <UserExpandedStats
                                user={u}
                                assignedBadgeIds={badgeAssignments[u.uid] || []}
                                isMuted={mutedIds.has(u.uid)}
                                onAssignBadge={async (badgeId, notify) => {
                                  await assignBadge(u.uid, badgeId, notify);
                                  setBadgeAssignments((prev) => ({
                                    ...prev,
                                    [u.uid]: [...(prev[u.uid] || []), badgeId],
                                  }));
                                }}
                                onRevokeBadge={async (badgeId) => {
                                  await revokeBadge(u.uid, badgeId);
                                  setBadgeAssignments((prev) => ({
                                    ...prev,
                                    [u.uid]: (prev[u.uid] || []).filter((id) => id !== badgeId),
                                  }));
                                }}
                                onToggleMute={async () => {
                                  if (mutedIds.has(u.uid)) {
                                    await unmuteUser(u.uid);
                                    setMutedIds((prev) => { const next = new Set(prev); next.delete(u.uid); return next; });
                                  } else {
                                    await muteUser(u.uid);
                                    setMutedIds((prev) => new Set(prev).add(u.uid));
                                  }
                                }}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          </>}

          {/* ── Feedback Tab ── */}
          {activeTab === "feedback" && <>
          {/* Feedback */}
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-fab-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fab-text">Feedback ({feedback.length})</h2>
              <div className="flex gap-1">
                {(["all", "new", "reviewed", "done"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFeedbackFilter(f)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      feedbackFilter === f
                        ? "bg-fab-gold/20 text-fab-gold"
                        : "text-fab-muted hover:text-fab-text"
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {f !== "all" && ` (${feedback.filter((fb) => fb.status === f).length})`}
                  </button>
                ))}
              </div>
            </div>
            {feedback.filter((f) => feedbackFilter === "all" || f.status === feedbackFilter).length === 0 ? (
              <div className="px-4 py-8 text-center text-fab-dim text-sm">No feedback yet.</div>
            ) : (
              <div className="divide-y divide-fab-border/50">
                {feedback
                  .filter((f) => feedbackFilter === "all" || f.status === feedbackFilter)
                  .map((f) => (
                    <div key={f.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              f.type === "bug"
                                ? "bg-fab-loss/15 text-fab-loss"
                                : "bg-fab-gold/15 text-fab-gold"
                            }`}>
                              {f.type}
                            </span>
                            <Link
                              href={`/player/${f.username}`}
                              className="text-xs text-fab-muted hover:text-fab-gold transition-colors"
                            >
                              @{f.username}
                            </Link>
                            <span className="text-xs text-fab-dim">
                              {new Date(f.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-fab-text whitespace-pre-wrap break-words">{f.message}</p>

                          {/* Reply button / sent confirmation */}
                          <div className="mt-2">
                            {replySent === f.id ? (
                              <span className="text-xs text-fab-win">Sent!</span>
                            ) : replyingTo === f.id ? null : (
                              <button
                                onClick={() => { setReplyingTo(f.id); setReplyText(""); }}
                                className="text-xs text-fab-muted hover:text-fab-gold transition-colors"
                              >
                                Reply
                              </button>
                            )}
                          </div>

                          {/* Inline reply form */}
                          {replyingTo === f.id && (
                            <div className="mt-2 space-y-2">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Type your reply..."
                                rows={3}
                                className="w-full bg-fab-bg border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold resize-none"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  disabled={!replyText.trim() || replySending}
                                  onClick={async () => {
                                    if (!profile || !replyText.trim()) return;
                                    setReplySending(true);
                                    try {
                                      const userProfile = {
                                        uid: f.userId,
                                        username: f.username,
                                        displayName: f.displayName,
                                        photoUrl: "",
                                        isPublic: true,
                                      } as UserProfile;
                                      const convId = await getOrCreateConversation(profile, userProfile);
                                      const quote = f.message.length > 100 ? f.message.slice(0, 100) + "..." : f.message;
                                      const fullMessage = `Re: your ${f.type === "bug" ? "bug report" : "feature request"} — "${quote}"\n\n${replyText.trim()}`;
                                      await sendMessage(convId, profile.uid, profile.displayName, profile.photoUrl, fullMessage, true);
                                      await sendMessageNotification(f.userId, convId, profile.uid, profile.displayName, profile.photoUrl, fullMessage.slice(0, 100));
                                      setReplyingTo(null);
                                      setReplyText("");
                                      setReplySent(f.id);
                                      setTimeout(() => setReplySent(null), 2000);
                                      // Auto-mark as reviewed if new
                                      if (f.status === "new") {
                                        await updateFeedbackStatus(f.id, "reviewed");
                                        setFeedback((prev) => prev.map((item) => item.id === f.id ? { ...item, status: "reviewed" } : item));
                                      }
                                    } catch (err) {
                                      console.error("Reply error:", err);
                                      setError("Failed to send reply.");
                                    } finally {
                                      setReplySending(false);
                                    }
                                  }}
                                  className="px-3 py-1 rounded text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
                                >
                                  {replySending ? "Sending..." : "Send"}
                                </button>
                                <button
                                  onClick={() => { setReplyingTo(null); setReplyText(""); }}
                                  className="text-xs text-fab-dim hover:text-fab-muted transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <select
                          value={f.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value as "new" | "reviewed" | "done";
                            try {
                              await updateFeedbackStatus(f.id, newStatus);
                              setFeedback((prev) =>
                                prev.map((item) =>
                                  item.id === f.id ? { ...item, status: newStatus } : item
                                )
                              );
                            } catch {
                              setError("Failed to update feedback status.");
                            }
                          }}
                          className={`text-xs rounded px-2 py-1 border bg-fab-bg border-fab-border cursor-pointer shrink-0 ${
                            f.status === "new"
                              ? "text-fab-gold"
                              : f.status === "reviewed"
                              ? "text-blue-400"
                              : "text-fab-win"
                          }`}
                        >
                          <option value="new">New</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          </>}

          {/* ── Content Tab ── */}
          {activeTab === "content" && <>
          {/* Event Showcase */}
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-fab-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fab-text">
                Event Showcase
                {showcaseActive && <span className="text-fab-win ml-1.5 text-xs font-normal">(Live)</span>}
              </h2>
              <div className="flex items-center gap-2">
                {showcaseSaved && <span className="text-xs text-fab-win">Saved!</span>}
                <button
                  type="button"
                  onClick={async () => {
                    const next = !showcaseActive;
                    setShowcaseActive(next);
                    setSavingShowcase(true);
                    try {
                      await saveEventShowcase({
                        active: next, title: showcaseTitle, images: showcaseImages,
                        imageLink: showcaseImageLink || undefined, autoAdvanceSeconds: showcaseAutoAdvance,
                        youtube: { url: showcaseYoutubeUrl, enabled: showcaseYoutubeEnabled },
                        discussion: { eventId: showcaseDiscussionId, enabled: showcaseDiscussionEnabled },
                      });
                      setShowcaseSaved(true);
                      setTimeout(() => setShowcaseSaved(false), 2000);
                    } catch { setShowcaseActive(!next); }
                    finally { setSavingShowcase(false); }
                  }}
                  disabled={savingShowcase}
                  className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${showcaseActive ? "bg-fab-win" : "bg-fab-border"}`}
                  title={showcaseActive ? "Turn off showcase" : "Turn on showcase"}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showcaseActive ? "translate-x-4" : ""}`} />
                </button>
                <button
                  onClick={async () => {
                    setSavingShowcase(true);
                    setShowcaseSaved(false);
                    try {
                      await saveEventShowcase({
                        active: showcaseActive, title: showcaseTitle, images: showcaseImages,
                        imageLink: showcaseImageLink || undefined, autoAdvanceSeconds: showcaseAutoAdvance,
                        youtube: { url: showcaseYoutubeUrl, enabled: showcaseYoutubeEnabled },
                        discussion: { eventId: showcaseDiscussionId, enabled: showcaseDiscussionEnabled },
                      });
                      setShowcaseSaved(true);
                      setTimeout(() => setShowcaseSaved(false), 2000);
                    } catch { setError("Failed to save showcase."); }
                    finally { setSavingShowcase(false); }
                  }}
                  disabled={savingShowcase}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
                >
                  {savingShowcase ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-fab-dim uppercase tracking-wider mb-1 block">Section Title</label>
                <input type="text" placeholder="e.g. Calling Montreal Day 1" value={showcaseTitle} onChange={(e) => setShowcaseTitle(e.target.value)} className="w-full bg-fab-bg border border-fab-border text-fab-text text-sm rounded px-3 py-2 focus:outline-none focus:border-fab-gold" />
              </div>
              <div>
                <label className="text-xs text-fab-dim uppercase tracking-wider mb-1 block">Carousel Images ({showcaseImages.length})</label>
                <div className="space-y-2">
                  {showcaseImages.map((img, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" placeholder="Image URL (e.g. /montreal.png)" value={img.url} onChange={(e) => setShowcaseImages((prev) => prev.map((im, j) => j === i ? { ...im, url: e.target.value } : im))} className="flex-1 bg-fab-bg border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold" />
                      <input type="text" placeholder="Alt text" value={img.alt || ""} onChange={(e) => setShowcaseImages((prev) => prev.map((im, j) => j === i ? { ...im, alt: e.target.value || undefined } : im))} className="w-40 bg-fab-bg border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold" />
                      <button onClick={() => setShowcaseImages((prev) => prev.filter((_, j) => j !== i))} className="text-xs text-fab-loss hover:text-fab-loss/80 transition-colors px-2">Remove</button>
                    </div>
                  ))}
                  <button onClick={() => setShowcaseImages((prev) => [...prev, { url: "" }])} className="w-full py-1.5 rounded text-xs font-medium border border-dashed border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors">+ Add Image</button>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-fab-dim uppercase tracking-wider mb-1 block">Image Click URL (optional)</label>
                  <input type="text" placeholder="https://..." value={showcaseImageLink} onChange={(e) => setShowcaseImageLink(e.target.value)} className="w-full bg-fab-bg border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold" />
                </div>
                <div className="w-32">
                  <label className="text-xs text-fab-dim uppercase tracking-wider mb-1 block">Auto-advance (s)</label>
                  <input type="number" min={0} value={showcaseAutoAdvance} onChange={(e) => setShowcaseAutoAdvance(Number(e.target.value) || 0)} className="w-full bg-fab-bg border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-fab-dim uppercase tracking-wider">YouTube Embed</label>
                  <button type="button" onClick={() => setShowcaseYoutubeEnabled((v) => !v)} className={`relative w-9 h-5 rounded-full transition-colors ${showcaseYoutubeEnabled ? "bg-fab-win" : "bg-fab-border"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showcaseYoutubeEnabled ? "translate-x-4" : ""}`} />
                  </button>
                </div>
                <input type="text" placeholder="YouTube URL (watch, live, or embed)" value={showcaseYoutubeUrl} onChange={(e) => setShowcaseYoutubeUrl(e.target.value)} className="w-full bg-fab-bg border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-fab-dim uppercase tracking-wider">Event Discussion</label>
                  <button type="button" onClick={() => setShowcaseDiscussionEnabled((v) => !v)} className={`relative w-9 h-5 rounded-full transition-colors ${showcaseDiscussionEnabled ? "bg-fab-win" : "bg-fab-border"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showcaseDiscussionEnabled ? "translate-x-4" : ""}`} />
                  </button>
                </div>
                <input type="text" placeholder="Event ID (e.g. calling_montreal_2026)" value={showcaseDiscussionId} onChange={(e) => setShowcaseDiscussionId(e.target.value)} className="w-full bg-fab-bg border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold" />
              </div>
            </div>
          </div>

          {/* Site Banner */}
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-fab-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fab-text">
                Site Banner
                {bannerActive && <span className="text-fab-win ml-1.5 text-xs font-normal">(Live)</span>}
              </h2>
              <div className="flex items-center gap-2">
                {bannerSaved && <span className="text-xs text-fab-win">Saved!</span>}
                <button
                  type="button"
                  onClick={async () => {
                    const next = !bannerActive;
                    setBannerActive(next);
                    setSavingBanner(true);
                    setBannerSaved(false);
                    try {
                      await saveBanner({ text: bannerText, active: next, type: bannerType, scope: bannerScope, link: bannerLink || undefined, linkText: bannerLinkText || undefined });
                      setBannerSaved(true);
                      setTimeout(() => setBannerSaved(false), 2000);
                    } catch {
                      setError("Failed to toggle banner.");
                      setBannerActive(!next);
                    } finally {
                      setSavingBanner(false);
                    }
                  }}
                  disabled={savingBanner || !bannerText.trim()}
                  className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${bannerActive ? "bg-fab-win" : "bg-fab-border"}`}
                  title={bannerActive ? "Turn off banner" : "Turn on banner"}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${bannerActive ? "translate-x-4" : ""}`} />
                </button>
                <button
                  onClick={async () => {
                    if (!bannerText.trim()) return;
                    setSavingBanner(true);
                    setBannerSaved(false);
                    try {
                      await saveBanner({ text: bannerText, active: bannerActive, type: bannerType, scope: bannerScope, link: bannerLink || undefined, linkText: bannerLinkText || undefined });
                      setBannerSaved(true);
                      setTimeout(() => setBannerSaved(false), 2000);
                    } catch {
                      setError("Failed to save banner.");
                    } finally {
                      setSavingBanner(false);
                    }
                  }}
                  disabled={savingBanner || !bannerText.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
                >
                  {savingBanner ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                placeholder="Banner message shown to all users..."
                rows={2}
                className="w-full bg-fab-bg border border-fab-border text-fab-text text-sm rounded px-3 py-2 focus:outline-none focus:border-fab-gold resize-none"
              />
              <div className="flex gap-2 flex-wrap">
                <select
                  value={bannerType}
                  onChange={(e) => setBannerType(e.target.value as BannerConfig["type"])}
                  className="bg-fab-bg border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold cursor-pointer"
                >
                  <option value="info">Info (Blue)</option>
                  <option value="warning">Warning (Gold)</option>
                  <option value="success">Success (Green)</option>
                </select>
                <select
                  value={bannerScope}
                  onChange={(e) => setBannerScope(e.target.value as BannerConfig["scope"])}
                  className="bg-fab-bg border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold cursor-pointer"
                >
                  <option value="all">All Pages</option>
                  <option value="home">Homepage Only</option>
                </select>
                <input
                  type="text"
                  placeholder="Link URL (optional)"
                  value={bannerLink}
                  onChange={(e) => setBannerLink(e.target.value)}
                  className="flex-1 min-w-0 bg-fab-bg border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                />
                <input
                  type="text"
                  placeholder="Link text (optional)"
                  value={bannerLinkText}
                  onChange={(e) => setBannerLinkText(e.target.value)}
                  className="w-32 bg-fab-bg border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                />
              </div>
              {bannerText.trim() && (
                <div className="mt-2">
                  <p className="text-[10px] text-fab-dim uppercase tracking-wider mb-1.5">Preview</p>
                  <div className={`border rounded-lg px-4 py-3 flex items-center justify-between gap-3 ${
                    bannerType === "info" ? "bg-blue-500/10 border-blue-500/25 text-blue-300"
                    : bannerType === "warning" ? "bg-fab-gold/10 border-fab-gold/25 text-fab-gold"
                    : "bg-fab-win/10 border-fab-win/25 text-fab-win"
                  }`}>
                    <p className="text-sm">
                      {bannerText}
                      {bannerLink && (
                        <span className="underline font-medium ml-1">{bannerLinkText || "Learn more"}</span>
                      )}
                    </p>
                    <span className="text-current opacity-50 shrink-0 text-lg leading-none">&times;</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Default Theme */}
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-fab-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fab-text">Default Theme</h2>
              <div className="flex items-center gap-2">
                {themeSaved && <span className="text-xs text-fab-win">Saved!</span>}
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs text-fab-dim mb-3">Sets the default theme for new users. Users can override in Settings.</p>
              <div className="flex gap-2">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={async () => {
                      setDefaultTheme(opt.value);
                      setSavingTheme(true);
                      setThemeSaved(false);
                      try {
                        await saveDefaultTheme(opt.value);
                        setThemeSaved(true);
                        setTimeout(() => setThemeSaved(false), 2000);
                      } catch {
                        setError("Failed to save theme.");
                      } finally {
                        setSavingTheme(false);
                      }
                    }}
                    disabled={savingTheme}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      defaultTheme === opt.value
                        ? "bg-fab-gold/15 text-fab-gold border border-fab-gold/30"
                        : "bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text"
                    }`}
                  >
                    <span className="font-semibold">{opt.label}</span>
                    <span className="block text-[10px] opacity-70 mt-0.5">{opt.description}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-fab-border flex items-center gap-3">
                <button
                  onClick={async () => {
                    if (!confirm("Reset ALL users back to the default theme? Their custom theme choices will be cleared on next visit.")) return;
                    setResettingThemes(true);
                    setThemesReset(false);
                    try {
                      await resetAllUserThemes();
                      setThemesReset(true);
                      setTimeout(() => setThemesReset(false), 3000);
                    } catch {
                      setError("Failed to reset user themes.");
                    } finally {
                      setResettingThemes(false);
                    }
                  }}
                  disabled={resettingThemes}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-fab-loss/10 text-fab-loss border border-fab-loss/20 hover:bg-fab-loss/20 transition-colors disabled:opacity-50"
                >
                  {resettingThemes ? "Resetting..." : "Reset All Users"}
                </button>
                {themesReset && <span className="text-xs text-fab-win">All users will revert to default on next visit.</span>}
                <span className="text-[10px] text-fab-dim">Forces everyone back to the default theme.</span>
              </div>
            </div>
          </div>

          {/* Creators Management */}
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-fab-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fab-text">Featured Creators ({creatorsList.length})</h2>
              <div className="flex items-center gap-2">
                {creatorsSaved && <span className="text-xs text-fab-win">Saved!</span>}
                <button
                  onClick={async () => {
                    setSavingCreators(true);
                    setCreatorsSaved(false);
                    try {
                      await saveCreators(creatorsList);
                      setCreatorsSaved(true);
                      setTimeout(() => setCreatorsSaved(false), 2000);
                    } catch {
                      setError("Failed to save creators.");
                    } finally {
                      setSavingCreators(false);
                    }
                  }}
                  disabled={savingCreators}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
                >
                  {savingCreators ? "Saving..." : "Save Creators"}
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {creatorsList.map((c, i) => (
                <div key={i} className="bg-fab-bg border border-fab-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-fab-dim font-medium">Creator {i + 1}</span>
                    <button
                      onClick={() => setCreatorsList((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs text-fab-loss hover:text-fab-loss/80 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={c.name}
                      onChange={(e) => setCreatorsList((prev) => prev.map((cr, j) => j === i ? { ...cr, name: e.target.value } : cr))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={c.description}
                      onChange={(e) => setCreatorsList((prev) => prev.map((cr, j) => j === i ? { ...cr, description: e.target.value } : cr))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                    />
                    <input
                      type="text"
                      placeholder="URL"
                      value={c.url}
                      onChange={(e) => setCreatorsList((prev) => prev.map((cr, j) => j === i ? { ...cr, url: e.target.value } : cr))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold col-span-1"
                    />
                    <select
                      value={c.platform}
                      onChange={(e) => setCreatorsList((prev) => prev.map((cr, j) => j === i ? { ...cr, platform: e.target.value as Creator["platform"] } : cr))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold cursor-pointer"
                    >
                      <option value="youtube">YouTube</option>
                      <option value="twitch">Twitch</option>
                      <option value="twitter">Twitter/X</option>
                      <option value="website">Website</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Image URL (optional)"
                      value={c.imageUrl || ""}
                      onChange={(e) => setCreatorsList((prev) => prev.map((cr, j) => j === i ? { ...cr, imageUrl: e.target.value || undefined } : cr))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold col-span-2"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setCreatorsList((prev) => [...prev, { name: "", description: "", url: "", platform: "youtube" }])}
                className="w-full py-2 rounded-lg text-sm font-medium border border-dashed border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors"
              >
                + Add Creator
              </button>
            </div>
          </div>

          {/* Featured Events Management */}
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden mt-6">
            <div className="px-4 py-3 border-b border-fab-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fab-text">Featured Events ({eventsList.length})</h2>
              <div className="flex items-center gap-2">
                {eventsSaved && <span className="text-xs text-fab-win">Saved!</span>}
                <button
                  onClick={async () => {
                    setSavingEvents(true);
                    setEventsSaved(false);
                    try {
                      await saveEvents(eventsList);
                      setEventsSaved(true);
                      setTimeout(() => setEventsSaved(false), 2000);
                    } catch (err) {
                      console.error("Save events error:", err);
                      setError(`Failed to save events: ${err instanceof Error ? err.message : String(err)}`);
                    } finally {
                      setSavingEvents(false);
                    }
                  }}
                  disabled={savingEvents}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
                >
                  {savingEvents ? "Saving..." : "Save Events"}
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {eventsList.map((ev, i) => (
                <div key={i} className="bg-fab-bg border border-fab-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-fab-dim font-medium">Event {i + 1}</span>
                    <button
                      onClick={() => setEventsList((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs text-fab-loss hover:text-fab-loss/80 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Event Name"
                      value={ev.name}
                      onChange={(e) => setEventsList((prev) => prev.map((ev2, j) => j === i ? { ...ev2, name: e.target.value } : ev2))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                    />
                    <input
                      type="date"
                      value={ev.date}
                      onChange={(e) => setEventsList((prev) => prev.map((ev2, j) => j === i ? { ...ev2, date: e.target.value } : ev2))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                    />
                    <select
                      value={ev.format}
                      onChange={(e) => setEventsList((prev) => prev.map((ev2, j) => j === i ? { ...ev2, format: e.target.value } : ev2))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                    >
                      <option value="">Format</option>
                      {Object.values(GameFormat).map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <select
                      value={ev.eventType || ""}
                      onChange={(e) => setEventsList((prev) => prev.map((ev2, j) => j === i ? { ...ev2, eventType: e.target.value } : ev2))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                    >
                      <option value="">Event Type</option>
                      {FEATURED_EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={ev.description || ""}
                      onChange={(e) => setEventsList((prev) => prev.map((ev2, j) => j === i ? { ...ev2, description: e.target.value || undefined } : ev2))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="Image URL (optional)"
                      value={ev.imageUrl || ""}
                      onChange={(e) => setEventsList((prev) => prev.map((ev2, j) => j === i ? { ...ev2, imageUrl: e.target.value || undefined } : ev2))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold col-span-2"
                    />
                  </div>

                  {/* Players */}
                  <div className="mt-3 border-t border-fab-border pt-3">
                    <p className="text-xs text-fab-dim font-medium mb-2">Players (Top 8+)</p>
                    <div className="space-y-2">
                      {(ev.players || []).map((player, pi) => (
                        <EventPlayerRow
                          key={pi}
                          player={player}
                          index={pi}
                          users={data?.users || []}
                          format={ev.format}
                          onChange={(updated) => setEventsList((prev) => prev.map((ev2, j) => j === i ? { ...ev2, players: ev2.players.map((p, pj) => pj === pi ? updated : p) } : ev2))}
                          onRemove={() => setEventsList((prev) => prev.map((ev2, j) => j === i ? { ...ev2, players: ev2.players.filter((_, pj) => pj !== pi) } : ev2))}
                        />
                      ))}
                      <button
                        onClick={() => setEventsList((prev) => prev.map((ev2, j) => j === i ? { ...ev2, players: [...(ev2.players || []), { name: "" }] } : ev2))}
                        className="w-full py-1.5 rounded text-xs font-medium border border-dashed border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors"
                      >
                        + Add Player
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <button
                  onClick={() => setEventsList((prev) => [...prev, { name: "", date: "", format: "", eventType: "", players: [] }])}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border border-dashed border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors"
                >
                  + Add Event
                </button>
                <button
                  onClick={async () => {
                    if (lookupOpen) {
                      setLookupOpen(false);
                      return;
                    }
                    setLookupOpen(true);
                    setLookupLoading(true);
                    try {
                      const results = await lookupEvents();
                      setLookupResults(results);
                    } catch (err) {
                      console.error("Event lookup error:", err);
                      setError("Failed to lookup events");
                    } finally {
                      setLookupLoading(false);
                    }
                  }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border border-dashed border-fab-gold/40 text-fab-gold hover:bg-fab-gold/5 transition-colors"
                >
                  {lookupLoading ? "Loading..." : lookupOpen ? "Close Lookup" : "Lookup Event"}
                </button>
                <button
                  onClick={async () => {
                    setLookupLoading(true);
                    try {
                      const results = await lookupEvents();
                      // Build name→username map from leaderboard for auto-matching
                      const nameToUsername = new Map<string, string>();
                      if (data?.users) {
                        for (const u of data.users) {
                          if (u.displayName && u.username) {
                            nameToUsername.set(u.displayName.toLowerCase(), u.username);
                          }
                        }
                      }
                      const existingKeys = new Set(eventsList.map((e) => `${e.name}|${e.date}`));
                      let matched = 0;
                      const newEvents = results
                        .filter((ev) => !existingKeys.has(`${ev.name}|${ev.date}`))
                        .map((ev) => ({
                          name: ev.name,
                          date: ev.date,
                          format: ev.format,
                          eventType: ev.eventType,
                          players: ev.players.map((p) => {
                            const username = nameToUsername.get(p.name.toLowerCase()) || "";
                            if (username) matched++;
                            return { name: p.name, hero: p.hero, username };
                          }),
                        }));
                      if (newEvents.length > 0) {
                        setEventsList((prev) => [...prev, ...newEvents]);
                      }
                      setError(newEvents.length > 0 ? "" : "");
                      alert(`Imported ${newEvents.length} new event${newEvents.length !== 1 ? "s" : ""} (${results.length - newEvents.length} already existed)${matched > 0 ? ` — auto-linked ${matched} player${matched !== 1 ? "s" : ""}` : ""}`);
                    } catch (err) {
                      console.error("Import all error:", err);
                      setError("Failed to import events");
                    } finally {
                      setLookupLoading(false);
                    }
                  }}
                  disabled={lookupLoading}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border border-dashed border-fab-win/40 text-fab-win hover:bg-fab-win/5 transition-colors disabled:opacity-50"
                >
                  {lookupLoading ? "Loading..." : "Import All"}
                </button>
              </div>

              {/* Event lookup results */}
              {lookupOpen && !lookupLoading && lookupResults.length > 0 && (
                <div className="mt-2 bg-fab-bg border border-fab-border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                  <p className="px-3 py-2 text-xs text-fab-dim border-b border-fab-border font-medium">
                    Recent events from fabtcgmeta.com — click to import
                  </p>
                  {lookupResults.map((ev, i) => (
                    <button
                      key={`${ev.name}-${i}`}
                      onClick={() => {
                        const nameToUsername = new Map<string, string>();
                        if (data?.users) {
                          for (const u of data.users) {
                            if (u.displayName && u.username) {
                              nameToUsername.set(u.displayName.toLowerCase(), u.username);
                            }
                          }
                        }
                        setEventsList((prev) => [...prev, {
                          name: ev.name,
                          date: ev.date,
                          format: ev.format,
                          eventType: ev.eventType,
                          players: ev.players.map((p) => ({
                            name: p.name,
                            hero: p.hero,
                            username: nameToUsername.get(p.name.toLowerCase()) || "",
                          })),
                        }]);
                        setLookupOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-fab-surface transition-colors border-b border-fab-border last:border-b-0"
                    >
                      <span className="font-medium text-fab-text">{ev.name}</span>
                      <span className="text-fab-dim ml-2">{ev.date}</span>
                      <span className="text-fab-muted ml-2">{ev.format}</span>
                      <span className="text-fab-dim ml-2">({ev.players.length} players)</span>
                    </button>
                  ))}
                </div>
              )}
              {lookupOpen && !lookupLoading && lookupResults.length === 0 && (
                <p className="mt-2 text-sm text-fab-dim text-center py-3">No events found</p>
              )}
            </div>
          </div>

          {/* Seasons Management */}
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden mt-6">
            <div className="px-4 py-3 border-b border-fab-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fab-text">Seasons ({seasonsList.length})</h2>
              <div className="flex items-center gap-2">
                {seasonsSaved && <span className="text-xs text-fab-win">Saved!</span>}
                <button
                  onClick={async () => {
                    setSavingSeasons(true);
                    setSeasonsSaved(false);
                    try {
                      await saveSeasons(seasonsList);
                      setSeasonsSaved(true);
                      setTimeout(() => setSeasonsSaved(false), 2000);
                    } catch {
                      setError("Failed to save seasons.");
                    } finally {
                      setSavingSeasons(false);
                    }
                  }}
                  disabled={savingSeasons}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
                >
                  {savingSeasons ? "Saving..." : "Save Seasons"}
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-fab-dim">Define competitive seasons to aggregate Top 8 data across weeks on the Meta page and homepage spotlight.</p>
              {seasonsList.map((s, i) => (
                <div key={i} className="bg-fab-bg border border-fab-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-fab-dim font-medium">Season {i + 1}</span>
                      {s.active && <span className="text-[10px] text-fab-win font-medium">(Active)</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSeasonsList((prev) => prev.map((s2, j) => j === i ? { ...s2, active: !s2.active } : s2))}
                        className={`relative w-8 h-4.5 rounded-full transition-colors ${s.active ? "bg-fab-win" : "bg-fab-border"}`}
                        title={s.active ? "Deactivate" : "Activate"}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${s.active ? "translate-x-3.5" : ""}`} />
                      </button>
                      <button
                        onClick={() => setSeasonsList((prev) => prev.filter((_, j) => j !== i))}
                        className="text-xs text-fab-loss hover:text-fab-loss/80 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Season Name (e.g. PQ CC Season 1)"
                      value={s.name}
                      onChange={(e) => setSeasonsList((prev) => prev.map((s2, j) => j === i ? { ...s2, name: e.target.value, id: slugify(e.target.value) } : s2))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold col-span-2"
                    />
                    <div>
                      <label className="text-[10px] text-fab-dim uppercase tracking-wider mb-0.5 block">Start Date</label>
                      <input
                        type="date"
                        value={s.startDate}
                        onChange={(e) => setSeasonsList((prev) => prev.map((s2, j) => j === i ? { ...s2, startDate: e.target.value } : s2))}
                        className="w-full bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-fab-dim uppercase tracking-wider mb-0.5 block">End Date</label>
                      <input
                        type="date"
                        value={s.endDate}
                        onChange={(e) => setSeasonsList((prev) => prev.map((s2, j) => j === i ? { ...s2, endDate: e.target.value } : s2))}
                        className="w-full bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                      />
                    </div>
                    <select
                      value={s.format}
                      onChange={(e) => setSeasonsList((prev) => prev.map((s2, j) => j === i ? { ...s2, format: e.target.value } : s2))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold cursor-pointer"
                    >
                      <option value="">Format</option>
                      {Object.values(GameFormat).map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <select
                      value={s.eventType}
                      onChange={(e) => setSeasonsList((prev) => prev.map((s2, j) => j === i ? { ...s2, eventType: e.target.value } : s2))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold cursor-pointer"
                    >
                      <option value="">Event Type</option>
                      {FEATURED_EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {s.id && <p className="text-[10px] text-fab-dim mt-1.5">ID: {s.id}</p>}
                </div>
              ))}
              <button
                onClick={() => setSeasonsList((prev) => [...prev, { id: "", name: "", startDate: "", endDate: "", format: "", eventType: "", active: false }])}
                className="w-full py-2 rounded-lg text-sm font-medium border border-dashed border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors"
              >
                + Add Season
              </button>
            </div>
          </div>

          </>}

          {/* ── Poll Tab ── */}
          {activeTab === "poll" && <>
          {/* Create New Poll */}
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-fab-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fab-text">Create New Poll</h2>
              <div className="flex items-center gap-2">
                {pollSaved && <span className="text-xs text-fab-win">Published!</span>}
                <button
                  onClick={async () => {
                    const opts = newPollOptions.filter(Boolean);
                    if (!newPollQuestion.trim() || opts.length < 2) return;
                    setSavingPoll(true);
                    setPollSaved(false);
                    try {
                      await savePoll({
                        question: newPollQuestion.trim(),
                        options: opts,
                        active: true,
                        createdAt: new Date().toISOString(),
                        showResults: newPollShowResults,
                      });
                      // Refresh polls list
                      const polls = await getAllPolls();
                      setAllPolls(polls);
                      // Reset form
                      setNewPollQuestion("");
                      setNewPollOptions(["", ""]);
                      setNewPollShowResults(false);
                      setPollSaved(true);
                      setTimeout(() => setPollSaved(false), 2000);
                    } catch {
                      setError("Failed to save poll.");
                    } finally {
                      setSavingPoll(false);
                    }
                  }}
                  disabled={savingPoll || !newPollQuestion.trim() || newPollOptions.filter(Boolean).length < 2}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
                >
                  {savingPoll ? "Saving..." : "Publish Poll"}
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text"
                placeholder="Poll question"
                value={newPollQuestion}
                onChange={(e) => setNewPollQuestion(e.target.value)}
                className="w-full bg-fab-bg border border-fab-border text-fab-text text-sm rounded px-3 py-2 focus:outline-none focus:border-fab-gold"
              />
              {newPollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const next = [...newPollOptions];
                      next[i] = e.target.value;
                      setNewPollOptions(next);
                    }}
                    className="flex-1 bg-fab-bg border border-fab-border text-fab-text text-sm rounded px-3 py-1.5 focus:outline-none focus:border-fab-gold"
                  />
                  {newPollOptions.length > 2 && (
                    <button
                      onClick={() => setNewPollOptions(newPollOptions.filter((_, j) => j !== i))}
                      className="text-xs text-fab-loss hover:text-fab-loss/80"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setNewPollOptions([...newPollOptions, ""])}
                className="w-full py-1.5 rounded text-xs font-medium border border-dashed border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors"
              >
                + Add Option
              </button>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <button
                  type="button"
                  onClick={() => setNewPollShowResults(!newPollShowResults)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${newPollShowResults ? "bg-fab-win" : "bg-fab-border"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${newPollShowResults ? "translate-x-4" : ""}`} />
                </button>
                <span className="text-xs text-fab-muted">Show results to voters</span>
              </label>
            </div>
          </div>

          {/* Create Prediction */}
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-fab-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fab-text">Create Prediction</h2>
              <div className="flex items-center gap-2">
                {predSaved && <span className="text-xs text-fab-win">Published!</span>}
                <button
                  onClick={async () => {
                    const opts = predOptions.filter(Boolean);
                    if (!predQuestion.trim()) return;
                    setSavingPred(true);
                    setPredSaved(false);
                    try {
                      await savePoll({
                        question: predQuestion.trim(),
                        options: opts,
                        active: true,
                        createdAt: new Date().toISOString(),
                        showResults: true,
                        type: "prediction",
                        allowUserOptions: true,
                        votingOpen: true,
                      });
                      const polls = await getAllPolls();
                      setAllPolls(polls);
                      setPredQuestion("");
                      setPredOptions(["", ""]);
                      setPredSaved(true);
                      setTimeout(() => setPredSaved(false), 2000);
                    } catch {
                      setError("Failed to save prediction.");
                    } finally {
                      setSavingPred(false);
                    }
                  }}
                  disabled={savingPred || !predQuestion.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
                >
                  {savingPred ? "Saving..." : "Publish Prediction"}
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text"
                placeholder="Who will win this match?"
                value={predQuestion}
                onChange={(e) => setPredQuestion(e.target.value)}
                className="w-full bg-fab-bg border border-fab-border text-fab-text text-sm rounded px-3 py-2 focus:outline-none focus:border-fab-gold"
              />
              {predOptions.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder={`Player ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const next = [...predOptions];
                      next[i] = e.target.value;
                      setPredOptions(next);
                    }}
                    className="flex-1 bg-fab-bg border border-fab-border text-fab-text text-sm rounded px-3 py-1.5 focus:outline-none focus:border-fab-gold"
                  />
                  {predOptions.length > 2 && (
                    <button
                      onClick={() => setPredOptions(predOptions.filter((_, j) => j !== i))}
                      className="text-xs text-fab-loss hover:text-fab-loss/80"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setPredOptions([...predOptions, ""])}
                className="w-full py-1.5 rounded text-xs font-medium border border-dashed border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors"
              >
                + Add Option
              </button>
              <p className="text-[10px] text-fab-dim">Users can add their own options. Predictions support real-time voting and achievement rewards.</p>
            </div>
          </div>

          {/* Active Prediction Management */}
          {allPolls.filter((p) => p.type === "prediction" && (p.active || p.votingOpen)).map((pred) => (
            <div key={pred.id} className="bg-fab-surface border border-fab-gold/30 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-fab-border">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-fab-gold/20 text-fab-gold">Prediction</span>
                  <h2 className="text-sm font-semibold text-fab-text flex-1">{pred.question}</h2>
                  {pred.votingOpen && <span className="text-[10px] text-fab-win">Voting Open</span>}
                  {!pred.votingOpen && !pred.resolvedAt && <span className="text-[10px] text-amber-400">Voting Closed</span>}
                  {pred.resolvedAt && <span className="text-[10px] text-fab-dim">Resolved</span>}
                </div>
              </div>
              <div className="p-4 space-y-4">
                {/* Voting controls */}
                <div className="flex items-center gap-2">
                  {pred.votingOpen ? (
                    <button
                      onClick={async () => {
                        await closePredictionVoting(pred.id!);
                        const polls = await getAllPolls();
                        setAllPolls(polls);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                    >
                      Close Voting
                    </button>
                  ) : !pred.resolvedAt ? (
                    <button
                      onClick={async () => {
                        await reopenPredictionVoting(pred.id!);
                        const polls = await getAllPolls();
                        setAllPolls(polls);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fab-win/20 text-fab-win hover:bg-fab-win/30 transition-colors"
                    >
                      Reopen Voting
                    </button>
                  ) : null}
                  {!pred.resolvedAt && (
                    <button
                      onClick={async () => {
                        await removePoll(pred.id!);
                        const polls = await getAllPolls();
                        setAllPolls(polls);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fab-loss/20 text-fab-loss hover:bg-fab-loss/30 transition-colors"
                    >
                      Deactivate
                    </button>
                  )}
                </div>

                {/* Options with vote counts */}
                <div>
                  <p className="text-xs text-fab-dim font-medium mb-2">Options ({pred.options.filter((o) => !o.startsWith("[MERGED]")).length} active)</p>
                  <div className="space-y-1">
                    {pred.options.map((opt, i) => {
                      if (opt.startsWith("[MERGED]")) return (
                        <div key={i} className="text-[11px] text-fab-dim line-through px-2 py-1">{opt}</div>
                      );
                      const isWinner = pred.correctOptionIndex === i;
                      return (
                        <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isWinner ? "bg-green-400/10 text-green-400" : "text-fab-text"}`}>
                          {isWinner && <span>&#10003;</span>}
                          <span className="flex-1 truncate">{opt}</span>
                          <span className="text-xs text-fab-dim">#{i}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Merge options */}
                {!pred.resolvedAt && (
                  <div className="border-t border-fab-border pt-3">
                    <p className="text-xs text-fab-dim font-medium mb-2">Merge Duplicate Options</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={mergeSource ?? ""}
                        onChange={(e) => setMergeSource(e.target.value ? Number(e.target.value) : null)}
                        className="bg-fab-bg border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                      >
                        <option value="">Source...</option>
                        {pred.options.map((opt, i) => !opt.startsWith("[MERGED]") && (
                          <option key={i} value={i}>{opt}</option>
                        ))}
                      </select>
                      <span className="text-xs text-fab-dim">&rarr;</span>
                      <select
                        value={mergeTarget ?? ""}
                        onChange={(e) => setMergeTarget(e.target.value ? Number(e.target.value) : null)}
                        className="bg-fab-bg border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                      >
                        <option value="">Target...</option>
                        {pred.options.map((opt, i) => !opt.startsWith("[MERGED]") && mergeSource !== i && (
                          <option key={i} value={i}>{opt}</option>
                        ))}
                      </select>
                      <button
                        onClick={async () => {
                          if (mergeSource === null || mergeTarget === null) return;
                          setMerging(true);
                          try {
                            const result = await mergeOptions(pred.id!, mergeSource, mergeTarget);
                            alert(`Merged! ${result.votesReassigned} vote(s) reassigned.`);
                            const polls = await getAllPolls();
                            setAllPolls(polls);
                            setMergeSource(null);
                            setMergeTarget(null);
                          } catch {
                            alert("Merge failed.");
                          } finally {
                            setMerging(false);
                          }
                        }}
                        disabled={merging || mergeSource === null || mergeTarget === null}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fab-gold/20 text-fab-gold hover:bg-fab-gold/30 transition-colors disabled:opacity-50"
                      >
                        {merging ? "Merging..." : "Merge"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Resolve prediction */}
                {!pred.resolvedAt && !pred.votingOpen && (
                  <div className="border-t border-fab-border pt-3">
                    <p className="text-xs text-fab-dim font-medium mb-2">Resolve Winner</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={resolveIdx ?? ""}
                        onChange={(e) => setResolveIdx(e.target.value ? Number(e.target.value) : null)}
                        className="bg-fab-bg border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                      >
                        <option value="">Select winner...</option>
                        {pred.options.map((opt, i) => !opt.startsWith("[MERGED]") && (
                          <option key={i} value={i}>{opt}</option>
                        ))}
                      </select>
                      <button
                        onClick={async () => {
                          if (resolveIdx === null) return;
                          if (!confirm(`Resolve "${pred.options[resolveIdx]}" as the winner?`)) return;
                          setResolving(true);
                          try {
                            await resolvePrediction(pred.id!, resolveIdx);
                            const polls = await getAllPolls();
                            setAllPolls(polls);
                            setResolveIdx(null);
                          } catch {
                            alert("Resolve failed.");
                          } finally {
                            setResolving(false);
                          }
                        }}
                        disabled={resolving || resolveIdx === null}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fab-win/20 text-fab-win hover:bg-fab-win/30 transition-colors disabled:opacity-50"
                      >
                        {resolving ? "Resolving..." : "Resolve"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Grant achievements */}
                {pred.resolvedAt && pred.correctOptionIndex !== undefined && pred.correctOptionIndex !== null && (
                  <div className="border-t border-fab-border pt-3">
                    <p className="text-xs text-fab-dim font-medium mb-2">
                      Winner: <span className="text-green-400">{pred.options[pred.correctOptionIndex]}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          setGranting(true);
                          setGrantResult(null);
                          try {
                            const result = await grantPredictionAchievements(pred.id!, pred.correctOptionIndex!);
                            setGrantResult(result);
                          } catch {
                            alert("Failed to grant achievements.");
                          } finally {
                            setGranting(false);
                          }
                        }}
                        disabled={granting}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                      >
                        {granting ? "Granting..." : "Grant Achievements"}
                      </button>
                      {grantResult && (
                        <span className="text-xs text-fab-dim">
                          {grantResult.granted} granted, {grantResult.alreadyHad} already had
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Poll History */}
          {allPolls.length > 0 && (
            <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-fab-border">
                <h2 className="text-sm font-semibold text-fab-text">Poll History ({allPolls.length})</h2>
              </div>
              <div className="divide-y divide-fab-border">
                {allPolls.map((p) => {
                  const isExpanded = expandedPollId === p.id;
                  return (
                    <div key={p.id}>
                      <button
                        onClick={async () => {
                          if (isExpanded) {
                            setExpandedPollId(null);
                            setExpandedPollResults(null);
                            setExpandedPollVoters([]);
                            setExpandedOption(null);
                          } else {
                            setExpandedPollId(p.id!);
                            setExpandedOption(null);
                            const [res, voters] = await Promise.all([
                              getPollResults(p.id!),
                              getPollVoters(p.id!),
                            ]);
                            setExpandedPollResults(res);
                            setExpandedPollVoters(voters);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-fab-bg/50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-fab-text truncate">{p.question}</p>
                          <p className="text-[10px] text-fab-dim">{new Date(p.createdAt).toLocaleDateString()}</p>
                        </div>
                        {p.type === "prediction" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-400 shrink-0">Prediction</span>
                        )}
                        {p.active && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-fab-win/20 text-fab-win shrink-0">Active</span>
                        )}
                        <svg
                          className={`w-4 h-4 text-fab-dim group-hover:text-fab-muted transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3">
                          {/* Actions for active poll */}
                          {p.active && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={async () => {
                                  await removePoll(p.id!);
                                  const polls = await getAllPolls();
                                  setAllPolls(polls);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fab-loss/20 text-fab-loss hover:bg-fab-loss/30 transition-colors"
                              >
                                Deactivate
                              </button>
                              <label className="flex items-center gap-2 cursor-pointer ml-auto">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const next = !p.showResults;
                                    await savePoll({ ...p, showResults: next });
                                    const polls = await getAllPolls();
                                    setAllPolls(polls);
                                  }}
                                  className={`relative w-9 h-5 rounded-full transition-colors ${p.showResults ? "bg-fab-win" : "bg-fab-border"}`}
                                >
                                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${p.showResults ? "translate-x-4" : ""}`} />
                                </button>
                                <span className="text-xs text-fab-muted">Show results</span>
                              </label>
                            </div>
                          )}

                          {/* Results */}
                          {expandedPollResults && (
                            <div>
                              <p className="text-xs text-fab-dim font-medium mb-2">Results ({expandedPollResults.total} vote{expandedPollResults.total !== 1 ? "s" : ""})</p>
                              {p.options.map((opt, i) => {
                                const count = expandedPollResults.counts[i] || 0;
                                const pct = expandedPollResults.total > 0 ? (count / expandedPollResults.total * 100) : 0;
                                const optionVoters = expandedPollVoters
                                  .filter((v) => v.optionIndex === i)
                                  .sort((a, b) => new Date(b.votedAt).getTime() - new Date(a.votedAt).getTime());
                                const isOptionExpanded = expandedOption === i;
                                return (
                                  <div key={i} className="mb-1.5">
                                    <button
                                      onClick={() => setExpandedOption(isOptionExpanded ? null : i)}
                                      className="w-full flex items-center gap-2 group"
                                    >
                                      <span className="text-xs text-fab-text w-32 truncate text-left">{opt}</span>
                                      <div className="flex-1 bg-fab-bg rounded-full h-2 overflow-hidden">
                                        <div className="bg-fab-gold h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                      </div>
                                      <span className="text-xs text-fab-dim w-20 text-right">{count} ({pct.toFixed(0)}%)</span>
                                      <svg
                                        className={`w-3 h-3 text-fab-dim group-hover:text-fab-muted transition-transform ${isOptionExpanded ? "rotate-180" : ""}`}
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>
                                    {isOptionExpanded && optionVoters.length > 0 && (
                                      <div className="ml-2 mt-1 mb-2 border-l border-fab-border pl-3 max-h-40 overflow-y-auto">
                                        {optionVoters.map((v) => {
                                          const u = data?.users.find((u) => u.uid === v.userId);
                                          return (
                                            <div key={v.userId} className="flex items-center gap-2 py-1">
                                              {u?.photoUrl ? (
                                                <img src={u.photoUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                                              ) : (
                                                <div className="w-4 h-4 rounded-full bg-fab-bg border border-fab-border flex items-center justify-center text-fab-gold text-[8px] font-bold">
                                                  {u?.displayName?.charAt(0).toUpperCase() || "?"}
                                                </div>
                                              )}
                                              <Link
                                                href={`/player/${u?.username || v.userId}`}
                                                className="text-[11px] text-fab-text hover:text-fab-gold transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {u ? `@${u.username}` : v.userId.slice(0, 8)}
                                              </Link>
                                              <span className="text-[10px] text-fab-dim ml-auto">
                                                {new Date(v.votedAt).toLocaleDateString()}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {isOptionExpanded && optionVoters.length === 0 && (
                                      <p className="ml-2 mt-1 mb-2 pl-3 text-[11px] text-fab-dim">No votes</p>
                                    )}
                                  </div>
                                );
                              })}
                              <button
                                onClick={async () => {
                                  if (confirm("Clear all votes? This cannot be undone.")) {
                                    await clearVotes(p.id!);
                                    setExpandedPollResults({ counts: [], total: 0 });
                                    setExpandedPollVoters([]);
                                  }
                                }}
                                className="mt-2 text-xs text-fab-loss hover:text-fab-loss/80 transition-colors"
                              >
                                Clear Votes
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          </>}

          {/* ── Tools Tab: Broadcast ── */}
          {activeTab === "tools" && <>
          {/* Broadcast Message */}
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-fab-border">
              <h2 className="text-sm font-semibold text-fab-text">Broadcast Message</h2>
              <p className="text-xs text-fab-dim mt-0.5">Send a message to all users. Appears in their inbox and as a notification.</p>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="Type your message here..."
                rows={3}
                disabled={broadcasting}
                className="w-full bg-fab-bg border border-fab-border text-fab-text text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold resize-none disabled:opacity-50"
              />
              <div className="flex items-center justify-between">
                <div className="text-xs text-fab-dim">
                  {broadcastProgress && <span>{broadcastProgress}</span>}
                  {broadcastResult && <span className={broadcastResult.includes("failed") ? "text-fab-loss" : "text-fab-win"}>{broadcastResult}</span>}
                </div>
                <button
                  onClick={async () => {
                    if (!profile || !broadcastText.trim()) return;
                    setBroadcasting(true);
                    setBroadcastProgress("Starting...");
                    setBroadcastResult("");
                    try {
                      const targets = data!.users
                        .filter((u) => u.uid !== profile.uid)
                        .map((u) => ({ uid: u.uid, displayName: u.displayName, photoUrl: u.photoUrl, username: u.username }));
                      const { sent, failed } = await broadcastMessage(
                        profile,
                        targets,
                        broadcastText.trim(),
                        (done, total) => setBroadcastProgress(`Sending... ${done}/${total} users`)
                      );
                      setBroadcastProgress("");
                      setBroadcastResult(`Sent to ${sent} users${failed > 0 ? `, ${failed} failed` : ""}`);
                      setBroadcastText("");
                    } catch {
                      setBroadcastProgress("");
                      setBroadcastResult("Broadcast failed");
                    } finally {
                      setBroadcasting(false);
                    }
                  }}
                  disabled={broadcasting || !broadcastText.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
                >
                  {broadcasting ? "Sending..." : "Send to All Users"}
                </button>
              </div>
            </div>
          </div>
          </>}
        </>
      ) : null}
    </div>
  );
}

function UserExpandedStats({ user: u, assignedBadgeIds, isMuted, onAssignBadge, onRevokeBadge, onToggleMute }: {
  user: AdminUserStats;
  assignedBadgeIds: string[];
  isMuted: boolean;
  onAssignBadge: (badgeId: string, notify: boolean) => Promise<void>;
  onRevokeBadge: (badgeId: string) => Promise<void>;
  onToggleMute: () => Promise<void>;
}) {
  const hasStats = u.winRate !== undefined;
  const unassigned = ADMIN_BADGES.filter((b) => !assignedBadgeIds.includes(b.id));
  const [notifyUser, setNotifyUser] = useState(true);
  const rarityColor: Record<string, string> = {
    legendary: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    epic: "text-purple-400 bg-purple-400/10 border-purple-400/30",
    rare: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    uncommon: "text-green-400 bg-green-400/10 border-green-400/30",
    common: "text-fab-dim bg-fab-surface border-fab-border",
  };

  return (
    <div className="space-y-3">
      {hasStats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-fab-muted">Win Rate</div>
              <div className={`text-lg font-bold ${(u.winRate ?? 0) >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                {u.winRate?.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-fab-muted">Record</div>
              <div className="text-lg font-bold text-fab-text">
                {u.totalWins}W - {u.totalLosses}L{(u.totalDraws ?? 0) > 0 ? ` - ${u.totalDraws}D` : ""}
              </div>
            </div>
            <div>
              <div className="text-xs text-fab-muted">Current Streak</div>
              <div className={`text-lg font-bold ${
                u.currentStreakType === "win" ? "text-fab-win" : u.currentStreakType === "loss" ? "text-fab-loss" : "text-fab-dim"
              }`}>
                {u.currentStreakCount ?? 0} {u.currentStreakType === "win" ? "W" : u.currentStreakType === "loss" ? "L" : "--"}
              </div>
            </div>
            <div>
              <div className="text-xs text-fab-muted">Best Win Streak</div>
              <div className="text-lg font-bold text-fab-win">{u.longestWinStreak ?? 0}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-fab-muted">Top Hero</div>
              <div className="text-sm font-semibold text-fab-text">
                {u.topHero ?? "--"}{u.topHeroMatches ? ` (${u.topHeroMatches})` : ""}
              </div>
            </div>
            <div>
              <div className="text-xs text-fab-muted">Events</div>
              <div className="text-sm font-semibold text-fab-text">
                {u.eventsPlayed ?? 0} played, {u.eventWins ?? 0} won
              </div>
            </div>
            <div>
              <div className="text-xs text-fab-muted">Rated</div>
              <div className="text-sm font-semibold text-fab-text">
                {u.ratedMatches ?? 0} matches{u.ratedMatches ? `, ${u.ratedWinRate?.toFixed(1)}% WR` : ""}
              </div>
            </div>
            <div>
              <div className="text-xs text-fab-muted">Last Updated</div>
              <div className="text-sm text-fab-dim">
                {u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : "--"}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-sm text-fab-dim">No leaderboard data yet. Stats sync when user visits their dashboard.</div>
      )}
      {/* Badges */}
      <div className="border-t border-fab-border/50 pt-3">
        <div className="text-xs text-fab-muted mb-2">Badges</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {assignedBadgeIds.map((id) => {
            const badge = ADMIN_BADGES.find((b) => b.id === id);
            if (!badge) return null;
            return (
              <span
                key={id}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border ${rarityColor[badge.rarity]}`}
              >
                {badge.name}
                <button
                  onClick={(e) => { e.stopPropagation(); onRevokeBadge(id); }}
                  className="ml-0.5 hover:opacity-70"
                  title="Remove badge"
                >
                  x
                </button>
              </span>
            );
          })}
          {unassigned.length > 0 && (
            <>
              <select
                className="text-[11px] bg-fab-bg border border-fab-border rounded px-2 py-1 text-fab-text"
                value=""
                onChange={(e) => { if (e.target.value) onAssignBadge(e.target.value, notifyUser); }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">+ Add badge</option>
                {unassigned.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.rarity})</option>
                ))}
              </select>
              <label className="inline-flex items-center gap-1 text-[11px] text-fab-muted cursor-pointer" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={notifyUser}
                  onChange={(e) => setNotifyUser(e.target.checked)}
                  className="accent-fab-gold w-3 h-3"
                />
                Notify
              </label>
            </>
          )}
          {assignedBadgeIds.length === 0 && unassigned.length === 0 && (
            <span className="text-[11px] text-fab-dim">All badges assigned</span>
          )}
        </div>
      </div>

      {/* Mute from event wall */}
      <div className="border-t border-fab-border/50 pt-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-fab-muted">Event Wall</span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
            className={`text-[11px] px-2 py-1 rounded font-medium transition-colors ${
              isMuted
                ? "bg-fab-loss/15 text-fab-loss hover:bg-fab-loss/25"
                : "bg-fab-dim/10 text-fab-muted hover:bg-fab-dim/20"
            }`}
          >
            {isMuted ? "Unmute" : "Mute"}
          </button>
          {isMuted && (
            <span className="text-[10px] text-fab-loss italic">User is muted from event wall</span>
          )}
        </div>
      </div>

      <div className="pt-1">
        <Link
          href={`/player/${u.username}`}
          className="text-xs text-fab-gold hover:text-fab-gold-light"
          onClick={(e) => e.stopPropagation()}
        >
          View Profile →
        </Link>
      </div>
    </div>
  );
}

function MetricCard({ label, value, subtext, prefix, suffix, highlight }: { label: string; value: number | string; subtext?: string; prefix?: string; suffix?: string; highlight?: boolean }) {
  return (
    <div className={`bg-fab-surface border rounded-lg p-4 ${highlight ? "border-fab-win/30" : "border-fab-border"}`}>
      <div className={`text-2xl font-bold ${highlight ? "text-fab-win" : "text-fab-text"}`}>
        {prefix && <span className="text-sm text-fab-muted mr-0.5">{prefix}</span>}{typeof value === "number" ? value.toLocaleString() : value}{suffix && <span className="text-sm text-fab-muted ml-0.5">{suffix}</span>}
      </div>
      <div className="text-xs text-fab-muted mt-1">{label}</div>
      {subtext && <div className="text-[10px] text-fab-dim mt-0.5">{subtext}</div>}
    </div>
  );
}

const ROUTE_LABELS: Record<string, string> = {
  _home: "Home (/)",
  leaderboard: "Leaderboard",
  matches: "Matches",
  events: "Events",
  opponents: "Opponents",
  trends: "Trends",
  meta: "Meta",
  search: "Discover",
  import: "Import",
  settings: "Settings",
  login: "Login",
  changelog: "Changelog",
  admin: "Admin",
  favorites: "Favorites",
  inbox: "Inbox",
  privacy: "Privacy",
  feedback: "Feedback",
};

function ActivitySection({ analytics: initialAnalytics }: { analytics: { pageViews: Record<string, number>; creatorClicks: Record<string, number> } }) {
  const [expanded, setExpanded] = useState(true);
  const [profilesExpanded, setProfilesExpanded] = useState(false);
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>("all");
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [loadingRange, setLoadingRange] = useState(false);
  const [rangeError, setRangeError] = useState("");
  const fetchIdRef = useRef(0);

  // Fetch data whenever timeRange changes, with cancellation for rapid clicks
  useEffect(() => {
    if (timeRange === "all") {
      setAnalytics(initialAnalytics);
      setLoadingRange(false);
      setRangeError("");
      return;
    }
    let cancelled = false;
    const id = ++fetchIdRef.current;
    setLoadingRange(true);
    setRangeError("");
    getAnalytics(timeRange).then((data) => {
      if (!cancelled && id === fetchIdRef.current) {
        setAnalytics(data);
        setLoadingRange(false);
      }
    }).catch((err) => {
      console.error("Failed to fetch analytics for range:", timeRange, err);
      if (!cancelled && id === fetchIdRef.current) {
        setAnalytics({ pageViews: {}, creatorClicks: {} });
        setLoadingRange(false);
        setRangeError("Failed to load data for this range.");
      }
    });
    return () => { cancelled = true; };
  }, [timeRange, initialAnalytics]);

  // Separate player profile views from regular page views
  const playerEntries: [string, number][] = [];
  const routeEntries: [string, number][] = [];
  for (const [key, count] of Object.entries(analytics.pageViews)) {
    if (key.startsWith("player_")) {
      playerEntries.push([key, count]);
    } else {
      routeEntries.push([key, count]);
    }
  }
  playerEntries.sort(([, a], [, b]) => b - a);
  const playerProfileTotal = playerEntries.reduce((sum, [, c]) => sum + c, 0);

  // Insert aggregated "Player Profiles" into route entries
  if (playerProfileTotal > 0) {
    routeEntries.push(["__player_profiles__", playerProfileTotal]);
  }
  routeEntries.sort(([, a], [, b]) => b - a);

  const totalPageViews = routeEntries.reduce((sum, [, count]) => sum + count, 0);

  const creatorClickEntries = Object.entries(analytics.creatorClicks)
    .sort(([, a], [, b]) => b - a);
  const totalCreatorClicks = creatorClickEntries.reduce((sum, [, count]) => sum + count, 0);

  function routeLabel(key: string): string {
    if (key === "__player_profiles__") return `Player Profiles (${playerEntries.length})`;
    return ROUTE_LABELS[key] || `/${key.replace(/_/g, "/")}`;
  }

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 border-b border-fab-border flex items-center justify-between group"
      >
        <h2 className="text-sm font-semibold text-fab-text">
          Page Activity
          <span className="text-fab-dim font-normal ml-2">
            ({totalPageViews.toLocaleString()} views{timeRange !== "all" ? ` in last ${timeRange === "1h" ? "hour" : timeRange === "12h" ? "12 hours" : timeRange === "24h" ? "24 hours" : "7 days"}` : ""})
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
        <div className="p-4">
          <div className="flex items-center gap-1 mb-4">
            {(["1h", "12h", "24h", "7d", "all"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  timeRange === range
                    ? "bg-fab-gold/20 text-fab-gold"
                    : "text-fab-muted hover:text-fab-text"
                }`}
              >
                {range === "all" ? "All Time" : range === "1h" ? "1 Hour" : range === "12h" ? "12 Hours" : range === "24h" ? "24 Hours" : "7 Days"}
              </button>
            ))}
            {loadingRange && <span className="text-xs text-fab-dim animate-pulse ml-2">Loading...</span>}
            {rangeError && <span className="text-xs text-red-400 ml-2">{rangeError}</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Route Views */}
            <div>
              <h3 className="text-xs text-fab-muted uppercase tracking-wider font-medium mb-3">Page Views</h3>
              <div className="space-y-1.5">
                {routeEntries.map(([route, count]) => {
                  const pct = totalPageViews > 0 ? (count / totalPageViews) * 100 : 0;
                  const isProfiles = route === "__player_profiles__";
                  return (
                    <div key={route}>
                      <div
                        className={`flex items-center gap-2 ${isProfiles ? "cursor-pointer" : ""}`}
                        onClick={isProfiles ? () => setProfilesExpanded(!profilesExpanded) : undefined}
                      >
                        <div className="w-32 text-xs text-fab-text truncate flex items-center gap-1" title={routeLabel(route)}>
                          {isProfiles && (
                            <svg
                              className={`w-3 h-3 text-fab-dim shrink-0 transition-transform ${profilesExpanded ? "rotate-90" : ""}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          )}
                          <span className="truncate">{routeLabel(route)}</span>
                        </div>
                        <div className="flex-1 h-4 bg-fab-bg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-fab-gold/30 rounded-full transition-all"
                            style={{ width: `${Math.max(pct, 1)}%` }}
                          />
                        </div>
                        <div className="w-16 text-right text-xs font-mono text-fab-dim">
                          {count.toLocaleString()}
                        </div>
                      </div>
                      {isProfiles && profilesExpanded && (
                        <div className="ml-4 mt-1 mb-1 space-y-1 border-l border-fab-border pl-3">
                          {playerEntries.map(([pKey, pCount]) => (
                            <div key={pKey} className="flex items-center gap-2">
                              <div className="w-28 text-[11px] text-fab-dim truncate" title={`/player/${pKey.slice(7)}`}>
                                {pKey.slice(7)}
                              </div>
                              <div className="flex-1 h-3 bg-fab-bg rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-fab-gold/20 rounded-full"
                                  style={{ width: `${Math.max((pCount / playerProfileTotal) * 100, 1)}%` }}
                                />
                              </div>
                              <div className="w-12 text-right text-[11px] font-mono text-fab-dim">
                                {pCount.toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {routeEntries.length === 0 && (
                  <p className="text-xs text-fab-dim">No page view data yet.</p>
                )}
              </div>
            </div>

            {/* Creator Clicks */}
            <div>
              <h3 className="text-xs text-fab-muted uppercase tracking-wider font-medium mb-3">
                Creator Link Clicks
                {totalCreatorClicks > 0 && (
                  <span className="text-fab-dim font-normal ml-2">({totalCreatorClicks.toLocaleString()} total)</span>
                )}
              </h3>
              <div className="space-y-1.5">
                {creatorClickEntries.map(([name, count]) => {
                  const pct = totalCreatorClicks > 0 ? (count / totalCreatorClicks) * 100 : 0;
                  return (
                    <div key={name} className="flex items-center gap-2">
                      <div className="w-32 text-xs text-fab-text truncate" title={name}>
                        {name}
                      </div>
                      <div className="flex-1 h-4 bg-fab-bg rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500/30 rounded-full transition-all"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                      <div className="w-16 text-right text-xs font-mono text-fab-dim">
                        {count.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
                {creatorClickEntries.length === 0 && (
                  <p className="text-xs text-fab-dim">No creator click data yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventPlayerRow({
  player,
  index,
  users,
  format,
  onChange,
  onRemove,
}: {
  player: FeaturedEventPlayer;
  index: number;
  users: AdminUserStats[];
  format: string;
  onChange: (p: FeaturedEventPlayer) => void;
  onRemove: () => void;
}) {
  const [nameQuery, setNameQuery] = useState("");
  const [heroQuery, setHeroQuery] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showHeroDropdown, setShowHeroDropdown] = useState(false);
  const [userHighlight, setUserHighlight] = useState(0);
  const [heroHighlight, setHeroHighlight] = useState(0);
  const userRef = React.useRef<HTMLDivElement>(null);
  const heroRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserDropdown(false);
      if (heroRef.current && !heroRef.current.contains(e.target as Node)) setShowHeroDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const userResults = nameQuery.trim()
    ? users.filter((u) =>
        u.displayName.toLowerCase().includes(nameQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(nameQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  const heroResults = heroQuery.trim()
    ? searchHeroes(heroQuery, format || undefined).slice(0, 8)
    : [];

  React.useEffect(() => { setUserHighlight(0); }, [nameQuery]);
  React.useEffect(() => { setHeroHighlight(0); }, [heroQuery]);

  function handleUserKeyDown(e: React.KeyboardEvent) {
    if (!showUserDropdown || userResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setUserHighlight((h) => Math.min(h + 1, userResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setUserHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && userResults[userHighlight]) {
      e.preventDefault();
      const u = userResults[userHighlight];
      onChange({ ...player, name: u.displayName, username: u.username });
      setNameQuery(u.displayName);
      setShowUserDropdown(false);
    } else if (e.key === "Escape") {
      setShowUserDropdown(false);
    }
  }

  function handleHeroKeyDown(e: React.KeyboardEvent) {
    if (!showHeroDropdown || heroResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHeroHighlight((h) => Math.min(h + 1, heroResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHeroHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && heroResults[heroHighlight]) {
      e.preventDefault();
      const h = heroResults[heroHighlight];
      onChange({ ...player, hero: h.name });
      setHeroQuery(h.name);
      setShowHeroDropdown(false);
    } else if (e.key === "Escape") {
      setShowHeroDropdown(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-fab-dim w-5 text-right shrink-0">{index + 1}.</span>

      {/* Player name with autocomplete */}
      <div ref={userRef} className="relative flex-1">
        <input
          type="text"
          placeholder="Player name"
          value={showUserDropdown ? nameQuery : player.name}
          onChange={(e) => {
            setNameQuery(e.target.value);
            setShowUserDropdown(true);
            onChange({ ...player, name: e.target.value, username: undefined });
          }}
          onFocus={() => {
            setNameQuery(player.name);
            if (player.name) setShowUserDropdown(true);
          }}
          onBlur={() => {
            setTimeout(() => {
              if (!player.username && nameQuery.trim()) {
                onChange({ ...player, name: nameQuery.trim() });
              }
            }, 200);
          }}
          onKeyDown={handleUserKeyDown}
          className="w-full bg-fab-surface border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
        />
        {player.username && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-fab-gold">@{player.username}</span>
        )}
        {showUserDropdown && userResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-fab-surface border border-fab-border rounded shadow-lg">
            {userResults.map((u, ui) => (
              <button
                key={u.uid}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ ...player, name: u.displayName, username: u.username });
                  setNameQuery(u.displayName);
                  setShowUserDropdown(false);
                }}
                className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                  ui === userHighlight ? "bg-fab-gold/15 text-fab-gold" : "hover:bg-fab-surface-hover"
                }`}
              >
                {u.photoUrl ? (
                  <img src={u.photoUrl} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-[10px] font-bold">
                    {u.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-fab-text">{u.displayName}</span>
                <span className="text-fab-dim">@{u.username}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hero with autocomplete */}
      <div ref={heroRef} className="relative w-36 shrink-0">
        <input
          type="text"
          placeholder="Hero"
          value={showHeroDropdown ? heroQuery : (player.hero || "")}
          onChange={(e) => {
            setHeroQuery(e.target.value);
            setShowHeroDropdown(true);
            onChange({ ...player, hero: e.target.value || undefined });
          }}
          onFocus={() => {
            setHeroQuery(player.hero || "");
            if (player.hero) setShowHeroDropdown(true);
          }}
          onKeyDown={handleHeroKeyDown}
          className="w-full bg-fab-surface border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
        />
        {showHeroDropdown && heroResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-56 max-h-48 overflow-y-auto bg-fab-surface border border-fab-border rounded shadow-lg">
            {heroResults.map((h, hi) => (
              <button
                key={h.name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ ...player, hero: h.name });
                  setHeroQuery(h.name);
                  setShowHeroDropdown(false);
                }}
                className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                  hi === heroHighlight ? "bg-fab-gold/15 text-fab-gold" : "hover:bg-fab-surface-hover"
                }`}
              >
                <span className="font-medium text-fab-text">{h.name}</span>
                <span className="text-fab-dim">{h.classes.join(" / ")}{h.young ? " (Young)" : ""}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onRemove}
        className="text-fab-loss hover:text-fab-loss/80 transition-colors shrink-0"
        title="Remove player"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

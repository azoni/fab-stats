"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminDashboardData, getDeletedAccountCount, backfillLeaderboard, backfillPlacementFeedEvents, backfillDay2, broadcastMessage, fixMatchDates, backfillGemIds, backfillMatchLinking, backfillH2H, backfillHeroMatchups, adminGetUserEvents, adminOverrideEventType, adminResyncLeaderboard, type AdminDashboardData, type AdminUserStats, type AdminEventSummary } from "@/lib/admin";
import { getAllFeedback, updateFeedbackStatus } from "@/lib/feedback";
import { getOrCreateConversation, sendMessage, sendMessageNotification } from "@/lib/messages";
import { getAnalytics, getDailyPageViewTrend, getImportMethodStats, getPageViews, type PageViewTimeRange } from "@/lib/analytics";
import { syncProfileBackgroundCatalogFromDefaults } from "@/lib/profile-background-catalog";
import { getBanner, saveBanner, type BannerConfig } from "@/lib/banner";
import { searchUsernames } from "@/lib/firestore-storage";
import { forceAddMember, searchTeams } from "@/lib/teams";
import { getAllBadgeAssignments, assignBadge, revokeBadge } from "@/lib/badge-service";
import { getMutedUserIds, muteUser, unmuteUser } from "@/lib/mute-service";
import { getSeasons, saveSeasons, slugify } from "@/lib/seasons";
import { getDefaultTheme, saveDefaultTheme, resetAllUserThemes, THEME_OPTIONS, type ThemeName } from "@/lib/theme-config";
import { loadBotAnalytics, loadDailyUsage, loadCommandLog, type BotAnalytics, type DailyUsage, type CommandLogEntry } from "@/lib/discord-analytics";
import { ADMIN_BADGES } from "@/lib/badges";
import { BackgroundCatalogManager } from "@/components/admin/BackgroundCatalogManager";
import { EventTypeManager } from "@/components/admin/EventTypeManager";
import { PageHero } from "@/components/ui/PageHero";
import { GameFormat } from "@/types";
import type { Season } from "@/types";
import type { FeedbackItem, UserProfile } from "@/types";

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
const USERS_PAGE_SIZE = 50;

export default function AdminPage() {
  const { user, profile, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastActive");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "public" | "private">("all");
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<"all" | "new" | "reviewed" | "done">("new");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replySent, setReplySent] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState("");
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState("");
  const [broadcastResult, setBroadcastResult] = useState("");
  const [analyticsData, setAnalyticsData] = useState<{ pageViews: Record<string, number>; creatorClicks: Record<string, number>; supportClicks: Record<string, number> } | null>(null);
  const [supportClicks24h, setSupportClicks24h] = useState<Record<string, number>>({});
  const [supportClicks7d, setSupportClicks7d] = useState<Record<string, number>>({});
  const [importMethods, setImportMethods] = useState<Record<string, number>>({});
  const [fixingDates, setFixingDates] = useState(false);
  const [fixDatesProgress, setFixDatesProgress] = useState("");
  const [linkingMatches, setLinkingMatches] = useState(false);
  const [linkProgress, setLinkProgress] = useState("");
  const [backfillingGemIds, setBackfillingGemIds] = useState(false);
  const [gemIdProgress, setGemIdProgress] = useState("");
  const [resyncingH2H, setResyncingH2H] = useState(false);
  const [h2hProgress, setH2hProgress] = useState("");
  const [backfillingMatchups, setBackfillingMatchups] = useState(false);
  const [matchupProgress, setMatchupProgress] = useState("");
  const [backfillingPlacements, setBackfillingPlacements] = useState(false);
  const [placementProgress, setPlacementProgress] = useState("");
  const [backfillingDay2, setBackfillingDay2] = useState(false);
  const [day2Progress, setDay2Progress] = useState("");
  const [syncingBackgroundCatalog, setSyncingBackgroundCatalog] = useState(false);
  const [backgroundCatalogProgress, setBackgroundCatalogProgress] = useState("");
  const [buildingHistorical, setBuildingHistorical] = useState(false);
  const [historicalProgress, setHistoricalProgress] = useState("");
  const [gemIdCount, setGemIdCount] = useState<number | null>(null);
  const [bannerText, setBannerText] = useState("");
  const [bannerActive, setBannerActive] = useState(false);
  const [bannerType, setBannerType] = useState<BannerConfig["type"]>("info");
  const [bannerScope, setBannerScope] = useState<BannerConfig["scope"]>("all");
  const [bannerLink, setBannerLink] = useState("");
  const [bannerLinkText, setBannerLinkText] = useState("");
  const [bannerLinkNewTab, setBannerLinkNewTab] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  const [bannerSaved, setBannerSaved] = useState(false);
  // Seasons
  const [seasonsList, setSeasonsList] = useState<Season[]>([]);
  const [savingSeasons, setSavingSeasons] = useState(false);
  const [seasonsSaved, setSeasonsSaved] = useState(false);
  // Default theme
  const [defaultTheme, setDefaultTheme] = useState<ThemeName>("rosetta");
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);
  const [resettingThemes, setResettingThemes] = useState(false);
  const [themesReset, setThemesReset] = useState(false);
  const [badgeAssignments, setBadgeAssignments] = useState<Record<string, string[]>>({});
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  const [deletedAccounts, setDeletedAccounts] = useState(0);
  // Discord bot analytics
  const [botAnalytics, setBotAnalytics] = useState<BotAnalytics | null>(null);
  const [botDaily, setBotDaily] = useState<DailyUsage[]>([]);
  const [botLog, setBotLog] = useState<CommandLogEntry[]>([]);
  const [botLoading, setBotLoading] = useState(false);
  // Force-add to team
  const [forceAddUserSearch, setForceAddUserSearch] = useState("");
  const [forceAddUserResults, setForceAddUserResults] = useState<{ username: string; userId: string }[]>([]);
  const [forceAddSelectedUser, setForceAddSelectedUser] = useState<{ username: string; userId: string } | null>(null);
  const [forceAddTeamSearch, setForceAddTeamSearch] = useState("");
  const [forceAddTeamResults, setForceAddTeamResults] = useState<{ teamId: string; name: string; nameLower: string }[]>([]);
  const [forceAddSelectedTeam, setForceAddSelectedTeam] = useState<{ teamId: string; name: string } | null>(null);
  const [forceAdding, setForceAdding] = useState(false);
  const [forceAddResult, setForceAddResult] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const anyToolRunning = fixingDates || backfilling || backfillingGemIds || linkingMatches || resyncingH2H || backfillingMatchups || backfillingPlacements || backfillingDay2 || syncingBackgroundCatalog || buildingHistorical;
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "feedback" | "content" | "tools" | "discord" | "games">(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (["overview", "users", "feedback", "content", "tools", "discord", "games"].includes(hash)) return hash as any;
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
      const [result, fb, analytics, bannerData, badges, muted, themeDefault, seasonsData, deletedCount, importMethodData] = await Promise.all([getAdminDashboardData(), getAllFeedback(), getAnalytics(), getBanner(), getAllBadgeAssignments(), getMutedUserIds(), getDefaultTheme(), getSeasons(), getDeletedAccountCount(), getImportMethodStats()]);
      setData(result);
      setDeletedAccounts(deletedCount);
      setFeedback(fb);
      setAnalyticsData(analytics);
      setImportMethods(importMethodData);
      // Lazy-load 24h/7d support click stats (93 fewer Firestore reads on initial load)
      Promise.all([getAnalytics("24h"), getAnalytics("7d")]).then(([sc24h, sc7d]) => {
        setSupportClicks24h(sc24h.supportClicks);
        setSupportClicks7d(sc7d.supportClicks);
      }).catch(() => {});
      // Lazy-load GEM ID count
      import("firebase/firestore").then(({ collection: col, getCountFromServer: getCount }) =>
        import("@/lib/firebase").then(({ db: fireDb }) =>
          getCount(col(fireDb, "gemIds")).then((snap) => setGemIdCount(snap.data().count)).catch(() => {})
        )
      );
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
        setBannerLinkNewTab(bannerData.linkNewTab ?? false);
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

  // Lazy-load Discord bot analytics when tab is opened
  useEffect(() => {
    if (activeTab !== "discord" || botAnalytics || botLoading) return;
    setBotLoading(true);
    Promise.all([loadBotAnalytics(), loadDailyUsage(30), loadCommandLog(50)])
      .then(([analytics, daily, log]) => {
        setBotAnalytics(analytics);
        setBotDaily(daily);
        setBotLog(log);
      })
      .finally(() => setBotLoading(false));
  }, [activeTab, botAnalytics, botLoading]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch, statusFilter, sortKey, sortDir]);

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

  const userQuery = userSearch.trim().toLowerCase();
  const filteredUsers = data
    ? sortedUsers(data.users)
        .filter((u) => statusFilter === "all" ? true : statusFilter === "public" ? u.isPublic : !u.isPublic)
        .filter((u) => {
          if (!userQuery) return true;
          return (
            u.username.toLowerCase().includes(userQuery) ||
            u.displayName.toLowerCase().includes(userQuery) ||
            u.uid.toLowerCase().includes(userQuery)
          );
        })
    : [];
  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE));
  const userCurrentPage = Math.min(userPage, userTotalPages);
  const paginatedUsers = filteredUsers.slice((userCurrentPage - 1) * USERS_PAGE_SIZE, userCurrentPage * USERS_PAGE_SIZE);
  const userPageStart = filteredUsers.length === 0 ? 0 : (userCurrentPage - 1) * USERS_PAGE_SIZE + 1;
  const userPageEnd = Math.min(userCurrentPage * USERS_PAGE_SIZE, filteredUsers.length);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHero
        eyebrow="Operations"
        title="Admin Dashboard"
        description="A lighter control room for users, content, feedback, analytics, and maintenance jobs."
        actions={(
          <div className="flex items-center gap-2">
            <Link
              href="/admin/ai"
              className="inline-flex min-h-10 items-center rounded-md border border-fab-gold/40 bg-fab-gold/10 px-4 text-sm font-semibold text-fab-gold hover:bg-fab-gold/20"
            >
              🧠 AI Assistant
            </Link>
            <Link
              href="/admin/sandbox"
              className="inline-flex min-h-10 items-center rounded-md border border-purple-500/40 bg-purple-500/10 px-4 text-sm font-semibold text-purple-200 hover:bg-purple-500/20"
            >
              🧪 Import Sandbox
            </Link>
            <button
              onClick={fetchData}
              disabled={fetching}
              className="inline-flex min-h-10 items-center rounded-md border border-fab-border bg-fab-bg px-4 text-sm font-semibold text-fab-text hover:border-fab-gold/40 disabled:opacity-50"
            >
              {fetching ? "Loading..." : "Refresh"}
            </button>
          </div>
        )}
        metrics={data ? [
          { label: "Users", value: data.totalUsers },
          { label: "Matches", value: data.totalMatches.toLocaleString() },
          { label: "Feedback", value: feedback.filter((f) => f.status === "new").length, sub: "new" },
          { label: "Tab", value: activeTab },
        ] : undefined}
      />

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-fab-border bg-fab-surface/90 p-1">
        {([
          { id: "overview", label: "Overview" },
          { id: "users", label: "Users" },
          { id: "feedback", label: "Feedback", badge: feedback.filter((f) => f.status === "new").length },
          { id: "content", label: "Content" },
          { id: "games", label: "Games" },
          { id: "discord", label: "Discord Bot" },
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
            <button
              onClick={async () => {
                setBackfillingMatchups(true);
                setMatchupProgress("Starting...");
                try {
                  const { usersProcessed, matchesCounted, failed } = await backfillHeroMatchups((done, total, msg) => {
                    setMatchupProgress(`${done}/${total} — ${msg}`);
                  });
                  setMatchupProgress(`Done: ${usersProcessed} users, ${matchesCounted} matches${failed > 0 ? `, ${failed} failed` : ""}`);
                } catch {
                  setMatchupProgress("Hero matchup backfill failed");
                } finally {
                  setBackfillingMatchups(false);
                }
              }}
              disabled={anyToolRunning}
              className="px-3 py-1.5 rounded text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold transition-colors disabled:opacity-50"
            >
              {backfillingMatchups ? "Backfilling..." : "Backfill Matchups"}
            </button>
            <button
              onClick={async () => {
                setBackfillingPlacements(true);
                setPlacementProgress("Starting...");
                try {
                  const { created, skipped, failed } = await backfillPlacementFeedEvents((done, total) => {
                    setPlacementProgress(`${done}/${total} users`);
                  });
                  setPlacementProgress(`Done: ${created} created, ${skipped} skipped, ${failed} failed`);
                } catch {
                  setPlacementProgress("Placement backfill failed");
                } finally {
                  setBackfillingPlacements(false);
                }
              }}
              disabled={anyToolRunning}
              className="px-3 py-1.5 rounded text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold transition-colors disabled:opacity-50"
            >
              {backfillingPlacements ? "Backfilling..." : "Backfill Placements"}
            </button>
            <button
              onClick={async () => {
                setBackfillingDay2(true);
                setDay2Progress("Starting...");
                try {
                  const { usersUpdated, eventsFlagged, matchesFlagged, skipped, failed } = await backfillDay2((done, total) => {
                    setDay2Progress(`${done}/${total} users`);
                  });
                  setDay2Progress(`Done: ${usersUpdated} users, ${eventsFlagged} events, ${matchesFlagged} matches flagged · ${skipped} skipped, ${failed} failed`);
                } catch {
                  setDay2Progress("Day 2 backfill failed");
                } finally {
                  setBackfillingDay2(false);
                }
              }}
              disabled={anyToolRunning}
              className="px-3 py-1.5 rounded text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold transition-colors disabled:opacity-50"
            >
              {backfillingDay2 ? "Backfilling..." : "Backfill Day 2"}
            </button>
            <button
              onClick={async () => {
                setSyncingBackgroundCatalog(true);
                setBackgroundCatalogProgress("Starting...");
                try {
                  const { upserted } = await syncProfileBackgroundCatalogFromDefaults({
                    useStorageUrls: true,
                    onProgress: (done, total, id) => {
                      setBackgroundCatalogProgress(`${done}/${total} - ${id}`);
                    },
                  });
                  setBackgroundCatalogProgress(`Done: ${upserted} backgrounds synced`);
                } catch (err) {
                  setBackgroundCatalogProgress(`Background sync failed: ${err instanceof Error ? err.message : String(err)}`);
                } finally {
                  setSyncingBackgroundCatalog(false);
                }
              }}
              disabled={anyToolRunning}
              className="px-3 py-1.5 rounded text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold transition-colors disabled:opacity-50"
            >
              {syncingBackgroundCatalog ? "Syncing..." : "Sync Background Catalog"}
            </button>
            <button
              onClick={async () => {
                setBuildingHistorical(true);
                setHistoricalProgress("Building...");
                try {
                  const res = await fetch("/.netlify/functions/build-historical-events");
                  const data = await res.json();
                  if (data.error) {
                    setHistoricalProgress(`Error: ${data.error}`);
                  } else {
                    setHistoricalProgress(`Done: ${data.eventsWritten} historical events written`);
                  }
                } catch (err) {
                  setHistoricalProgress(`Failed: ${err instanceof Error ? err.message : String(err)}`);
                } finally {
                  setBuildingHistorical(false);
                }
              }}
              disabled={anyToolRunning}
              className="px-3 py-1.5 rounded text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold transition-colors disabled:opacity-50"
            >
              {buildingHistorical ? "Building..." : "Build Historical Events"}
            </button>
          </div>
          {(historicalProgress || backgroundCatalogProgress || backfillProgress || fixDatesProgress || linkProgress || gemIdProgress || h2hProgress || matchupProgress || placementProgress || day2Progress) && (
            <p className="text-xs text-fab-dim">{historicalProgress || backgroundCatalogProgress || day2Progress || placementProgress || matchupProgress || h2hProgress || linkProgress || gemIdProgress || fixDatesProgress || backfillProgress}</p>
          )}

          <EventTypeManager />

          <BackgroundCatalogManager />
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
            const activeThisWeek = data.users.filter((u) => u.lastSiteVisit && (now - new Date(u.lastSiteVisit).getTime()) < 7 * 24 * 60 * 60_000).length;
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <MetricCard label="Online Now" value={onlineNow} subtext={`${activeToday} today · ${activeThisWeek} this week`} highlight />
                <MetricCard label="Total Users" value={data.totalUsers} />
                <MetricCard label="Active Players" value={activePlayers} subtext={`${data.totalUsers - activePlayers} with 0 matches`} />
                <MetricCard label="Public" value={publicUsers} subtext={`${privateUsers} private`} />
                <MetricCard label="Total Matches" value={data.totalMatches} subtext={`${avgMatches} avg per player`} />
                <MetricCard label="New (24h)" value={data.newUsersToday} />
                <MetricCard label="New (7d)" value={data.newUsersThisWeek} />
                <MetricCard label="New (30d)" value={data.newUsersThisMonth} />
                <MetricCard label="Avg Win Rate" value={(() => {
                  const withWr = data.users.filter((u) => u.winRate !== undefined && u.matchCount >= 10);
                  if (withWr.length === 0) return 0;
                  return Math.round((withWr.reduce((s, u) => s + (u.winRate ?? 0), 0) / withWr.length) * 10) / 10;
                })()} subtext="players with 10+ matches" suffix="%" />
                {deletedAccounts > 0 && <MetricCard label="Deleted Accounts" value={deletedAccounts} />}
                {gemIdCount !== null && <MetricCard label="GEM IDs Linked" value={gemIdCount} subtext={`${activePlayers > 0 ? Math.round((gemIdCount / activePlayers) * 100) : 0}% of active players`} />}
              </div>
            );
          })()}

          {analyticsData && <PageViewsSummary initialPageViews={analyticsData.pageViews} />}

          {/* Import Methods */}
          {Object.keys(importMethods).length > 0 && (() => {
            const methods = ["extension", "paste", "csv", "bookmarklet", "manual", "auto-sync"] as const;
            const totalMatches = methods.reduce((s, m) => s + (importMethods[m] || 0), 0);
            const totalImports = methods.reduce((s, m) => s + (importMethods[`${m}_count`] || 0), 0);
            return (
              <div className="bg-fab-surface border border-fab-border rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-fab-text mb-3">Import Methods</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {methods.map((m) => {
                    const matches = importMethods[m] || 0;
                    const imports = importMethods[`${m}_count`] || 0;
                    if (matches === 0 && imports === 0) return null;
                    const pct = totalMatches > 0 ? ((matches / totalMatches) * 100).toFixed(1) : "0";
                    return (
                      <div key={m} className="bg-fab-bg rounded-md px-3 py-2">
                        <p className="text-xs text-fab-dim capitalize">{m}</p>
                        <p className="text-sm font-bold text-fab-text">{matches.toLocaleString()} <span className="text-fab-dim font-normal">matches</span></p>
                        <p className="text-[10px] text-fab-muted">{imports} imports · {pct}%</p>
                      </div>
                    );
                  })}
                  <div className="bg-fab-bg rounded-md px-3 py-2">
                    <p className="text-xs text-fab-dim">Total</p>
                    <p className="text-sm font-bold text-fab-text">{totalMatches.toLocaleString()} <span className="text-fab-dim font-normal">matches</span></p>
                    <p className="text-[10px] text-fab-muted">{totalImports} imports</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Support & Affiliate */}
          {analyticsData && (() => {
            const sc = analyticsData.supportClicks;
            const totalClicks = Object.values(sc).reduce((s, v) => s + v, 0);
            const total24h = Object.values(supportClicks24h).reduce((s, v) => s + v, 0);
            const total7d = Object.values(supportClicks7d).reduce((s, v) => s + v, 0);
            const supportPageViews = analyticsData.pageViews["support"] || 0;
            const LABELS: Record<string, string> = {
              tcgplayer: "TCGplayer",
              github_sponsors: "GitHub Sponsors",
              kofi: "Ko-fi",
              discord: "Discord",
              twitter: "X / Twitter",
              navbar: "Nav Bar",
              mobile_tab: "Mobile Tab",
              fab: "Floating Button",
            };
            const sources = Object.entries(sc).sort(([, a], [, b]) => b - a);
            return (
              <div className="bg-fab-surface border border-fab-border rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-fab-text mb-3">Support & Affiliate</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-fab-bg rounded-md px-3 py-2">
                    <p className="text-xs text-fab-dim">Page Views</p>
                    <p className="text-sm font-bold text-fab-text">{supportPageViews.toLocaleString()}</p>
                    <p className="text-[10px] text-fab-muted">/support</p>
                  </div>
                  <div className="bg-fab-bg rounded-md px-3 py-2">
                    <p className="text-xs text-fab-dim">Total Clicks</p>
                    <p className="text-sm font-bold text-fab-text">{totalClicks.toLocaleString()}</p>
                    <div className="flex gap-2 mt-0.5">
                      <p className="text-[10px] text-fab-muted">24h: <span className="text-fab-text font-medium">{total24h.toLocaleString()}</span></p>
                      <p className="text-[10px] text-fab-muted">7d: <span className="text-fab-text font-medium">{total7d.toLocaleString()}</span></p>
                    </div>
                  </div>
                  {sources.map(([key, count]) => (
                    <div key={key} className="bg-fab-bg rounded-md px-3 py-2">
                      <p className="text-xs text-fab-dim">{LABELS[key] || key}</p>
                      <p className="text-sm font-bold text-fab-text">{count.toLocaleString()}</p>
                      <div className="flex gap-2 mt-0.5">
                        <p className="text-[10px] text-fab-muted">24h: <span className="text-fab-text font-medium">{(supportClicks24h[key] || 0).toLocaleString()}</span></p>
                        <p className="text-[10px] text-fab-muted">7d: <span className="text-fab-text font-medium">{(supportClicks7d[key] || 0).toLocaleString()}</span></p>
                      </div>
                    </div>
                  ))}
                  {totalClicks === 0 && sources.length === 0 && (
                    <div className="col-span-2 bg-fab-bg rounded-md px-3 py-2">
                      <p className="text-xs text-fab-dim">No click data yet</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Growth Charts */}
          <GrowthCharts users={data.users} />
          </>}

          {/* ── Users Tab ── */}
          {activeTab === "users" && <>
          {/* Users table */}
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-fab-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-fab-text">
                All Users ({filteredUsers.length.toLocaleString()}{filteredUsers.length !== data.users.length ? ` of ${data.users.length.toLocaleString()}` : ""})
              </h2>
              <div className="flex flex-col gap-2 sm:items-end">
                <input
                  type="search"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full sm:w-64 bg-fab-bg border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                />
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
                </div>
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
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-fab-dim text-sm">No users found.</td>
                    </tr>
                  ) : paginatedUsers.map((u, i) => {
                    const isExpanded = expandedUid === u.uid;
                    const rowNumber = (userCurrentPage - 1) * USERS_PAGE_SIZE + i + 1;
                    return (
                      <React.Fragment key={u.uid}>
                        <tr
                          className="border-b border-fab-border/50 hover:bg-fab-surface-hover transition-colors cursor-pointer"
                          onClick={() => setExpandedUid(isExpanded ? null : u.uid)}
                        >
                          <td className="px-4 py-2 text-fab-dim">{rowNumber}</td>
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
                            <td colSpan={9} className="px-4 py-3">
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
            {filteredUsers.length > USERS_PAGE_SIZE && (
              <div className="px-4 py-3 border-t border-fab-border flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-fab-dim">
                  Showing {userPageStart.toLocaleString()}-{userPageEnd.toLocaleString()} of {filteredUsers.length.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    disabled={userCurrentPage <= 1}
                    className="px-3 py-1.5 rounded text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold transition-colors disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-fab-muted">
                    Page {userCurrentPage} / {userTotalPages}
                  </span>
                  <button
                    onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}
                    disabled={userCurrentPage >= userTotalPages}
                    className="px-3 py-1.5 rounded text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold transition-colors disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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
                                        await updateFeedbackStatus(f.id, "reviewed", f);
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
                              await updateFeedbackStatus(f.id, newStatus, f);
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
                      await saveBanner({ text: bannerText, active: next, type: bannerType, scope: bannerScope, link: bannerLink || undefined, linkText: bannerLinkText || undefined, linkNewTab: bannerLinkNewTab });
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
                      await saveBanner({ text: bannerText, active: bannerActive, type: bannerType, scope: bannerScope, link: bannerLink || undefined, linkText: bannerLinkText || undefined, linkNewTab: bannerLinkNewTab });
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
                <label className="flex items-center gap-1 text-xs text-fab-muted cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={bannerLinkNewTab}
                    onChange={(e) => setBannerLinkNewTab(e.target.checked)}
                    className="accent-fab-gold"
                  />
                  New tab
                </label>
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
                      {s.showResults && <span className="text-[10px] text-fab-gold font-medium">(Results)</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-fab-dim">Active</span>
                        <button
                          type="button"
                          onClick={() => setSeasonsList((prev) => prev.map((s2, j) => j === i ? { ...s2, active: !s2.active } : s2))}
                          className={`relative w-8 h-4.5 rounded-full transition-colors ${s.active ? "bg-fab-win" : "bg-fab-border"}`}
                          title={s.active ? "Deactivate" : "Activate"}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${s.active ? "translate-x-3.5" : ""}`} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-fab-dim">Results</span>
                        <button
                          type="button"
                          onClick={() => setSeasonsList((prev) => prev.map((s2, j) => j === i ? { ...s2, showResults: !s2.showResults } : s2))}
                          className={`relative w-8 h-4.5 rounded-full transition-colors ${s.showResults ? "bg-fab-gold" : "bg-fab-border"}`}
                          title={s.showResults ? "Hide results" : "Show donut chart on homepage"}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${s.showResults ? "translate-x-3.5" : ""}`} />
                        </button>
                      </div>
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
                  <div className="mt-2">
                    <label className="text-[10px] text-fab-dim uppercase tracking-wider mb-0.5 block">Background Image URL</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="proquest-lasvegas.jpg"
                        value={s.backgroundImage || ""}
                        onChange={(e) => setSeasonsList((prev) => prev.map((s2, j) => j === i ? { ...s2, backgroundImage: e.target.value } : s2))}
                        className="flex-1 bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                      />
                      {s.backgroundImage && (
                        <div className="w-10 h-10 rounded border border-fab-border overflow-hidden shrink-0 bg-fab-surface">
                          <img src={s.backgroundImage.startsWith("http") || s.backgroundImage.startsWith("/") ? s.backgroundImage : `/seasons/${s.backgroundImage}`} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                  {s.id && <p className="text-[10px] text-fab-dim mt-1.5">ID: {s.id}</p>}
                </div>
              ))}
              <button
                onClick={() => setSeasonsList((prev) => [...prev, { id: "", name: "", startDate: "", endDate: "", format: "", eventType: "", active: false, backgroundImage: "", showResults: false }])}
                className="w-full py-2 rounded-lg text-sm font-medium border border-dashed border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors"
              >
                + Add Season
              </button>
            </div>
          </div>

          </>}

          {/* ── Discord Bot Tab ── */}
          {activeTab === "discord" && <>
          {botLoading ? (
            <div className="text-fab-muted text-sm animate-pulse py-8 text-center">Loading Discord bot data...</div>
          ) : !botAnalytics ? (
            <div className="bg-fab-surface border border-fab-border rounded-lg p-6 text-center">
              <p className="text-fab-muted text-sm mb-3">No Discord bot data yet. The bot needs to write analytics to Firestore.</p>
              <p className="text-xs text-fab-dim">Document path: <code className="text-fab-gold">admin/discord-bot</code></p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Invite Link */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-fab-muted">Invite link:</span>
                <code className="text-fab-gold bg-fab-bg px-2 py-1 rounded select-all">https://discord.com/oauth2/authorize?client_id=1478583612537573479&amp;permissions=0&amp;scope=bot+applications.commands</code>
                <button
                  onClick={() => { navigator.clipboard.writeText("https://discord.com/oauth2/authorize?client_id=1478583612537573479&permissions=0&scope=bot+applications.commands"); }}
                  className="px-2 py-1 rounded text-fab-muted hover:text-fab-text hover:bg-fab-surface transition-colors"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
              </div>
              {/* Bot Status */}
              {(() => {
                const hb = botAnalytics.heartbeat;
                const isOnline = hb && (Date.now() - hb.timestamp < 5 * 60_000);
                const uptimeStr = hb ? formatUptime(hb.uptimeMs) : "—";
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard
                      label="Bot Status"
                      value={isOnline ? "Online" : "Offline"}
                      subtext={hb ? `Ping: ${hb.ping}ms` : undefined}
                      highlight={!!isOnline}
                    />
                    <MetricCard label="Servers" value={hb?.serverCount ?? 0} subtext={`${(hb?.totalMembers ?? 0).toLocaleString()} total members`} />
                    <MetricCard label="Uptime" value={uptimeStr} />
                    <MetricCard label="Commands Run" value={botAnalytics.totalCommandCount ?? 0} subtext={`${botAnalytics.totalUniqueUsers ?? 0} unique users`} />
                  </div>
                );
              })()}

              {/* Servers List */}
              {botAnalytics.heartbeat?.servers?.length > 0 && (() => {
                // Build per-server command breakdown from the log
                const serverCmds: Record<string, Record<string, number>> = {};
                for (const entry of botLog) {
                  if (!entry.serverId) continue;
                  if (!serverCmds[entry.serverId]) serverCmds[entry.serverId] = {};
                  serverCmds[entry.serverId][entry.command] = (serverCmds[entry.serverId][entry.command] || 0) + 1;
                }
                // All-time per-server totals from analytics (more accurate than log-based)
                const serverTotals = botAnalytics.serverCommandCounts || {};
                return (
                  <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-fab-border">
                      <h2 className="text-sm font-semibold text-fab-text">Servers ({botAnalytics.heartbeat.servers.length})</h2>
                    </div>
                    <div className="divide-y divide-fab-border">
                      {[...botAnalytics.heartbeat.servers]
                        .sort((a, b) => (serverTotals[b.id] || 0) - (serverTotals[a.id] || 0) || b.memberCount - a.memberCount)
                        .map((s) => {
                          const allTimeTotal = serverTotals[s.id] || 0;
                          const cmds = serverCmds[s.id];
                          const cmdEntries = cmds ? Object.entries(cmds).sort(([, a], [, b]) => b - a) : [];
                          return (
                            <div key={s.id} className="px-4 py-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {s.icon ? (
                                    <img src={`https://cdn.discordapp.com/icons/${s.id}/${s.icon}.webp?size=32`} alt="" className="w-6 h-6 rounded-full" />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-fab-dim/20 flex items-center justify-center text-[10px] text-fab-muted font-bold">
                                      {s.name.charAt(0)}
                                    </div>
                                  )}
                                  <span className="text-sm text-fab-text">{s.name}</span>
                                  {allTimeTotal > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-fab-gold/10 text-fab-gold font-medium">
                                      {allTimeTotal} commands
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-fab-muted">
                                  {s.memberCount.toLocaleString()} members
                                  <span className="text-fab-dim ml-2">joined {new Date(s.joinedAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              {cmdEntries.length > 0 && (
                                <div className="mt-1.5 ml-9 flex flex-wrap gap-1.5">
                                  {cmdEntries.map(([cmd, count]) => (
                                    <span key={cmd} className="text-[10px] px-1.5 py-0.5 rounded bg-fab-bg text-fab-dim">
                                      /{cmd} <span className="text-fab-muted font-medium">{count}</span>
                                    </span>
                                  ))}
                                  <span className="text-[10px] text-fab-dim">(recent)</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })()}

              {/* Command Usage Breakdown */}
              {botAnalytics.totalCommands && Object.keys(botAnalytics.totalCommands).length > 0 && (
                <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-fab-border">
                    <h2 className="text-sm font-semibold text-fab-text">Command Usage (All Time)</h2>
                  </div>
                  <div className="p-4">
                    <div className="space-y-2">
                      {Object.entries(botAnalytics.totalCommands)
                        .sort(([, a], [, b]) => b - a)
                        .map(([cmd, count]) => {
                          const maxCount = Math.max(...Object.values(botAnalytics!.totalCommands));
                          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                          return (
                            <div key={cmd} className="flex items-center gap-3">
                              <code className="text-xs text-fab-gold w-28 shrink-0">/{cmd}</code>
                              <div className="flex-1 bg-fab-bg rounded-full h-4 overflow-hidden">
                                <div className="h-full bg-fab-gold/25 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-fab-muted w-12 text-right">{count.toLocaleString()}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* Daily Usage Chart (simple table) */}
              {botDaily.length > 0 && (
                <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-fab-border">
                    <h2 className="text-sm font-semibold text-fab-text">Daily Usage (Last {botDaily.length} days)</h2>
                  </div>
                  <div className="p-4">
                    {/* Mini bar chart */}
                    <div className="flex items-end gap-1 h-24 mb-3">
                      {botDaily.map((d) => {
                        const maxCmds = Math.max(...botDaily.map((x) => x.totalCommands), 1);
                        const h = (d.totalCommands / maxCmds) * 100;
                        return (
                          <div
                            key={d.date}
                            className="flex-1 bg-fab-gold/30 hover:bg-fab-gold/50 rounded-t transition-colors cursor-default group relative"
                            style={{ height: `${Math.max(h, 2)}%` }}
                            title={`${d.date}: ${d.totalCommands} commands, ${d.uniqueUsers} users`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[10px] text-fab-dim">
                      <span>{botDaily[0]?.date}</span>
                      <span>{botDaily[botDaily.length - 1]?.date}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Commands Log */}
              {botLog.length > 0 && (
                <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-fab-border">
                    <h2 className="text-sm font-semibold text-fab-text">Recent Commands</h2>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-fab-border">
                    {botLog.map((entry, i) => (
                      <div key={i} className="px-4 py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <code className="text-fab-gold">/{entry.command}</code>
                          {entry.args && <span className="text-fab-dim">{entry.args}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-fab-muted">
                          <span>{entry.username}</span>
                          <span className="text-fab-dim">{entry.serverName}</span>
                          <span className="text-fab-dim">{formatTimeAgo(entry.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          </>}

          {/* ── Tools Tab: Broadcast ── */}
          {activeTab === "games" && <GameAnalytics />}

          {activeTab === "tools" && <>
          {/* Force Add to Team */}
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-fab-border">
              <h2 className="text-sm font-semibold text-fab-text">Force Add to Team</h2>
              <p className="text-xs text-fab-dim mt-0.5">Add a user to a team directly. Removes them from their current team if needed.</p>
            </div>
            <div className="p-4 space-y-3">
              {/* User search */}
              <div>
                <label className="block text-xs text-fab-muted mb-1">User</label>
                {forceAddSelectedUser ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-fab-text">@{forceAddSelectedUser.username}</span>
                    <button onClick={() => setForceAddSelectedUser(null)} className="text-xs text-fab-dim hover:text-fab-muted">&times;</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={forceAddUserSearch}
                      onChange={async (e) => {
                        setForceAddUserSearch(e.target.value);
                        if (e.target.value.trim().length >= 2) {
                          const res = await searchUsernames(e.target.value, 5);
                          setForceAddUserResults(res);
                        } else {
                          setForceAddUserResults([]);
                        }
                      }}
                      placeholder="Search username..."
                      className="w-full bg-fab-bg border border-fab-border text-fab-text text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
                    />
                    {forceAddUserResults.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {forceAddUserResults.map((r) => (
                          <button
                            key={r.userId}
                            onClick={() => { setForceAddSelectedUser(r); setForceAddUserSearch(""); setForceAddUserResults([]); }}
                            className="block w-full text-left px-3 py-1.5 text-sm text-fab-text hover:bg-fab-bg rounded"
                          >
                            @{r.username}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              {/* Team search */}
              <div>
                <label className="block text-xs text-fab-muted mb-1">Team</label>
                {forceAddSelectedTeam ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-fab-text">{forceAddSelectedTeam.name}</span>
                    <button onClick={() => setForceAddSelectedTeam(null)} className="text-xs text-fab-dim hover:text-fab-muted">&times;</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={forceAddTeamSearch}
                      onChange={async (e) => {
                        setForceAddTeamSearch(e.target.value);
                        if (e.target.value.trim().length >= 2) {
                          const res = await searchTeams(e.target.value, 5);
                          setForceAddTeamResults(res);
                        } else {
                          setForceAddTeamResults([]);
                        }
                      }}
                      placeholder="Search team name..."
                      className="w-full bg-fab-bg border border-fab-border text-fab-text text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
                    />
                    {forceAddTeamResults.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {forceAddTeamResults.map((r) => (
                          <button
                            key={r.teamId}
                            onClick={() => { setForceAddSelectedTeam({ teamId: r.teamId, name: r.name }); setForceAddTeamSearch(""); setForceAddTeamResults([]); }}
                            className="block w-full text-left px-3 py-1.5 text-sm text-fab-text hover:bg-fab-bg rounded"
                          >
                            {r.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  {forceAddResult && <span className={forceAddResult.startsWith("Error") ? "text-fab-loss" : "text-fab-win"}>{forceAddResult}</span>}
                </div>
                <button
                  onClick={async () => {
                    if (!forceAddSelectedUser || !forceAddSelectedTeam) return;
                    setForceAdding(true);
                    setForceAddResult("");
                    try {
                      await forceAddMember(forceAddSelectedTeam.teamId, forceAddSelectedUser.userId);
                      // Auto-resync leaderboard so team badge appears immediately
                      try { await adminResyncLeaderboard(forceAddSelectedUser.userId); } catch { /* best effort */ }
                      setForceAddResult(`Added @${forceAddSelectedUser.username} to ${forceAddSelectedTeam.name}`);
                      setForceAddSelectedUser(null);
                      setForceAddSelectedTeam(null);
                    } catch (err) {
                      setForceAddResult(`Error: ${err instanceof Error ? err.message : "Failed"}`);
                    } finally {
                      setForceAdding(false);
                    }
                  }}
                  disabled={forceAdding || !forceAddSelectedUser || !forceAddSelectedTeam}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
                >
                  {forceAdding ? "Adding..." : "Force Add"}
                </button>
              </div>
            </div>
          </div>

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

// ── Game Analytics Component ──
const GAME_COLLECTIONS = [
  { id: "fabdoku", label: "FaBdoku", collection: "fabdoku-results" },
  { id: "crossword", label: "Crossword", collection: "crossword-results" },
  { id: "heroguesser", label: "Hero Guesser", collection: "heroguesser-results" },
  { id: "matchupmania", label: "Matchup Mania", collection: "matchupmania-results" },
  { id: "trivia", label: "Trivia", collection: "trivia-results" },
  { id: "timeline", label: "Timeline", collection: "timeline-results" },
  { id: "connections", label: "Connections", collection: "connections-results" },
  { id: "rampage", label: "Rhinar's Rampage", collection: "rhinarsrampage-results" },
  { id: "kayosknockout", label: "Kayo's Knockout", collection: "kayosknockout-results" },
  { id: "brutebrawl", label: "Brute Brawl", collection: "brutebrawl-results" },
  { id: "ninjacombo", label: "Katsu's Combo", collection: "ninjacombo-results" },
  { id: "shadowstrike", label: "Shadow Strike", collection: "shadowstrike-results" },
  { id: "bladedash", label: "Blade Dash", collection: "bladedash-results" },
] as const;

interface GameStats {
  id: string;
  label: string;
  today: number;
  todayWins: number;
  week: number;
  weekWins: number;
  total: number;
  totalWins: number;
  uniqueToday: number;
  uniqueWeek: number;
}

function GameAnalytics() {
  const [stats, setStats] = useState<GameStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGameStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-fab-muted text-sm animate-pulse py-8 text-center">Loading game analytics...</div>;
  }

  const totals = stats.reduce(
    (acc, g) => ({
      today: acc.today + g.today,
      todayWins: acc.todayWins + g.todayWins,
      week: acc.week + g.week,
      weekWins: acc.weekWins + g.weekWins,
      total: acc.total + g.total,
      totalWins: acc.totalWins + g.totalWins,
      uniqueToday: acc.uniqueToday + g.uniqueToday,
      uniqueWeek: acc.uniqueWeek + g.uniqueWeek,
    }),
    { today: 0, todayWins: 0, week: 0, weekWins: 0, total: 0, totalWins: 0, uniqueToday: 0, uniqueWeek: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Today", value: totals.today, sub: `${totals.uniqueToday} players` },
          { label: "This Week", value: totals.week, sub: `${totals.uniqueWeek} players` },
          { label: "All Time", value: totals.total, sub: `${totals.totalWins} wins` },
          { label: "Win Rate", value: totals.total ? `${((totals.totalWins / totals.total) * 100).toFixed(1)}%` : "–", sub: "all games" },
        ].map((card) => (
          <div key={card.label} className="bg-fab-surface border border-fab-border rounded-lg p-3">
            <p className="text-xs text-fab-dim">{card.label}</p>
            <p className="text-xl font-bold text-fab-text mt-0.5">{card.value}</p>
            <p className="text-[10px] text-fab-dim mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Per-game table */}
      <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-fab-border">
          <h2 className="text-sm font-semibold text-fab-text">Per-Game Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fab-border text-fab-dim text-xs">
                <th className="text-left px-4 py-2 font-medium">Game</th>
                <th className="text-right px-4 py-2 font-medium">Today</th>
                <th className="text-right px-4 py-2 font-medium">Players</th>
                <th className="text-right px-4 py-2 font-medium">Win %</th>
                <th className="text-right px-4 py-2 font-medium">Week</th>
                <th className="text-right px-4 py-2 font-medium">Players</th>
                <th className="text-right px-4 py-2 font-medium">Win %</th>
                <th className="text-right px-4 py-2 font-medium">All Time</th>
                <th className="text-right px-4 py-2 font-medium">Win %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fab-border">
              {stats.map((g) => (
                <tr key={g.id} className="text-fab-muted hover:bg-fab-surface-hover transition-colors">
                  <td className="px-4 py-2 font-medium text-fab-text">{g.label}</td>
                  <td className="px-4 py-2 text-right">{g.today || "–"}</td>
                  <td className="px-4 py-2 text-right text-fab-dim">{g.uniqueToday || "–"}</td>
                  <td className="px-4 py-2 text-right">{g.today ? `${((g.todayWins / g.today) * 100).toFixed(0)}%` : "–"}</td>
                  <td className="px-4 py-2 text-right">{g.week || "–"}</td>
                  <td className="px-4 py-2 text-right text-fab-dim">{g.uniqueWeek || "–"}</td>
                  <td className="px-4 py-2 text-right">{g.week ? `${((g.weekWins / g.week) * 100).toFixed(0)}%` : "–"}</td>
                  <td className="px-4 py-2 text-right">{g.total}</td>
                  <td className="px-4 py-2 text-right">{g.total ? `${((g.totalWins / g.total) * 100).toFixed(0)}%` : "–"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-fab-border text-fab-text font-medium">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right">{totals.today}</td>
                <td className="px-4 py-2 text-right text-fab-dim">{totals.uniqueToday}</td>
                <td className="px-4 py-2 text-right">{totals.today ? `${((totals.todayWins / totals.today) * 100).toFixed(0)}%` : "–"}</td>
                <td className="px-4 py-2 text-right">{totals.week}</td>
                <td className="px-4 py-2 text-right text-fab-dim">{totals.uniqueWeek}</td>
                <td className="px-4 py-2 text-right">{totals.week ? `${((totals.weekWins / totals.week) * 100).toFixed(0)}%` : "–"}</td>
                <td className="px-4 py-2 text-right">{totals.total}</td>
                <td className="px-4 py-2 text-right">{totals.total ? `${((totals.totalWins / totals.total) * 100).toFixed(0)}%` : "–"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

async function loadGameStats(): Promise<GameStats[]> {
  const { collection, query, where, getDocs, getCountFromServer } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);

  return Promise.all(
    GAME_COLLECTIONS.map(async (game): Promise<GameStats> => {
      try {
        const col = collection(db, game.collection);

        // Today's results
        const todaySnap = await getDocs(query(col, where("date", "==", today)));
        const todayDocs = todaySnap.docs.map((d) => d.data());
        const todayWins = todayDocs.filter((d) => d.won).length;
        const uniqueToday = new Set(todayDocs.map((d) => d.uid)).size;

        // This week's results
        const weekSnap = await getDocs(query(col, where("date", ">=", weekAgo)));
        const weekDocs = weekSnap.docs.map((d) => d.data());
        const weekWins = weekDocs.filter((d) => d.won).length;
        const uniqueWeek = new Set(weekDocs.map((d) => d.uid)).size;

        // All-time count
        let total = 0;
        let totalWins = 0;
        try {
          const countSnap = await getCountFromServer(col);
          total = countSnap.data().count;
          const winsSnap = await getCountFromServer(query(col, where("won", "==", true)));
          totalWins = winsSnap.data().count;
        } catch {
          total = weekDocs.length;
          totalWins = weekWins;
        }

        return {
          id: game.id,
          label: game.label,
          today: todayDocs.length,
          todayWins,
          week: weekDocs.length,
          weekWins,
          total,
          totalWins,
          uniqueToday,
          uniqueWeek,
        };
      } catch (err) {
        console.warn(`Failed to load stats for ${game.label}:`, err);
        return { id: game.id, label: game.label, today: 0, todayWins: 0, week: 0, weekWins: 0, total: 0, totalWins: 0, uniqueToday: 0, uniqueWeek: 0 };
      }
    })
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

      <div className="pt-1 flex items-center gap-4">
        <Link
          href={`/player/${u.username}`}
          className="text-xs text-fab-gold hover:text-fab-gold-light"
          onClick={(e) => e.stopPropagation()}
        >
          View Profile →
        </Link>
        <button
          className="text-xs text-fab-muted hover:text-fab-text transition-colors"
          onClick={async (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            btn.textContent = "Syncing...";
            btn.disabled = true;
            try {
              const { adminResyncLeaderboard } = await import("@/lib/admin");
              await adminResyncLeaderboard(u.uid);
              btn.textContent = "Synced ✓";
            } catch {
              btn.textContent = "Failed";
            }
          }}
        >
          Resync Leaderboard
        </button>
      </div>
    </div>
  );
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function GrowthCharts({ users }: { users: AdminUserStats[] }) {
  const [pvTrend, setPvTrend] = useState<{ date: string; total: number }[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDailyPageViewTrend(30).then((data) => { setPvTrend(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  // Build daily new user counts from createdAt (local timezone)
  const usersByDay = useMemo(() => {
    function localDay(d: Date) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    const counts = new Map<string, number>();
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      counts.set(localDay(d), 0);
    }
    for (const u of users) {
      if (!u.createdAt) continue;
      const day = localDay(new Date(u.createdAt));
      if (counts.has(day)) counts.set(day, (counts.get(day) || 0) + 1);
    }
    return [...counts.entries()].map(([date, count]) => ({ date, count }));
  }, [users]);

  if (loading) return <div className="text-xs text-fab-dim animate-pulse mb-6">Loading trends...</div>;

  const maxPv = pvTrend ? Math.max(...pvTrend.map((d: { date: string; total: number }) => d.total), 1) : 1;
  const maxUsers = Math.max(...usersByDay.map((d: { date: string; count: number }) => d.count), 1);

  function formatDay(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Daily Page Views */}
      {pvTrend && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <h3 className="text-xs text-fab-muted uppercase tracking-wider font-medium mb-3">
            Daily Page Views <span className="text-fab-dim font-normal">(30 days)</span>
          </h3>
          <div className="flex items-end gap-[2px] h-24">
            {pvTrend.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                <div
                  className="w-full bg-fab-gold/40 rounded-t-sm min-h-[2px] transition-all hover:bg-fab-gold/70"
                  style={{ height: `${Math.max((d.total / maxPv) * 100, 2)}%` }}
                />
                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-fab-bg border border-fab-border rounded px-1.5 py-0.5 text-[10px] text-fab-text whitespace-nowrap z-10">
                  {formatDay(d.date)}: {d.total.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-fab-dim">
            <span>{formatDay(pvTrend[0].date)}</span>
            <span>{formatDay(pvTrend[pvTrend.length - 1].date)}</span>
          </div>
        </div>
      )}

      {/* Daily New Users */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
        <h3 className="text-xs text-fab-muted uppercase tracking-wider font-medium mb-3">
          New Users <span className="text-fab-dim font-normal">(30 days &middot; {usersByDay.reduce((s: number, d: { count: number }) => s + d.count, 0)} total)</span>
        </h3>
        <div className="flex items-end gap-[2px] h-24">
          {usersByDay.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              <div
                className="w-full bg-fab-win/40 rounded-t-sm min-h-[2px] transition-all hover:bg-fab-win/70"
                style={{ height: `${d.count > 0 ? Math.max((d.count / maxUsers) * 100, 4) : 0}%` }}
              />
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-fab-bg border border-fab-border rounded px-1.5 py-0.5 text-[10px] text-fab-text whitespace-nowrap z-10">
                {formatDay(d.date)}: {d.count}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-fab-dim">
          <span>{formatDay(usersByDay[0].date)}</span>
          <span>{formatDay(usersByDay[usersByDay.length - 1].date)}</span>
        </div>
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
  social: "Social",
  compare: "Versus",
  tools: "Player Tools",
  friends: "Friends",
  docs: "Docs",
  roadmap: "Roadmap",
  tournaments: "Tournaments",
  fabdoku: "FaBdoku",
};

function PageViewsSummary({ initialPageViews }: { initialPageViews: Record<string, number> }) {
  const [range, setRange] = useState<PageViewTimeRange>("all");
  const [pageViews, setPageViews] = useState(initialPageViews);
  const [loadingRange, setLoadingRange] = useState(false);
  const [rangeError, setRangeError] = useState("");

  useEffect(() => {
    if (range === "all") {
      setPageViews(initialPageViews);
      setLoadingRange(false);
      setRangeError("");
      return;
    }

    let cancelled = false;
    setLoadingRange(true);
    setRangeError("");
    getPageViews(range)
      .then((views) => {
        if (!cancelled) setPageViews(views);
      })
      .catch((err) => {
        console.error("Failed to fetch page views for range:", range, err);
        if (!cancelled) {
          setPageViews({});
          setRangeError("Failed to load page views.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRange(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range, initialPageViews]);

  const playerEntries: [string, number][] = [];
  const routeEntries: [string, number][] = [];
  for (const [key, count] of Object.entries(pageViews)) {
    if (key.startsWith("player_")) playerEntries.push([key, count]);
    else routeEntries.push([key, count]);
  }

  const playerProfileTotal = playerEntries.reduce((sum, [, count]) => sum + count, 0);
  if (playerProfileTotal > 0) routeEntries.push(["__player_profiles__", playerProfileTotal]);
  routeEntries.sort(([, a], [, b]) => b - a);

  const totalPageViews = routeEntries.reduce((sum, [, count]) => sum + count, 0);
  const topRoutes = routeEntries.slice(0, 8);

  function routeLabel(key: string): string {
    if (key === "__player_profiles__") return `Player Profiles (${playerEntries.length})`;
    return ROUTE_LABELS[key] || `/${key.replace(/_/g, "/")}`;
  }

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-fab-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-fab-text">
          Page Views
          <span className="text-fab-dim font-normal ml-2">({totalPageViews.toLocaleString()})</span>
        </h3>
        <div className="flex items-center gap-1">
          {([
            ["1h", "Hour"],
            ["24h", "Day"],
            ["7d", "Week"],
            ["all", "All Time"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                range === value
                  ? "bg-fab-gold/20 text-fab-gold"
                  : "text-fab-muted hover:text-fab-text"
              }`}
            >
              {label}
            </button>
          ))}
          {loadingRange && <span className="text-xs text-fab-dim animate-pulse ml-2">Loading...</span>}
        </div>
      </div>
      <div className="p-4">
        {rangeError ? (
          <p className="text-xs text-red-400">{rangeError}</p>
        ) : topRoutes.length === 0 ? (
          <p className="text-xs text-fab-dim">No page view data yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {topRoutes.map(([route, count]) => {
              const pct = totalPageViews > 0 ? (count / totalPageViews) * 100 : 0;
              return (
                <div key={route} className="bg-fab-bg rounded-md px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-fab-dim truncate" title={routeLabel(route)}>{routeLabel(route)}</p>
                    <p className="text-sm font-bold text-fab-text">{count.toLocaleString()}</p>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-fab-surface overflow-hidden">
                    <div className="h-full rounded-full bg-fab-gold/50" style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFeed } from "@/hooks/useFeed";
import { useFriends } from "@/hooks/useFriends";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { groupConsecutiveEvents, GroupedFeedCard } from "@/components/feed/FeedCard";
import { getActivityFeed, ACTIVITY_LABELS, type ActivityEvent } from "@/lib/activity-log";
import { playerHref } from "@/lib/constants";
import type { FeedEventType } from "@/lib/feed";
import type { FeedEvent } from "@/types";

type ScopeTab = "community" | "friends";
type TypeFilter = "all" | "import" | "placement" | "games" | "engagement";

const GAME_EVENT_TYPES = new Set(["fabdoku", "fabdoku-cards", "crossword", "heroguesser", "matchupmania", "trivia", "timeline", "connections", "rampage", "kayosknockout", "brutebrawl", "ninjacombo", "shadowstrike", "bladedash"]);

const TYPE_FILTERS: { value: TypeFilter; label: string; adminOnly?: boolean }[] = [
  { value: "all", label: "All" },
  { value: "import", label: "Imports" },
  { value: "placement", label: "Placements" },
  { value: "games", label: "Games" },
  { value: "engagement", label: "Engagement", adminOnly: true },
];

const PAGE_SIZE = 5;
const ENGAGEMENT_PAGE_SIZE = 10;

interface ActivityGroup {
  event: ActivityEvent;
  count: number;
}

function groupConsecutiveActivity(events: ActivityEvent[]): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  for (const ev of events) {
    const last = groups[groups.length - 1];
    if (last && last.event.uid === ev.uid && last.event.action === ev.action) {
      last.count += 1;
    } else {
      groups.push({ event: ev, count: 1 });
    }
  }
  return groups;
}
const TYPE_CAPS: Record<string, number> = {
  import: 20,
  placement: 20,
};
const SCOPE_KEY = "fab-feed-scope";
const TYPE_KEY = "fab-feed-type";

function readStored<T extends string>(key: string, valid: T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(key) as T | null;
  return v && valid.includes(v) ? v : fallback;
}

export function ActivityFeed({ rankMap, eventTierMap, underlineTierMap }: { rankMap?: Map<string, 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>; eventTierMap?: Map<string, { border: string; shadow: string }>; underlineTierMap?: Map<string, { color: string; rgb: string }> }) {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { friends } = useFriends();
  const { favorites } = useFavorites();
  const [scope, _setScope] = useState<ScopeTab>(() => readStored(SCOPE_KEY, ["community", "friends"], "community"));
  const [typeFilter, _setTypeFilter] = useState<TypeFilter>(() => readStored(TYPE_KEY, ["all", "import", "placement", "games", "engagement"], "placement"));
  const feedTypeFilter: FeedEventType = (typeFilter === "engagement" || typeFilter === "games") ? "all" : typeFilter;
  const { events, loading } = useFeed(feedTypeFilter);

  const [page, setPage] = useState(0);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const handleDelete = useCallback((eventId: string) => {
    setDeletedIds((prev) => new Set(prev).add(eventId));
  }, []);

  // Admin engagement activity
  const [adminActivity, setAdminActivity] = useState<ActivityEvent[]>([]);
  const [adminActivityLoading, setAdminActivityLoading] = useState(false);
  useEffect(() => {
    if (!isAdmin) return;
    setAdminActivityLoading(true);
    getActivityFeed(100).then(({ events }) => {
      setAdminActivity(events.filter((e) => e.uid !== user?.uid));
      setAdminActivityLoading(false);
    }).catch(() => setAdminActivityLoading(false));
  }, [isAdmin]);

  const setScope = useCallback((v: ScopeTab) => { _setScope(v); setPage(0); localStorage.setItem(SCOPE_KEY, v); }, []);
  const setTypeFilter = useCallback((v: TypeFilter) => { _setTypeFilter(v); setPage(0); localStorage.setItem(TYPE_KEY, v); }, []);

  // Build set of friend/favorite user IDs
  const socialUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const f of friends) {
      for (const p of f.participants) {
        if (p !== user?.uid) ids.add(p);
      }
    }
    for (const fav of favorites) {
      ids.add(fav.targetUserId);
    }
    return ids;
  }, [friends, favorites, user?.uid]);

  const filteredEvents: FeedEvent[] = useMemo(() => {
    // Exclude shared game events globally — they duplicate the completion event
    let source = events.filter((e) => !deletedIds.has(e.id) && !((e as { subtype?: string }).subtype === "shared" && GAME_EVENT_TYPES.has(e.type)));

    // Scope filter
    if (scope === "friends") {
      source = source.filter((e) => socialUserIds.has(e.userId));
    }

    // Type filter
    if (typeFilter === "games") {
      source = source.filter((e) => GAME_EVENT_TYPES.has(e.type));
    } else if (typeFilter !== "all") {
      source = source.filter((e) => e.type === typeFilter);
    }

    // Filter out stale placements — only show events from the last 2 weeks
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const placementCutoff = Date.now() - THIRTY_DAYS;
    source = source.filter((e) => {
      if (e.type === "placement") {
        return new Date(e.eventDate).getTime() >= placementCutoff;
      }
      return true;
    });

    // Sort by when the event was uploaded (most recent first)
    // createdAt may be a Firestore Timestamp object — handle both Timestamp and string/Date
    const toMs = (v: unknown): number =>
      v && typeof v === "object" && "toMillis" in v
        ? (v as { toMillis: () => number }).toMillis()
        : new Date(v as string | number).getTime();
    source = [...source].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));

    // Per-type caps: keep only N most recent of each type
    const typeCounts: Record<string, number> = {};
    source = source.filter((e) => {
      const count = (typeCounts[e.type] ?? 0) + 1;
      typeCounts[e.type] = count;
      return count <= (TYPE_CAPS[e.type] ?? 15);
    });

    return source;
  }, [events, scope, typeFilter, socialUserIds, deletedIds]);

  // Group consecutive imports for cleaner display
  const allGroups = useMemo(() => groupConsecutiveEvents(filteredEvents), [filteredEvents]);
  const totalPages = Math.max(1, Math.ceil(allGroups.length / PAGE_SIZE));
  const groups = allGroups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Don't render section if no events at all and showing everything
  if (!loading && events.length === 0 && typeFilter === "all" && scope === "community") return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-fab-gold/10 flex items-center justify-center ring-1 ring-inset ring-fab-gold/20">
          <svg className="w-4 h-4 text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-fab-text leading-tight">Activity Feed</h2>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Type filters */}
        <div className="flex gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border">
          {TYPE_FILTERS.filter((f) => !f.adminOnly || isAdmin).map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                typeFilter === f.value
                  ? "bg-fab-surface text-fab-text shadow-sm"
                  : "text-fab-dim hover:text-fab-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Scope toggle */}
        {user && (
          <div className="flex gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border ml-auto">
            <button
              onClick={() => setScope("community")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                scope === "community"
                  ? "bg-fab-surface text-fab-text shadow-sm"
                  : "text-fab-dim hover:text-fab-muted"
              }`}
            >
              Community
            </button>
            <button
              onClick={() => setScope("friends")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                scope === "friends"
                  ? "bg-fab-surface text-fab-text shadow-sm"
                  : "text-fab-dim hover:text-fab-muted"
              }`}
            >
              Friends
            </button>
          </div>
        )}
      </div>

      {/* Feed list */}
      {typeFilter === "engagement" && isAdmin ? (
        // Admin-only engagement activity feed
        adminActivityLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-3 h-12 animate-pulse" />
            ))}
          </div>
        ) : adminActivity.length === 0 ? (
          <div className="bg-fab-surface border border-fab-border rounded-lg p-4 text-center">
            <p className="text-xs text-fab-dim">No engagement activity yet.</p>
          </div>
        ) : (() => {
          const activityGroups = groupConsecutiveActivity(adminActivity);
          const engagementPages = Math.max(1, Math.ceil(activityGroups.length / ENGAGEMENT_PAGE_SIZE));
          const pageItems = activityGroups.slice(page * ENGAGEMENT_PAGE_SIZE, (page + 1) * ENGAGEMENT_PAGE_SIZE);
          return (
            <>
              <div className="space-y-1.5 min-h-[440px]">
                {pageItems.map(({ event: ev, count }) => {
                  const ago = (() => {
                    const diff = Date.now() - new Date(ev.ts).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 1) return "just now";
                    if (mins < 60) return `${mins}m ago`;
                    const hrs = Math.floor(mins / 60);
                    if (hrs < 24) return `${hrs}h ago`;
                    const days = Math.floor(hrs / 24);
                    if (days < 7) return `${days}d ago`;
                    return new Date(ev.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  })();
                  return (
                    <div key={ev.id} className="bg-fab-surface border border-fab-border rounded-lg px-3 py-2 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-fab-gold/20 flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-fab-muted">
                          <Link href={playerHref(ev.username)} className="font-semibold text-fab-text hover:text-fab-gold transition-colors">
                            {ev.username}
                          </Link>
                          {" "}{ACTIVITY_LABELS[ev.action] || ev.action}
                          {count > 1 && <span className="ml-1 text-fab-dim font-medium">&times;{count}</span>}
                          {ev.meta && <span className="text-fab-dim"> &middot; {ev.meta}</span>}
                        </p>
                      </div>
                      <span className="text-[10px] text-fab-dim shrink-0">{ago}</span>
                    </div>
                  );
                })}
              </div>
              {engagementPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    &larr; Prev
                  </button>
                  <span className="text-[10px] text-fab-dim">{page + 1} / {engagementPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(engagementPages - 1, p + 1))}
                    disabled={page >= engagementPages - 1}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </>
          );
        })()
      ) : loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-3 h-12 animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4 text-center">
          <p className="text-xs text-fab-dim">
            {scope === "friends"
              ? "No recent activity from friends yet."
              : typeFilter !== "all"
              ? `No ${TYPE_FILTERS.find((f) => f.value === typeFilter)?.label ?? typeFilter} activity yet.`
              : "No recent activity yet. Import some matches to get started!"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2 min-h-[440px]">
            {groups.map((group) => (
              <div
                key={group.events[0].id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a")) return;
                  if (group.events.length > 1 && GAME_EVENT_TYPES.has(group.events[0].type)) {
                    router.push("/games");
                    return;
                  }
                  const t = group.events[0].type;
                  router.push(GAME_EVENT_TYPES.has(t) ? `/${t}` : t === "import" ? `/search?type=${t}` : `/search?type=${t}`);
                }}
                className="cursor-pointer"
              >
                <GroupedFeedCard group={group} compact rankMap={rankMap} eventTierMap={eventTierMap} underlineTierMap={underlineTierMap} userId={user?.uid} isAdmin={isAdmin} onDelete={handleDelete} />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                &larr; Prev
              </button>
              <span className="text-[10px] text-fab-dim">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                Next &rarr;
              </button>
            </div>
          )}

        </>
      )}
    </div>
  );
}

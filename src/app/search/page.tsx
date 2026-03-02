"use client";
import { Suspense, useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { searchUsernames, getProfile } from "@/lib/firestore-storage";
import { playerHref } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useFeed } from "@/hooks/useFeed";
import { useFriends } from "@/hooks/useFriends";
import { useFavorites } from "@/hooks/useFavorites";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { selectFeaturedProfiles } from "@/lib/featured-profiles";
import { computeRankMap, computeEventTierMap } from "@/lib/leaderboard-ranks";
import { groupConsecutiveEvents, GroupedFeedCard } from "@/components/feed/FeedCard";
import { FeaturedProfiles } from "@/components/home/FeaturedProfiles";
import { FeedIcon } from "@/components/icons/NavIcons";
import type { UserProfile, FeedEvent } from "@/types";

interface SearchResult {
  username: string;
  profile: UserProfile | null;
}

type ScopeTab = "community" | "friends";
type TypeFilter = "all" | "import" | "achievement" | "placement";

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "import", label: "Imports" },
  { value: "achievement", label: "Achievements" },
  { value: "placement", label: "Placements" },
];

const PAGE_SIZE = 15;

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchContent />
    </Suspense>
  );
}

function SearchSkeleton() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-fab-gold mb-6">Discover</h1>
      <div className="flex gap-3 mb-8">
        <div className="flex-1 h-11 bg-fab-surface border border-fab-border rounded-lg animate-pulse" />
        <div className="w-24 h-11 bg-fab-surface rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isAdmin, user } = useAuth();

  // Feed state — same model as home ActivityFeed
  const { events: allFeedEvents, loading: feedLoading } = useFeed();
  const { friends } = useFriends();
  const { favorites } = useFavorites();
  const [scope, setScope] = useState<ScopeTab>("community");
  const initialType = searchParams.get("type") as TypeFilter | null;
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(
    initialType && (["all", "import", "achievement", "placement"] as TypeFilter[]).includes(initialType) ? initialType : "placement"
  );
  const [page, setPage] = useState(0);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const handleDeleteFeed = useCallback((eventId: string) => {
    setDeletedIds((prev) => new Set(prev).add(eventId));
  }, []);

  // Spotlight state
  const { entries: lbEntries } = useLeaderboard();
  const featuredProfiles = useMemo(() => selectFeaturedProfiles(lbEntries), [lbEntries]);
  const rankMap = useMemo(() => computeRankMap(lbEntries), [lbEntries]);
  const eventTierMap = useMemo(() => computeEventTierMap(lbEntries), [lbEntries]);

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

  // Filter + sort events — same logic as ActivityFeed
  const filteredEvents: FeedEvent[] = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const importCutoff = yesterday.getTime();
    const appLaunch = new Date("2026-02-24").getTime();

    let source = allFeedEvents.filter((e) => !deletedIds.has(e.id));

    if (scope === "friends") {
      source = source.filter((e) => socialUserIds.has(e.userId));
    }

    if (typeFilter !== "all") {
      source = source.filter((e) => e.type === typeFilter);
    }

    source = source.filter((e) => {
      const dateStr = e.type === "placement" ? e.eventDate : e.createdAt;
      const ts = new Date(dateStr).getTime();
      if (e.type === "import") return ts >= importCutoff;
      return ts >= appLaunch;
    });

    source = [...source].sort((a, b) => {
      const dateA = a.type === "placement" ? a.eventDate : a.createdAt;
      const dateB = b.type === "placement" ? b.eventDate : b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return source;
  }, [allFeedEvents, scope, typeFilter, socialUserIds, deletedIds]);

  const allGroups = useMemo(() => groupConsecutiveEvents(filteredEvents), [filteredEvents]);
  const totalPages = Math.max(1, Math.ceil(allGroups.length / PAGE_SIZE));
  const groups = allGroups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  const handleSetScope = useCallback((v: ScopeTab) => { setScope(v); setPage(0); }, []);
  const handleSetTypeFilter = useCallback((v: TypeFilter) => { setTypeFilter(v); setPage(0); }, []);

  async function doSearch(q: string, autoRedirect = false) {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);

    const usernames = await searchUsernames(q.trim());

    const withProfiles = await Promise.all(
      usernames.map(async (u) => ({
        username: u.username,
        profile: await getProfile(u.userId),
      }))
    );

    const filtered = withProfiles.filter((r) => {
      if (!r.profile?.isPublic && !isAdmin) return false;
      if (r.profile?.hideFromGuests && !user && !isAdmin) return false;
      return true;
    });

    if (autoRedirect && filtered.length === 1) {
      router.replace(`/player/${filtered[0].username}`);
      return;
    }

    setResults(filtered);
    setLoading(false);
  }

  useEffect(() => {
    if (initialQuery) {
      doSearch(initialQuery, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  useEffect(() => {
    if (query === initialQuery) return;
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    doSearch(query);
  }

  const showFeed = !query.trim() && !searched;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center ring-1 ring-inset ring-teal-500/20">
          <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-fab-text leading-tight">Discover</h1>
          <p className="text-xs text-fab-muted leading-tight">Search for players or see what the community is up to</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or username..."
          className="flex-1 bg-fab-surface border border-fab-border text-fab-text rounded-lg px-4 py-2.5 focus:outline-none focus:border-fab-gold"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-2.5 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "Search"}
        </button>
      </form>

      {/* Search results */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-16 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-16">
          <p className="text-fab-muted">No players found matching &quot;{query}&quot;.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <Link
              key={r.username}
              href={playerHref(r.username)}
              className="block bg-fab-surface border border-fab-border rounded-lg p-4 hover:bg-fab-surface-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                {r.profile?.photoUrl ? (
                  <img src={r.profile.photoUrl} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold font-bold">
                    {(r.profile?.displayName || r.username).charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-fab-text">{r.profile?.displayName || r.username}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-fab-dim">@{r.username}</p>
                    {!r.profile?.isPublic && <span className="text-[9px] px-1.5 py-0.5 rounded bg-fab-dim/10 text-fab-dim">Private</span>}
                    {r.profile?.firstName && (
                      <p className="text-sm text-fab-muted">
                        {r.profile.firstName}{r.profile.lastName ? ` ${r.profile.lastName}` : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Feed + Spotlight (shown when not searching) */}
      {showFeed && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Activity Feed */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-fab-text">Activity Feed</h2>
            </div>

            {/* Filter row */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <div className="flex gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border">
                {TYPE_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => handleSetTypeFilter(f.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      typeFilter === f.value
                        ? "bg-fab-surface text-fab-text shadow-sm"
                        : "text-fab-dim hover:text-fab-muted"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {user && (
                <div className="flex gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border ml-auto">
                  <button
                    onClick={() => handleSetScope("community")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      scope === "community"
                        ? "bg-fab-surface text-fab-text shadow-sm"
                        : "text-fab-dim hover:text-fab-muted"
                    }`}
                  >
                    Community
                  </button>
                  <button
                    onClick={() => handleSetScope("friends")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
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

            {feedLoading && (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-24 animate-pulse" />
                ))}
              </div>
            )}

            {!feedLoading && filteredEvents.length === 0 && (
              <div className="text-center py-12">
                <FeedIcon className="w-12 h-12 text-fab-muted mb-3 mx-auto" />
                <p className="text-fab-muted text-sm">
                  {scope === "friends"
                    ? "No recent activity from friends yet."
                    : typeFilter === "all"
                      ? "No activity yet. When players import matches or earn achievements, it will show up here."
                      : `No ${typeFilter} activity yet.`}
                </p>
              </div>
            )}

            {!feedLoading && filteredEvents.length > 0 && (
              <>
                <div className="space-y-3">
                  {groups.map((group) => (
                    <GroupedFeedCard key={group.events[0].id} group={group} rankMap={rankMap} eventTierMap={eventTierMap} userId={user?.uid} isAdmin={isAdmin} onDelete={handleDeleteFeed} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      &larr; Prev
                    </button>
                    <span className="text-xs text-fab-dim">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Next &rarr;
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Spotlight sidebar */}
          <div className="hidden lg:block">
            <FeaturedProfiles profiles={featuredProfiles} rankMap={rankMap} />
          </div>

          {/* Spotlight on mobile (below feed) */}
          <div className="lg:hidden">
            <FeaturedProfiles profiles={featuredProfiles} rankMap={rankMap} />
          </div>
        </div>
      )}
    </div>
  );
}

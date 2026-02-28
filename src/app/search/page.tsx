"use client";
import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { searchUsernames, getProfile } from "@/lib/firestore-storage";
import { useAuth } from "@/contexts/AuthContext";
import { getFeedEventsPaginated, type FeedEventType } from "@/lib/feed";
import { GroupedFeedCard, groupConsecutiveEvents } from "@/components/feed/FeedCard";
import { FeedIcon } from "@/components/icons/NavIcons";
import type { UserProfile, FeedEvent } from "@/types";

interface SearchResult {
  username: string;
  profile: UserProfile | null;
}

const PAGE_SIZE = 20;

const TYPE_FILTERS: { value: FeedEventType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "import", label: "Imports" },
  { value: "achievement", label: "Achievements" },
  { value: "placement", label: "Placements" },
];

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

  // Feed state
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const [feedCursor, setFeedCursor] = useState<string | undefined>();
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [typeFilter, setTypeFilter] = useState<FeedEventType>("all");

  const loadFeed = useCallback(async (filter: FeedEventType, cursor?: string) => {
    const result = await getFeedEventsPaginated(PAGE_SIZE, filter, cursor);
    return result;
  }, []);

  // Initial feed load
  useEffect(() => {
    setFeedLoading(true);
    setFeedEvents([]);
    setFeedCursor(undefined);
    loadFeed(typeFilter).then((result) => {
      setFeedEvents(result.events);
      setFeedHasMore(result.hasMore);
      setFeedCursor(result.lastTimestamp || undefined);
      setFeedLoading(false);
    });
  }, [typeFilter, loadFeed]);

  async function loadMore() {
    if (!feedCursor || feedLoadingMore) return;
    setFeedLoadingMore(true);
    const result = await loadFeed(typeFilter, feedCursor);
    setFeedEvents((prev) => [...prev, ...result.events]);
    setFeedHasMore(result.hasMore);
    setFeedCursor(result.lastTimestamp || undefined);
    setFeedLoadingMore(false);
  }

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

    // Auto-redirect to profile if exactly one result and came from a link (not manual search)
    if (autoRedirect && filtered.length === 1) {
      router.replace(`/player/${filtered[0].username}`);
      return;
    }

    setResults(filtered);
    setLoading(false);
  }

  // Auto-search if ?q= is provided (with auto-redirect for linked searches)
  useEffect(() => {
    if (initialQuery) {
      doSearch(initialQuery, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // Debounced auto-search as user types
  useEffect(() => {
    if (query === initialQuery) return; // skip initial
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
  const feedGroups = groupConsecutiveEvents(feedEvents);

  return (
    <div>
      <h1 className="text-2xl font-bold text-fab-gold mb-2">Discover</h1>
      <p className="text-fab-muted text-sm mb-6">
        Search for players or see what the community is up to.
      </p>

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
              href={`/player/${r.username}`}
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

      {/* Activity feed (shown when not searching) */}
      {showFeed && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-fab-text">Activity Feed</h2>
          </div>

          {/* Type filter tabs */}
          <div className="flex gap-1 bg-fab-bg rounded-lg p-0.5 border border-fab-border w-fit mb-5">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
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

          {feedLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-24 animate-pulse" />
              ))}
            </div>
          )}

          {!feedLoading && feedEvents.length === 0 && (
            <div className="text-center py-12">
              <FeedIcon className="w-12 h-12 text-fab-muted mb-3 mx-auto" />
              <p className="text-fab-muted text-sm">
                {typeFilter === "all"
                  ? "No activity yet. When players import matches or earn achievements, it will show up here."
                  : `No ${typeFilter} activity yet.`}
              </p>
            </div>
          )}

          {!feedLoading && feedEvents.length > 0 && (
            <>
              <div className="space-y-3">
                {feedGroups.map((group) => (
                  <GroupedFeedCard key={group.events[0].id} group={group} />
                ))}
              </div>

              {/* Load More */}
              {feedHasMore && (
                <div className="mt-6 text-center">
                  <button
                    onClick={loadMore}
                    disabled={feedLoadingMore}
                    className="px-6 py-2.5 rounded-lg font-semibold bg-fab-surface border border-fab-border text-fab-text hover:bg-fab-surface-hover transition-colors disabled:opacity-50"
                  >
                    {feedLoadingMore ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}

              {!feedHasMore && feedEvents.length > PAGE_SIZE && (
                <p className="text-center text-fab-dim text-xs mt-6">You&apos;ve reached the end</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

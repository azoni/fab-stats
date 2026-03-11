"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { searchUsernames, getProfile } from "@/lib/firestore-storage";
import { playerHref } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import type { UserProfile } from "@/types";

interface SearchResult {
  username: string;
  profile: UserProfile | null;
}

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
      <div className="h-8 w-48 bg-fab-surface rounded animate-pulse mb-6" />
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center ring-1 ring-inset ring-cyan-500/20">
          <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-fab-text leading-tight">Search</h1>
          <p className="text-xs text-fab-muted leading-tight">Find players by name or username</p>
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
        <div className="text-center py-16 text-fab-dim">
          <p className="text-lg mb-1">No players found</p>
          <p className="text-sm">No results matching &quot;{query}&quot; — try a different name or username.</p>
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

      {/* Prompt when no search is active */}
      {!query.trim() && !searched && (
        <div className="text-center py-16 text-fab-dim">
          <svg className="w-12 h-12 mx-auto mb-3 text-fab-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <p className="text-sm">Type a name or username above to find players.</p>
        </div>
      )}
    </div>
  );
}

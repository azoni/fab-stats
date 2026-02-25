"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { searchUsernames, getProfile } from "@/lib/firestore-storage";
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
      <h1 className="text-2xl font-bold text-fab-gold mb-6">Find Players</h1>
      <div className="flex gap-3 mb-8">
        <div className="flex-1 h-11 bg-fab-surface border border-fab-border rounded-lg animate-pulse" />
        <div className="w-24 h-11 bg-fab-surface rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function doSearch(q: string) {
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

    setResults(withProfiles.filter((r) => r.profile?.isPublic));
    setLoading(false);
  }

  // Auto-search if ?q= is provided
  useEffect(() => {
    if (initialQuery) {
      doSearch(initialQuery);
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-fab-gold mb-6">Find Players</h1>

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
    </div>
  );
}

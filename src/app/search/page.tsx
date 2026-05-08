"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search as SearchIcon, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHero } from "@/components/ui/PageHero";
import { searchUsernames, getProfile } from "@/lib/firestore-storage";
import { searchTeams, getTeam } from "@/lib/teams";
import { playerHref } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import type { UserProfile, Team } from "@/types";

interface SearchResult {
  username: string;
  profile: UserProfile | null;
}

interface TeamSearchResult {
  teamId: string;
  name: string;
  nameLower: string;
  team: Team | null;
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
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="h-40 rounded-lg border border-fab-border bg-fab-surface animate-pulse" />
      <div className="h-16 rounded-lg border border-fab-border bg-fab-surface animate-pulse" />
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [teamResults, setTeamResults] = useState<TeamSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isAdmin, user } = useAuth();

  async function doSearch(q: string, autoRedirect = false) {
    if (!q.trim()) {
      setResults([]);
      setTeamResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);

    const [usernames, teams] = await Promise.all([
      searchUsernames(q.trim()).catch(() => []),
      searchTeams(q.trim(), 10).catch(() => []),
    ]);

    const withProfiles = await Promise.all(
      usernames.map(async (u) => ({
        username: u.username,
        profile: await getProfile(u.userId),
      })),
    );

    const filtered = withProfiles.filter((r) => {
      if (!r.profile?.isPublic && !isAdmin) return false;
      if (r.profile?.hideFromGuests && !user && !isAdmin) return false;
      return true;
    });

    const teamsWithData = await Promise.all(
      teams.map(async (t) => ({
        ...t,
        team: await getTeam(t.teamId),
      })),
    );

    if (autoRedirect && filtered.length === 1 && teamsWithData.length === 0) {
      router.replace(`/player/${filtered[0].username}`);
      return;
    }

    setResults(filtered);
    setTeamResults(teamsWithData);
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
      setTeamResults([]);
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

  const resultCount = results.length + teamResults.length;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHero
        eyebrow="Discover"
        title="Find players and teams"
        description="Search public profiles, team pages, and community records without guessing which section they live in."
        icon={<SearchIcon className="h-4 w-4" />}
        metrics={[
          { label: "Players", value: results.length, sub: searched ? "matching search" : "ready" },
          { label: "Teams", value: teamResults.length, sub: searched ? "matching search" : "ready" },
          { label: "Results", value: resultCount, sub: loading ? "searching" : "current view" },
        ]}
      />

      <form onSubmit={handleSearch} className="rounded-lg border border-fab-border bg-fab-surface/95 p-3 sm:flex sm:gap-3">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fab-dim" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by player, username, or team..."
            className="w-full rounded-md border border-fab-border bg-fab-bg px-10 py-3 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fab-dim transition-colors hover:text-fab-text"
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="mt-3 min-h-11 rounded-md bg-fab-gold px-6 text-sm font-semibold text-fab-bg transition-colors hover:bg-fab-gold-light disabled:opacity-50 sm:mt-0"
        >
          {loading ? "..." : "Search"}
        </button>
      </form>

      {loading && (
        <div className="grid gap-2 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-fab-border bg-fab-surface p-4 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && teamResults.length === 0 && (
        <EmptyState
          icon={<SearchIcon className="h-5 w-5" />}
          title="No results found"
          description={`No players or teams matching "${query}". Try a username, display name, or team name.`}
        />
      )}

      {!loading && teamResults.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-fab-muted">Teams</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {teamResults.map((t) => (
              <Link
                key={t.teamId}
                href={`/teams/${t.nameLower}`}
                className="block rounded-lg border border-fab-border bg-fab-surface/95 p-4 transition-colors hover:border-fab-gold/30 hover:bg-fab-surface-hover"
              >
                <div className="flex items-center gap-3">
                  {t.team?.iconUrl ? (
                    <img src={t.team.iconUrl} alt="" className="h-11 w-11 rounded-lg border border-fab-border object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/15">
                      <Users className="h-5 w-5 text-amber-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-fab-text">{t.name}</p>
                    <div className="flex items-center gap-2 text-sm text-fab-dim">
                      {t.team && <span>{t.team.memberCount} member{t.team.memberCount !== 1 ? "s" : ""}</span>}
                      {t.team && <span className="rounded border border-fab-border bg-fab-bg px-1.5 py-0.5 text-[10px]">{t.team.joinMode === "open" ? "Open" : "Invite Only"}</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && results.length > 0 && (
        <section>
          {teamResults.length > 0 && <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-fab-muted">Players</h2>}
          <div className="grid gap-2 sm:grid-cols-2">
            {results.map((r) => (
              <Link
                key={r.username}
                href={playerHref(r.username)}
                className="block rounded-lg border border-fab-border bg-fab-surface/95 p-4 transition-colors hover:border-fab-gold/30 hover:bg-fab-surface-hover"
              >
                <div className="flex items-center gap-3">
                  {r.profile?.photoUrl ? (
                    <img src={r.profile.photoUrl} alt="" className="h-11 w-11 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-fab-gold/20 font-bold text-fab-gold">
                      {(r.profile?.displayName || r.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-fab-text">{r.profile?.displayName || r.username}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-fab-dim">@{r.username}</p>
                      {!r.profile?.isPublic && <span className="rounded bg-fab-dim/10 px-1.5 py-0.5 text-[9px] text-fab-dim">Private</span>}
                      {r.profile?.firstName && (
                        <p className="truncate text-sm text-fab-muted">
                          {r.profile.firstName}{r.profile.lastName ? ` ${r.profile.lastName}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!query.trim() && !searched && (
        <EmptyState
          icon={<SearchIcon className="h-5 w-5" />}
          title="Start with a name"
          description="Type a display name, username, or team name to search across FaB Stats."
        />
      )}
    </div>
  );
}

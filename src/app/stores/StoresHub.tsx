"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getStoreDirectory, slugifyStoreName, type StoreDirectoryEntry } from "@/lib/store-directory";
import { getMatchVenue } from "@/lib/stats";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { PageHero } from "@/components/ui/PageHero";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, MapPin, Search, Store as StoreIcon, Trophy, Users } from "lucide-react";

type SortMode = "matches" | "players" | "alpha";

const PAGE_SIZE = 30;

export default function StoresHub() {
  const { user } = useAuth();
  const { matches } = useMatches();
  const [directory, setDirectory] = useState<StoreDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQueryRaw] = useState("");
  const [sort, setSortRaw] = useState<SortMode>("matches");
  const [mineOnly, setMineOnlyRaw] = useState(false);
  const [page, setPage] = useState(0);

  // Slugs of the stores the signed-in user has actually played at.
  const myStoreSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      const slug = slugifyStoreName(getMatchVenue(m));
      if (slug.length >= 2) set.add(slug);
    }
    return set;
  }, [matches]);

  // Wrappers reset pagination on filter/sort changes — avoids the lint warning
  // about setState-in-effect while keeping the UX intuitive.
  const setQuery = (v: string) => {
    setQueryRaw(v);
    setPage(0);
  };
  const setSort = (v: SortMode) => {
    setSortRaw(v);
    setPage(0);
  };
  const setMineOnly = (v: boolean) => {
    setMineOnlyRaw(v);
    setPage(0);
  };

  useEffect(() => {
    let cancelled = false;
    getStoreDirectory()
      .then((d) => {
        if (!cancelled) setDirectory(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q ? directory.filter((d) => d.name.toLowerCase().includes(q)) : directory;
    if (mineOnly) list = list.filter((d) => myStoreSlugs.has(d.slug));
    list = [...list];
    if (sort === "matches") list.sort((a, b) => b.totalMatches - a.totalMatches);
    else if (sort === "players") list.sort((a, b) => b.uniquePlayers - a.uniquePlayers);
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [directory, query, sort, mineOnly, myStoreSlugs]);

  const totalMatches = directory.reduce((acc, d) => acc + d.totalMatches, 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE;
  const visible = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-3 py-5 sm:px-4">
      <PageHero
        eyebrow={<><Badge variant="gold" size="xs">Beta</Badge>{" "}Stores</>}
        title="Game store directory"
        description="Every Flesh and Blood store any FaB Stats player has logged a match at. Stores appear here automatically from imported match data — no registration needed."
        icon={<StoreIcon className="h-4 w-4" />}
        metrics={[
          { label: "Stores tracked", value: directory.length.toLocaleString() },
          { label: "Total matches", value: totalMatches.toLocaleString() },
        ]}
        actions={
          <Link
            href="/leagues"
            className="inline-flex items-center gap-1.5 rounded-md border border-fab-gold/40 px-3 py-1.5 text-xs font-semibold text-fab-gold hover:bg-fab-gold/10 hover:border-fab-gold"
          >
            <Trophy className="h-3.5 w-3.5" /> Browse leagues
          </Link>
        }
      />

      <Card padding="sm">
        <div className="flex flex-wrap items-center gap-2">
          {user && myStoreSlugs.size > 0 && (
            <button
              type="button"
              onClick={() => setMineOnly(!mineOnly)}
              aria-pressed={mineOnly}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2.5 text-xs font-semibold transition-colors ${
                mineOnly
                  ? "border-fab-gold/60 bg-fab-gold/15 text-fab-gold"
                  : "border-fab-border bg-fab-bg text-fab-muted hover:border-fab-gold/40 hover:text-fab-text"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              My stores
              <span className={`rounded px-1 text-[10px] tabular-nums ${mineOnly ? "bg-fab-gold/20" : "bg-fab-border/40 text-fab-dim"}`}>
                {myStoreSlugs.size}
              </span>
            </button>
          )}
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fab-dim" />
            <input
              className="w-full rounded-md border border-fab-border bg-fab-bg py-2.5 pl-9 pr-3 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
              placeholder="Search stores by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-fab-muted">
            <span>Sort:</span>
            {(["matches", "players", "alpha"] as SortMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSort(m)}
                className={`rounded-md border px-2.5 py-1 font-semibold transition-colors ${
                  sort === m
                    ? "border-fab-gold/50 bg-fab-gold/10 text-fab-gold"
                    : "border-fab-border bg-fab-bg text-fab-muted hover:text-fab-text"
                }`}
              >
                {m === "matches" ? "Most matches" : m === "players" ? "Most players" : "A–Z"}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <Card padding="md">
          <p className="text-sm text-fab-muted">Loading store directory…</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="md">
          <p className="text-sm text-fab-muted">
            {mineOnly
              ? "None of your stores match. Clear filters to browse every store."
              : query
                ? "No stores match that search."
                : "No stores yet — once players import matches, their venues will show up here."}
          </p>
        </Card>
      ) : (
        <>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {visible.map((s) => (
              <li key={s.slug}>
                <Card padding="sm" interactive className="group">
                  <Link href={`/stores/${s.slug}`} className="block">
                    <h2 className="truncate text-sm font-bold text-fab-text group-hover:text-fab-gold sm:text-base">
                      {s.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fab-muted">
                      <span className="inline-flex items-center gap-1">
                        <StoreIcon className="h-3 w-3" /> {s.totalMatches.toLocaleString()} matches
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" /> {s.uniquePlayers} player
                        {s.uniquePlayers === 1 ? "" : "s"}
                      </span>
                    </div>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 px-1 text-xs text-fab-muted">
              <span>
                Showing <span className="text-fab-text">{pageStart + 1}</span>–
                <span className="text-fab-text">
                  {Math.min(pageStart + PAGE_SIZE, filtered.length)}
                </span>{" "}
                of <span className="text-fab-text">{filtered.length}</span>
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  iconOnly
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-fab-text">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  iconOnly
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}

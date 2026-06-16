"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getStoreStats, type StoreStats } from "@/lib/store-directory";
import { getLeaguesForStore } from "@/lib/leagues";
import type { League } from "@/types";
import { PageHero } from "@/components/ui/PageHero";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { HeroImg } from "@/components/heroes/HeroImg";
import { ArrowLeft, Crown, Flame, Layers, Search, Store as StoreIcon, Swords, Trophy, Users } from "lucide-react";

/** Best-effort: turn "mishrasworkshop" into something display-worthy.
 *  Used only as a placeholder while real data loads. */
function humanizeSlug(slug: string): string {
  if (!slug) return "Store";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function SkeletonTable({ rows }: { rows: number }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-fab-border/60 bg-fab-bg/50 px-3 py-2">
        <div className="h-4 w-40 animate-pulse rounded bg-fab-border/40" />
      </div>
      <div className="divide-y divide-fab-border/30">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2.5">
            <div className="h-3 w-32 animate-pulse rounded bg-fab-border/30" />
            <div className="h-3 w-16 animate-pulse rounded bg-fab-border/30" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: League["status"] }) {
  const variant: Record<League["status"], "muted" | "win" | "default"> = {
    draft: "muted",
    active: "win",
    completed: "default",
  };
  return (
    <Badge variant={variant[status] || "default"} size="xs">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function StorePage() {
  // Read the slug from the URL, not useParams: in static export this page is
  // served from the /stores/_.html placeholder, so useParams returns "_" and the
  // real venue slug is only in the pathname. (Matches the player/group pattern.)
  const pathname = usePathname();
  const slug = decodeURIComponent(pathname?.split("/").pop() || "");

  const [stats, setStats] = useState<StoreStats | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug || slug === "_") return;
    let cancelled = false;
    (async () => {
      const [s, ls] = await Promise.all([
        getStoreStats(slug).catch(() => null),
        getLeaguesForStore(slug).catch(() => [] as League[]),
      ]);
      if (cancelled) return;
      if (!s) {
        setNotFound(true);
      } else {
        setStats(s);
        setLeagues(ls);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-5xl px-3 py-10 sm:px-4">
        <Card padding="md">
          <p className="text-sm text-fab-text">
            No store found for &ldquo;{slug}&rdquo;. Stores appear in the directory once at
            least one match has been imported from that venue.
          </p>
          <Link href="/stores" className="mt-3 inline-block text-sm text-fab-gold underline">
            ← Back to stores
          </Link>
        </Card>
      </div>
    );
  }

  // Render the page chrome immediately. Show real data when it arrives;
  // until then, derive a friendly placeholder name from the slug so the page
  // never looks completely blank.
  const displayName = stats?.name || humanizeSlug(slug);
  const mostActive = stats?.topByActivity[0];
  const bestWinRate = stats?.topByWinRate[0];

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-3 py-5 sm:px-4">
      <Link
        href="/stores"
        className="inline-flex items-center gap-1 text-xs text-fab-muted hover:text-fab-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All stores
      </Link>

      <PageHero
        eyebrow={<><Badge variant="gold" size="xs">Store</Badge></>}
        title={displayName}
        description="Stats are aggregated from imported match data. Refreshes whenever players sync new matches."
        icon={<StoreIcon className="h-4 w-4" />}
        metrics={[
          { label: "Total matches", value: stats ? stats.totalMatches.toLocaleString() : "…" },
          { label: "Players logged", value: stats ? stats.uniquePlayers.toLocaleString() : "…" },
          { label: "Leagues", value: stats ? leagues.length.toString() : "…" },
        ]}
      />

      {loading && !stats && (
        <Card padding="sm" className="text-center">
          <p className="text-xs text-fab-muted">Crunching the numbers from imported matches…</p>
        </Card>
      )}

      {/* Highlights */}
      {stats && <Spotlight mostActive={mostActive} bestWinRate={bestWinRate} />}

      {/* Hero + format breakdown (populates as players' leaderboard docs refresh) */}
      {stats && (stats.heroes.length > 0 || stats.formats.length > 0) && (
        <StoreBreakdown heroes={stats.heroes} formats={stats.formats} />
      )}

      {/* Players — the main interactive table, full width */}
      {stats ? (
        <StorePlayersTable players={stats.players} />
      ) : (
        <SkeletonTable rows={8} />
      )}

      {/* Leagues — only when there are any */}
      {leagues.length > 0 && <LeaguesPanel leagues={leagues} />}

      <p className="px-1 text-[11px] leading-relaxed text-fab-dim">
        FaB Stats doesn&apos;t track stores formally — this page is built entirely from the
        &quot;venue&quot; field on players&apos; imported matches, so duplicate store spellings
        can appear as separate entries.
      </p>
    </div>
  );
}

function StoreBreakdown({ heroes, formats }: { heroes: StoreStats["heroes"]; formats: StoreStats["formats"] }) {
  const topHeroes = heroes.slice(0, 8);
  const formatTotal = formats.reduce((a, f) => a + f.matches, 0) || 1;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {topHeroes.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-fab-border/60 bg-fab-bg/50 px-3 py-2.5">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-fab-text">
              <Swords className="h-4 w-4 text-rose-300" /> Most played heroes
            </h2>
            <span className="text-[10px] text-fab-dim">matches · win rate</span>
          </div>
          <ul className="divide-y divide-fab-border/30">
            {topHeroes.map((h, i) => (
              <li key={h.hero} className="flex items-center gap-2.5 px-3 py-2">
                <span className="w-4 text-center text-[11px] font-bold tabular-nums text-fab-dim">{i + 1}</span>
                <HeroImg name={h.hero} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fab-text">{h.hero}</span>
                <span className="tabular-nums text-xs text-fab-muted">{h.matches}</span>
                <span
                  className={`w-10 text-right tabular-nums text-xs font-bold ${
                    h.winRate >= 55 ? "text-fab-win" : h.winRate < 45 ? "text-fab-loss" : "text-fab-text"
                  }`}
                >
                  {h.winRate}%
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {formats.length > 0 && (
        <Card padding="sm">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-fab-text">
            <Layers className="h-4 w-4 text-fab-gold" /> Formats played
          </h2>
          <ul className="mt-3 space-y-2.5">
            {formats.map((f) => {
              const pct = Math.round((f.matches / formatTotal) * 100);
              return (
                <li key={f.format}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-fab-text">
                      {f.format === "Classic Constructed" ? "Classic Constructed (CC)" : f.format}
                    </span>
                    <span className="tabular-nums text-fab-muted">
                      {f.matches} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-fab-border/40">
                    <div className="h-full rounded-full bg-fab-gold/70" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

type StorePlayer = StoreStats["players"][number];
type SortKey = "matches" | "record" | "winRate" | "name";

function Avatar({ p }: { p: StorePlayer }) {
  if (p.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.photoUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fab-gold/15 text-xs font-bold text-fab-gold">
      {(p.displayName || "?").charAt(0).toUpperCase()}
    </span>
  );
}

/** One sortable, searchable, filterable table for everyone at the store. */
function StorePlayersTable({ players }: { players: StoreStats["players"] }) {
  const [search, setSearch] = useState("");
  const [minMatches, setMinMatches] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("matches");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = players.filter(
      (p) =>
        p.matches >= minMatches &&
        (!q || p.displayName.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)),
    );
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.displayName.localeCompare(b.displayName);
      else if (sortKey === "matches") cmp = a.matches - b.matches;
      else if (sortKey === "record") cmp = a.wins - b.wins;
      else cmp = a.winRate - b.winRate;
      if (cmp === 0) cmp = a.matches - b.matches; // tiebreak by volume
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [players, search, minMatches, sortKey, sortDir]);

  const visible = showAll ? rows : rows.slice(0, 20);

  function sortBy(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const SortHead = ({ k, label, align = "right", thClass = "" }: { k: SortKey; label: string; align?: "left" | "right"; thClass?: string }) => (
    <th className={`px-2 py-2 ${align === "left" ? "text-left" : "text-right"} font-semibold ${thClass}`}>
      <button
        type="button"
        onClick={() => sortBy(k)}
        className={`inline-flex items-center gap-1 hover:text-fab-text ${sortKey === k ? "text-fab-gold" : ""}`}
      >
        {label}
        <span className="text-[8px]">{sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-fab-border/60 bg-fab-bg/50 px-3 py-2.5">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-fab-text">
          <Users className="h-4 w-4 text-fab-dim" /> Players
          <span className="text-xs font-normal text-fab-dim">({rows.length})</span>
        </h2>
        <div className="relative ml-auto min-w-[130px] flex-1 sm:max-w-[200px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fab-dim" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowAll(true);
            }}
            placeholder="Find a player…"
            className="w-full rounded-md border border-fab-border bg-fab-bg py-1.5 pl-7 pr-2 text-xs text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none"
          />
        </div>
        <select
          value={minMatches}
          onChange={(e) => setMinMatches(Number(e.target.value))}
          className="rounded-md border border-fab-border bg-fab-bg px-2 py-1.5 text-xs text-fab-text focus:border-fab-gold/60 focus:outline-none"
        >
          {[1, 3, 5, 10, 25].map((n) => (
            <option key={n} value={n}>{n}+ matches</option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-fab-muted">No players match these filters.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-fab-bg/30 text-[10px] uppercase tracking-[0.1em] text-fab-dim">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">#</th>
              <SortHead k="name" label="Player" align="left" />
              <SortHead k="matches" label="Matches" />
              <SortHead k="record" label="W–L" thClass="hidden sm:table-cell" />
              <SortHead k="winRate" label="Win rate" />
            </tr>
          </thead>
          <tbody>
            {visible.map((p, i) => {
              const rank = i + 1;
              return (
                <tr key={p.userId} className="border-t border-fab-border/40 transition-colors hover:bg-fab-surface-hover/40">
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold tabular-nums ${
                        rank === 1
                          ? "bg-fab-gold/20 text-fab-gold"
                          : rank === 2
                            ? "bg-gray-400/20 text-gray-300"
                            : rank === 3
                              ? "bg-amber-700/25 text-amber-500"
                              : "text-fab-dim"
                      }`}
                    >
                      {rank}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <Link href={`/player/${p.username}`} className="group/p flex items-center gap-2">
                      <Avatar p={p} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-fab-text group-hover/p:text-fab-gold">{p.displayName}</span>
                        <span className="block truncate text-[10px] text-fab-dim">@{p.username}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-fab-text">{p.matches}</td>
                  <td className="hidden px-2 py-2 text-right tabular-nums text-fab-muted sm:table-cell">
                    {p.wins}–{p.matches - p.wins}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-fab-border/40 sm:block">
                        <span
                          className={`block h-full rounded-full ${p.winRate >= 50 ? "bg-fab-win" : "bg-fab-loss"}`}
                          style={{ width: `${Math.min(100, Math.max(0, p.winRate))}%` }}
                        />
                      </span>
                      <span
                        className={`w-10 text-right tabular-nums font-bold ${
                          p.winRate >= 55 ? "text-fab-win" : p.winRate < 45 ? "text-fab-loss" : "text-fab-text"
                        }`}
                      >
                        {p.winRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {rows.length > 20 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full border-t border-fab-border/40 py-2 text-xs font-semibold text-fab-muted hover:bg-fab-surface-hover/40 hover:text-fab-text"
        >
          Show all {rows.length} players
        </button>
      )}
    </Card>
  );
}

function Spotlight({
  mostActive,
  bestWinRate,
}: {
  mostActive?: StoreStats["topByActivity"][number];
  bestWinRate?: StoreStats["topByWinRate"][number];
}) {
  if (!mostActive && !bestWinRate) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {mostActive && (
        <Card padding="sm" className="border-rose-500/30 bg-rose-500/[0.04]">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-300">
            <Flame className="h-3 w-3" /> Most active player
          </p>
          <Link
            href={`/player/${mostActive.username}`}
            className="mt-1 block text-base font-black text-fab-text hover:text-fab-gold"
          >
            {mostActive.displayName}
          </Link>
          <p className="text-xs text-fab-muted">
            {mostActive.matches} matches · {mostActive.winRate}% W/R
          </p>
        </Card>
      )}
      {bestWinRate && bestWinRate.userId !== mostActive?.userId && (
        <Card padding="sm" className="border-fab-gold/30 bg-fab-gold/[0.05]">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-fab-gold">
            <Crown className="h-3 w-3" /> Highest win rate
          </p>
          <Link
            href={`/player/${bestWinRate.username}`}
            className="mt-1 block text-base font-black text-fab-text hover:text-fab-gold"
          >
            {bestWinRate.displayName}
          </Link>
          <p className="text-xs text-fab-muted">
            {bestWinRate.winRate}% W/R in {bestWinRate.matches} matches
          </p>
        </Card>
      )}
    </div>
  );
}

function LeaguesPanel({ leagues }: { leagues: League[] }) {
  return (
    <Card padding="sm">
      <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">
        <Trophy className="h-3 w-3 text-fab-gold" /> Leagues at this store
      </h3>
      {leagues.length === 0 ? (
        <p className="mt-2 text-xs text-fab-muted">
          No leagues include this store yet.{" "}
          <Link href="/leagues" className="text-fab-gold underline">
            Start one →
          </Link>
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {leagues.map((l) => (
            <li key={l.id} className="rounded-md border border-fab-border/60 bg-fab-bg/60 p-2">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/leagues/${l.slug}`}
                  className="text-sm font-semibold text-fab-text hover:text-fab-gold"
                >
                  {l.name}
                </Link>
                <StatusBadge status={l.status} />
              </div>
              <p className="text-[10px] text-fab-dim">
                {l.memberCount} players · {l.storeSlugs.length} stores
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

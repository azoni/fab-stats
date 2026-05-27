"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getStoreStats, type StoreStats } from "@/lib/store-directory";
import { getLeaguesForStore } from "@/lib/leagues";
import type { League } from "@/types";
import { ArrowLeft, Crown, Flame, Store as StoreIcon, Trophy, Users } from "lucide-react";

function StatusPill({ status }: { status: League["status"] }) {
  const map: Record<League["status"], { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-fab-bg/70 text-fab-dim border-fab-border/60" },
    active: { label: "Active", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
    completed: { label: "Completed", cls: "bg-sky-500/15 text-sky-300 border-sky-500/40" },
  };
  const { label, cls } = map[status] || map.active;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

export default function StorePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";

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

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-fab-dim">Loading store…</div>;
  }
  if (notFound || !stats) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-fab-text">
          No store found for &ldquo;{slug}&rdquo;. Stores appear in the directory once at least
          one match has been imported from that venue.
        </p>
        <Link href="/stores" className="mt-3 inline-block text-fab-gold underline">
          ← Back to stores
        </Link>
      </div>
    );
  }

  const winRate = stats.totalMatches > 0
    ? Math.round((stats.totalWins / stats.totalMatches) * 1000) / 10
    : 0;

  const mostActive = stats.topByActivity[0];
  const bestWinRate = stats.topByWinRate[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-3">
        <Link
          href="/stores"
          className="inline-flex items-center gap-1 text-xs text-fab-dim hover:text-fab-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All stores
        </Link>
      </div>

      <header className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-5">
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-black text-fab-gold sm:text-3xl">
          <StoreIcon className="inline h-6 w-6" /> {stats.name}
        </h1>
        <p className="mt-1 text-xs text-fab-dim">
          Aggregated from imported match data. Stats refresh whenever players sync new matches.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Total matches" value={stats.totalMatches.toLocaleString()} />
          <Stat label="Players logged" value={stats.uniquePlayers.toLocaleString()} />
          <Stat label="Community W/R" value={`${winRate}%`} />
          <Stat label="Leagues" value={leagues.length.toString()} />
        </div>
      </header>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <TopPlayersTable
            title="Top players by activity"
            icon={<Flame className="h-4 w-4 text-rose-300" />}
            entries={stats.topByActivity}
            metric="matches"
          />
          <TopPlayersTable
            title="Top players by win rate"
            icon={<Crown className="h-4 w-4 text-fab-gold" />}
            entries={stats.topByWinRate}
            metric="winRate"
            note="Minimum 5 matches at this store."
          />
          {stats.players.length > 0 && (
            <AllPlayersTable players={stats.players} />
          )}
        </div>

        <aside className="space-y-5">
          <Spotlight
            mostActive={mostActive}
            bestWinRate={bestWinRate}
          />
          <LeaguesPanel leagues={leagues} />
          <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-4 text-xs text-fab-dim">
            <p className="font-bold uppercase tracking-wider text-fab-text">About this store</p>
            <p className="mt-2 leading-relaxed">
              FaB Stats doesn&apos;t track stores formally — this page is built entirely from
              the &quot;venue&quot; field that players record on their matches. If you spot a
              duplicate or miscategorized store name, ask players to clean up their match
              venue strings, or organize a league that includes both names.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 px-3 py-2 shadow-inner shadow-black/10">
      <p className="text-xl font-black leading-none text-fab-gold">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-fab-dim">
        {label}
      </p>
    </div>
  );
}

function TopPlayersTable({
  title,
  icon,
  entries,
  metric,
  note,
}: {
  title: string;
  icon: React.ReactNode;
  entries: StoreStats["topByActivity"];
  metric: "matches" | "winRate";
  note?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-fab-border/70 bg-fab-bg/45">
      <div className="flex items-center gap-2 border-b border-fab-border/40 px-3 py-2">
        {icon}
        <h2 className="text-sm font-bold text-fab-gold">{title}</h2>
        {note && <span className="text-[10px] text-fab-dim">— {note}</span>}
      </div>
      {entries.length === 0 ? (
        <p className="px-3 py-4 text-xs text-fab-dim">No qualifying players yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-fab-bg/40 text-[10px] uppercase tracking-wider text-fab-dim">
            <tr>
              <th className="px-3 py-1.5 text-left">#</th>
              <th className="px-3 py-1.5 text-left">Player</th>
              <th className="px-2 py-1.5 text-right">Matches</th>
              <th className="px-2 py-1.5 text-right">W–L</th>
              <th className="px-2 py-1.5 text-right">W/R</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((p, i) => (
              <tr
                key={p.userId}
                className={`border-t border-fab-border/30 ${i === 0 ? "bg-fab-gold/[0.05]" : ""}`}
              >
                <td className="px-3 py-1.5 font-bold text-fab-dim">{i + 1}</td>
                <td className="px-3 py-1.5">
                  <Link
                    href={`/player/${p.username}`}
                    className="font-bold text-fab-text hover:text-fab-gold"
                  >
                    {p.displayName}
                  </Link>
                  <p className="text-[10px] text-fab-dim">@{p.username}</p>
                </td>
                <td className="px-2 py-1.5 text-right text-fab-text">{p.matches}</td>
                <td className="px-2 py-1.5 text-right text-fab-text">
                  {p.wins}–{p.matches - p.wins}
                </td>
                <td
                  className={`px-2 py-1.5 text-right font-bold ${
                    metric === "winRate" ? "text-fab-gold" : "text-fab-text"
                  }`}
                >
                  {p.winRate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AllPlayersTable({ players }: { players: StoreStats["players"] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? players : players.slice(0, 5);
  if (players.length <= 10) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-fab-border/70 bg-fab-bg/45">
      <div className="flex items-center justify-between border-b border-fab-border/40 px-3 py-2">
        <h2 className="text-sm font-bold text-fab-gold">
          <Users className="mr-1 inline h-3.5 w-3.5 align-[-2px]" /> All players ({players.length})
        </h2>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-fab-dim hover:text-fab-text"
        >
          {expanded ? "Collapse" : `Show all ${players.length}`}
        </button>
      </div>
      <ul className="divide-y divide-fab-border/30">
        {visible.map((p) => (
          <li key={p.userId} className="flex items-center justify-between px-3 py-1.5 text-sm">
            <Link href={`/player/${p.username}`} className="text-fab-text hover:text-fab-gold">
              {p.displayName}
            </Link>
            <span className="text-xs text-fab-dim">
              {p.matches} match{p.matches === 1 ? "" : "es"} · {p.winRate}% W/R
            </span>
          </li>
        ))}
      </ul>
    </div>
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
    <div className="space-y-3">
      {mostActive && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/[0.05] p-4">
          <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-rose-300">
            <Flame className="h-3.5 w-3.5" /> Most active player
          </p>
          <Link
            href={`/player/${mostActive.username}`}
            className="mt-1 block text-lg font-black text-fab-text hover:text-fab-gold"
          >
            {mostActive.displayName}
          </Link>
          <p className="text-xs text-fab-dim">
            {mostActive.matches} matches · {mostActive.winRate}% W/R
          </p>
        </div>
      )}
      {bestWinRate && bestWinRate.userId !== mostActive?.userId && (
        <div className="rounded-lg border border-fab-gold/30 bg-fab-gold/[0.05] p-4">
          <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-fab-gold">
            <Crown className="h-3.5 w-3.5" /> Highest win rate
          </p>
          <Link
            href={`/player/${bestWinRate.username}`}
            className="mt-1 block text-lg font-black text-fab-text hover:text-fab-gold"
          >
            {bestWinRate.displayName}
          </Link>
          <p className="text-xs text-fab-dim">
            {bestWinRate.winRate}% W/R in {bestWinRate.matches} matches
          </p>
        </div>
      )}
    </div>
  );
}

function LeaguesPanel({ leagues }: { leagues: League[] }) {
  return (
    <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-4">
      <h3 className="flex items-center gap-1 text-sm font-bold uppercase tracking-wider text-fab-dim">
        <Trophy className="h-3.5 w-3.5 text-fab-gold" /> Leagues at this store
      </h3>
      {leagues.length === 0 ? (
        <p className="mt-2 text-xs text-fab-dim">
          No leagues include this store yet.{" "}
          <Link href="/leagues" className="text-fab-gold underline">
            Start one
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {leagues.map((l) => (
            <li
              key={l.id}
              className="rounded-md border border-fab-border/40 bg-fab-bg/60 p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/leagues/${l.slug}`}
                  className="text-sm font-bold text-fab-text hover:text-fab-gold"
                >
                  {l.name}
                </Link>
                <StatusPill status={l.status} />
              </div>
              <p className="text-[10px] text-fab-dim">
                {l.memberCount} players · {l.storeSlugs.length} stores
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

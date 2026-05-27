"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getStoreStats, type StoreStats } from "@/lib/store-directory";
import { getLeaguesForStore } from "@/lib/leagues";
import type { League } from "@/types";
import { PageHero } from "@/components/ui/PageHero";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Crown, Flame, Store as StoreIcon, Trophy, Users } from "lucide-react";

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
    return (
      <div className="mx-auto max-w-5xl px-3 py-10 text-sm text-fab-muted sm:px-4">
        Loading store…
      </div>
    );
  }
  if (notFound || !stats) {
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

  const mostActive = stats.topByActivity[0];
  const bestWinRate = stats.topByWinRate[0];

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
        title={stats.name}
        description="Stats are aggregated from imported match data. Refreshes whenever players sync new matches."
        icon={<StoreIcon className="h-4 w-4" />}
        metrics={[
          { label: "Total matches", value: stats.totalMatches.toLocaleString() },
          { label: "Players logged", value: stats.uniquePlayers.toLocaleString() },
          { label: "Leagues", value: leagues.length.toString() },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <TopPlayersTable
            title="Top players by activity"
            icon={<Flame className="h-4 w-4 text-rose-300" />}
            entries={stats.topByActivity}
            highlight="matches"
          />
          <TopPlayersTable
            title="Top players by win rate"
            icon={<Crown className="h-4 w-4 text-fab-gold" />}
            entries={stats.topByWinRate}
            highlight="winRate"
            note="Minimum 5 matches at this store."
          />
          {stats.players.length > 10 && <AllPlayersTable players={stats.players} />}
        </div>

        <aside className="space-y-5">
          <Spotlight mostActive={mostActive} bestWinRate={bestWinRate} />
          <LeaguesPanel leagues={leagues} />
          <Card padding="sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">
              About this store
            </p>
            <p className="mt-2 text-xs leading-relaxed text-fab-muted">
              FaB Stats doesn&apos;t track stores formally — this page is built entirely from
              the &quot;venue&quot; field on players&apos; matches. Duplicate store names
              appear as separate entries.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function TopPlayersTable({
  title,
  icon,
  entries,
  highlight,
  note,
}: {
  title: string;
  icon: React.ReactNode;
  entries: StoreStats["topByActivity"];
  highlight: "matches" | "winRate";
  note?: string;
}) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-fab-border/60 bg-fab-bg/50 px-3 py-2">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-bold text-fab-text">{title}</h2>
        </div>
        {note && <span className="text-[10px] text-fab-dim">{note}</span>}
      </div>
      {entries.length === 0 ? (
        <p className="px-3 py-4 text-xs text-fab-muted">No qualifying players yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-fab-bg/30 text-[10px] uppercase tracking-[0.1em] text-fab-dim">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Player</th>
              <th className="px-2 py-2 text-right">Matches</th>
              <th className="px-2 py-2 text-right">W–L</th>
              <th className="px-2 py-2 text-right">W/R</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((p, i) => (
              <tr
                key={p.userId}
                className={`border-t border-fab-border/40 ${i === 0 ? "bg-fab-gold/[0.05]" : ""}`}
              >
                <td className="px-3 py-2 font-semibold text-fab-dim tabular-nums">{i + 1}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/player/${p.username}`}
                    className="font-semibold text-fab-text hover:text-fab-gold"
                  >
                    {p.displayName}
                  </Link>
                  <p className="text-[10px] text-fab-dim">@{p.username}</p>
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-fab-text">{p.matches}</td>
                <td className="px-2 py-2 text-right tabular-nums text-fab-text">
                  {p.wins}–{p.matches - p.wins}
                </td>
                <td
                  className={`px-2 py-2 text-right tabular-nums font-bold ${
                    highlight === "winRate" ? "text-fab-gold" : "text-fab-text"
                  }`}
                >
                  {p.winRate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function AllPlayersTable({ players }: { players: StoreStats["players"] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? players : players.slice(0, 5);
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-fab-border/60 bg-fab-bg/50 px-3 py-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-fab-text">
          <Users className="h-3.5 w-3.5 text-fab-dim" /> All players ({players.length})
        </h2>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-fab-muted hover:text-fab-text"
        >
          {expanded ? "Collapse" : `Show all ${players.length}`}
        </button>
      </div>
      <ul className="divide-y divide-fab-border/30">
        {visible.map((p) => (
          <li key={p.userId} className="flex items-center justify-between px-3 py-2 text-sm">
            <Link href={`/player/${p.username}`} className="text-fab-text hover:text-fab-gold">
              {p.displayName}
            </Link>
            <span className="text-xs text-fab-dim tabular-nums">
              {p.matches} match{p.matches === 1 ? "" : "es"} · {p.winRate}% W/R
            </span>
          </li>
        ))}
      </ul>
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
    <div className="space-y-3">
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

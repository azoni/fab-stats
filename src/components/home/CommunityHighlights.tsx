"use client";
import { memo, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { Flame, TrendingUp, Trophy } from "lucide-react";
import { HeroImg } from "@/components/heroes/HeroImg";
import { playerHref } from "@/lib/constants";
import type { LeaderboardEntry } from "@/types";
import { PollCard } from "./PollCard";

const PLACEMENT = {
  champion: { emoji: "🏆", label: "Champion" },
  finalist: { emoji: "🥈", label: "Finalist" },
  top4: { emoji: "🥉", label: "Top 4" },
  top8: { emoji: "🎖️", label: "Top 8" },
} as const;

function HighlightCard({ icon, title, accent, children }: { icon: ReactNode; title: string; accent: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-fab-border/80 bg-fab-surface/80 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.18)] backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${accent}`}>{icon}</span>
        <h3 className="text-xs font-black uppercase tracking-[0.14em] text-fab-muted">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Avatar({ photoUrl, name }: { photoUrl?: string; name: string }) {
  if (photoUrl && photoUrl.startsWith("http")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" loading="lazy" />;
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fab-gold/15 text-[10px] font-bold text-fab-gold">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

interface Props {
  entries?: LeaderboardEntry[];
}

export const CommunityHighlights = memo(function CommunityHighlights({ entries = [] }: Props) {
  // Hot heroes this week — aggregate everyone's weeklyHeroBreakdown.
  const hotHeroes = useMemo(() => {
    const agg = new Map<string, { matches: number; wins: number; players: Set<string> }>();
    for (const e of entries) {
      for (const hb of e.weeklyHeroBreakdown ?? []) {
        if (!hb.hero || hb.hero === "Unknown") continue;
        const cur = agg.get(hb.hero) ?? { matches: 0, wins: 0, players: new Set<string>() };
        cur.matches += hb.matches;
        cur.wins += hb.wins;
        cur.players.add(e.userId);
        agg.set(hb.hero, cur);
      }
    }
    return [...agg.entries()]
      .map(([hero, d]) => ({ hero, matches: d.matches, players: d.players.size, winRate: d.matches > 0 ? (d.wins / d.matches) * 100 : 0 }))
      .filter((h) => h.matches >= 2)
      .sort((a, b) => b.matches - a.matches)
      .slice(0, 5);
  }, [entries]);

  // Most active players this week.
  const mostActive = useMemo(() => {
    return entries
      .filter((e) => e.isPublic && (e.weeklyMatches ?? 0) > 0)
      .sort((a, b) => (b.weeklyMatches ?? 0) - (a.weeklyMatches ?? 0))
      .slice(0, 5);
  }, [entries]);

  // Recent Top 8 finishes across the community.
  const recentTop8s = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const seen = new Set<string>();
    const rows: { username: string; displayName: string; photoUrl?: string; hero: string; placementType: string; eventName: string; eventDate: string }[] = [];
    for (const e of entries) {
      for (const t8 of e.top8Heroes ?? []) {
        if (!t8.eventDate || new Date(t8.eventDate).getTime() < cutoff) continue;
        const key = `${e.userId}|${t8.eventName}|${t8.eventDate}|${t8.hero}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({ username: e.username, displayName: e.displayName, photoUrl: e.photoUrl, hero: t8.hero, placementType: t8.placementType, eventName: t8.eventName, eventDate: t8.eventDate });
      }
    }
    const order = ["champion", "finalist", "top4", "top8"];
    rows.sort((a, b) => {
      const d = b.eventDate.localeCompare(a.eventDate);
      if (d !== 0) return d;
      return order.indexOf(a.placementType) - order.indexOf(b.placementType);
    });
    return rows.slice(0, 5);
  }, [entries]);

  return (
    <div className="space-y-5">
      <PollCard />

      {hotHeroes.length > 0 && (
        <HighlightCard icon={<Flame className="h-4 w-4 text-rose-300" />} title="Hot Heroes · This Week" accent="border border-rose-400/25 bg-rose-400/10">
          <ul className="space-y-2">
            {hotHeroes.map((h, i) => (
              <li key={h.hero} className="flex items-center gap-2">
                <span className="w-3 shrink-0 text-[11px] font-bold text-fab-dim">{i + 1}</span>
                <HeroImg name={h.hero} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm text-fab-text">{h.hero}</span>
                <span className={`shrink-0 text-xs font-bold tabular-nums ${h.winRate >= 55 ? "text-emerald-300" : h.winRate >= 45 ? "text-fab-muted" : "text-rose-300"}`}>
                  {h.winRate.toFixed(0)}%
                </span>
                <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-fab-dim">{h.matches}m</span>
              </li>
            ))}
          </ul>
        </HighlightCard>
      )}

      {recentTop8s.length > 0 && (
        <HighlightCard icon={<Trophy className="h-4 w-4 text-fab-gold" />} title="Recent Top 8s" accent="border border-fab-gold/25 bg-fab-gold/10">
          <ul className="space-y-2">
            {recentTop8s.map((r, i) => {
              const p = PLACEMENT[r.placementType as keyof typeof PLACEMENT] ?? PLACEMENT.top8;
              return (
                <li key={`${r.username}-${r.eventDate}-${r.hero}-${i}`} className="flex items-center gap-2">
                  <span className="shrink-0 text-sm">{p.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={playerHref(r.username)} className="block truncate text-sm font-semibold text-fab-text hover:text-fab-gold">
                      {r.displayName}
                    </Link>
                    <p className="truncate text-[11px] text-fab-dim">{r.hero} · {r.eventName}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </HighlightCard>
      )}

      {mostActive.length > 0 && (
        <HighlightCard icon={<TrendingUp className="h-4 w-4 text-sky-300" />} title="Most Active · This Week" accent="border border-sky-400/25 bg-sky-400/10">
          <ul className="space-y-2">
            {mostActive.map((e) => (
              <li key={e.userId} className="flex items-center gap-2">
                <Avatar photoUrl={e.photoUrl} name={e.displayName} />
                <Link href={playerHref(e.username)} className="min-w-0 flex-1 truncate text-sm font-semibold text-fab-text hover:text-fab-gold">
                  {e.displayName}
                </Link>
                <span className="shrink-0 text-xs font-bold tabular-nums text-sky-300">{e.weeklyMatches}</span>
                <span className="shrink-0 text-[11px] text-fab-dim">matches</span>
              </li>
            ))}
          </ul>
        </HighlightCard>
      )}
    </div>
  );
});

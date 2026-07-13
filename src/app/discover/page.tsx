"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Compass, Shield, Store, Trophy, Users } from "lucide-react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCommunityStats } from "@/hooks/useCommunityStats";
import { getStoreDirectory } from "@/lib/store-directory";

type Accent = {
  iconWrap: string;
  text: string;
  glow: string;
  hover: string;
};

const ACCENTS: Record<string, Accent> = {
  emerald: {
    iconWrap: "text-emerald-300 bg-emerald-400/12 border-emerald-400/25",
    text: "text-emerald-300",
    glow: "bg-emerald-400/25",
    hover: "hover:border-emerald-400/55 hover:shadow-[0_16px_44px_-18px_rgba(52,211,153,0.45)]",
  },
  amber: {
    iconWrap: "text-amber-300 bg-amber-400/12 border-amber-400/25",
    text: "text-amber-300",
    glow: "bg-amber-400/25",
    hover: "hover:border-amber-400/55 hover:shadow-[0_16px_44px_-18px_rgba(251,191,36,0.45)]",
  },
  gold: {
    iconWrap: "text-fab-gold bg-fab-gold/12 border-fab-gold/25",
    text: "text-fab-gold",
    glow: "bg-fab-gold/25",
    hover: "hover:border-fab-gold/60 hover:shadow-[0_16px_44px_-18px_rgba(201,168,76,0.5)]",
  },
  sky: {
    iconWrap: "text-sky-300 bg-sky-400/12 border-sky-400/25",
    text: "text-sky-300",
    glow: "bg-sky-400/25",
    hover: "hover:border-sky-400/55 hover:shadow-[0_16px_44px_-18px_rgba(56,189,248,0.45)]",
  },
};

type Dest = {
  key: "players" | "stores" | "leagues" | "teams";
  href: string;
  title: string;
  desc: string;
  unit: string;
  icon: typeof Users;
  accent: Accent;
  badge?: string;
};

const DESTINATIONS: Dest[] = [
  { key: "players", href: "/players", title: "Players", unit: "players", desc: "Find players, coaching guides, decklists, and socials across the community.", icon: Users, accent: ACCENTS.emerald },
  { key: "stores", href: "/stores", title: "Stores", unit: "stores", badge: "Beta", desc: "Browse game stores and the players who log their matches there.", icon: Store, accent: ACCENTS.amber },
  { key: "leagues", href: "/leagues", title: "Leagues", unit: "leagues", badge: "Beta", desc: "Join or run a store league and follow the live standings.", icon: Trophy, accent: ACCENTS.gold },
  { key: "teams", href: "/teams", title: "Teams", unit: "teams", desc: "Team hubs, rosters, and shared stats for your crew.", icon: Shield, accent: ACCENTS.sky },
];

const CACHE_KEY = "fabstats.discover-counts.v2";
const CACHE_TTL = 10 * 60_000;

type Counts = { stores?: number; leagues?: number; teams?: number };

function formatCount(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: n >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}

export default function DiscoverPage() {
  const { userCount } = useCommunityStats();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let fresh = false;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { c, ts } = JSON.parse(raw);
        setCounts(c);
        setSettled(true);
        fresh = Date.now() - ts < CACHE_TTL;
      }
    } catch {
      /* no storage */
    }
    if (fresh) return;

    // Count aggregations (~1 read each) instead of downloading up to 150 full
    // league/team docs; also returns the true, uncapped totals.
    Promise.allSettled([
      getStoreDirectory(),
      getCountFromServer(collection(db, "leagues")),
      getCountFromServer(query(collection(db, "teams"), where("memberCount", ">", 0))),
    ]).then((r) => {
      if (cancelled) return;
      const c: Counts = {
        stores: r[0].status === "fulfilled" ? r[0].value.length : undefined,
        leagues: r[1].status === "fulfilled" ? r[1].value.data().count : undefined,
        teams: r[2].status === "fulfilled" ? r[2].value.data().count : undefined,
      };
      setCounts(c);
      setSettled(true);
      // Only cache a fully-successful result — caching a partial failure would
      // freeze a stuck skeleton for the whole TTL.
      if (r.every((x) => x.status === "fulfilled")) {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ c, ts: Date.now() }));
        } catch {
          /* no storage */
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const countFor = (key: Dest["key"]): number | undefined =>
    key === "players" ? (userCount || undefined) : counts?.[key];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-fab-border bg-fab-surface/95 p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_8%_-20%,rgba(201,168,76,0.12),transparent),radial-gradient(ellipse_45%_60%_at_95%_130%,rgba(56,189,248,0.09),transparent)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-lg border border-fab-border/70 bg-fab-bg/70 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-fab-gold">
            <Compass className="h-4 w-4" />
            Discover
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-fab-text sm:text-4xl">Explore the community</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-fab-muted sm:text-base">
            Players, stores, leagues, and teams — jump into any corner of FaB Stats.
          </p>
        </div>
      </section>

      {/* Destination cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {DESTINATIONS.map((d) => {
          const Icon = d.icon;
          const count = countFor(d.key);
          return (
            <Link
              key={d.key}
              href={d.href}
              className={`group relative overflow-hidden rounded-2xl border border-fab-border bg-fab-surface/90 p-5 transition-all duration-200 hover:-translate-y-0.5 ${d.accent.hover}`}
            >
              {/* Accent glow on hover */}
              <div className={`pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100 ${d.accent.glow}`} />

              <div className="relative flex items-start justify-between">
                <span className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl border ${d.accent.iconWrap}`}>
                  <Icon className="h-7 w-7" />
                </span>
                <ArrowRight className="mt-1 h-5 w-5 text-fab-dim transition-all duration-200 group-hover:translate-x-1 group-hover:text-fab-gold" />
              </div>

              <div className="relative mt-4 flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-fab-text">{d.title}</h2>
                {d.badge && (
                  <span className="rounded-full border border-fab-border bg-fab-bg/70 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-fab-dim">
                    {d.badge}
                  </span>
                )}
              </div>
              <p className="relative mt-1 text-sm leading-6 text-fab-muted">{d.desc}</p>

              <div className="relative mt-4 flex items-baseline gap-1.5">
                {count != null ? (
                  <span className={`text-2xl font-black tabular-nums ${d.accent.text}`}>{formatCount(count)}</span>
                ) : settled ? (
                  <span className={`text-2xl font-black ${d.accent.text}`}>—</span>
                ) : (
                  <span className="h-6 w-12 animate-pulse rounded bg-fab-border/60" />
                )}
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-fab-dim">{d.unit}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

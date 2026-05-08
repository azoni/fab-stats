"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Compass, ExternalLink, GraduationCap, Search, Users } from "lucide-react";
import { getDiscoverProfiles } from "@/lib/firestore-storage";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import type { LeaderboardEntry, UserProfile } from "@/types";

type LinkFilter = "all" | "metafy" | "fabrary" | "twitter";

interface DiscoverLink {
  type: Exclude<LinkFilter, "all">;
  label: string;
  href: string;
  meta: string;
}

const FILTERS: { id: LinkFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "metafy", label: "Metafy" },
  { id: "fabrary", label: "Decklists" },
  { id: "twitter", label: "X" },
];

function withProtocol(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function profileLinks(profile: UserProfile): DiscoverLink[] {
  const links = profile.socialLinks;
  if (!links) return [];
  const out: DiscoverLink[] = [];

  if (links.metafy) {
    out.push({
      type: "metafy",
      label: links.metafyTitle || "Metafy guide",
      href: withProtocol(links.metafy),
      meta: "Coaching and guides",
    });
  }

  if (links.fabrary) {
    out.push({
      type: "fabrary",
      label: links.fabraryName || "Fabrary deck",
      href: links.fabrary.startsWith("http") ? links.fabrary : `https://fabrary.net/decks/${links.fabrary}`,
      meta: "Decklist",
    });
  }

  if (links.twitter) {
    const handle = links.twitter.replace(/^@/, "");
    out.push({
      type: "twitter",
      label: `@${handle}`,
      href: `https://x.com/${handle}`,
      meta: "Social",
    });
  }

  return out;
}

function linkIcon(type: DiscoverLink["type"]) {
  if (type === "metafy") return <GraduationCap className="h-3.5 w-3.5" />;
  if (type === "fabrary") return <BookOpen className="h-3.5 w-3.5" />;
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function formatWinRate(entry?: LeaderboardEntry): string {
  if (!entry || !Number.isFinite(entry.winRate)) return "No data";
  return `${entry.winRate.toFixed(1)}%`;
}

function formatMatches(entry?: LeaderboardEntry): string {
  if (!entry) return "0";
  return new Intl.NumberFormat("en-US", { notation: entry.totalMatches >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(entry.totalMatches);
}

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LinkFilter>("all");
  const [query, setQuery] = useState("");
  const { entries } = useLeaderboard(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDiscoverProfiles()
      .then((items) => {
        if (!cancelled) setProfiles(items);
      })
      .catch(() => {
        if (!cancelled) setProfiles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const entryByUid = useMemo(() => new Map(entries.map((entry) => [entry.userId, entry])), [entries]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles
      .map((profile) => ({ profile, links: profileLinks(profile), entry: entryByUid.get(profile.uid) }))
      .filter((row) => row.links.length > 0)
      .filter((row) => filter === "all" || row.links.some((link) => link.type === filter))
      .filter((row) => {
        if (!q) return true;
        const haystack = [
          row.profile.displayName,
          row.profile.username,
          row.profile.socialLinks?.twitter,
          row.profile.socialLinks?.fabraryName,
          row.profile.socialLinks?.metafyTitle,
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => (b.entry?.totalMatches ?? 0) - (a.entry?.totalMatches ?? 0));
  }, [entryByUid, filter, profiles, query]);

  const counts = useMemo(() => {
    const base: Record<LinkFilter, number> = { all: 0, metafy: 0, fabrary: 0, twitter: 0 };
    for (const profile of profiles) {
      const links = profileLinks(profile);
      if (links.length === 0) continue;
      base.all += 1;
      for (const type of new Set(links.map((link) => link.type))) base[type] += 1;
    }
    return base;
  }, [profiles]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-xl border border-fab-border bg-fab-surface/95 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-lg border border-fab-border/70 bg-fab-bg/70 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-fab-gold">
              <Compass className="h-4 w-4" />
              Discover
            </div>
            <h1 className="mt-4 text-3xl font-black text-fab-text sm:text-4xl">Find players, guides, and decks</h1>
            <p className="mt-3 text-sm leading-6 text-fab-muted">
              Browse public profiles that have shared Metafy guides, Fabrary decklists, or X handles.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[24rem]">
            <Metric label="Profiles" value={counts.all.toString()} />
            <Metric label="Guides" value={counts.metafy.toString()} tone="green" />
            <Metric label="Decks" value={counts.fabrary.toString()} tone="blue" />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-fab-border bg-fab-surface/90 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fab-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players, guides, deck names..."
              className="w-full rounded-lg border border-fab-border bg-fab-bg py-2.5 pl-9 pr-3 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-fab-border bg-fab-bg/65 p-1">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold transition-colors ${
                  filter === item.id
                    ? "bg-fab-gold/15 text-fab-gold"
                    : "text-fab-muted hover:bg-fab-surface-hover hover:text-fab-text"
                }`}
              >
                {item.label}
                <span className="ml-2 text-fab-dim">{counts[item.id]}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-fab-border bg-fab-surface" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-fab-border bg-fab-surface/80 p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-fab-dim" />
          <p className="mt-3 text-sm font-bold text-fab-text">No profiles found</p>
          <p className="mt-1 text-sm text-fab-muted">Try a different filter or search term.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ profile, links, entry }) => (
            <article key={profile.uid} className="rounded-xl border border-fab-border bg-fab-surface/90 p-4 transition-colors hover:border-fab-gold/45 hover:bg-fab-surface-hover/80">
              <div className="flex items-start gap-3">
                <Link href={`/player/${profile.username}`} className="shrink-0">
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt="" className="h-12 w-12 rounded-full border border-fab-border object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-fab-border bg-fab-bg text-sm font-black text-fab-gold">
                      {(profile.displayName || profile.username).charAt(0).toUpperCase()}
                    </span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/player/${profile.username}`} className="block">
                    <h2 className="truncate text-base font-black text-fab-text transition-colors hover:text-fab-gold">{profile.displayName}</h2>
                    <p className="text-xs text-fab-dim">@{profile.username}</p>
                  </Link>
                  {profile.socialLinks?.discord && (
                    <p className="mt-1 truncate text-[11px] text-fab-muted">Discord: {profile.socialLinks.discord}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-fab-border bg-fab-bg/65 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">Win Rate</p>
                  <p className="text-sm font-black text-fab-text">{formatWinRate(entry)}</p>
                </div>
                <div className="rounded-lg border border-fab-border bg-fab-bg/65 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">Matches</p>
                  <p className="text-sm font-black text-fab-text">{formatMatches(entry)}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {links.filter((link) => filter === "all" || link.type === filter).map((link) => (
                  <a
                    key={`${profile.uid}-${link.type}-${link.href}`}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-fab-border bg-fab-bg/65 px-3 py-2 text-sm transition-colors hover:border-fab-gold/45 hover:text-fab-gold"
                  >
                    <span className="text-fab-gold">{linkIcon(link.type)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-fab-text">{link.label}</span>
                      <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">{link.meta}</span>
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-fab-dim" />
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone = "gold" }: { label: string; value: string; tone?: "gold" | "green" | "blue" }) {
  const color = tone === "green" ? "text-emerald-300" : tone === "blue" ? "text-sky-300" : "text-fab-gold";
  return (
    <div className="rounded-lg border border-fab-border bg-fab-bg/65 px-3 py-2">
      <p className={`text-lg font-black leading-none ${color}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">{label}</p>
    </div>
  );
}

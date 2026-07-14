"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, GraduationCap, Search, Settings, UserCircle, Users } from "lucide-react";
import { getDiscoverProfiles } from "@/lib/firestore-storage";
import { getCommunityPlayers, invalidateCommunityPlayersCache, type DirectoryPlayer } from "@/lib/community-directory";
import { useCommunityStats } from "@/hooks/useCommunityStats";
import { useAuth } from "@/contexts/AuthContext";
import { TeamBadge } from "@/components/profile/TeamBadge";
import { getHeroPortraitUrl, resolveHeroName } from "@/lib/heroes";
import type { UserProfile } from "@/types";

/** DiscoverLink types double as the link-filter ids. */
type LinkType = "metafy-guide" | "metafy-profile" | "fabrary" | "twitter";
type LinkFilter = "all" | LinkType;
type SortKey = "active" | "matches" | "winRate" | "rating" | "newest" | "name";

interface DiscoverLink {
  type: LinkType;
  label: string;
  href: string;
}

const FILTERS: { id: LinkFilter; label: string }[] = [
  { id: "all", label: "All players" },
  { id: "metafy-guide", label: "Guides" },
  { id: "fabrary", label: "Decklists" },
  { id: "twitter", label: "X" },
];

const SORTS: { id: SortKey; label: string }[] = [
  { id: "active", label: "Recently active" },
  { id: "matches", label: "Most games" },
  { id: "winRate", label: "Best win rate" },
  { id: "rating", label: "Highest rating" },
  { id: "newest", label: "Newest" },
  { id: "name", label: "Name A–Z" },
];

const SITE_CREATOR_USERNAME = "azoni";
const SITE_CREATOR_DISCOVER_LINKS: NonNullable<UserProfile["socialLinks"]> = {
  twitter: "azoniTCG",
  metafyGuide: "https://mfy.gg/@azoni/members?membershipId=99383fe4-b403-4f05-a041-c3212bd7ea30",
  metafyGuideTitle: "Azoni's Competitive Hala",
  metafyProfile: "https://mfy.gg/@azoni",
  fabrary: "https://fabrary.net/decks?search=Azoni%27s%20Competitive%20Dori",
  fabraryName: "Azoni's Competitive Dori",
};

function withProtocol(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function twitterHref(value: string): { label: string; href: string } {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/(?:x|twitter)\.com\/([^/?#]+)/i);
  const handle = (urlMatch?.[1] || trimmed).replace(/^@/, "");
  return {
    label: `@${handle}`,
    href: /^https?:\/\//i.test(trimmed) ? trimmed : `https://x.com/${handle}`,
  };
}

function profileLinks(links: UserProfile["socialLinks"]): DiscoverLink[] {
  if (!links) return [];
  const out: DiscoverLink[] = [];
  const metafyGuide = links.metafyGuide || links.metafy;
  const metafyGuideTitle = links.metafyGuideTitle || links.metafyTitle;
  if (metafyGuide) out.push({ type: "metafy-guide", label: metafyGuideTitle || "Guide", href: withProtocol(metafyGuide) });
  if (links.metafyProfile) out.push({ type: "metafy-profile", label: "Metafy", href: withProtocol(links.metafyProfile) });
  if (links.fabrary) {
    out.push({
      type: "fabrary",
      label: links.fabraryName || "Decklist",
      href: links.fabrary.startsWith("http") ? links.fabrary : `https://fabrary.net/decks/${links.fabrary}`,
    });
  }
  if (links.twitter) {
    const t = twitterHref(links.twitter);
    out.push({ type: "twitter", label: t.label, href: t.href });
  }
  return out;
}

const LINK_TONES: Record<LinkType, { label: string; chip: string }> = {
  "metafy-guide": { label: "Guide", chip: "text-emerald-300 bg-emerald-400/12 border-emerald-400/25" },
  "metafy-profile": { label: "Metafy", chip: "text-fab-gold bg-fab-gold/12 border-fab-gold/25" },
  fabrary: { label: "Deck", chip: "text-sky-300 bg-sky-400/12 border-sky-400/25" },
  twitter: { label: "X", chip: "text-zinc-200 bg-zinc-300/12 border-zinc-300/20" },
};

function linkIcon(type: LinkType) {
  if (type === "metafy-guide") return <GraduationCap className="h-3 w-3" />;
  if (type === "metafy-profile") return <UserCircle className="h-3 w-3" />;
  if (type === "fabrary") return <BookOpen className="h-3 w-3" />;
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function playerInitial(name: string): string {
  return (name || "?").charAt(0).toUpperCase();
}

function LinkChip({ link }: { link: DiscoverLink }) {
  const tone = LINK_TONES[link.type];
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      title={link.label}
      className={`inline-flex max-w-[140px] items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] transition-opacity hover:opacity-80 ${tone.chip}`}
    >
      {linkIcon(link.type)}
      <span className="truncate">{link.label}</span>
    </a>
  );
}

function shortHero(name: string): string {
  return name.split(",")[0].trim();
}

function PlayerRow({ p, hero, links }: { p: DirectoryPlayer; hero?: string; links?: DiscoverLink[] }) {
  const portrait = hero ? getHeroPortraitUrl(hero) : null;
  return (
    <div className="group relative rounded-xl border border-fab-border bg-fab-surface/90 px-3 py-2.5 transition-colors hover:border-fab-gold/45 hover:bg-fab-surface-hover/80">
      <div className="flex items-center gap-3">
        {p.photoUrl ? (
          <img src={p.photoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full border border-fab-border object-cover" />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-fab-border bg-fab-bg text-sm font-black text-fab-gold">
            {playerInitial(p.displayName || p.username)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            {/* Stretched link — the whole card navigates to the profile. */}
            <Link
              href={`/player/${p.username}`}
              className="truncate text-sm font-black text-fab-text transition-colors after:absolute after:inset-0 group-hover:text-fab-gold"
            >
              {p.displayName}
            </Link>
            {p.teamName && (
              <span className="relative z-10 shrink-0">
                <TeamBadge teamName={p.teamName} teamIconUrl={p.teamIconUrl} size="sm" />
              </span>
            )}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-fab-dim">
            <span className="shrink-0">@{p.username}</span>
            {hero && portrait && (
              <span className="flex min-w-0 items-center gap-1">
                <img
                  src={portrait}
                  alt=""
                  loading="lazy"
                  className="h-5 w-5 shrink-0 rounded-full border border-fab-border object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="truncate">{shortHero(hero)}</span>
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          {p.matches > 0 ? (
            <>
              <p className="text-sm font-black tabular-nums text-fab-text">
                {p.matches.toLocaleString()}
                <span className="ml-1 text-[10px] font-bold uppercase text-fab-dim">gp</span>
              </p>
              {typeof p.winRate === "number" && <p className="text-[11px] font-bold text-fab-muted">{p.winRate.toFixed(1)}% WR</p>}
            </>
          ) : (
            <span className="rounded-full border border-fab-border bg-fab-bg/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fab-dim">New</span>
          )}
        </div>
      </div>
      {links && links.length > 0 && (
        <div className="relative z-10 mt-2 flex flex-wrap gap-1 pl-12">
          {links.map((link) => (
            <LinkChip key={`${p.username}-${link.type}-${link.href}`} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlayersPage() {
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = !!user;
  const { userCount } = useCommunityStats();

  const [players, setPlayers] = useState<DirectoryPlayer[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState("");
  const [linkFilter, setLinkFilter] = useState<LinkFilter>("all");
  const [heroFilter, setHeroFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("active");
  const [visibleCount, setVisibleCount] = useState(30);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const deferredQuery = useDeferredValue(query);

  // Single-doc directory read (fast). No full leaderboard load. getCommunityPlayers
  // rejects on a hard failure so we can show an error state (not a false "empty").
  // Wait for auth to resolve so a signed-in hard-load doesn't fetch the guest doc
  // then immediately re-fetch the authed doc (skeleton flash + wasted read).
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setPlayers(null);
    setLoadError(false);
    getCommunityPlayers(isAuthenticated)
      .then((items) => !cancelled && setPlayers(items))
      .catch(() => !cancelled && setLoadError(true));
    return () => { cancelled = true; };
  }, [isAuthenticated, authLoading, retryKey]);

  const retry = () => {
    invalidateCommunityPlayersCache();
    setRetryKey((k) => k + 1);
  };

  // Link chips come from the discover-links query (server-filtered on
  // hasDiscoverLinks). It is cached, but note it can fan out to a broad profile
  // scan while link adoption is low — see getDiscoverProfiles.
  useEffect(() => {
    let cancelled = false;
    getDiscoverProfiles()
      .then((items) => !cancelled && setProfiles(items))
      .catch(() => !cancelled && setProfiles([]));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setVisibleCount(30);
  }, [deferredQuery, linkFilter, heroFilter, sort]);

  const linkInfo = useMemo(() => {
    const map = new Map<string, DiscoverLink[]>();
    const add = (username: string | undefined, links: DiscoverLink[]) => {
      if (!username || links.length === 0) return;
      map.set(username.toLowerCase(), links);
    };
    add(SITE_CREATOR_USERNAME, profileLinks(SITE_CREATOR_DISCOVER_LINKS));
    for (const p of profiles) add(p.username, profileLinks(p.socialLinks));
    return map;
  }, [profiles]);

  // Count over the intersection with the directory so each badge matches the
  // number of rows its filter actually shows.
  const linkCounts = useMemo(() => {
    const base: Record<LinkType, number> = { "metafy-guide": 0, "metafy-profile": 0, fabrary: 0, twitter: 0 };
    if (!players) return base;
    for (const p of players) {
      const links = linkInfo.get(p.username);
      if (!links) continue;
      for (const type of new Set(links.map((l) => l.type))) base[type] += 1;
    }
    return base;
  }, [players, linkInfo]);

  const linkedCount = useMemo(
    () => (players ? players.filter((p) => linkInfo.has(p.username)).length : 0),
    [players, linkInfo],
  );

  // Resolve each player's topHero to a canonical FaB hero, dropping gibberish
  // (mis-parsed import values that don't match any real hero).
  const heroByUsername = useMemo(() => {
    const map = new Map<string, string>();
    if (!players) return map;
    const cache = new Map<string, string | null>();
    for (const p of players) {
      const raw = p.topHero;
      if (!raw) continue;
      if (!cache.has(raw)) cache.set(raw, resolveHeroName(raw));
      const canonical = cache.get(raw);
      if (canonical) map.set(p.username, canonical);
    }
    return map;
  }, [players]);

  const heroOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const hero of heroByUsername.values()) counts.set(hero, (counts.get(hero) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([hero, count]) => ({ hero, count }));
  }, [heroByUsername]);

  const activeCount = useMemo(() => (players ? players.filter((p) => p.matches > 0).length : 0), [players]);

  const rows = useMemo(() => {
    if (!players) return [] as DirectoryPlayer[];
    const q = deferredQuery.trim().toLowerCase();
    let list = players;
    if (linkFilter !== "all") {
      list = list.filter((p) => linkInfo.get(p.username)?.some((l) => l.type === linkFilter) ?? false);
    }
    if (heroFilter) list = list.filter((p) => heroByUsername.get(p.username) === heroFilter);
    if (q) {
      list = list.filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          p.username.includes(q) ||
          (heroByUsername.get(p.username)?.toLowerCase().includes(q) ?? false),
      );
    }
    const sorted = [...list];
    if (sort === "active") {
      // Gate recency on having played so zero-game signups don't top the
      // discovery view purely by visiting.
      const key = (p: DirectoryPlayer) => (p.matches > 0 ? (p.lastVisit ?? 0) : -1);
      sorted.sort((a, b) => key(b) - key(a) || b.matches - a.matches);
    } else if (sort === "winRate") {
      const wr = (p: DirectoryPlayer) => (p.matches >= 10 && typeof p.winRate === "number" ? p.winRate : -1);
      sorted.sort((a, b) => wr(b) - wr(a) || b.matches - a.matches);
    } else if (sort === "rating") {
      sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || b.matches - a.matches);
    } else if (sort === "newest") {
      sorted.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    } else if (sort === "name") {
      sorted.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } else {
      sorted.sort((a, b) => b.matches - a.matches);
    }
    return sorted;
  }, [players, deferredQuery, linkFilter, heroFilter, sort, linkInfo, heroByUsername]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (obsEntries) => {
        if (obsEntries.some((e) => e.isIntersecting)) setVisibleCount((n) => n + 30);
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, rows.length]);

  const selectClass =
    "rounded-lg border border-fab-border bg-fab-bg px-3 py-2.5 text-sm font-bold text-fab-text focus:border-fab-gold/60 focus:outline-none";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Header */}
      <section className="rounded-xl border border-fab-border bg-fab-surface/95 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-lg border border-fab-border/70 bg-fab-bg/70 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-fab-gold sm:px-3 sm:py-2 sm:text-[11px] sm:tracking-[0.16em]">
                <Users className="h-4 w-4" />
                Players
              </div>
              <Link
                href="/settings#discover"
                className="inline-flex items-center gap-1.5 rounded-lg border border-fab-border/70 bg-fab-bg/60 px-2.5 py-1.5 text-[10px] font-bold text-fab-muted transition-colors hover:border-fab-gold/45 hover:text-fab-gold sm:px-3 sm:py-2 sm:text-xs"
              >
                <Settings className="h-3.5 w-3.5" />
                Edit my links
              </Link>
            </div>
            <h1 className="mt-2 text-lg font-black text-fab-text sm:mt-3 sm:text-3xl">Player directory</h1>
            <p className="mt-2 hidden text-sm leading-6 text-fab-muted sm:block">
              Search every player, filter by most-played hero, and find guides, decklists, and coaches from the community.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:min-w-[22rem] sm:gap-2">
            <Metric label="Players" value={(players ? players.length : userCount || 0).toLocaleString()} />
            <Metric label="With stats" value={activeCount.toLocaleString()} tone="green" />
            <Metric label="With links" value={linkedCount.toLocaleString()} tone="blue" />
          </div>
        </div>
      </section>

      {/* Search + filters */}
      <section className="rounded-xl border border-fab-border bg-fab-surface/90 p-3 sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fab-dim" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search players"
            placeholder="Search all players by name or @username..."
            className="w-full rounded-lg border border-fab-border bg-fab-bg py-2.5 pl-9 pr-3 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none"
          />
        </div>
        <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-fab-border bg-fab-bg/65 p-1">
            {FILTERS.map((item) => {
              const count = item.id === "all" ? undefined : linkCounts[item.id as LinkType];
              return (
                <button
                  key={item.id}
                  onClick={() => setLinkFilter(item.id)}
                  aria-pressed={linkFilter === item.id}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors ${
                    linkFilter === item.id ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:bg-fab-surface-hover hover:text-fab-text"
                  }`}
                >
                  {item.label}
                  {count !== undefined && <span className="ml-1.5 text-fab-dim">{count}</span>}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <select value={heroFilter} onChange={(e) => setHeroFilter(e.target.value)} className={`${selectClass} min-w-0 flex-1`} aria-label="Filter by hero">
              <option value="">All heroes</option>
              {heroOptions.map((h) => (
                <option key={h.hero} value={h.hero}>
                  {h.hero} ({h.count})
                </option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={`${selectClass} min-w-0 flex-1`} aria-label="Sort players">
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Directory */}
      {loadError ? (
        <div className="rounded-xl border border-fab-border bg-fab-surface/80 p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-fab-dim" />
          <p className="mt-3 text-sm font-bold text-fab-text">Couldn&apos;t load the player directory</p>
          <p className="mt-1 text-sm text-fab-muted">Check your connection and try again.</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 inline-flex items-center justify-center rounded-lg border border-fab-border bg-fab-bg px-4 py-2 text-sm font-bold text-fab-muted transition-colors hover:border-fab-gold/45 hover:text-fab-gold"
          >
            Retry
          </button>
        </div>
      ) : players === null ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-fab-border bg-fab-surface" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-fab-border bg-fab-surface/80 p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-fab-dim" />
          {query || linkFilter !== "all" || heroFilter ? (
            <>
              <p className="mt-3 text-sm font-bold text-fab-text">No players match</p>
              <p className="mt-1 text-sm text-fab-muted">Try a different filter, hero, or search term.</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm font-bold text-fab-text">No players yet</p>
              <p className="mt-1 text-sm text-fab-muted">The directory will fill in as players log matches.</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {rows.slice(0, visibleCount).map((p) => (
              <PlayerRow key={p.username} p={p} hero={heroByUsername.get(p.username)} links={linkInfo.get(p.username)} />
            ))}
          </div>
          {visibleCount < rows.length ? (
            <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-4 text-xs text-fab-muted">
              <span>Showing {Math.min(visibleCount, rows.length).toLocaleString()} of {rows.length.toLocaleString()}</span>
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + 30)}
                className="rounded-lg border border-fab-border bg-fab-bg px-4 py-2 text-sm font-bold text-fab-muted transition-colors hover:border-fab-gold/45 hover:text-fab-gold"
              >
                Load more
              </button>
            </div>
          ) : (
            <p className="py-4 text-center text-xs text-fab-dim">{rows.length.toLocaleString()} players</p>
          )}
        </>
      )}
    </div>
  );
}

function Metric({ label, value, tone = "gold" }: { label: string; value: string; tone?: "gold" | "green" | "blue" }) {
  const color = tone === "green" ? "text-emerald-300" : tone === "blue" ? "text-sky-300" : "text-fab-gold";
  return (
    <div className="rounded-lg border border-fab-border bg-fab-bg/65 px-2 py-2 sm:px-3">
      <p className={`text-base font-black leading-none sm:text-lg ${color}`}>{value}</p>
      <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.08em] text-fab-dim sm:text-[10px] sm:tracking-[0.12em]">{label}</p>
    </div>
  );
}

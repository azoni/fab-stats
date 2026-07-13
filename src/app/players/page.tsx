"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Crown, ExternalLink, GraduationCap, Search, Settings, Sparkles, UserCircle, Users } from "lucide-react";
import { getDiscoverProfiles } from "@/lib/firestore-storage";
import { getCommunityPlayers, type DirectoryPlayer } from "@/lib/community-directory";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useCommunityStats } from "@/hooks/useCommunityStats";
import { useAuth } from "@/contexts/AuthContext";
import { useCreators } from "@/hooks/useCreators";
import { HeroAvatar } from "@/components/heroes/HeroAvatar";
import { HeroShieldBadge } from "@/components/profile/HeroShieldBadge";
import { TeamBadge } from "@/components/profile/TeamBadge";
import { EMBLEM_COMPONENTS, EMBLEM_COLORS } from "@/components/profile/EmblemIcons";
import { computeRankMap, rankBorderClass } from "@/lib/leaderboard-ranks";
import type { Creator, LeaderboardEntry, UserProfile } from "@/types";

type LinkFilter = "all" | "metafy-guide" | "metafy-profile" | "fabrary" | "twitter";
type SortKey = "matches" | "winRate" | "rating" | "newest" | "name";

interface DiscoverLink {
  type: Exclude<LinkFilter, "all">;
  label: string;
  href: string;
  meta: string;
}

const FILTERS: { id: LinkFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "metafy-guide", label: "Guides" },
  { id: "metafy-profile", label: "Metafy Profiles" },
  { id: "fabrary", label: "Decklists" },
  { id: "twitter", label: "X" },
];

const SORTS: { id: SortKey; label: string }[] = [
  { id: "matches", label: "Most games" },
  { id: "winRate", label: "Best win rate" },
  { id: "rating", label: "Highest rating" },
  { id: "newest", label: "Newest" },
  { id: "name", label: "Name A–Z" },
];

const SITE_CREATOR_USERNAME = "azoni";
const SITE_CREATOR_DISCOVER_LINKS: NonNullable<UserProfile["socialLinks"]> = {
  twitter: "azoniTCG",
  discord: "azonii",
  metafyGuide: "https://mfy.gg/@azoni/members?membershipId=99383fe4-b403-4f05-a041-c3212bd7ea30",
  metafyGuideTitle: "Azoni's Competitive Hala",
  metafyProfile: "https://mfy.gg/@azoni",
  fabrary: "https://fabrary.net/decks?search=Azoni%27s%20Competitive%20Dori",
  fabraryName: "Azoni's Competitive Dori",
  discoverTags: ["warrior"],
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

function profileLinks(profile: UserProfile): DiscoverLink[] {
  const links = profile.socialLinks;
  if (!links) return [];
  const out: DiscoverLink[] = [];
  const metafyGuide = links.metafyGuide || links.metafy;
  const metafyGuideTitle = links.metafyGuideTitle || links.metafyTitle;

  if (metafyGuide) {
    out.push({
      type: "metafy-guide",
      label: metafyGuideTitle || "Metafy guide",
      href: withProtocol(metafyGuide),
      meta: "Guide or coaching resource",
    });
  }

  if (links.metafyProfile) {
    out.push({
      type: "metafy-profile",
      label: "Metafy profile",
      href: withProtocol(links.metafyProfile),
      meta: "Coach profile",
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
    const twitter = twitterHref(links.twitter);
    out.push({
      type: "twitter",
      label: twitter.label,
      href: twitter.href,
      meta: "Social",
    });
  }

  return out;
}

function hasDiscoverInfo(profile: UserProfile): boolean {
  const links = profile.socialLinks;
  if (!links) return false;
  return profileLinks(profile).length > 0 || Boolean(links.discord) || (links.discoverTags?.length ?? 0) > 0;
}

function profileKey(profile: UserProfile): string {
  return (profile.username || profile.uid).toLowerCase();
}

function makeSiteCreatorProfile(entry?: LeaderboardEntry): UserProfile {
  return {
    uid: entry?.userId || "site-creator-azoni",
    username: SITE_CREATOR_USERNAME,
    displayName: entry?.displayName || "azoni",
    photoUrl: entry?.photoUrl,
    createdAt: entry?.createdAt || "2024-01-01T00:00:00.000Z",
    isPublic: true,
    profileVisibility: "public",
    socialLinks: SITE_CREATOR_DISCOVER_LINKS,
  };
}

function linkIcon(type: DiscoverLink["type"]) {
  if (type === "metafy-guide") return <GraduationCap className="h-3.5 w-3.5" />;
  if (type === "metafy-profile") return <UserCircle className="h-3.5 w-3.5" />;
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

function linkDomain(href: string): string {
  try {
    return new URL(withProtocol(href)).hostname.replace(/^www\./, "");
  } catch {
    return href.replace(/^https?:\/\//i, "").split("/")[0] || href;
  }
}

const LINK_TONES: Record<DiscoverLink["type"], { label: string; border: string; bg: string; text: string; icon: string }> = {
  "metafy-guide": {
    label: "Guide",
    border: "border-emerald-400/35 hover:border-emerald-300/60",
    bg: "bg-emerald-400/10",
    text: "text-emerald-300",
    icon: "text-emerald-300 bg-emerald-400/12 border-emerald-400/25",
  },
  "metafy-profile": {
    label: "Metafy",
    border: "border-fab-gold/35 hover:border-fab-gold/65",
    bg: "bg-fab-gold/10",
    text: "text-fab-gold",
    icon: "text-fab-gold bg-fab-gold/12 border-fab-gold/25",
  },
  fabrary: {
    label: "Decklist",
    border: "border-sky-400/35 hover:border-sky-300/60",
    bg: "bg-sky-400/10",
    text: "text-sky-300",
    icon: "text-sky-300 bg-sky-400/12 border-sky-400/25",
  },
  twitter: {
    label: "X",
    border: "border-zinc-300/25 hover:border-zinc-100/45",
    bg: "bg-zinc-300/10",
    text: "text-zinc-200",
    icon: "text-zinc-200 bg-zinc-300/12 border-zinc-300/20",
  },
};

function LinkPreview({ link }: { link: DiscoverLink }) {
  const tone = LINK_TONES[link.type];
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center gap-2 rounded-lg border bg-fab-bg/65 px-3 py-2 transition-colors ${tone.border} hover:bg-fab-surface-hover/70`}
    >
      <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${tone.text}`}>
        {linkIcon(link.type)}
        {tone.label}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-fab-text">{link.label}</span>
        <span className="mt-0.5 block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">{link.meta}</span>
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-fab-dim transition-colors group-hover:text-fab-gold" />
    </a>
  );
}

function playerInitial(name: string): string {
  return (name || "?").charAt(0).toUpperCase();
}

function isSiteAdminProfile(profile: UserProfile): boolean {
  return profile.username?.toLowerCase() === "azoni";
}

function CreatorChip({ creator }: { creator: Creator }) {
  const tone = creator.platform === "youtube"
    ? "border-red-500/30 bg-red-500/10 text-red-300"
    : creator.platform === "twitch"
    ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
    : creator.platform === "twitter"
    ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

  return (
    <a
      href={creator.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] transition-colors hover:border-fab-gold/45 hover:text-fab-gold ${tone}`}
      title={creator.description}
    >
      <Sparkles className="h-3 w-3" />
      Creator
    </a>
  );
}

function MiniEmblems({ profile }: { profile: UserProfile }) {
  const emblems = [profile.selectedEmblem, profile.selectedClassEmblem].filter(Boolean) as string[];
  if (emblems.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {emblems.map((id) => {
        const Icon = EMBLEM_COMPONENTS[id];
        const colors = EMBLEM_COLORS[id];
        if (!Icon) return null;
        return (
          <span
            key={id}
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-fab-border bg-fab-bg/70 ${colors?.text || "text-fab-gold"}`}
            title="Selected emblem"
          >
            <Icon className="h-5 w-5" />
          </span>
        );
      })}
    </div>
  );
}

function FeaturedCard({
  profile,
  entry,
  creator,
  avatarBorder,
  shieldPct,
  isAdmin,
}: {
  profile: UserProfile;
  entry?: LeaderboardEntry;
  creator?: Creator;
  avatarBorder: string;
  shieldPct: number;
  isAdmin: boolean;
}) {
  const isSiteAdmin = isSiteAdminProfile(profile);
  const links = profileLinks(profile);
  return (
    <article className="rounded-xl border border-fab-border bg-fab-surface/90 p-3 transition-colors hover:border-fab-gold/45 hover:bg-fab-surface-hover/80">
      <div className="flex min-w-0 items-center gap-3">
        <Link href={`/player/${profile.username}`} className="relative shrink-0">
          {isSiteAdmin && (
            <Crown className="absolute -top-2 left-1/2 z-10 h-4 w-4 -translate-x-1/2 fill-current text-fab-gold drop-shadow-[0_0_6px_rgba(201,168,76,0.6)]" />
          )}
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt="" className={`h-11 w-11 rounded-full border border-fab-border object-cover ${avatarBorder}`} />
          ) : (
            <span className={`flex h-11 w-11 items-center justify-center rounded-full border border-fab-border bg-fab-bg text-sm font-black text-fab-gold ${avatarBorder}`}>
              {playerInitial(profile.displayName || profile.username)}
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link href={`/player/${profile.username}`} className="min-w-0">
              <h3 className="truncate text-base font-black text-fab-text transition-colors hover:text-fab-gold">{profile.displayName}</h3>
            </Link>
            {entry?.teamName && (
              <TeamBadge teamName={entry.teamName} teamIconUrl={entry.teamIconUrl} size="sm" isPrivate={entry.teamVisibility === "private"} isSiteAdmin={isAdmin} />
            )}
            {shieldPct >= 35 && <HeroShieldBadge pct={shieldPct} />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-fab-dim">
            <span>@{profile.username}</span>
            {entry && (
              <>
                <span className="text-fab-border">/</span>
                <span>{formatWinRate(entry)} WR</span>
                <span className="text-fab-border">/</span>
                <span>{formatMatches(entry)} matches</span>
              </>
            )}
            {isSiteAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full border border-fab-gold/35 bg-fab-gold/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-fab-gold">
                <Crown className="h-2.5 w-2.5 fill-current" />
                Admin
              </span>
            )}
            {creator && <CreatorChip creator={creator} />}
          </div>
          <div className="mt-2">
            <MiniEmblems profile={profile} />
          </div>
        </div>
      </div>

      {(profile.socialLinks?.discord || (profile.socialLinks?.discoverTags?.length ?? 0) > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {profile.socialLinks?.discord && (
            <span className="rounded-full border border-fab-border bg-fab-bg/70 px-2 py-0.5 text-[10px] font-semibold text-fab-muted">
              Discord: {profile.socialLinks.discord}
            </span>
          )}
          {profile.socialLinks?.discoverTags?.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border border-fab-border bg-fab-bg/70 px-2 py-0.5 text-[10px] font-semibold text-fab-muted">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {links.length > 0 ? (
          links.map((link) => <LinkPreview key={`${profile.uid}-${link.type}-${link.href}`} link={link} />)
        ) : (
          <Link
            href={`/player/${profile.username}`}
            className="flex items-center justify-between rounded-lg border border-fab-border bg-fab-bg/65 px-3 py-2 text-sm font-bold text-fab-muted transition-colors hover:border-fab-gold/45 hover:text-fab-gold"
          >
            View profile
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-fab-dim" />
          </Link>
        )}
      </div>
    </article>
  );
}

function PlayerRow({ p, rank }: { p: DirectoryPlayer; rank?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 }) {
  const border = rankBorderClass(rank);
  return (
    <Link
      href={`/player/${p.username}`}
      className="group flex items-center gap-3 rounded-xl border border-fab-border bg-fab-surface/90 px-3 py-2.5 transition-colors hover:border-fab-gold/45 hover:bg-fab-surface-hover/80"
    >
      {p.photoUrl ? (
        <img src={p.photoUrl} alt="" className={`h-9 w-9 shrink-0 rounded-full border border-fab-border object-cover ${border}`} />
      ) : (
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-fab-border bg-fab-bg text-sm font-black text-fab-gold ${border}`}>
          {playerInitial(p.displayName || p.username)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-black text-fab-text transition-colors group-hover:text-fab-gold">{p.displayName}</span>
          {p.teamName && (
            <span className="hidden shrink-0 rounded-full border border-fab-border bg-fab-bg/70 px-1.5 py-0.5 text-[9px] font-bold text-fab-muted sm:inline">{p.teamName}</span>
          )}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-fab-dim">
          <span className="truncate">@{p.username}</span>
          {p.topHero && <HeroAvatar heroName={p.topHero} />}
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
    </Link>
  );
}

export default function PlayersPage() {
  const { profile, isAdmin, user } = useAuth();
  const isAuthenticated = !!user;
  const { userCount } = useCommunityStats();

  // Featured (coaches / creators / link-rich profiles)
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [linkFilter, setLinkFilter] = useState<LinkFilter>("all");
  const creators = useCreators({ lazy: true }) as Creator[] & { load: () => void };
  const { entries } = useLeaderboard(false);

  // Directory (all registered players)
  const [players, setPlayers] = useState<DirectoryPlayer[] | null>(null);
  const [query, setQuery] = useState("");
  const [heroFilter, setHeroFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("matches");
  const [visibleCount, setVisibleCount] = useState(30);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let cancelled = false;
    setFeaturedLoading(true);
    getDiscoverProfiles()
      .then((items) => !cancelled && setProfiles(items))
      .catch(() => !cancelled && setProfiles([]))
      .finally(() => !cancelled && setFeaturedLoading(false));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getCommunityPlayers(isAuthenticated)
      .then((items) => !cancelled && setPlayers(items))
      .catch(() => !cancelled && setPlayers([]));
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!featuredLoading && profiles.length > 0) creators.load();
  }, [creators, featuredLoading, profiles.length]);

  useEffect(() => {
    setVisibleCount(30);
  }, [deferredQuery, heroFilter, sort]);

  const entryByUid = useMemo(() => new Map(entries.map((entry) => [entry.userId, entry])), [entries]);
  const deferredEntries = useDeferredValue(entries);
  const rankMap = useMemo(() => computeRankMap(deferredEntries), [deferredEntries]);
  const rankByUsername = useMemo(() => {
    const map = new Map<string, 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>();
    for (const e of deferredEntries) {
      const r = rankMap.get(e.userId);
      if (r && e.username) map.set(e.username.toLowerCase(), r);
    }
    return map;
  }, [deferredEntries, rankMap]);
  const creatorByUsername = useMemo(() => {
    const map = new Map<string, Creator>();
    for (const creator of creators) {
      if (creator.username) map.set(creator.username.toLowerCase(), creator);
    }
    return map;
  }, [creators]);

  const featured = useMemo(() => {
    const merged = new Map<string, UserProfile>();
    const siteCreatorEntry = entries.find((entry) => entry.username?.toLowerCase() === SITE_CREATOR_USERNAME);
    merged.set(SITE_CREATOR_USERNAME, makeSiteCreatorProfile(siteCreatorEntry));
    for (const item of profiles) merged.set(profileKey(item), item);
    if (profile?.uid) merged.set(profileKey(profile), profile);

    const result: { profile: UserProfile; links: DiscoverLink[] }[] = [];
    for (const p of merged.values()) {
      if (!hasDiscoverInfo(p)) continue;
      result.push({ profile: p, links: profileLinks(p) });
    }
    return result;
  }, [entries, profile, profiles]);

  const featuredRows = useMemo(() => {
    return featured
      .filter((row) => linkFilter === "all" || row.links.some((link) => link.type === linkFilter))
      .map((row) => ({ ...row, entry: entryByUid.get(row.profile.uid) }))
      .sort((a, b) => (b.entry?.totalMatches ?? 0) - (a.entry?.totalMatches ?? 0));
  }, [featured, entryByUid, linkFilter]);

  const featuredCounts = useMemo(() => {
    const base: Record<LinkFilter, number> = { all: 0, "metafy-guide": 0, "metafy-profile": 0, fabrary: 0, twitter: 0 };
    for (const row of featured) {
      base.all += 1;
      for (const type of new Set(row.links.map((link) => link.type))) base[type] += 1;
    }
    return base;
  }, [featured]);

  const heroOptions = useMemo(() => {
    if (!players) return [] as { hero: string; count: number }[];
    const counts = new Map<string, number>();
    for (const p of players) if (p.topHero) counts.set(p.topHero, (counts.get(p.topHero) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([hero, count]) => ({ hero, count }));
  }, [players]);

  const activeCount = useMemo(() => (players ? players.filter((p) => p.matches > 0).length : 0), [players]);

  const rows = useMemo(() => {
    if (!players) return [] as DirectoryPlayer[];
    const q = deferredQuery.trim().toLowerCase();
    let list = players;
    if (heroFilter) list = list.filter((p) => p.topHero === heroFilter);
    if (q) {
      list = list.filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          p.username.includes(q) ||
          (p.topHero?.toLowerCase().includes(q) ?? false),
      );
    }
    const sorted = [...list];
    if (sort === "winRate") {
      // Gate low-sample players so a 100%-from-1-game doesn't top the list.
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
  }, [players, deferredQuery, heroFilter, sort]);

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
            <h1 className="mt-2 text-lg font-black text-fab-text sm:mt-3 sm:text-3xl">Browse the player directory</h1>
            <p className="mt-2 hidden text-sm leading-6 text-fab-muted sm:block">
              Search every player, filter by their most-played hero, and find coaches, guides, and decklists from the community.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:min-w-[22rem] sm:gap-2">
            <Metric label="Players" value={(userCount || players?.length || 0).toLocaleString()} />
            <Metric label="With stats" value={activeCount.toLocaleString()} tone="green" />
            <Metric label="Featured" value={featuredCounts.all.toLocaleString()} tone="blue" />
          </div>
        </div>
      </section>

      {/* Featured — coaches & creators */}
      <section className="rounded-xl border border-fab-border bg-fab-surface/90 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-fab-gold" />
            <h2 className="text-sm font-black uppercase tracking-[0.1em] text-fab-text">Coaches &amp; creators</h2>
          </div>
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-fab-border bg-fab-bg/65 p-1">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                onClick={() => setLinkFilter(item.id)}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors ${
                  linkFilter === item.id ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:bg-fab-surface-hover hover:text-fab-text"
                }`}
              >
                {item.label}
                <span className="ml-1.5 text-fab-dim">{featuredCounts[item.id]}</span>
              </button>
            ))}
          </div>
        </div>

        {featuredLoading ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl border border-fab-border bg-fab-surface" />
            ))}
          </div>
        ) : featuredRows.length === 0 ? (
          <p className="mt-3 rounded-lg border border-fab-border bg-fab-bg/50 p-4 text-center text-sm text-fab-muted">
            No featured profiles for this filter.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {featuredRows.map(({ profile: p, entry }) => (
              <FeaturedCard
                key={p.uid}
                profile={p}
                entry={entry}
                creator={creatorByUsername.get(p.username.toLowerCase())}
                avatarBorder={rankBorderClass(rankMap.get(p.uid))}
                shieldPct={entry?.heroCompletionPct ?? entry?.bothHeroesCompletionPct ?? 0}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </section>

      {/* Directory */}
      <section className="rounded-xl border border-fab-border bg-fab-surface/90 p-3 sm:p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fab-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all players by name or @username..."
              className="w-full rounded-lg border border-fab-border bg-fab-bg py-2.5 pl-9 pr-3 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none"
            />
          </div>
          <select value={heroFilter} onChange={(e) => setHeroFilter(e.target.value)} className={selectClass} aria-label="Filter by hero">
            <option value="">All heroes</option>
            {heroOptions.map((h) => (
              <option key={h.hero} value={h.hero}>
                {h.hero} ({h.count})
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectClass} aria-label="Sort players">
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {players === null ? (
          <div className="mt-3 space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-fab-border bg-fab-surface" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-3 rounded-lg border border-fab-border bg-fab-bg/50 p-8 text-center">
            <Users className="mx-auto h-9 w-9 text-fab-dim" />
            <p className="mt-3 text-sm font-bold text-fab-text">No players found</p>
            <p className="mt-1 text-sm text-fab-muted">Try a different hero or search term.</p>
          </div>
        ) : (
          <>
            <div className="mt-3 space-y-2">
              {rows.slice(0, visibleCount).map((p) => (
                <PlayerRow key={p.username} p={p} rank={rankByUsername.get(p.username)} />
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
      </section>
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

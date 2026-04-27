"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ImportIcon } from "@/components/icons/NavIcons";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { trackPageView, trackSupportClick, trackVisit, trackPresence, getOnlineStats } from "@/lib/analytics";
import { useCommunityStats } from "@/hooks/useCommunityStats";
import { useFriends } from "@/hooks/useFriends";
import type { ReactNode } from "react";
import type { Creator } from "@/types";
import {
  Globe,
  ChevronDown,
  Users, ExternalLink,
} from "lucide-react";
import dynamic from "next/dynamic";
const FeedbackModal = dynamic(() => import("@/components/feedback/FeedbackModal").then(m => ({ default: m.FeedbackModal })), { ssr: false });
import { SmartSearch } from "@/components/search/SmartSearch";
import { navLinks, userMenuLinks } from "./nav-data";

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, isGuest, isAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { userCount, matchCount } = useCommunityStats();
  const { incomingCount } = useFriends();
  useEffect(() => setMounted(true), []);

  // Track page views on route change
  useEffect(() => {
    if (mounted) trackPageView(pathname);
  }, [pathname, mounted]);

  // Track daily unique visit (once per day per user)
  useEffect(() => {
    if (mounted && user && !isGuest) trackVisit();
  }, [mounted, user, isGuest]);

  // Update presence timestamp (every 5 minutes, on each route change)
  useEffect(() => {
    if (mounted && user && !isGuest) trackPresence();
  }, [mounted, user, isGuest, pathname]);

  // Admin-only: online stats (fetch on mount + every 2 min)
  const [onlineStats, setOnlineStats] = useState<{ onlineNow: number; activeToday: number } | null>(null);
  useEffect(() => {
    if (!mounted || !isAdmin) return;
    let cancelled = false;
    function fetch() {
      getOnlineStats().then((s) => { if (!cancelled) setOnlineStats(s); }).catch(() => {});
    }
    fetch();
    const interval = setInterval(fetch, 2 * 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [mounted, isAdmin]);

  const isAuthenticated = user && !isGuest;

  return (<>
    <nav className="hidden md:block md:fixed md:top-0 md:left-0 md:right-0 z-50 bg-fab-surface/95 backdrop-blur-md border-b border-fab-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-2.5 shrink-0">
            <Link href="/" className="flex items-center gap-2.5">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="2" width="14" height="20" rx="2" stroke="#D9A05B" strokeWidth="2" />
                <rect x="7.5" y="13" width="2" height="3" fill="#E53935" />
                <rect x="11" y="10" width="2" height="6" fill="#FBC02D" />
                <rect x="14.5" y="6" width="2" height="10" fill="#1E88E5" />
              </svg>
              <span className="text-xl font-bold text-fab-gold tracking-tight">FaB Stats</span>
            </Link>
            {(userCount > 0 || matchCount > 0) && (
              <CommunityStatsPopover userCount={userCount} matchCount={matchCount} />
            )}
          </div>

          <div className="flex items-center gap-1">
            {mounted && (
              <>
                {/* Main nav links — hidden on mobile */}
                <div className="hidden md:flex items-center gap-0.5">
                  {navLinks.filter((link) => !link.authOnly || isAuthenticated).map((link) => {
                      const visibleSubs = link.subItems?.filter((s) => (!s.adminOnly || isAdmin) && (!s.authOnly || isAuthenticated));
                      const hasSubs = visibleSubs && visibleSubs.length > 0;
                      return (
                      <div key={link.href} className={`relative ${hasSubs ? "group/nav" : ""}`}>
                        <Link
                          href={link.href}
                          onClick={link.href === "/support" ? () => trackSupportClick("navbar") : undefined}
                          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors ${
                            pathname === link.href || visibleSubs?.some((s) => pathname === s.href)
                              ? `${link.color} ${link.bg}`
                              : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"
                          }`}
                        >
                          {link.icon}
                          {!link.iconOnly && <span className="hidden xl:inline">{link.label}</span>}
                          {hasSubs && !link.iconOnly && <ChevronDown className="w-3 h-3 text-fab-dim hidden xl:block" />}
                        </Link>
                        {hasSubs && (
                          <div className="absolute left-0 top-full pt-1 hidden group-hover/nav:block z-50">
                            <div className={`bg-fab-surface border border-fab-border rounded-lg shadow-xl ${link.href === "/community" ? "w-64 overflow-visible" : "w-48 overflow-hidden"}`}>
                              {link.href === "/community" && (
                                <div className="px-2 pt-2 pb-1 relative">
                                  <SmartSearch placeholder="Search players or teams..." className="text-xs" />
                                </div>
                              )}
                              {visibleSubs.map((sub) => {
                                const isExternal = sub.href.startsWith("http");
                                const trackKey = sub.href.includes("amazon") ? "amazon" : sub.href.includes("tcgplayer") ? "tcgplayer" : sub.href.includes("sponsors") ? "github_sponsors" : sub.href.includes("ko-fi") ? "kofi" : undefined;
                                if (isExternal) {
                                  return (
                                    <a
                                      key={sub.href}
                                      href={sub.href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => { if (trackKey) trackSupportClick(trackKey); }}
                                      className="flex items-center gap-2 px-3 py-2 text-sm text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover transition-colors"
                                    >
                                      {sub.icon && <span className="text-fab-dim shrink-0">{sub.icon}</span>}
                                      <span className="flex-1">{sub.label}</span>
                                      {sub.badge && <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/15 px-1.5 py-0.5 rounded-full">{sub.badge}</span>}
                                      <ExternalLink className="w-3 h-3 text-fab-dim shrink-0" />
                                    </a>
                                  );
                                }
                                if (sub.href === "/feedback") {
                                  return (
                                    <button
                                      key={sub.href}
                                      onClick={() => setFeedbackOpen(true)}
                                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover transition-colors"
                                    >
                                      {sub.icon && <span className="text-fab-dim shrink-0">{sub.icon}</span>}
                                      {sub.label}
                                    </button>
                                  );
                                }
                                return (
                                  <Link
                                    key={sub.href}
                                    href={sub.href}
                                    className={`block px-3 py-2 text-sm transition-colors ${
                                      pathname === sub.href
                                        ? "text-fab-gold bg-fab-gold/10"
                                        : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"
                                    }`}
                                  >
                                    {sub.label}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      );
                  })}
                  {isAuthenticated && (
                    <Link
                      href="/import"
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 ml-0.5 rounded-lg text-sm font-semibold transition-colors ${
                        pathname === "/import"
                          ? "bg-fab-gold text-fab-bg"
                          : "bg-fab-gold/15 text-fab-gold hover:bg-fab-gold/25 border border-fab-gold/30"
                      }`}
                    >
                      <ImportIcon className="w-4 h-4" />
                      <span className="hidden xl:inline">Import</span>
                    </Link>
                  )}
                </div>

                {/* Right side: bell + user menu */}
                <div className="hidden md:flex items-center gap-1 ml-2 pl-2 border-l border-fab-border">
                  {!user && !isGuest ? (
                    <Link
                      href="/login"
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
                    >
                      Sign In
                    </Link>
                  ) : isGuest ? (
                    <Link
                      href="/login"
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-fab-gold/20 text-fab-gold hover:bg-fab-gold/30 transition-colors"
                    >
                      Sign Up
                    </Link>
                  ) : (
                    <>
                      {isAdmin && onlineStats && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-fab-bg border border-fab-border hover:border-fab-gold/30 transition-colors"
                          title={`${onlineStats.onlineNow} online now, ${onlineStats.activeToday} active today`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                          <span className="text-green-400 font-bold">{onlineStats.onlineNow}</span>
                          <span className="text-fab-dim">·</span>
                          <span className="text-fab-muted">{onlineStats.activeToday} today</span>
                        </Link>
                      )}
                      <NotificationBell />
                      <UserMenu
                        pathname={pathname}
                        profile={profile}
                        user={user}
                        isAdmin={isAdmin}
                        incomingFriendRequests={incomingCount}
                      />
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
    {feedbackOpen && <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />}
  </>
  );
}

function UserMenu({
  pathname,
  profile,
  user,
  isAdmin,
  incomingFriendRequests,
}: {
  pathname: string;
  profile: { username: string; displayName?: string; photoUrl?: string } | null;
  user: { email?: string | null } | null;
  isAdmin: boolean;
  incomingFriendRequests: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const initial = (profile?.displayName || profile?.username || user?.email || "U").charAt(0).toUpperCase();
  const visibleLinks = userMenuLinks.filter((l) => !l.adminOnly || isAdmin);
  const isMenuActive = visibleLinks.some((l) => pathname === l.href);
  const hasBadge = incomingFriendRequests > 0;

  const profileHref = profile?.username ? `/player/${profile.username}` : "/settings";

  return (
    <div className="relative flex items-center" ref={ref}>
      {/* Avatar — links directly to profile */}
      <Link
        href={profileHref}
        className={`relative flex items-center gap-1.5 pl-0.5 pr-1.5 py-0.5 rounded-l-full transition-all ${
          pathname === profileHref
            ? "ring-2 ring-fab-gold bg-fab-gold/20 text-fab-gold"
            : "bg-fab-surface-hover text-fab-muted hover:text-fab-text hover:ring-1 hover:ring-fab-border"
        }`}
        title="View profile"
      >
        {profile?.photoUrl ? (
          <img src={profile.photoUrl} alt="Your profile photo" className="w-7 h-7 rounded-full object-cover shrink-0" loading="lazy" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-xs font-bold shrink-0">{initial}</span>
        )}
        {hasBadge && (
          <span className="absolute top-0 left-5 w-2.5 h-2.5 rounded-full bg-fab-loss ring-2 ring-fab-surface" />
        )}
      </Link>
      {/* Chevron — opens dropdown menu */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center px-1.5 py-2 rounded-r-full transition-all -ml-px ${
          open || isMenuActive
            ? "bg-fab-gold/20 text-fab-gold"
            : "bg-fab-surface-hover text-fab-muted hover:text-fab-text"
        }`}
        title="Account menu"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-56 bg-fab-surface border border-fab-border rounded-lg shadow-xl overflow-hidden z-50">
          {/* Profile header */}
          <Link
            href={profile?.username ? `/player/${profile.username}` : "/settings"}
                       className="flex items-center gap-3 px-4 py-3 hover:bg-fab-surface-hover transition-colors border-b border-fab-border"
          >
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Your profile photo" className="w-9 h-9 rounded-full object-cover shrink-0" loading="lazy" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold font-bold text-sm shrink-0">
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fab-text truncate">
                {profile?.displayName || profile?.username || "My Account"}
              </p>
              {profile?.username && (
                <p className="text-xs text-fab-dim truncate">@{profile.username}</p>
              )}
            </div>
          </Link>

          {/* Menu links */}
          <div className="p-1.5">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                               className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-fab-gold bg-fab-gold/10"
                    : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"
                }`}
              >
                {link.icon}
                {link.label}
                {link.href === "/friends" && incomingFriendRequests > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-fab-loss text-white">
                    {incomingFriendRequests}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const platformIcons: Record<Creator["platform"], ReactNode> = {
  youtube: (
    <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  twitch: (
    <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  ),
  twitter: (
    <svg className="w-4 h-4 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  website: (
    <svg className="w-4 h-4 text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
};

function CollapsibleSection({
  label,
  children,
  expanded,
  onToggle,
  borderTop = true,
}: {
  label: string;
  children: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  borderTop?: boolean;
}) {
  return (
    <>
      {borderTop && <div className="border-t border-fab-border" />}
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-2 hover:bg-fab-surface-hover transition-colors"
      >
        <span className="text-xs text-fab-dim font-medium uppercase tracking-wider">{label}</span>
        <ChevronDown className={`w-3 h-3 text-fab-dim transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && <div className="px-1.5 pb-1.5">{children}</div>}
    </>
  );
}

const SHIELD_TIERS = [
  { min: 100, color: "#fbbf24", label: "Gold", req: "100%" },
  { min: 90, color: "#a78bfa", label: "Purple", req: "90%+" },
  { min: 75, color: "#f87171", label: "Red", req: "75%+" },
  { min: 50, color: "#60a5fa", label: "Blue", req: "50%+" },
  { min: 35, color: "#cd7f32", label: "Bronze", req: "35%+" },
] as const;

interface CommunityHeroStats {
  totalMatches: number;
  withHero: number;
  withOpponent: number;
  withBoth: number;
  tierCounts: { label: string; color: string; req: string; count: number; pct: number }[];
}

function CommunityStatsPopover({ userCount, matchCount }: { userCount: number; matchCount: number }) {
  const [heroStats, setHeroStats] = useState<CommunityHeroStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadStats = useCallback(() => {
    if (loaded) return;
    setLoaded(true);
    // Check localStorage cache first
    const cacheKey = "fab_community_hero_stats_v2";
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { stats, ts } = JSON.parse(cached);
        if (Date.now() - ts < 30 * 60 * 1000) { setHeroStats(stats); return; }
      }
    } catch {}

    // Lazy fetch from leaderboard
    import("@/lib/leaderboard").then(({ getLeaderboardEntries }) => {
      getLeaderboardEntries().then((entries) => {
        let totalMatches = 0;
        let withHero = 0;
        let withOpponent = 0;
        let withBoth = 0;
        const tierBuckets = [0, 0, 0, 0, 0, 0]; // gold, purple, red, blue, bronze, none

        for (const e of entries) {
          const tm = e.totalMatches || 0;
          totalMatches += tm;
          const heroPct = e.heroCompletionPct ?? 0;
          const oppPct = e.opponentHeroCompletionPct ?? 0;
          const bothPct = e.bothHeroesCompletionPct ?? 0;
          if (heroPct > 0) withHero += Math.round(heroPct / 100 * tm);
          if (oppPct > 0) withOpponent += Math.round(oppPct / 100 * tm);
          if (bothPct > 0) withBoth += Math.round(bothPct / 100 * tm);
          if (heroPct === 100) tierBuckets[0]++;
          else if (heroPct >= 90) tierBuckets[1]++;
          else if (heroPct >= 75) tierBuckets[2]++;
          else if (heroPct >= 50) tierBuckets[3]++;
          else if (heroPct >= 35) tierBuckets[4]++;
          else tierBuckets[5]++;
        }

        const total = entries.length;
        const tierCounts = SHIELD_TIERS.map((t, i) => ({
          label: t.label,
          color: t.color,
          req: t.req,
          count: tierBuckets[i],
          pct: total > 0 ? Math.round(tierBuckets[i] / total * 100) : 0,
        }));

        const stats: CommunityHeroStats = { totalMatches, withHero, withOpponent, withBoth, tierCounts };
        setHeroStats(stats);
        try { localStorage.setItem(cacheKey, JSON.stringify({ stats, ts: Date.now() })); } catch {}
      });
    });
  }, [loaded]);

  const heroPct = heroStats ? Math.round(heroStats.withHero / heroStats.totalMatches * 100) : 0;

  return (
    <div className="hidden xl:flex relative group/stats ml-1.5" onMouseEnter={loadStats}>
      <div className="flex flex-col leading-tight px-2 py-1 rounded-md border border-fab-border/50 hover:border-fab-gold/30 hover:bg-fab-surface-hover transition-colors cursor-default">
        {userCount > 0 && <span className="text-[10px] text-fab-muted font-medium tabular-nums">{userCount.toLocaleString()} players</span>}
        {matchCount > 0 && <span className="text-[10px] text-fab-dim font-medium tabular-nums">{matchCount.toLocaleString()} matches</span>}
      </div>
      <div className="absolute left-0 top-full pt-1 hidden group-hover/stats:block z-50">
        <div className="w-64 bg-fab-surface border border-fab-border rounded-lg shadow-xl p-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-fab-muted">Players</span>
              <span className="text-sm font-bold text-fab-text tabular-nums">{userCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-fab-muted">Matches Tracked</span>
              <span className="text-sm font-bold text-fab-text tabular-nums">{matchCount.toLocaleString()}</span>
            </div>
            {heroStats && (
              <>
                <div className="mt-1 pt-1.5 border-t border-fab-border/50">
                  <p className="text-[10px] text-fab-dim mb-1">Community Match Data</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-fab-muted">Matches w/ Hero</span>
                  <span className="text-xs font-bold text-fab-text tabular-nums">{heroStats.withHero.toLocaleString()} <span className="text-fab-dim font-normal">({heroPct}%)</span></span>
                </div>
                {heroStats.withBoth > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-fab-muted">Matches w/ Both Heroes</span>
                    <span className="text-xs font-bold text-fab-text tabular-nums">{heroStats.withBoth.toLocaleString()} <span className="text-fab-dim font-normal">({heroStats.totalMatches > 0 ? Math.round(heroStats.withBoth / heroStats.totalMatches * 100) : 0}%)</span></span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-fab-muted">Missing Hero Data</span>
                  <span className="text-xs font-bold text-fab-text tabular-nums">{(heroStats.totalMatches - heroStats.withHero).toLocaleString()} <span className="text-fab-dim font-normal">({100 - heroPct}%)</span></span>
                </div>
                <div className="mt-1 pt-1.5 border-t border-fab-border/50">
                  <p className="text-[10px] text-fab-dim mb-1.5">Shield Badge Distribution</p>
                  {heroStats.tierCounts.map((t) => (
                    <div key={t.label} className="flex items-center gap-2 py-0.5">
                      <svg className="w-3 h-3 shrink-0" style={{ color: t.color }} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.5 13.5l-3.5-3.5 1.41-1.41L10.5 11.67l5.09-5.09L17 8l-6.5 6.5z" />
                      </svg>
                      <span className="text-[10px] text-fab-muted flex-1">{t.label} <span className="text-fab-dim">({t.req})</span></span>
                      <span className="text-[10px] text-fab-text tabular-nums font-medium">{t.count}</span>
                      <span className="text-[10px] text-fab-dim tabular-nums w-8 text-right">{t.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {!heroStats && loaded && (
              <div className="flex items-center justify-center py-2">
                <div className="w-4 h-4 border-2 border-fab-gold border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


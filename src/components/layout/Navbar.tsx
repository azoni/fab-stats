"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
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
import { ExternalLink } from "lucide-react";
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

  const isAuthenticated = Boolean(user) && !isGuest;
  const visibleNavLinks = useMemo(() => (
    navLinks
      .filter((link) => !link.authOnly || isAuthenticated)
      .map((link) => ({
        ...link,
        visibleSubs: link.subItems?.filter((s) => (!s.adminOnly || isAdmin) && (!s.authOnly || isAuthenticated)) || [],
      }))
  ), [isAdmin, isAuthenticated]);
  const displayName = profile?.displayName || profile?.username || user?.email || "My Account";
  const profileHref = profile?.username ? `/player/${profile.username}` : "/settings";
  const initial = displayName.charAt(0).toUpperCase();
  const visibleUserLinks = userMenuLinks.filter((l) => !l.adminOnly || isAdmin);

  return (<>
    <nav className="fab-sidebar hidden md:flex fixed inset-y-0 left-0 z-50 w-64 flex-col bg-fab-surface/95 backdrop-blur-md border-r border-fab-border/80">
      <div className="fab-sidebar-brand shrink-0 px-4 py-3 border-b border-fab-border/70">
        <Link href="/" className="flex items-center gap-2.5 min-w-0 rounded-lg -mx-1 px-1 py-1 transition-colors hover:bg-fab-surface-hover/60">
          <svg className="w-8 h-8 shrink-0" viewBox="0 0 24 24" fill="none">
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

      <div className="fab-sidebar-actions px-3 py-3 border-b border-fab-border/70 space-y-2">
        <SmartSearch placeholder="Search players or teams..." className="text-xs" />
        {mounted && isAuthenticated && (
          <Link
            href="/import"
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              pathname === "/import"
                ? "bg-fab-gold text-fab-bg"
                : "bg-fab-gold/15 text-fab-gold hover:bg-fab-gold/25 border border-fab-gold/30"
            }`}
          >
            <ImportIcon className="w-4 h-4" />
            Import Matches
          </Link>
        )}
      </div>

      <div className="fab-sidebar-nav flex-1 overflow-y-auto px-2 py-3">
        {mounted && (
          <div className="space-y-4">
            {visibleNavLinks.map((link) => {
              const parentActive = isActiveRoute(pathname, link.href) || link.visibleSubs.some((sub) => !sub.href.startsWith("http") && isActiveRoute(pathname, sub.href));
              const isParentExternal = link.href.startsWith("http");
              const parentTrackKey = getExternalTrackKey(link.href);
              const parentClassName = `fab-sidebar-link flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                parentActive
                  ? `${link.color} ${link.bg}`
                  : "text-fab-muted hover:text-fab-text"
              }`;
              const parentContent = (
                <>
                  <span className="shrink-0 flex items-center justify-center">{link.icon}</span>
                  <span className="truncate">{link.label}</span>
                  {isParentExternal && <ExternalLink className="w-3 h-3 text-fab-dim shrink-0 ml-auto" />}
                </>
              );
              return (
                <section key={link.href} className="space-y-1">
                  {isParentExternal ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => { if (parentTrackKey) trackSupportClick(parentTrackKey); }}
                      data-active={parentActive}
                      className={parentClassName}
                    >
                      {parentContent}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      onClick={link.href === "/support" ? () => trackSupportClick("navbar") : undefined}
                      data-active={parentActive}
                      className={parentClassName}
                    >
                      {parentContent}
                    </Link>
                  )}

                  {link.visibleSubs.length > 0 && (
                    <div className="fab-sidebar-subnav ml-4 pl-3 border-l space-y-0.5">
                      {link.visibleSubs.map((sub) => {
                        const isExternal = sub.href.startsWith("http");
                        const trackKey = getExternalTrackKey(sub.href);

                        if (isExternal) {
                          return (
                            <a
                              key={sub.href}
                              href={sub.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => { if (trackKey) trackSupportClick(trackKey); }}
                              className="fab-sidebar-subitem flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-fab-muted hover:text-fab-text transition-colors"
                            >
                              {sub.icon && <span className="text-fab-dim shrink-0">{sub.icon}</span>}
                              <span className="flex-1 truncate">{sub.label}</span>
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
                              className="fab-sidebar-subitem flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md text-xs font-medium text-fab-muted hover:text-fab-text transition-colors"
                            >
                              {sub.icon && <span className="text-fab-dim shrink-0">{sub.icon}</span>}
                              <span className="truncate">{sub.label}</span>
                            </button>
                          );
                        }

                        const active = isActiveRoute(pathname, sub.href);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            data-active={active}
                            className={`fab-sidebar-subitem block px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                              active
                                ? "text-fab-gold bg-fab-gold/10"
                                : "text-fab-muted hover:text-fab-text"
                            }`}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <div className="fab-sidebar-account border-t border-fab-border/70 p-3 space-y-3">
        {mounted && (
          <>
            {isAdmin && onlineStats && (
              <Link
                href="/admin"
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-fab-bg/70 border border-fab-border/70 hover:border-fab-gold/30 transition-colors"
                title={`${onlineStats.onlineNow} online now, ${onlineStats.activeToday} active today`}
              >
                <span className="flex items-center gap-2 text-fab-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                  Online
                </span>
                <span className="text-green-400 font-bold">{onlineStats.onlineNow}</span>
                <span className="text-fab-dim">{onlineStats.activeToday} today</span>
              </Link>
            )}

            {!user && !isGuest ? (
              <Link
                href="/login"
                className="block w-full text-center px-4 py-2 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
              >
                Sign In
              </Link>
            ) : isGuest ? (
              <Link
                href="/login"
                className="block w-full text-center px-4 py-2 rounded-lg text-sm font-semibold bg-fab-gold/20 text-fab-gold hover:bg-fab-gold/30 transition-colors"
              >
                Sign Up
              </Link>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Link
                    href={profileHref}
                    className={`flex min-w-0 flex-1 items-center gap-2 p-2 rounded-lg border transition-colors ${
                      isActiveRoute(pathname, profileHref)
                        ? "bg-fab-gold/15 text-fab-gold border-fab-gold/20"
                        : "bg-fab-bg/70 text-fab-muted border-fab-border/60 hover:text-fab-text hover:bg-fab-surface-hover"
                    }`}
                  >
                    {profile?.photoUrl ? (
                      <img src={profile.photoUrl} alt="Your profile photo" className="w-8 h-8 rounded-full object-cover shrink-0" loading="lazy" />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-xs font-bold shrink-0">{initial}</span>
                    )}
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold truncate">{displayName}</span>
                      {profile?.username && <span className="block text-[10px] text-fab-dim truncate">@{profile.username}</span>}
                    </span>
                  </Link>
                  <NotificationBell />
                </div>

                <div className="grid grid-cols-2 gap-1">
                  {visibleUserLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`relative flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                        isActiveRoute(pathname, link.href)
                          ? "text-fab-gold bg-fab-gold/10 border-fab-gold/20"
                          : "text-fab-muted border-transparent hover:text-fab-text hover:bg-fab-surface-hover hover:border-fab-border/60"
                      }`}
                    >
                      {link.icon}
                      <span className="truncate">{link.label}</span>
                      {link.href === "/friends" && incomingCount > 0 && (
                        <span className="absolute right-1.5 top-1 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-fab-loss text-white">
                          {incomingCount}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>

              </>
            )}
          </>
        )}
      </div>
    </nav>

    {feedbackOpen && <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />}
  </>
  );
}

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href.startsWith("http")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getExternalTrackKey(href: string): string | undefined {
  if (href.includes("discord.com/oauth2/authorize")) return "discord_bot";
  if (href.includes("discord.gg") || href.includes("discord.com")) return "discord";
  if (href.includes("x.com") || href.includes("twitter.com")) return "twitter";
  if (href.includes("amazon")) return "amazon";
  if (href.includes("tcgplayer")) return "tcgplayer";
  if (href.includes("sponsors")) return "github_sponsors";
  if (href.includes("ko-fi")) return "kofi";
  return undefined;
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
    <div className="relative group/stats mt-1.5 pl-[42px]" onMouseEnter={loadStats}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-tight text-[10px] cursor-default">
        {userCount > 0 && <span className="text-fab-muted font-medium tabular-nums">{userCount.toLocaleString()} players</span>}
        {matchCount > 0 && <span className="text-fab-dim font-medium tabular-nums">{matchCount.toLocaleString()} matches</span>}
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


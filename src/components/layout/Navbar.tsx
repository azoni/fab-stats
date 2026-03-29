"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SwordsIcon, TrendsIcon, ImportIcon, TrophyIcon } from "@/components/icons/NavIcons";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { useCreators } from "@/hooks/useCreators";
import { trackPageView, trackCreatorClick, trackSupportClick, trackVisit, trackPresence, getOnlineStats } from "@/lib/analytics";
import { useCommunityStats } from "@/hooks/useCommunityStats";
import { useFriends } from "@/hooks/useFriends";
import type { ReactNode } from "react";
import type { Creator } from "@/types";
import {
  Globe, BookOpen, Zap,
  Wrench, ChevronDown,
  Mail, Star, Users, Settings, ShieldCheck, ExternalLink,
  MoreVertical, Heart, MessageCircle, ShoppingCart, Coffee, Github,
} from "lucide-react";
import dynamic from "next/dynamic";
const FeedbackModal = dynamic(() => import("@/components/feedback/FeedbackModal").then(m => ({ default: m.FeedbackModal })), { ssr: false });
import { SmartSearch } from "@/components/search/SmartSearch";

const navLinks: { href: string; label: string; icon: ReactNode; color: string; bg: string; authOnly?: boolean; iconOnly?: boolean; subItems?: { href: string; label: string; adminOnly?: boolean; badge?: string; icon?: ReactNode }[] }[] = [
  { href: "/matches", label: "Matches", icon: <SwordsIcon className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-400/10", authOnly: true, subItems: [
    { href: "/matches", label: "Matches" },
    { href: "/events", label: "Events" },
    { href: "/opponents", label: "Opponents" },
    { href: "/tools?tab=matrix", label: "Matchup Matrix" },
  ] },
  { href: "/meta", label: "Meta", icon: <Globe className="w-4 h-4" />, color: "text-teal-400", bg: "bg-teal-400/10", subItems: [
    { href: "/matchups", label: "Matchup Matrix" },
    { href: "/meta/snapshot", label: "Meta Snapshot", adminOnly: true },
    { href: "/meta/matchup-spotlight", label: "Matchup Spotlight", adminOnly: true },
    { href: "/meta/hot-takes", label: "Hot Takes", adminOnly: true },
  ] },
  { href: "/leaderboard", label: "Rankings", icon: <TrophyIcon className="w-4 h-4" />, color: "text-amber-400", bg: "bg-amber-400/10" },
  { href: "/community", label: "Community", icon: <Users className="w-4 h-4" />, color: "text-indigo-400", bg: "bg-indigo-400/10", subItems: [
    { href: "/team", label: "Teams" },
    { href: "/tournaments", label: "Tournaments" },
  ] },
  { href: "/support", label: "Support", icon: <Heart className="w-4 h-4" />, color: "text-pink-400", bg: "bg-pink-400/10", iconOnly: true, subItems: [
    { href: "https://www.amazon.com/?tag=oldwaystoda00-20", label: "Shop Amazon", badge: "Free", icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { href: "https://partner.tcgplayer.com/fabstats", label: "Shop TCGplayer", badge: "Free", icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { href: "https://github.com/sponsors/azoni", label: "GitHub Sponsors", icon: <Github className="w-3.5 h-3.5" /> },
    { href: "https://ko-fi.com/azoni", label: "Ko-fi", icon: <Coffee className="w-3.5 h-3.5" /> },
    { href: "/feedback", label: "Send Feedback", icon: <MessageCircle className="w-3.5 h-3.5" /> },
    { href: "https://discord.gg/WPP5aqCUHY", label: "Join Discord", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg> },
    { href: "https://x.com/FabStats", label: "Follow on X", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  ] },
];

const moreLinks: { href: string; label: string; icon: ReactNode; authOnly?: boolean; adminOnly?: boolean; badge?: string; divider?: boolean; sectionLabel?: string; subItems?: { href: string; label: string }[] }[] = [
  { divider: true, sectionLabel: "Your Stats", href: "", label: "", icon: null },
  { href: "/trends", label: "My Stats", icon: <TrendsIcon className="w-4 h-4" />, authOnly: true },
  { href: "/tournament-stats", label: "Tournament Stats", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.704 6.023 6.023 0 01-2.77-.704" /></svg>, authOnly: true },
  { href: "/tools", label: "Player Tools", icon: <Wrench className="w-4 h-4" />, authOnly: true, subItems: [
    { href: "/tools?tab=matrix", label: "Matchup Matrix" },
    { href: "/tools?tab=prep", label: "Tournament Prep" },
    { href: "/tools?tab=notes", label: "Matchup Notes" },
  ] },
];

const userMenuLinks: { href: string; label: string; icon: ReactNode; adminOnly?: boolean }[] = [
  { href: "/inbox", label: "Inbox", icon: <Mail className="w-4 h-4" /> },
  { href: "/favorites", label: "Favorites", icon: <Star className="w-4 h-4" /> },
  { href: "/friends", label: "Friends", icon: <Users className="w-4 h-4" /> },
  { href: "/team", label: "Teams", icon: <Users className="w-4 h-4" /> },
  { href: "/settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  { href: "/admin", label: "Admin", adminOnly: true, icon: <ShieldCheck className="w-4 h-4" /> },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, isGuest, isAdmin } = useAuth();
  const creators = useCreators({ lazy: true });
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
    <nav className="md:fixed md:top-0 md:left-0 md:right-0 z-50 bg-fab-surface/95 backdrop-blur-md border-b border-fab-border">
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
                      const visibleSubs = link.subItems?.filter((s) => !s.adminOnly || isAdmin);
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
                  <MoreDropdown
                    pathname={pathname}
                    creators={creators}
                    onCreatorsNeeded={creators.load}
                    isAuthenticated={!!isAuthenticated}
                    isAdmin={isAdmin}
                  />
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

function MoreDropdown({
  pathname,
  creators,
  onCreatorsNeeded,
  isAuthenticated,
  isAdmin,
}: {
  pathname: string;
  creators: Creator[];
  onCreatorsNeeded?: () => void;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["games"]));
  const ref = useRef<HTMLDivElement>(null);

  const toggle = useCallback((section: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  // Parse moreLinks into sections by divider markers
  const sections = useMemo(() => {
    const result: { label: string; links: typeof moreLinks }[] = [];
    let current: { label: string; links: typeof moreLinks } | null = null;
    for (const item of moreLinks) {
      if (item.divider) {
        current = { label: item.sectionLabel || "", links: [] };
        result.push(current);
      } else if (current) {
        current.links.push(item);
      }
    }
    return result;
  }, []);

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      pathname === href
        ? "text-fab-gold bg-fab-gold/10"
        : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"
    }`;

  return (
    <div className="relative group/more" ref={ref} onMouseEnter={onCreatorsNeeded}>
      <button
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover group-hover/more:text-fab-gold group-hover/more:bg-fab-gold/10"
      >
        <MoreVertical className="w-4 h-4" />
        <span className="hidden lg:inline">More</span>
        <ChevronDown className="w-3 h-3 transition-transform group-hover/more:rotate-180" />
      </button>

      <div className="absolute top-full right-0 pt-1 hidden group-hover/more:block z-50">
        <div className="w-64 bg-fab-surface border border-fab-border rounded-lg shadow-xl">
          {/* Sections */}
          {sections.map((section, sIdx) => {
            const visible = section.links.filter((l) => (!l.authOnly || isAuthenticated) && (!l.adminOnly || isAdmin));
            if (visible.length === 0) return null;
            // First section renders flat, rest are collapsible
            if (sIdx === 0) {
              return (
                <div key={section.label} className="p-1.5">
                  {visible.map((link) => (
                    <div key={link.href} className="group/sub relative">
                      <Link href={link.href} className={`${linkClass(link.href)} justify-between`}>
                        <span className="flex items-center gap-3">
                          {link.icon}
                          {link.label}
                        </span>
                        {link.badge && <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-teal-400/15 text-teal-400 border border-teal-400/25">{link.badge}</span>}
                        {link.subItems && (
                          <ChevronDown className="w-3 h-3 text-fab-dim -rotate-90" />
                        )}
                      </Link>
                      {link.subItems && (
                        <div className="absolute left-full top-0 pl-1 hidden group-hover/sub:block z-50">
                          <div className="w-48 bg-fab-surface border border-fab-border rounded-lg shadow-xl overflow-hidden">
                            {link.subItems.map((sub) => (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                                               className={`block px-3 py-2 text-sm transition-colors ${
                                  pathname === sub.href || (sub.href.includes("?") && pathname === sub.href.split("?")[0])
                                    ? "text-fab-gold bg-fab-gold/10"
                                    : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"
                                }`}
                              >
                                {sub.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <CollapsibleSection key={section.label} label={section.label} expanded={expanded.has(section.label.toLowerCase())} onToggle={() => toggle(section.label.toLowerCase())}>
                {visible.map((link) => (
                  <div key={link.href} className="group/sub relative">
                    <Link href={link.href} className={`${linkClass(link.href)} justify-between`}>
                      <span className="flex items-center gap-3">
                        {link.icon}
                        {link.label}
                      </span>
                      {link.badge && <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-teal-400/15 text-teal-400 border border-teal-400/25">{link.badge}</span>}
                      {link.subItems && (
                        <ChevronDown className="w-3 h-3 text-fab-dim -rotate-90" />
                      )}
                    </Link>
                    {link.subItems && (
                      <div className="absolute left-full top-0 pl-1 hidden group-hover/sub:block z-50">
                        <div className="w-48 bg-fab-surface border border-fab-border rounded-lg shadow-xl overflow-hidden">
                          {link.subItems.map((sub) => {
                            const isExternal = sub.href.startsWith("http");
                            const trackKey = sub.href.includes("tcgplayer") ? "tcgplayer" : sub.href.includes("sponsors") ? "github_sponsors" : sub.href.includes("ko-fi") ? "kofi" : undefined;
                            if (isExternal) {
                              return (
                                <a
                                  key={sub.href}
                                  href={sub.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => { if (trackKey) trackSupportClick(trackKey); }}
                                  className="flex items-center justify-between px-3 py-2 text-sm text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover transition-colors"
                                >
                                  {sub.label}
                                  <ExternalLink className="w-3 h-3 text-fab-dim" />
                                </a>
                              );
                            }
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                                               className={`block px-3 py-2 text-sm transition-colors ${
                                  pathname === sub.href || (sub.href.includes("?") && pathname === sub.href.split("?")[0])
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
                ))}
              </CollapsibleSection>
            );
          })}

          {/* Featured Creators — collapsible */}
          {creators.length > 0 && (
            <CollapsibleSection label="Featured Creators" expanded={expanded.has("creators")} onToggle={() => toggle("creators")}>
              {creators.map((creator) => (
                <a
                  key={creator.name}
                  href={creator.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-fab-surface-hover transition-colors group"
                  onClick={() => {
                    trackCreatorClick(creator.name);
                  }}
                >
                  {creator.imageUrl ? (
                    <img src={creator.imageUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" loading="lazy" />
                  ) : (
                    platformIcons[creator.platform]
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fab-text group-hover:text-fab-gold transition-colors truncate">
                      {creator.name}
                    </p>
                    <p className="text-xs text-fab-dim truncate">{creator.description}</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-fab-dim shrink-0" />
                </a>
              ))}
            </CollapsibleSection>
          )}


          {/* Explore, Resources — always visible with hover sub-items */}
          <div className="border-t border-fab-border p-1.5 space-y-0.5">
            {/* Explore */}
            <div className="group/explore relative">
              <Link href="/explore" className={`${linkClass("/explore")} justify-between`}>
                <span className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Explore
                </span>
                <ChevronDown className="w-3 h-3 text-fab-dim -rotate-90" />
              </Link>
              <div className="absolute left-full top-0 pl-1 hidden group-hover/explore:block z-50">
                <div className="w-48 bg-fab-surface border border-fab-border rounded-lg shadow-xl overflow-hidden">
                  <Link href="/matchups" className={`block px-3 py-2 text-sm transition-colors ${pathname === "/matchups" ? "text-fab-gold bg-fab-gold/10" : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"}`}>Matchup Matrix</Link>
                  <Link href="/compare" className={`block px-3 py-2 text-sm transition-colors ${pathname === "/compare" ? "text-fab-gold bg-fab-gold/10" : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"}`}>Versus</Link>
                  <Link href="/tier-list" className={`block px-3 py-2 text-sm transition-colors ${pathname === "/tier-list" ? "text-fab-gold bg-fab-gold/10" : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"}`}>Tier List</Link>
                  <Link href="/tournaments" className={`block px-3 py-2 text-sm transition-colors ${pathname === "/tournaments" ? "text-fab-gold bg-fab-gold/10" : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"}`}>Tournaments</Link>
                  <Link href="/games" className={`block px-3 py-2 text-sm transition-colors ${pathname === "/games" ? "text-fab-gold bg-fab-gold/10" : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"}`}>Games</Link>
                </div>
              </div>
            </div>

            {/* Resources */}
            <div className="group/resources relative">
              <Link href="/resources" className={`${linkClass("/resources")} justify-between`}>
                <span className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  Resources
                </span>
                <ChevronDown className="w-3 h-3 text-fab-dim -rotate-90" />
              </Link>
              <div className="absolute left-full top-0 pl-1 hidden group-hover/resources:block z-50">
                <div className="w-48 bg-fab-surface border border-fab-border rounded-lg shadow-xl overflow-hidden">
                  <Link href="/changelog" className={`block px-3 py-2 text-sm transition-colors ${pathname === "/changelog" ? "text-fab-gold bg-fab-gold/10" : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"}`}>Changelog</Link>
                  <Link href="/docs" className={`block px-3 py-2 text-sm transition-colors ${pathname === "/docs" ? "text-fab-gold bg-fab-gold/10" : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"}`}>Docs</Link>
                </div>
              </div>
            </div>

          </div>

          {/* Social — always visible at bottom */}
          <div className="border-t border-fab-border">
            <a
              href="https://discord.gg/WPP5aqCUHY"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-fab-surface-hover transition-colors group"
                         >
              <svg className="w-4 h-4 text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fab-text group-hover:text-fab-gold transition-colors">Join the Discord</p>
                <p className="text-xs text-fab-dim">Community server &middot; <Link href="/docs#discord-bot" className="text-fab-gold/70 hover:text-fab-gold">Add Bot</Link></p>
              </div>
              <svg className="w-3.5 h-3.5 text-fab-dim shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
            <a
              href="https://x.com/FabStats"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-fab-surface-hover transition-colors group"
                         >
              <svg className="w-4 h-4 text-fab-dim shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fab-text group-hover:text-fab-gold transition-colors">Follow on X</p>
                <p className="text-xs text-fab-dim">@FabStats</p>
              </div>
              <svg className="w-3.5 h-3.5 text-fab-dim shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

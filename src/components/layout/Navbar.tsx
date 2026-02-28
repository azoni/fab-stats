"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SwordsIcon, OpponentsIcon, TrendsIcon, ImportIcon, CalendarIcon, TrophyIcon } from "@/components/icons/NavIcons";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { useCreators } from "@/hooks/useCreators";
import { trackPageView, trackCreatorClick, trackVisit, trackPresence } from "@/lib/analytics";
import { useCommunityStats } from "@/hooks/useCommunityStats";
import { useFriends } from "@/hooks/useFriends";
import type { ReactNode } from "react";
import type { Creator } from "@/types";

function MetaIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChangelogIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function DocsIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function CompareIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

const navLinks: { href: string; label: string; icon: ReactNode; color: string; bg: string }[] = [
  { href: "/leaderboard", label: "Leaderboard", icon: <TrophyIcon className="w-4 h-4" />, color: "text-amber-400", bg: "bg-amber-400/10" },
  { href: "/matches", label: "Matches", icon: <SwordsIcon className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-400/10" },
  { href: "/events", label: "Events", icon: <CalendarIcon className="w-4 h-4" />, color: "text-blue-400", bg: "bg-blue-400/10" },
  { href: "/opponents", label: "Opponents", icon: <OpponentsIcon className="w-4 h-4" />, color: "text-purple-400", bg: "bg-purple-400/10" },
  { href: "/search", label: "Discover", icon: <SearchIcon className="w-4 h-4" />, color: "text-cyan-400", bg: "bg-cyan-400/10" },
];

const moreLinks: { href: string; label: string; icon: ReactNode; authOnly?: boolean }[] = [
  { href: "/compare", label: "Compare", icon: <CompareIcon className="w-4 h-4" /> },
  { href: "/meta", label: "Community Meta", icon: <MetaIcon className="w-4 h-4" /> },
  { href: "/trends", label: "Trends", icon: <TrendsIcon className="w-4 h-4" />, authOnly: true },
  { href: "/tournaments", label: "Tournaments", icon: <TrophyIcon className="w-4 h-4" /> },
  { href: "/import", label: "Import", icon: <ImportIcon className="w-4 h-4" />, authOnly: true },
  { href: "/docs", label: "Docs", icon: <DocsIcon className="w-4 h-4" /> },
  { href: "/changelog", label: "Changelog", icon: <ChangelogIcon className="w-4 h-4" /> },
];

const userMenuLinks: { href: string; label: string; icon: ReactNode; adminOnly?: boolean }[] = [
  { href: "/inbox", label: "Inbox", icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )},
  { href: "/favorites", label: "Favorites", icon: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  )},
  { href: "/friends", label: "Friends", icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )},
  { href: "/settings", label: "Settings", icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
  { href: "/admin", label: "Admin", adminOnly: true, icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )},
];

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, isGuest, isAdmin } = useAuth();
  const creators = useCreators();
  const [mounted, setMounted] = useState(false);
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

  const isAuthenticated = user && !isGuest;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-fab-surface/95 backdrop-blur-md border-b border-fab-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <svg className="w-7 h-7 text-fab-gold" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L4 8v8c0 7.2 5.1 13.9 12 16 6.9-2.1 12-8.8 12-16V8L16 2z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
              <path d="M16 8l-2 6h-5l4 3-1.5 5L16 19l4.5 3L19 17l4-3h-5L16 8z" fill="currentColor" />
            </svg>
            <span className="text-xl font-bold text-fab-gold tracking-tight">FaB Stats</span>
            {(userCount > 0 || matchCount > 0) && (
              <span className="hidden lg:inline whitespace-nowrap text-xs text-fab-muted font-medium ml-1.5 self-end mb-0.5">
                {userCount > 0 && <>{userCount.toLocaleString()} players</>}
                {userCount > 0 && matchCount > 0 && <span className="text-fab-dim mx-1">·</span>}
                {matchCount > 0 && <>{matchCount.toLocaleString()} matches</>}
              </span>
            )}
          </Link>

          <div className="flex items-center gap-1">
            {mounted && (
              <>
                {/* Main nav links — hidden on mobile */}
                <div className="hidden md:flex items-center gap-0.5">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors ${
                        pathname === link.href
                          ? `${link.color} ${link.bg}`
                          : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"
                      }`}
                    >
                      {link.icon}
                      <span className="hidden lg:inline">{link.label}</span>
                    </Link>
                  ))}
                  <MoreDropdown
                    pathname={pathname}
                    creators={creators}
                    isAuthenticated={!!isAuthenticated}
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all ${
          open || isMenuActive
            ? "ring-2 ring-fab-gold bg-fab-gold/20 text-fab-gold"
            : "bg-fab-surface-hover text-fab-muted hover:text-fab-text hover:ring-1 hover:ring-fab-border"
        }`}
        title={profile?.username ? `@${profile.username}` : "Account"}
      >
        {profile?.photoUrl ? (
          <img src={profile.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <span className="text-xs font-bold">{initial}</span>
        )}
        {hasBadge && !open && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-fab-loss ring-2 ring-fab-surface" />
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-56 bg-fab-surface border border-fab-border rounded-lg shadow-xl overflow-hidden z-50">
          {/* Profile header */}
          <Link
            href={profile?.username ? `/player/${profile.username}` : "/settings"}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-fab-surface-hover transition-colors border-b border-fab-border"
          >
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
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
                onClick={() => setOpen(false)}
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

function MoreDropdown({
  pathname,
  creators,
  isAuthenticated,
}: {
  pathname: string;
  creators: Creator[];
  isAuthenticated?: boolean;
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

  const visibleMoreLinks = moreLinks.filter((l) => !l.authOnly || isAuthenticated);
  const isMoreActive = visibleMoreLinks.some((l) => pathname === l.href);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors ${
          open || isMoreActive
            ? "text-fab-gold bg-fab-gold/10"
            : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="5" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="19" r="1" fill="currentColor" />
        </svg>
        <span className="hidden lg:inline">More</span>
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-fab-surface border border-fab-border rounded-lg shadow-xl overflow-hidden z-50">
          <div className="p-2">
            {visibleMoreLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-fab-gold bg-fab-gold/10"
                    : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>
          {creators.length > 0 && (
            <>
              <div className="border-t border-fab-border" />
              <div className="p-2">
                <p className="px-3 py-1.5 text-xs text-fab-dim font-medium uppercase tracking-wider">
                  Featured Creators
                </p>
                {creators.map((creator) => (
                  <a
                    key={creator.name}
                    href={creator.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-fab-surface-hover transition-colors group"
                    onClick={() => {
                      trackCreatorClick(creator.name);
                      setOpen(false);
                    }}
                  >
                    {creator.imageUrl ? (
                      <img src={creator.imageUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                    ) : (
                      platformIcons[creator.platform]
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fab-text group-hover:text-fab-gold transition-colors truncate">
                        {creator.name}
                      </p>
                      <p className="text-xs text-fab-dim truncate">{creator.description}</p>
                    </div>
                    <svg className="w-3.5 h-3.5 text-fab-dim shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                ))}
              </div>
            </>
          )}
          <div className="border-t border-fab-border" />
          <div className="p-2">
            <p className="px-3 py-1.5 text-xs text-fab-dim font-medium uppercase tracking-wider">
              Buy Me a Booster
            </p>
            <a
              href="https://github.com/sponsors/azoni"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-fab-surface-hover transition-colors group"
              onClick={() => setOpen(false)}
            >
              <svg className="w-4 h-4 text-pink-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fab-text group-hover:text-fab-gold transition-colors truncate">
                  GitHub Sponsors
                </p>
                <p className="text-xs text-fab-dim truncate">100% goes to the developer</p>
              </div>
              <svg className="w-3.5 h-3.5 text-fab-dim shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
            <a
              href="https://ko-fi.com/azoni"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-fab-surface-hover transition-colors group"
              onClick={() => setOpen(false)}
            >
              <svg className="w-4 h-4 text-yellow-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.493s1.535-.199 2.089 1.024c.603 1.332-.084 4.39-1.9 4.629z" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fab-text group-hover:text-fab-gold transition-colors truncate">
                  Ko-fi
                </p>
                <p className="text-xs text-fab-dim truncate">Buy me a booster</p>
              </div>
              <svg className="w-3.5 h-3.5 text-fab-dim shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

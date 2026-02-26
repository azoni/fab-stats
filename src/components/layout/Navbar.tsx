"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SwordsIcon, OpponentsIcon, TrendsIcon, ImportIcon, CalendarIcon, TrophyIcon } from "@/components/icons/NavIcons";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { useCreators } from "@/hooks/useCreators";
import { trackPageView, trackCreatorClick } from "@/lib/analytics";
import { useCommunityStats } from "@/hooks/useCommunityStats";
import type { ReactNode } from "react";
import type { Creator } from "@/types";

function MetaIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

const coreLinks: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/leaderboard", label: "Leaderboard", icon: <TrophyIcon className="w-4 h-4" /> },
  { href: "/meta", label: "Meta", icon: <MetaIcon className="w-4 h-4" /> },
  { href: "/search", label: "Discover", icon: <SearchIcon className="w-4 h-4" /> },
];

const historyLinks: { href: string; label: string; icon: ReactNode; authOnly?: boolean }[] = [
  { href: "/matches", label: "Matches", icon: <SwordsIcon className="w-4 h-4" /> },
  { href: "/events", label: "Events", icon: <CalendarIcon className="w-4 h-4" /> },
  { href: "/opponents", label: "Opponents", icon: <OpponentsIcon className="w-4 h-4" /> },
  { href: "/trends", label: "Trends", icon: <TrendsIcon className="w-4 h-4" />, authOnly: true },
];

const moreLinks: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/import", label: "Import", icon: <ImportIcon className="w-4 h-4" /> },
  { href: "/changelog", label: "Changelog", icon: <ChangelogIcon className="w-4 h-4" /> },
];

function ChangelogIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, isGuest, isAdmin } = useAuth();
  const creators = useCreators();
  const [mounted, setMounted] = useState(false);
  const { userCount, matchCount } = useCommunityStats();
  useEffect(() => setMounted(true), []);

  // Track page views on route change
  useEffect(() => {
    if (mounted) trackPageView(pathname);
  }, [pathname, mounted]);

  const isAuthenticated = user && !isGuest;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-fab-surface/95 backdrop-blur-md border-b border-fab-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <svg className="w-7 h-7 text-fab-gold" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L4 8v8c0 7.2 5.1 13.9 12 16 6.9-2.1 12-8.8 12-16V8L16 2z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
              <path d="M16 8l-2 6h-5l4 3-1.5 5L16 19l4.5 3L19 17l4-3h-5L16 8z" fill="currentColor" />
            </svg>
            <span className="text-xl font-bold text-fab-gold tracking-tight">FaB Stats</span>
            {(userCount > 0 || matchCount > 0) && (
              <span className="hidden md:inline whitespace-nowrap text-xs text-fab-muted font-medium ml-1.5 self-end mb-0.5">
                {userCount > 0 && <>{userCount.toLocaleString()} players</>}
                {userCount > 0 && matchCount > 0 && <span className="hidden lg:inline text-fab-dim mx-1">·</span>}
                {matchCount > 0 && <span className="hidden lg:inline">{matchCount.toLocaleString()} matches</span>}
              </span>
            )}
          </Link>
          <div className="flex items-center gap-1">
            {mounted && (
              <>
                <div className="hidden md:contents">
                  {coreLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        pathname === link.href
                          ? "text-fab-gold bg-fab-gold/10"
                          : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"
                      }`}
                    >
                      {link.icon}
                      {link.label}
                    </Link>
                  ))}
                  <HistoryDropdown
                    pathname={pathname}
                    isAuthenticated={!!isAuthenticated}
                  />
                  <MoreDropdown
                    pathname={pathname}
                    creators={creators}
                  />
                </div>
                <div className="ml-3 pl-3 border-l border-fab-border flex items-center gap-2">
                  {!user && !isGuest ? (
                    <Link
                      href="/login"
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
                    >
                      Sign In
                    </Link>
                  ) : isGuest ? (
                    <>
                      <span className="text-xs text-fab-dim hidden sm:inline">Guest</span>
                      <Link
                        href="/login"
                        className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors"
                      >
                        Sign Up
                      </Link>
                    </>
                  ) : profile ? (
                    <Link
                      href={`/player/${profile.username}`}
                      className="text-xs text-fab-dim hover:text-fab-gold transition-colors truncate max-w-32 hidden sm:inline"
                    >
                      @{profile.username}
                    </Link>
                  ) : (
                    <span className="text-xs text-fab-dim truncate max-w-32 hidden sm:inline">{user?.email}</span>
                  )}
                  {isAuthenticated && <NotificationBell />}
                  {isAuthenticated && (
                    <Link
                      href="/inbox"
                      className={`p-1 rounded transition-colors ${
                        pathname === "/inbox" || pathname.startsWith("/inbox/")
                          ? "text-fab-gold"
                          : "text-fab-muted hover:text-fab-text"
                      }`}
                      title="Inbox"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </Link>
                  )}
                  {isAuthenticated && (
                    <Link
                      href="/favorites"
                      className={`p-1 rounded transition-colors ${
                        pathname === "/favorites"
                          ? "text-fab-gold"
                          : "text-fab-muted hover:text-fab-text"
                      }`}
                      title="Favorites"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    </Link>
                  )}
                  {isAuthenticated && (
                    <Link
                      href="/settings"
                      className={`p-1 rounded transition-colors ${
                        pathname === "/settings"
                          ? "text-fab-gold"
                          : "text-fab-muted hover:text-fab-text"
                      }`}
                      title="Settings"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className={`p-1 rounded transition-colors ${
                        pathname === "/admin"
                          ? "text-fab-gold"
                          : "text-fab-muted hover:text-fab-text"
                      }`}
                      title="Admin"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </Link>
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

function HistoryDropdown({
  pathname,
  isAuthenticated,
}: {
  pathname: string;
  isAuthenticated: boolean;
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

  const visibleLinks = historyLinks.filter((l) => !l.authOnly || isAuthenticated);
  const isHistoryActive = visibleLinks.some((l) => pathname === l.href);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          open || isHistoryActive
            ? "text-fab-gold bg-fab-gold/10"
            : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"
        }`}
      >
        <SwordsIcon className="w-4 h-4" />
        History
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-52 bg-fab-surface border border-fab-border rounded-lg shadow-xl overflow-hidden z-50">
          <div className="p-2">
            {visibleLinks.map((link) => (
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
          <div className="border-t border-fab-border" />
          <div className="p-2">
            <Link
              href="/events?import=1"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Log Event
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function MoreDropdown({
  pathname,
  creators,
}: {
  pathname: string;
  creators: Creator[];
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

  const isMoreActive = moreLinks.some((l) => pathname === l.href);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
        More
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-fab-surface border border-fab-border rounded-lg shadow-xl overflow-hidden z-50">
          <div className="p-2">
            {moreLinks.map((link) => (
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

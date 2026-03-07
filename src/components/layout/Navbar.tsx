"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SwordsIcon, OpponentsIcon, TrendsIcon, ImportIcon, CalendarIcon, TrophyIcon } from "@/components/icons/NavIcons";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { useCreators } from "@/hooks/useCreators";
import { trackPageView, trackCreatorClick, trackVisit, trackPresence, getOnlineStats } from "@/lib/analytics";
import { useCommunityStats } from "@/hooks/useCommunityStats";
import { useFriends } from "@/hooks/useFriends";
import { searchUsernames, getProfile } from "@/lib/firestore-storage";
import { playerHref } from "@/lib/constants";
import type { ReactNode } from "react";
import type { Creator, UserProfile } from "@/types";
import { GAMES } from "@/lib/games";

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

function RoadmapIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function CompareIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
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

const navLinks: { href: string; label: string; icon: ReactNode; color: string; bg: string; authOnly?: boolean }[] = [
  { href: "/leaderboard", label: "Rankings", icon: <TrophyIcon className="w-4 h-4" />, color: "text-amber-400", bg: "bg-amber-400/10" },
  { href: "/trends", label: "My Stats", icon: <TrendsIcon className="w-4 h-4" />, color: "text-fab-gold", bg: "bg-fab-gold/10", authOnly: true },
  { href: "/matches", label: "Matches", icon: <SwordsIcon className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-400/10" },
  { href: "/meta", label: "Meta", icon: <MetaIcon className="w-4 h-4" />, color: "text-teal-400", bg: "bg-teal-400/10" },
];

const moreLinks: { href: string; label: string; icon: ReactNode; authOnly?: boolean; adminOnly?: boolean; badge?: string; divider?: boolean; sectionLabel?: string }[] = [
  { href: "/events", label: "Events", icon: <CalendarIcon className="w-4 h-4" /> },
  { href: "/opponents", label: "Opponents", icon: <OpponentsIcon className="w-4 h-4" /> },
  { href: "/compare", label: "Versus", icon: <CompareIcon className="w-4 h-4" /> },
  { href: "/tournaments", label: "Tournaments", icon: <CalendarIcon className="w-4 h-4" /> },
  { href: "/tools", label: "Player Tools", badge: "Beta", icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  ), authOnly: true },
  { href: "/games", label: "Games", badge: String(GAMES.length), icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
    </svg>
  ) },
  { divider: true, sectionLabel: "Resources", href: "", label: "", icon: null },
  { href: "/roadmap", label: "Roadmap", icon: <RoadmapIcon className="w-4 h-4" /> },
  { href: "/changelog", label: "Changelog", icon: <ChangelogIcon className="w-4 h-4" /> },
  { href: "/docs", label: "Docs", icon: <DocsIcon className="w-4 h-4" /> },
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

  return (
    <nav className="md:fixed md:top-0 md:left-0 md:right-0 z-50 bg-fab-surface/95 backdrop-blur-md border-b border-fab-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="2" width="14" height="20" rx="2" stroke="#D9A05B" strokeWidth="2" />
              <rect x="7.5" y="13" width="2" height="3" fill="#E53935" />
              <rect x="11" y="10" width="2" height="6" fill="#FBC02D" />
              <rect x="14.5" y="6" width="2" height="10" fill="#1E88E5" />
            </svg>
            <span className="text-xl font-bold text-fab-gold tracking-tight">FaB Stats</span>
            {(userCount > 0 || matchCount > 0) && (
              <span className="hidden xl:inline whitespace-nowrap text-xs text-fab-muted font-medium ml-1.5 self-end mb-0.5">
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
                  {navLinks.filter((link) => !link.authOnly || isAuthenticated).map((link) => (
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
                      <span className="hidden xl:inline">{link.label}</span>
                    </Link>
                  ))}
                  <NavbarSearch />
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
  );
}

interface SearchResult {
  username: string;
  profile: UserProfile | null;
}

function NavbarSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, isAdmin } = useAuth();

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setHighlighted(-1);
    const timer = setTimeout(async () => {
      try {
        const usernames = await searchUsernames(query.trim(), 5);
        const withProfiles = await Promise.all(
          usernames.map(async (u) => ({
            username: u.username,
            profile: await getProfile(u.userId),
          }))
        );
        const filtered = withProfiles.filter((r) => {
          if (!r.profile?.isPublic && !isAdmin) return false;
          if (r.profile?.hideFromGuests && !user && !isAdmin) return false;
          return true;
        });
        setResults(filtered.slice(0, 5));
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, user, isAdmin]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery("");
    setResults([]);
    setHighlighted(-1);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
  }, []);

  const navigateTo = useCallback((href: string) => {
    handleClose();
    router.push(href);
  }, [handleClose, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, -1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && highlighted < results.length) {
        navigateTo(playerHref(results[highlighted].username));
      } else if (query.trim()) {
        navigateTo(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  }, [handleClose, highlighted, results, query, navigateTo]);

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"
        title="Search players"
      >
        <SearchIcon className="w-4 h-4" />
        <span className="hidden xl:inline">Search</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-1.5 bg-fab-bg border border-fab-gold/40 rounded-lg px-2.5 py-1.5">
        <SearchIcon className="w-4 h-4 text-fab-gold shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search players..."
          className="bg-transparent text-sm text-fab-text placeholder:text-fab-dim outline-none w-40 xl:w-52"
        />
        {loading && (
          <svg className="w-3.5 h-3.5 text-fab-dim animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        <button onClick={handleClose} className="text-fab-dim hover:text-fab-text transition-colors shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {query.trim() && (
        <div className="absolute top-full left-0 mt-1.5 w-72 bg-fab-surface border border-fab-border rounded-lg shadow-xl overflow-hidden z-50">
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-fab-muted">No players found</div>
          )}
          {results.map((r, i) => (
            <button
              key={r.username}
              onMouseDown={() => navigateTo(playerHref(r.username))}
              onMouseEnter={() => setHighlighted(i)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors ${
                highlighted === i ? "bg-fab-surface-hover" : ""
              }`}
            >
              {r.profile?.photoUrl ? (
                <img src={r.profile.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-xs font-bold shrink-0">
                  {(r.profile?.displayName || r.username).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fab-text truncate">{r.profile?.displayName || r.username}</p>
                <p className="text-xs text-fab-dim truncate">@{r.username}</p>
              </div>
            </button>
          ))}
          {query.trim() && (
            <button
              onMouseDown={() => navigateTo(`/search?q=${encodeURIComponent(query.trim())}`)}
              className="flex items-center gap-2 w-full px-3 py-2.5 border-t border-fab-border text-left hover:bg-fab-surface-hover transition-colors"
            >
              <SearchIcon className="w-3.5 h-3.5 text-fab-dim" />
              <span className="text-xs text-fab-muted">Search all for &quot;{query.trim()}&quot;</span>
              <svg className="w-3 h-3 text-fab-dim ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
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
          <img src={profile.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
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
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
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
        <svg className={`w-3 h-3 text-fab-dim transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {expanded && <div className="px-1.5 pb-1.5">{children}</div>}
    </>
  );
}

function MoreDropdown({
  pathname,
  creators,
  isAuthenticated,
  isAdmin,
}: {
  pathname: string;
  creators: Creator[];
  isAuthenticated?: boolean;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["games"]));
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

  const toggle = useCallback((section: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  // Split moreLinks into main links (before first divider) and sections
  const mainLinks = moreLinks.filter((l) => !l.divider && !l.sectionLabel && moreLinks.indexOf(l) < moreLinks.findIndex((x) => x.divider));
  const visibleMainLinks = mainLinks.filter((l) => (!l.authOnly || isAuthenticated) && (!l.adminOnly || isAdmin));

  // Extract Resources links
  const resourcesStart = moreLinks.findIndex((l) => l.sectionLabel === "Resources");
  const resourcesLinks = moreLinks.slice(resourcesStart + 1);

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      pathname === href
        ? "text-fab-gold bg-fab-gold/10"
        : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"
    }`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors ${
          open
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
        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-teal-400/15 text-teal-400 border border-teal-400/25">New</span>
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-fab-surface border border-fab-border rounded-lg shadow-xl overflow-hidden z-50 max-h-[calc(100vh-4rem)] overflow-y-auto">
          {/* Main links — always visible */}
          <div className="p-1.5">
            {visibleMainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={linkClass(link.href)}
              >
                {link.icon}
                {link.label}
                {link.badge && <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-teal-400/15 text-teal-400 border border-teal-400/25 ml-auto">{link.badge}</span>}
              </Link>
            ))}
          </div>

          {/* Resources — collapsible */}
          <CollapsibleSection label="Resources" expanded={expanded.has("resources")} onToggle={() => toggle("resources")}>
            {resourcesLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={linkClass(link.href)}>
                {link.icon}
                {link.label}
                {link.badge && <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-teal-400/15 text-teal-400 border border-teal-400/25 ml-auto">{link.badge}</span>}
              </Link>
            ))}
          </CollapsibleSection>

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
            </CollapsibleSection>
          )}

          {/* Support — collapsible */}
          <CollapsibleSection label="Support" expanded={expanded.has("support")} onToggle={() => toggle("support")}>
            <a
              href="https://github.com/sponsors/azoni"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-fab-surface-hover transition-colors group"
              onClick={() => setOpen(false)}
            >
              <svg className="w-4 h-4 text-pink-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span className="text-sm font-medium text-fab-muted group-hover:text-fab-text transition-colors">GitHub Sponsors</span>
              <svg className="w-3.5 h-3.5 text-fab-dim shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
            <a
              href="https://ko-fi.com/azoni"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-fab-surface-hover transition-colors group"
              onClick={() => setOpen(false)}
            >
              <svg className="w-4 h-4 text-yellow-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.493s1.535-.199 2.089 1.024c.603 1.332-.084 4.39-1.9 4.629z" />
              </svg>
              <span className="text-sm font-medium text-fab-muted group-hover:text-fab-text transition-colors">Ko-fi</span>
              <svg className="w-3.5 h-3.5 text-fab-dim shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </CollapsibleSection>

          {/* Discord — always visible at bottom */}
          <div className="border-t border-fab-border">
            <a
              href="https://discord.gg/knDmm9s7"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-fab-surface-hover transition-colors group"
              onClick={() => setOpen(false)}
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
          </div>
        </div>
      )}
    </div>
  );
}

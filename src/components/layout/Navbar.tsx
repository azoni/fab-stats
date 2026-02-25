"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, SwordsIcon, OpponentsIcon, TrendsIcon, ImportIcon, CalendarIcon, TrophyIcon } from "@/components/icons/NavIcons";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ReactNode } from "react";

const coreLinks: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/", label: "Dashboard", icon: <DashboardIcon className="w-4 h-4" /> },
  { href: "/leaderboard", label: "Leaderboard", icon: <TrophyIcon className="w-4 h-4" /> },
  { href: "/matches", label: "Matches", icon: <SwordsIcon className="w-4 h-4" /> },
  { href: "/events", label: "Events", icon: <CalendarIcon className="w-4 h-4" /> },
];

const authLinks: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/opponents", label: "Opponents", icon: <OpponentsIcon className="w-4 h-4" /> },
  { href: "/trends", label: "Trends", icon: <TrendsIcon className="w-4 h-4" /> },
  { href: "/import", label: "Import", icon: <ImportIcon className="w-4 h-4" /> },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, isGuest, isAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [userCount, setUserCount] = useState(0);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const CACHE_KEY = "fab_user_count";
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { count, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) {
        setUserCount(count);
        return;
      }
    }
    getCountFromServer(collection(db, "usernames"))
      .then((snap) => {
        const count = snap.data().count;
        setUserCount(count);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ count, ts: Date.now() }));
      })
      .catch(() => {});
  }, []);

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
            {userCount > 0 && (
              <span className="hidden sm:inline text-[10px] text-fab-dim font-normal ml-1 self-end mb-0.5">
                {userCount} players
              </span>
            )}
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {mounted && (
              <>
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
                {user && !isGuest && authLinks.map((link) => (
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
                <Link
                  href="/search"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === "/search"
                      ? "text-fab-gold bg-fab-gold/10"
                      : "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Discover
                </Link>
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
                      <span className="text-xs text-fab-dim">Guest</span>
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
                      className="text-xs text-fab-dim hover:text-fab-gold transition-colors truncate max-w-32"
                    >
                      @{profile.username}
                    </Link>
                  ) : (
                    <span className="text-xs text-fab-dim truncate max-w-32">{user?.email}</span>
                  )}
                  {user && !isGuest && <NotificationBell />}
                  {user && !isGuest && (
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

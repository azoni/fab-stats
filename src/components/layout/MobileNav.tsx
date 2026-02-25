"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, SwordsIcon, CalendarIcon, TrophyIcon, OpponentsIcon, TrendsIcon, ImportIcon } from "@/components/icons/NavIcons";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import type { ReactNode } from "react";

function SearchIcon(props: { className?: string }) {
  return (
    <svg className={props.className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function SettingsIcon(props: { className?: string }) {
  return (
    <svg className={props.className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ChangelogIcon(props: { className?: string }) {
  return (
    <svg className={props.className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function BellIcon(props: { className?: string }) {
  return (
    <svg className={props.className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function MoreDotsIcon(props: { className?: string }) {
  return (
    <svg className={props.className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

const tabs: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/", label: "Profile", icon: <DashboardIcon /> },
  { href: "/matches", label: "Matches", icon: <SwordsIcon /> },
  { href: "/leaderboard", label: "Rankings", icon: <TrophyIcon /> },
  { href: "/search", label: "Discover", icon: <SearchIcon /> },
];

const moreLinks: { href: string; label: string; icon: ReactNode; authOnly?: boolean }[] = [
  { href: "/events", label: "Events", icon: <CalendarIcon /> },
  { href: "/opponents", label: "Opponents", icon: <OpponentsIcon />, authOnly: true },
  { href: "/trends", label: "Trends", icon: <TrendsIcon />, authOnly: true },
  { href: "/import", label: "Import Matches", icon: <ImportIcon />, authOnly: true },
  { href: "/notifications", label: "Notifications", icon: <BellIcon />, authOnly: true },
  { href: "/settings", label: "Settings", icon: <SettingsIcon />, authOnly: true },
  { href: "/changelog", label: "Changelog", icon: <ChangelogIcon /> },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user, isGuest } = useAuth();
  const { unreadCount } = useNotifications();
  const [mounted, setMounted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  // Close menu on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const closeMore = useCallback(() => setMoreOpen(false), []);

  if (!mounted) return null;

  const isAuthed = user || isGuest;
  const visibleMoreLinks = moreLinks.filter((l) => !l.authOnly || isAuthed);
  const isMoreActive = visibleMoreLinks.some((l) => pathname === l.href);

  return (
    <>
      {/* Slide-up overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMore}
        />
      )}

      {/* Slide-up panel */}
      <div
        className={`fixed bottom-16 left-0 right-0 z-40 md:hidden transition-transform duration-200 ease-out ${
          moreOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-3 mb-2 bg-fab-surface border border-fab-border rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2">
            <p className="px-3 py-1.5 text-xs text-fab-dim font-medium uppercase tracking-wider">
              Navigation
            </p>
            {visibleMoreLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMore}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-fab-gold bg-fab-gold/10"
                    : "text-fab-text active:bg-fab-surface-hover"
                }`}
              >
                <span className={pathname === link.href ? "text-fab-gold" : "text-fab-muted"}>
                  {link.icon}
                </span>
                {link.label}
                {link.href === "/notifications" && unreadCount > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-fab-loss text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
            ))}
            {!isAuthed && (
              <Link
                href="/login"
                onClick={closeMore}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-fab-gold active:bg-fab-gold/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-fab-surface/95 backdrop-blur-md border-t border-fab-border">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
                pathname === tab.href
                  ? "text-fab-gold"
                  : "text-fab-muted"
              }`}
            >
              {tab.icon}
              <span className="mt-0.5">{tab.label}</span>
            </Link>
          ))}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`relative flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
              moreOpen || isMoreActive ? "text-fab-gold" : "text-fab-muted"
            }`}
          >
            <MoreDotsIcon />
            <span className="mt-0.5">More</span>
            {unreadCount > 0 && !moreOpen && (
              <span className="absolute top-0 right-0.5 w-2 h-2 rounded-full bg-fab-loss" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}

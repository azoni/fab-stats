"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, SwordsIcon, CalendarIcon, TrophyIcon, OpponentsIcon, TrendsIcon, ImportIcon } from "@/components/icons/NavIcons";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useFriends } from "@/hooks/useFriends";
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

function DocsIcon(props: { className?: string }) {
  return (
    <svg className={props.className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
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

function InboxIcon(props: { className?: string }) {
  return (
    <svg className={props.className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function AdminIcon(props: { className?: string }) {
  return (
    <svg className={props.className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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

const tabs: { href: string; label: string; icon: ReactNode; color: string }[] = [
  { href: "/", label: "Profile", icon: <DashboardIcon />, color: "text-blue-400" },
  { href: "/matches", label: "Matches", icon: <SwordsIcon />, color: "text-red-400" },
  { href: "/leaderboard", label: "Rankings", icon: <TrophyIcon />, color: "text-amber-400" },
  { href: "/opponents", label: "Opponents", icon: <OpponentsIcon />, color: "text-purple-400" },
  { href: "/search", label: "Discover", icon: <SearchIcon />, color: "text-cyan-400" },
];

function MetaIcon(props: { className?: string }) {
  return (
    <svg className={props.className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CompareIcon(props: { className?: string }) {
  return (
    <svg className={props.className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
    </svg>
  );
}

function FriendsIcon(props: { className?: string }) {
  return (
    <svg className={props.className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

const moreLinks: { href: string; label: string; icon: ReactNode; authOnly?: boolean; adminOnly?: boolean }[] = [
  { href: "/meta", label: "Community Meta", icon: <MetaIcon /> },
  { href: "/compare", label: "Versus", icon: <CompareIcon /> },
  { href: "/events", label: "Events", icon: <CalendarIcon /> },
  { href: "/trends", label: "Trends", icon: <TrendsIcon />, authOnly: true },
  { href: "/import", label: "Import Matches", icon: <ImportIcon />, authOnly: true },
  { href: "/friends", label: "Friends", icon: <FriendsIcon />, authOnly: true },
  { href: "/inbox", label: "Inbox", icon: <InboxIcon />, authOnly: true },
  { href: "/notifications", label: "Notifications", icon: <BellIcon />, authOnly: true },
  { href: "/admin", label: "Admin", icon: <AdminIcon />, adminOnly: true },
  { href: "/settings", label: "Settings", icon: <SettingsIcon />, authOnly: true },
  { href: "/docs", label: "Docs", icon: <DocsIcon /> },
  { href: "/changelog", label: "Changelog", icon: <ChangelogIcon /> },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user, isGuest, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();
  const { incomingCount: friendRequestCount } = useFriends();
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
  const visibleMoreLinks = moreLinks.filter((l) => (!l.authOnly || isAuthed) && (!l.adminOnly || isAdmin));
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
                {link.href === "/friends" && friendRequestCount > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-fab-loss text-white">
                    {friendRequestCount}
                  </span>
                )}
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
            <div className="border-t border-fab-border mt-1 pt-1">
              <p className="px-3 py-1.5 text-xs text-fab-dim font-medium uppercase tracking-wider">
                Buy Me a Booster
              </p>
              <a
                href="https://github.com/sponsors/azoni"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-fab-text active:bg-fab-surface-hover transition-colors"
                onClick={closeMore}
              >
                <svg className="w-5 h-5 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                GitHub Sponsors
              </a>
              <a
                href="https://ko-fi.com/azoni"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-fab-text active:bg-fab-surface-hover transition-colors"
                onClick={closeMore}
              >
                <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.493s1.535-.199 2.089 1.024c.603 1.332-.084 4.39-1.9 4.629z" />
                </svg>
                Ko-fi
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-fab-surface/95 backdrop-blur-md border-t border-fab-border">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
                  isActive ? tab.color : "text-fab-muted"
                }`}
              >
                {tab.icon}
                <span className="mt-0.5">{tab.label}</span>
              </Link>
            );
          })}
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

"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, SwordsIcon, TrophyIcon, TrendsIcon, ImportIcon } from "@/components/icons/NavIcons";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useFriends } from "@/hooks/useFriends";
import type { ReactNode } from "react";
import {
  Search, Settings, ClipboardList, BookOpen, Bell,
  MessageCircle, ShieldCheck, Home, MoreHorizontal,
  Globe, AlignLeft, Wrench, Target, BarChart3,
  Puzzle, Users, LogIn,
} from "lucide-react";

const tabs: { href: string; label: string; icon: ReactNode; color: string }[] = [
  { href: "/", label: "Home", icon: <Home className="w-5 h-5" />, color: "text-fab-gold" },
  { href: "/matches", label: "Matches", icon: <SwordsIcon />, color: "text-red-400" },
  { href: "/leaderboard", label: "Rankings", icon: <TrophyIcon />, color: "text-amber-400" },
  { href: "/trends", label: "My Stats", icon: <TrendsIcon />, color: "text-fab-gold" },
  { href: "/search", label: "Search", icon: <Search className="w-5 h-5" />, color: "text-cyan-400" },
];

// Local icon function definitions removed — using Lucide imports above

type MoreLink = { href: string; label: string; icon: ReactNode; authOnly?: boolean; adminOnly?: boolean };

const moreSections: { title: string; links: MoreLink[] }[] = [
  {
    title: "Games",
    links: [
      { href: "/games", label: "Games", icon: <Puzzle className="w-5 h-5" /> },
    ],
  },
  {
    title: "Explore",
    links: [
      { href: "/meta", label: "Community Meta", icon: <Globe className="w-5 h-5" /> },
      { href: "/tier-list", label: "Tier List", icon: <AlignLeft className="w-5 h-5" /> },
      { href: "/tournaments", label: "Tournaments", icon: <TrophyIcon /> },
      { href: "/compare", label: "Versus", icon: <AlignLeft className="w-5 h-5" /> },
    ],
  },
  {
    title: "Your Data",
    links: [
      { href: "/import", label: "Import Matches", icon: <ImportIcon />, authOnly: true },
      { href: "/trends", label: "My Stats", icon: <TrendsIcon />, authOnly: true },
      { href: "/tools", label: "Player Tools", icon: <Wrench className="w-5 h-5" />, authOnly: true },
      { href: "/goals", label: "Goals", icon: <Target className="w-5 h-5" />, authOnly: true },
      { href: "/share-stats", label: "Stats Package", icon: <BarChart3 className="w-5 h-5" />, authOnly: true },
    ],
  },
  {
    title: "Social",
    links: [
      { href: "/community", label: "Community", icon: <Users className="w-5 h-5" /> },
      { href: "/friends", label: "Friends", icon: <Users className="w-5 h-5" />, authOnly: true },
      { href: "/inbox", label: "Inbox", icon: <MessageCircle className="w-5 h-5" />, authOnly: true },
      { href: "/notifications", label: "Notifications", icon: <Bell className="w-5 h-5" />, authOnly: true },
    ],
  },
  {
    title: "Settings & Info",
    links: [
      { href: "/settings", label: "Settings", icon: <Settings className="w-5 h-5" />, authOnly: true },
      { href: "/admin", label: "Admin", icon: <ShieldCheck className="w-5 h-5" />, adminOnly: true },
      { href: "/docs", label: "Docs", icon: <BookOpen className="w-5 h-5" /> },
      { href: "/changelog", label: "Changelog", icon: <ClipboardList className="w-5 h-5" /> },
    ],
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user, profile, isGuest, isAdmin } = useAuth();
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
  const allMoreLinks = moreSections.flatMap((s) => s.links);
  const isMoreActive = allMoreLinks.some((l) => (!l.authOnly || isAuthed) && (!l.adminOnly || isAdmin) && pathname === l.href);

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
        <div className="mx-3 mb-2 bg-fab-surface border border-fab-border rounded-xl shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto">
          <div className="p-2">
            {isAuthed && profile?.username && (
              <div className="border-b border-fab-border/50 pb-1 mb-1">
                <Link
                  href={`/player/${profile.username}`}
                  onClick={closeMore}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-colors ${
                    pathname === `/player/${profile.username}`
                      ? "text-fab-gold bg-fab-gold/10"
                      : "text-fab-text active:bg-fab-surface-hover"
                  }`}
                >
                  <DashboardIcon className="w-5 h-5 text-blue-400" />
                  My Profile
                </Link>
              </div>
            )}
            {moreSections.map((section, sIdx) => {
              const visibleLinks = section.links.filter((l) => (!l.authOnly || isAuthed) && (!l.adminOnly || isAdmin));
              if (visibleLinks.length === 0) return null;
              return (
                <div key={section.title} className={sIdx > 0 ? "border-t border-fab-border/50 mt-1 pt-1" : ""}>
                  <p className="px-3 py-1.5 text-xs text-fab-dim font-medium uppercase tracking-wider">
                    {section.title}
                  </p>
                  {visibleLinks.map((link) => (
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
                </div>
              );
            })}
            {!isAuthed && (
              <Link
                href="/login"
                onClick={closeMore}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-fab-gold active:bg-fab-gold/10 transition-colors"
              >
                <LogIn className="w-5 h-5" />
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
              <a
                href="https://discord.gg/knDmm9s7"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-fab-text active:bg-fab-surface-hover transition-colors"
                onClick={closeMore}
              >
                <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
                </svg>
                Join Discord
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-fab-surface/95 backdrop-blur-md border-t border-fab-border pb-[env(safe-area-inset-bottom)]">
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
            <MoreHorizontal className="w-5 h-5" />
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

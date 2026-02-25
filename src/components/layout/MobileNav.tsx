"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, SwordsIcon, CalendarIcon, TrophyIcon } from "@/components/icons/NavIcons";
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

const tabs: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/", label: "Home", icon: <DashboardIcon /> },
  { href: "/matches", label: "Matches", icon: <SwordsIcon /> },
  { href: "/events", label: "Events", icon: <CalendarIcon /> },
  { href: "/leaderboard", label: "Rankings", icon: <TrophyIcon /> },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user, isGuest } = useAuth();
  const { unreadCount } = useNotifications();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isAuthed = user || isGuest;

  return (
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
        <Link
          href="/search"
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
            pathname === "/search" ? "text-fab-gold" : "text-fab-muted"
          }`}
        >
          <SearchIcon />
          <span className="mt-0.5">Discover</span>
        </Link>
        {isAuthed ? (
          <Link
            href="/settings"
            className={`relative flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
              pathname === "/settings" ? "text-fab-gold" : "text-fab-muted"
            }`}
          >
            <SettingsIcon />
            <span className="mt-0.5">More</span>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-fab-loss" />
            )}
          </Link>
        ) : (
          <Link
            href="/login"
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
              pathname === "/login" ? "text-fab-gold" : "text-fab-muted"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span className="mt-0.5">Sign In</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

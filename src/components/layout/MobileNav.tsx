"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, SwordsIcon, ImportIcon, OpponentsIcon, CalendarIcon } from "@/components/icons/NavIcons";
import { useAuth } from "@/contexts/AuthContext";
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
  { href: "/import", label: "Import", icon: <ImportIcon /> },
  { href: "/events", label: "Events", icon: <CalendarIcon /> },
  { href: "/opponents", label: "Opponents", icon: <OpponentsIcon /> },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user, isGuest } = useAuth();

  if (!user && !isGuest) return null;

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
          <span className="mt-0.5">Search</span>
        </Link>
        <Link
          href="/settings"
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
            pathname === "/settings" ? "text-fab-gold" : "text-fab-muted"
          }`}
        >
          <SettingsIcon />
          <span className="mt-0.5">More</span>
        </Link>
      </div>
    </nav>
  );
}

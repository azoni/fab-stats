"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, SwordsIcon, ImportIcon, OpponentsIcon, CalendarIcon } from "@/components/icons/NavIcons";
import { useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";

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
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
              pathname === tab.href
                ? "text-fab-gold"
                : "text-fab-muted"
            }`}
          >
            {tab.icon}
            <span className="mt-0.5">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, SwordsIcon, OpponentsIcon, TrendsIcon, ImportIcon, PlusIcon } from "@/components/icons/NavIcons";
import type { ReactNode } from "react";

const navLinks: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/", label: "Dashboard", icon: <DashboardIcon className="w-4 h-4" /> },
  { href: "/matches", label: "Matches", icon: <SwordsIcon className="w-4 h-4" /> },
  { href: "/opponents", label: "Opponents", icon: <OpponentsIcon className="w-4 h-4" /> },
  { href: "/trends", label: "Trends", icon: <TrendsIcon className="w-4 h-4" /> },
  { href: "/import", label: "Import", icon: <ImportIcon className="w-4 h-4" /> },
];

export function Navbar() {
  const pathname = usePathname();

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
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
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
              href="/matches/new"
              className="ml-2 flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Log Match
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

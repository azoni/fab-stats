"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { BarChart3, CalendarDays, LineChart, Swords, Trophy, Users } from "lucide-react";

const HOME_TABS = [
  { href: "/", label: "Overview", Icon: BarChart3, isActive: (path: string) => path === "/" },
  { href: "/matches", label: "Matches", Icon: Swords, isActive: (path: string) => path === "/matches" || path.startsWith("/matches/") },
  { href: "/events", label: "Events", Icon: CalendarDays, isActive: (path: string) => path === "/events" || path.startsWith("/events/") },
  { href: "/opponents", label: "Opponents", Icon: Users, isActive: (path: string) => path === "/opponents" || path.startsWith("/opponents/") },
  { href: "/trends", label: "Trends", Icon: LineChart, isActive: (path: string) => path === "/trends" || path.startsWith("/trends/") },
  { href: "/tournament-stats", label: "Tournament Stats", Icon: Trophy, isActive: (path: string) => path === "/tournament-stats" || path.startsWith("/tournament-stats/") },
];

export function HomeTabs() {
  const pathname = usePathname() || "/";

  return (
    <nav
      aria-label="Home sections"
      className="rounded-lg border border-fab-border/80 bg-fab-surface/80 p-1 shadow-[0_18px_38px_-32px_rgba(0,0,0,0.95)] backdrop-blur-sm section-reveal"
      style={{ "--stagger": 0 } as CSSProperties}
    >
      <div className="overflow-x-auto scrollbar-hide">
        <ul className="grid min-w-max grid-cols-6 gap-1 sm:min-w-0">
          {HOME_TABS.map(({ href, label, Icon, isActive }) => {
            const active = isActive(pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-xs font-semibold transition-colors sm:text-sm ${
                    active
                      ? "border-fab-gold/55 bg-fab-gold/15 text-fab-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "border-transparent text-fab-muted hover:border-fab-border hover:bg-fab-surface-hover hover:text-fab-text"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

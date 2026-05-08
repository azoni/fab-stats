"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export interface BucketSubNavItem {
  href: string;
  label: string;
  authOnly?: boolean;
  adminOnly?: boolean;
}

interface BucketSubNavProps {
  /** All sibling destinations within this bucket. */
  items: BucketSubNavItem[];
  /** Optional className passthrough for the wrapper. */
  className?: string;
}

/**
 * Horizontal scroll pill row of sub-destinations within a primary nav bucket.
 * Used inside Home / Meta / Community pages so users can reach sibling routes
 * without going back through the bottom tab bar. Active page is highlighted.
 *
 * Mobile-first: scroll-snap with edge fades. Wraps on `md:` and up so desktop
 * users see all options at once (since they have the dropdown anyway).
 */
export function BucketSubNav({ items, className = "" }: BucketSubNavProps) {
  const pathname = usePathname() || "/";
  const { user, isGuest, isAdmin } = useAuth();
  const isAuthenticated = Boolean(user) && !isGuest;

  const visible = items.filter((item) => {
    if (item.authOnly && !isAuthenticated) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  if (visible.length === 0) return null;

  return (
    <nav
      aria-label="Section navigation"
      className={`fab-bucket-subnav relative -mx-4 sm:-mx-6 mb-4 ${className}`}
    >
      <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        <ul className="flex gap-2 px-4 sm:px-6">
          {visible.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href + "/")) ||
              (item.href !== "/" && pathname === item.href);
            return (
              <li key={item.href} className="flex-shrink-0 snap-start">
                <Link
                  href={item.href}
                  className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap transition-colors min-h-[32px] ${
                    isActive
                      ? "bg-fab-gold text-fab-bg border-fab-gold"
                      : "bg-fab-surface/90 text-fab-muted border-fab-border/80 hover:text-fab-text hover:border-fab-gold/30"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

// Pre-defined bucket configs so callers don't have to repeat the lists.
export const HOME_BUCKET: BucketSubNavItem[] = [
  { href: "/matches", label: "Matches" },
  { href: "/events", label: "Events" },
  { href: "/opponents", label: "Opponents" },
  { href: "/trends", label: "Trends" },
  { href: "/tournament-stats", label: "Tournament Stats" },
];

export const META_BUCKET: BucketSubNavItem[] = [
  { href: "/leaderboard", label: "Rankings" },
  { href: "/matchups", label: "Matchup Matrix" },
];

export const EXTRAS_BUCKET: BucketSubNavItem[] = [
  { href: "/games", label: "Daily Games" },
  { href: "/compare", label: "Versus" },
  { href: "/docs", label: "Docs" },
  { href: "/changelog", label: "Changelog" },
];

const HOME_PATHS = ["/", "/matches", "/events", "/opponents", "/trends", "/tournament-stats", "/wrapped"];
const META_PATHS = ["/meta", "/leaderboard", "/matchups"];
const EXTRAS_PATHS = [
  "/games",
  "/compare",
  "/docs",
  "/changelog",
  "/fabdoku",
  "/crossword",
  "/heroguesser",
  "/matchupmania",
  "/connections",
  "/timeline",
  "/trivia",
  "/rhinarsrampage",
  "/kayosknockout",
  "/brutebrawl",
  "/ninjacombo",
  "/shadowstrike",
  "/bladedash",
];

function pathInBucket(pathname: string, bucket: string[]): boolean {
  return bucket.some((p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/")));
}

/**
 * Picks the right bucket subnav based on current pathname. Renders nothing on
 * pages that don't belong to a bucket (e.g. /import, /admin, /share, /login).
 */
export function BucketSubNavRouter() {
  // Lazy-evaluated to avoid hydration churn — usePathname inside hook only.
  return <BucketSubNavRouterInner />;
}

function BucketSubNavRouterInner() {
  const pathname = usePathnameSafe();
  if (!pathname) return null;
  if (pathInBucket(pathname, HOME_PATHS)) return null;
  if (pathInBucket(pathname, META_PATHS)) return <BucketSubNav items={META_BUCKET} />;
  if (pathInBucket(pathname, EXTRAS_PATHS)) return <BucketSubNav items={EXTRAS_BUCKET} />;
  return null;
}

function usePathnameSafe(): string | null {
  // Avoid SSR mismatch — pathname only known on client.
  return usePathname();
}

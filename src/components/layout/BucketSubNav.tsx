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
      className={`md:hidden relative -mx-4 sm:-mx-6 mb-4 ${className}`}
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
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors min-h-[32px] ${
                    isActive
                      ? "bg-fab-gold text-fab-bg border-fab-gold"
                      : "bg-fab-surface text-fab-muted border-fab-border hover:text-fab-text hover:border-fab-muted"
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
  { href: "/", label: "Dashboard" },
  { href: "/matches", label: "Matches" },
  { href: "/events", label: "Events" },
  { href: "/opponents", label: "Opponents" },
  { href: "/trends", label: "Trends" },
  { href: "/tournament-stats", label: "Tournament Stats" },
  { href: "/goals", label: "Goals" },
];

export const META_BUCKET: BucketSubNavItem[] = [
  { href: "/meta", label: "Hero Stats" },
  { href: "/leaderboard", label: "Rankings" },
  { href: "/matchups", label: "Matchup Matrix" },
  { href: "/tier-list", label: "Tier List" },
  { href: "/compare", label: "Versus" },
  { href: "/tournaments", label: "Tournaments" },
];

export const COMMUNITY_BUCKET: BucketSubNavItem[] = [
  { href: "/community", label: "Community" },
  { href: "/team", label: "Teams" },
  { href: "/friends", label: "Friends", authOnly: true },
  { href: "/search", label: "Search" },
];

const HOME_PATHS = ["/", "/matches", "/events", "/opponents", "/trends", "/tournament-stats", "/goals", "/wrapped"];
const META_PATHS = ["/meta", "/leaderboard", "/matchups", "/tier-list", "/compare", "/tournaments"];
const COMMUNITY_PATHS = ["/community", "/team", "/group", "/friends", "/search"];

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
  if (pathInBucket(pathname, HOME_PATHS)) return <BucketSubNav items={HOME_BUCKET} />;
  if (pathInBucket(pathname, META_PATHS)) return <BucketSubNav items={META_BUCKET} />;
  if (pathInBucket(pathname, COMMUNITY_PATHS)) return <BucketSubNav items={COMMUNITY_BUCKET} />;
  return null;
}

function usePathnameSafe(): string | null {
  // Avoid SSR mismatch — pathname only known on client.
  return usePathname();
}

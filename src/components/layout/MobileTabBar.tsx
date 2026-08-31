"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BUCKET_ROUTES, routeInBucket } from "./nav-data";

interface TabSpec {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (pathname: string) => boolean;
}

function NavAssetIcon({ name }: { name: "home" | "meta" | "activity" | "extras" | "discover" | "teams" }) {
  return (
    <span className="nav-icon-frame" aria-hidden="true">
      <img src={`/nav-icons/nav-${name}.svg`} alt="" className="nav-asset-icon" />
    </span>
  );
}

// Route lists live in nav-data's BUCKET_ROUTES — the single registry shared
// with BucketSubNav, so a new page can't silently fall out of one surface.
const tabs: TabSpec[] = [
  {
    href: "/",
    label: "Home",
    icon: <NavAssetIcon name="home" />,
    match: (p) => p === "/" || routeInBucket(p, BUCKET_ROUTES.home),
  },
  {
    href: "/activity",
    label: "Activity",
    icon: <NavAssetIcon name="activity" />,
    match: (p) => routeInBucket(p, BUCKET_ROUTES.activity),
  },
  {
    href: "/discover",
    label: "Discover",
    icon: <NavAssetIcon name="discover" />,
    match: (p) => routeInBucket(p, BUCKET_ROUTES.discover),
  },
  {
    href: "/meta",
    label: "Meta",
    icon: <NavAssetIcon name="meta" />,
    match: (p) => routeInBucket(p, BUCKET_ROUTES.meta),
  },
  {
    href: "/extras",
    label: "Extras",
    icon: <NavAssetIcon name="extras" />,
    match: (p) => routeInBucket(p, BUCKET_ROUTES.extras),
  },
];

export function MobileTabBar() {
  const pathname = usePathname() || "/";

  return (
    <nav
      aria-label="Primary"
      className="fab-mobile-shell md:hidden fixed bottom-0 inset-x-0 z-50 bg-fab-bg/95 backdrop-blur border-t border-fab-border pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 items-stretch px-0.5">
        {tabs.map((tab) => (
          <TabLink key={tab.href} tab={tab} active={tab.match(pathname)} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({ tab, active }: { tab: TabSpec; active: boolean }) {
  return (
    <Link
      href={tab.href}
      data-active={active}
      className={`fab-mobile-tab flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-2 min-h-[56px] transition-colors ${
        active ? "text-fab-text" : "text-fab-muted hover:text-fab-text"
      }`}
    >
      <span aria-hidden>{tab.icon}</span>
      <span className="max-w-full truncate text-[9px] font-semibold leading-tight tracking-tight">{tab.label}</span>
    </Link>
  );
}

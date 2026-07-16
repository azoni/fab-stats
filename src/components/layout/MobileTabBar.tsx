"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

const tabs: TabSpec[] = [
  {
    href: "/",
    label: "Home",
    icon: <NavAssetIcon name="home" />,
    match: (p) => p === "/" || p.startsWith("/matches") || p.startsWith("/events") || p.startsWith("/opponents") || p.startsWith("/trends") || p.startsWith("/tournament-stats") || p.startsWith("/wrapped"),
  },
  {
    href: "/activity",
    label: "Activity",
    icon: <NavAssetIcon name="activity" />,
    match: (p) => p.startsWith("/activity") || p.startsWith("/community") || p.startsWith("/friends") || p.startsWith("/feed"),
  },
  {
    href: "/discover",
    label: "Discover",
    icon: <NavAssetIcon name="discover" />,
    // Discover is the hub for players/stores/leagues/teams. `/player` also covers `/players`.
    match: (p) => p.startsWith("/discover") || p.startsWith("/player") || p.startsWith("/search") || p.startsWith("/stores") || p.startsWith("/leagues") || p.startsWith("/teams") || p.startsWith("/group"),
  },
  {
    href: "/meta",
    label: "Meta",
    icon: <NavAssetIcon name="meta" />,
    match: (p) => p.startsWith("/meta") || p.startsWith("/leaderboard") || p.startsWith("/matchups"),
  },
  {
    href: "/extras",
    label: "Extras",
    icon: <NavAssetIcon name="extras" />,
    match: (p) => p.startsWith("/extras") || p.startsWith("/achievements") || p.startsWith("/games") || p.startsWith("/compare") || p.startsWith("/docs") || p.startsWith("/changelog") || p.startsWith("/fabdoku") || p.startsWith("/crossword") || p.startsWith("/heroguesser") || p.startsWith("/matchupmania") || p.startsWith("/connections") || p.startsWith("/timeline") || p.startsWith("/trivia") || p.startsWith("/rhinarsrampage") || p.startsWith("/kayosknockout") || p.startsWith("/brutebrawl") || p.startsWith("/ninjacombo") || p.startsWith("/shadowstrike") || p.startsWith("/bladedash"),
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

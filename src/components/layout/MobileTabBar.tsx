"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileSheet } from "./ProfileSheet";

interface TabSpec {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (pathname: string) => boolean;
}

function NavAssetIcon({ name }: { name: "home" | "meta" | "activity" | "extras" }) {
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
    href: "/meta",
    label: "Meta",
    icon: <NavAssetIcon name="meta" />,
    match: (p) => p.startsWith("/meta") || p.startsWith("/leaderboard") || p.startsWith("/matchups"),
  },
  {
    href: "/activity",
    label: "Activity",
    icon: <NavAssetIcon name="activity" />,
    match: (p) => p.startsWith("/activity") || p.startsWith("/community") || p.startsWith("/teams") || p.startsWith("/group") || p.startsWith("/friends") || p.startsWith("/search") || p.startsWith("/feed") || p.startsWith("/player"),
  },
  {
    href: "/games",
    label: "Extras",
    icon: <NavAssetIcon name="extras" />,
    match: (p) => p.startsWith("/games") || p.startsWith("/achievements") || p.startsWith("/compare") || p.startsWith("/docs") || p.startsWith("/changelog") || p.startsWith("/fabdoku") || p.startsWith("/crossword") || p.startsWith("/heroguesser") || p.startsWith("/matchupmania") || p.startsWith("/connections") || p.startsWith("/timeline") || p.startsWith("/trivia") || p.startsWith("/rhinarsrampage") || p.startsWith("/kayosknockout") || p.startsWith("/brutebrawl") || p.startsWith("/ninjacombo") || p.startsWith("/shadowstrike") || p.startsWith("/bladedash"),
  },
];

export function MobileTabBar() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const isAuthenticated = Boolean(user) && !isGuest;

  useEffect(() => {
    setProfileOpen(false);
  }, [pathname]);

  const handleProfileClick = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setProfileOpen((open) => !open);
  };

  return (
    <>
      <nav
        aria-label="Primary"
        className="fab-mobile-shell md:hidden fixed bottom-0 inset-x-0 z-50 bg-fab-bg/95 backdrop-blur border-t border-fab-border pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-stretch justify-around px-1">
          <TabLink tab={tabs[0]} active={tabs[0].match(pathname)} />
          <TabLink tab={tabs[1]} active={tabs[1].match(pathname)} />
          <TabLink tab={tabs[2]} active={tabs[2].match(pathname)} />
          <TabLink tab={tabs[3]} active={tabs[3].match(pathname)} />
          <ProfileTab
            active={pathname.startsWith("/settings") || pathname.startsWith("/inbox") || pathname.startsWith("/favorites")}
            onClick={handleProfileClick}
          />
        </div>
      </nav>
      {profileOpen && (
        <ProfileSheet
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </>
  );
}

function TabLink({ tab, active }: { tab: TabSpec; active: boolean }) {
  return (
    <Link
      href={tab.href}
      data-active={active}
      className={`fab-mobile-tab flex flex-col items-center justify-center gap-0.5 py-2 px-2 min-h-[56px] flex-1 transition-colors ${
        active ? "text-fab-text" : "text-fab-muted hover:text-fab-text"
      }`}
    >
      <span aria-hidden>{tab.icon}</span>
      <span className="text-[10px] font-medium">{tab.label}</span>
    </Link>
  );
}

function ProfileTab({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Profile menu"
      data-active={active}
      className={`fab-mobile-tab flex flex-col items-center justify-center gap-0.5 py-2 px-2 min-h-[56px] flex-1 transition-colors ${
        active ? "text-fab-text" : "text-fab-muted hover:text-fab-text"
      }`}
    >
      <UserIcon className="w-5 h-5" />
      <span className="text-[10px] font-medium">Profile</span>
    </button>
  );
}

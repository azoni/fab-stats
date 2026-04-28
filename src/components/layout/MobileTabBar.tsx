"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home as HomeIcon, Globe, Users, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileSheet } from "./ProfileSheet";

interface TabSpec {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (pathname: string) => boolean;
}

const tabs: TabSpec[] = [
  {
    href: "/",
    label: "Home",
    icon: <HomeIcon className="w-5 h-5" />,
    match: (p) => p === "/" || p.startsWith("/matches") || p.startsWith("/events") || p.startsWith("/opponents") || p.startsWith("/trends") || p.startsWith("/tournament-stats") || p.startsWith("/goals") || p.startsWith("/wrapped"),
  },
  {
    href: "/meta",
    label: "Meta",
    icon: <Globe className="w-5 h-5" />,
    match: (p) => p.startsWith("/meta") || p.startsWith("/leaderboard") || p.startsWith("/matchups") || p.startsWith("/tier-list") || p.startsWith("/compare") || p.startsWith("/tournaments"),
  },
  {
    href: "/community",
    label: "Community",
    icon: <Users className="w-5 h-5" />,
    match: (p) => p.startsWith("/community") || p.startsWith("/team") || p.startsWith("/group") || p.startsWith("/friends") || p.startsWith("/search") || p.startsWith("/feed") || p.startsWith("/player"),
  },
];

export function MobileTabBar() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const isAuthenticated = Boolean(user) && !isGuest;

  const handleProfileClick = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setProfileOpen(true);
  };

  return (
    <>
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-fab-bg/95 backdrop-blur border-t border-fab-border pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-stretch justify-around">
          <TabLink tab={tabs[0]} active={tabs[0].match(pathname)} />
          <TabLink tab={tabs[1]} active={tabs[1].match(pathname)} />
          <TabLink tab={tabs[2]} active={tabs[2].match(pathname)} />
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
      className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-h-[56px] flex-1 transition-colors ${
        active ? "text-fab-gold" : "text-fab-muted hover:text-fab-text"
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
      className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-h-[56px] flex-1 transition-colors ${
        active ? "text-fab-gold" : "text-fab-muted hover:text-fab-text"
      }`}
    >
      <UserIcon className="w-5 h-5" />
      <span className="text-[10px] font-medium">Profile</span>
    </button>
  );
}

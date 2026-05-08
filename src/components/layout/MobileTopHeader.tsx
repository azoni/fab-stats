"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search as SearchIcon, User as UserIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ProfileSheet } from "./ProfileSheet";

export function MobileTopHeader() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { user, profile, isGuest } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const isAuthenticated = Boolean(user) && !isGuest;

  useEffect(() => {
    setProfileOpen(false);
  }, [pathname]);

  const handleProfileClick = () => {
    if (!isAuthenticated && !isGuest) {
      router.push("/login");
      return;
    }
    setProfileOpen((open) => !open);
  };

  return (
    <>
      <header className="fab-topbar md:hidden fixed top-0 inset-x-0 z-40 bg-fab-bg/95 backdrop-blur border-b border-fab-border pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="flex items-center gap-2 min-w-0 rounded-lg -ml-1 px-1.5 py-1 hover:bg-fab-surface-hover/70 transition-colors">
            <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="5" y="2" width="14" height="20" rx="2" stroke="#D9A05B" strokeWidth="2" />
              <rect x="7.5" y="13" width="2" height="3" fill="#E53935" />
              <rect x="11" y="10" width="2" height="6" fill="#FBC02D" />
              <rect x="14.5" y="6" width="2" height="10" fill="#1E88E5" />
            </svg>
            <span className="text-fab-gold font-bold text-base tracking-tight truncate">FaB Stats</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              href="/search"
              aria-label="Search"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-fab-border/60 text-fab-muted transition-colors hover:border-fab-gold/30 hover:bg-fab-surface-hover hover:text-fab-text"
            >
              <SearchIcon className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={handleProfileClick}
              aria-label="Profile menu"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-fab-border/60 bg-fab-surface/55 text-fab-muted transition-colors hover:border-fab-gold/30 hover:bg-fab-surface-hover hover:text-fab-text"
            >
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </button>
            <NotificationBell
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-fab-border/60 text-fab-muted transition-colors hover:border-fab-gold/30 hover:bg-fab-surface-hover hover:text-fab-text"
              iconClassName="h-5 w-5"
              tooltipSide="bottom"
            />
          </div>
        </div>
      </header>
      {profileOpen && (
        <ProfileSheet
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </>
  );
}

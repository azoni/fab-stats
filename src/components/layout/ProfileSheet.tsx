"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Heart, Import, Mail, Settings as SettingsIcon, ShieldCheck, Star, User as UserIcon, Users, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileSheetProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileSheet({ open, onClose }: ProfileSheetProps) {
  const router = useRouter();
  const { user, profile, isGuest, isAdmin, signOut } = useAuth();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const username = profile?.username || "";
  const displayName = isGuest ? "Guest Mode" : profile?.displayName || profile?.username || user?.email || "User";

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div
      role="dialog"
      aria-modal={true}
      aria-label="Profile menu"
      className="md:hidden fixed inset-x-0 top-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[45] flex flex-col bg-fab-bg pt-[env(safe-area-inset-top)] shadow-2xl"
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
        <h2 className="text-base font-semibold text-fab-text">Profile</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-2 rounded-md text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="fab-page-header flex items-center gap-3 p-3 bg-fab-surface border border-fab-border rounded-lg">
          {profile?.photoUrl ? (
            <img src={profile.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-fab-bg border border-fab-border flex items-center justify-center text-fab-gold font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-fab-text truncate">{displayName}</div>
            {isGuest ? (
              <div className="text-xs text-fab-dim truncate">Local browser data</div>
            ) : username && (
              <div className="text-xs text-fab-dim truncate">@{username}</div>
            )}
          </div>
          {username && (
            <Link
              href={`/player/${username}`}
              onClick={onClose}
              className="text-xs font-medium text-fab-gold hover:text-fab-gold-light"
            >
              View -&gt;
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {isGuest ? (
            <>
              <SheetButton icon={<Import className="w-5 h-5" />} label="Import" onClick={() => go("/import")} />
              <SheetButton icon={<SettingsIcon className="w-5 h-5" />} label="Settings" onClick={() => go("/settings")} />
            </>
          ) : (
            <>
              <SheetButton icon={<Bell className="w-5 h-5" />} label="Notifications" onClick={() => go("/notifications")} />
              <SheetButton icon={<Import className="w-5 h-5" />} label="Import" onClick={() => go("/import")} />
            </>
          )}
        </div>

        <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
          {!isGuest && (
            <>
              <SheetRow icon={<Mail className="w-5 h-5" />} label="Inbox" onClick={() => go("/inbox")} />
              <SheetRow icon={<Users className="w-5 h-5" />} label="Friends" onClick={() => go("/friends")} />
              <SheetRow icon={<Star className="w-5 h-5" />} label="Favorites" onClick={() => go("/favorites")} />
              <SheetRow icon={<UserIcon className="w-5 h-5" />} label="My profile" onClick={() => username ? go(`/player/${username}`) : go("/settings")} />
              <SheetRow icon={<SettingsIcon className="w-5 h-5" />} label="Settings" onClick={() => go("/settings")} />
            </>
          )}
          <SheetRow icon={<Heart className="w-5 h-5" />} label="Support" onClick={() => go("/support")} />
          {isGuest && (
            <>
              <SheetRow icon={<UserIcon className="w-5 h-5" />} label="Create Account" onClick={() => go("/login")} />
              <SheetRow icon={<X className="w-5 h-5" />} label="Exit Guest Mode" onClick={() => { onClose(); signOut(); router.push("/login"); }} />
            </>
          )}
          {isAdmin && (
            <SheetRow icon={<ShieldCheck className="w-5 h-5" />} label="Admin" onClick={() => go("/admin")} />
          )}
        </div>
      </div>
    </div>
  );
}

function SheetButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg bg-fab-surface border border-fab-border hover:bg-fab-surface-hover hover:border-fab-muted transition-colors min-h-[64px]"
    >
      <span className="text-fab-muted">{icon}</span>
      <span className="text-xs font-medium text-fab-text">{label}</span>
    </button>
  );
}

function SheetRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-fab-surface-hover transition-colors min-h-[48px] border-b border-fab-border last:border-b-0"
    >
      <span className="text-fab-muted">{icon}</span>
      <span className="text-sm font-medium text-fab-text">{label}</span>
    </button>
  );
}

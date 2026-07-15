"use client";
/**
 * Shareable avatar card — shows off a player's DECORATED avatar (photo + equipped
 * frame/aura/companion + nameplate) with a few headline stats and their collection
 * size. Card is a pure presentational component (for html-to-image capture); the
 * modal owns data + copy/download. Only surfaced when COSMETICS_ENABLED.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { UserProfile } from "@/types";
import { EquippedAvatar, NameWithPlate } from "@/components/cosmetics/EquippedAvatar";
import { useInventory } from "@/lib/cosmetics/inventory";
import {
  CornerFiligree,
  OrnamentalDivider,
  CardBackgroundPattern,
  AccentTopBar,
  InnerVignette,
} from "@/components/share/CardOrnaments";
import { copyCardImage, downloadCardImage, type ShareResult } from "@/lib/share-image";
import { logActivity } from "@/lib/activity-log";

// Fixed heraldic palette (explicit colors so the capture is theme-independent).
const C = {
  bg: "#14110b",
  surface: "#1c1810",
  gold: "#c9a84c",
  text: "#e9dfc9",
  muted: "#a89a7c",
  dim: "#6f6650",
  border: "#3a2f1c",
};

export interface AvatarCardStats {
  winRate: number;
  totalMatches: number;
  wins: number;
  losses: number;
  topHero: string | null;
  achievementsCount: number;
}

function Stat({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="min-w-0 text-center">
      <p className={`${small ? "text-sm" : "text-xl"} truncate font-black`} style={{ color: C.gold }} title={value}>
        {value}
      </p>
      <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
        {label}
      </p>
    </div>
  );
}

export function ProfileAvatarShareCard({
  profile,
  stats,
  cosmeticsCount,
}: {
  profile: UserProfile;
  stats: AvatarCardStats;
  cosmeticsCount: number;
}) {
  const initial = (profile.displayName || "?").charAt(0).toUpperCase();
  return (
    <div
      style={{ width: 380, background: C.bg, borderColor: C.border }}
      className="relative overflow-hidden rounded-xl border-2"
    >
      <CardBackgroundPattern color={C.gold} id="avatarcard" opacity={0.04} />
      <InnerVignette opacity={0.32} />
      <AccentTopBar color={C.gold} />
      <CornerFiligree color={C.gold} opacity={0.18} />

      <div className="relative flex flex-col items-center px-6 pb-6 pt-8 text-center">
        <EquippedAvatar profile={profile} size={132}>
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt=""
              className="h-[132px] w-[132px] rounded-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div
              className="flex h-[132px] w-[132px] items-center justify-center rounded-full text-5xl font-bold"
              style={{ background: "rgba(201,168,76,0.18)", color: C.gold }}
            >
              {initial}
            </div>
          )}
        </EquippedAvatar>

        <div className="mt-5">
          <NameWithPlate profile={profile}>
            <span className="text-2xl font-black" style={{ color: C.gold }}>
              {profile.displayName}
            </span>
          </NameWithPlate>
        </div>
        {profile.username && (
          <p className="mt-1 text-xs" style={{ color: C.muted }}>
            @{profile.username}
          </p>
        )}

        <OrnamentalDivider color={C.gold} className="my-4" />

        <div className="grid w-full grid-cols-3 gap-3">
          <Stat label="Win Rate" value={`${Math.round(stats.winRate)}%`} />
          <Stat label="Matches" value={stats.totalMatches.toLocaleString()} />
          <Stat label="Top Hero" value={stats.topHero || "—"} small />
        </div>

        <div className="mt-4 flex items-center gap-2 text-[11px]" style={{ color: C.muted }}>
          <span>{stats.achievementsCount} achievements</span>
          <span style={{ color: C.dim }}>·</span>
          <span>
            {cosmeticsCount} cosmetic{cosmeticsCount === 1 ? "" : "s"} collected
          </span>
        </div>

        <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: C.dim }}>
          fabstats.net
        </div>
      </div>
    </div>
  );
}

export function AvatarShareModal({
  profile,
  stats,
  onClose,
}: {
  profile: UserProfile;
  stats: AvatarCardStats;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  const { items } = useInventory(profile.uid);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "text" | "failed">("idle");
  const cosmeticsCount = useMemo(() => items.length, [items]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    const prev = document.activeElement as HTMLElement | null;
    copyRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", h);
      prev?.focus?.();
    };
  }, [onClose]);

  const profileUrl =
    typeof window !== "undefined" ? `${window.location.origin}/player/${encodeURIComponent(profile.username || "")}` : "";
  const shareText = `${profile.displayName} — ${Math.round(stats.winRate)}% win rate across ${stats.totalMatches} matches\n${profileUrl}`;

  async function handleCopy() {
    setStatus("working");
    logActivity("profile_share");
    const r: ShareResult = await copyCardImage(cardRef.current, {
      backgroundColor: C.bg,
      fileName: "fab-avatar.png",
      shareTitle: "FaB Stats — Avatar",
      shareText,
      fallbackText: profileUrl,
      retryWithoutImages: true,
    });
    setStatus(r === "image" || r === "shared" ? "done" : r === "text" ? "text" : "failed");
    if (r === "image" || r === "shared" || r === "text") setTimeout(onClose, 1200);
  }

  async function handleDownload() {
    setStatus("working");
    logActivity("profile_share");
    const ok = await downloadCardImage(cardRef.current, {
      backgroundColor: C.bg,
      fileName: "fab-avatar.png",
      retryWithoutImages: true,
    });
    setStatus(ok ? "done" : "failed");
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share your avatar card"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-fab-border bg-fab-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-fab-text">Share your avatar</p>
          <button type="button" onClick={onClose} className="text-fab-dim hover:text-fab-text" aria-label="Close">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="grid place-items-center">
          <div ref={cardRef}>
            <ProfileAvatarShareCard profile={profile} stats={stats} cosmeticsCount={cosmeticsCount} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            ref={copyRef}
            type="button"
            onClick={handleCopy}
            disabled={status === "working"}
            className="flex-1 rounded-lg border border-fab-gold/40 bg-fab-gold/20 px-3 py-2 text-sm font-semibold text-fab-gold hover:bg-fab-gold/25 focus:outline-none focus:ring-2 focus:ring-fab-gold/50 disabled:opacity-50"
          >
            {status === "working"
              ? "Capturing…"
              : status === "done"
                ? "Image copied!"
                : status === "text"
                  ? "Link copied!"
                  : status === "failed"
                    ? "Try again"
                    : "Copy image"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={status === "working"}
            className="rounded-lg border border-fab-border px-3 py-2 text-fab-muted hover:text-fab-text disabled:opacity-50"
            title="Download PNG"
            aria-label="Download PNG"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { memo, useState } from "react";
import Link from "next/link";

interface LeagueBadgeProps {
  leagueName: string;
  leagueSlug?: string;
  iconUrl?: string;
  size?: "xs" | "sm" | "md";
  /** Wrap in a link to the league page (default true). */
  linkToLeague?: boolean;
}

const SIZES = {
  xs: { box: "w-4 h-4", text: "text-[7px]" },
  sm: { box: "w-5 h-5", text: "text-[8px]" },
  md: { box: "w-7 h-7", text: "text-[10px]" },
};

/** Deterministic color from a league name (fallback when there's no icon). */
function leagueColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 50%, 50%)`;
}

/** Small league emblem shown next to a player's name — mirrors TeamBadge, but a
 *  rounded square (not a circle) and links to the league page. */
function LeagueBadgeInner({ leagueName, leagueSlug, iconUrl, size = "sm", linkToLeague = true }: LeagueBadgeProps) {
  const s = SIZES[size];
  const abbr = leagueName.slice(0, 2).toUpperCase();
  const slug = leagueSlug || leagueName.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Icon URLs are tokenized Storage links denormalized onto feed/leaderboard docs;
  // if the icon is later replaced/removed the old URL 403s, so fall back to initials.
  const [imgError, setImgError] = useState(false);

  const badge = iconUrl && !imgError ? (
    <img
      src={iconUrl}
      alt={leagueName}
      title={leagueName}
      onError={() => setImgError(true)}
      className={`${s.box} rounded-md object-cover shrink-0`}
      style={{ border: "1px solid var(--color-fab-border)" }}
    />
  ) : (
    <span
      title={leagueName}
      className={`${s.box} rounded-md flex items-center justify-center font-bold ${s.text} shrink-0`}
      style={{
        backgroundColor: leagueColor(leagueName),
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {abbr}
    </span>
  );

  if (linkToLeague) {
    return (
      <Link href={`/leagues/${slug}`} className="inline-flex hover:opacity-80 transition-opacity" title={leagueName}>
        {badge}
      </Link>
    );
  }
  return badge;
}

export const LeagueBadge = memo(LeagueBadgeInner);

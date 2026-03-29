"use client";
import { memo } from "react";
import Link from "next/link";

interface TeamBadgeProps {
  teamName: string;
  teamNameLower?: string;
  teamIconUrl?: string;
  size?: "xs" | "sm" | "md";
  linkToTeam?: boolean;
  /** If true, team is private — hidden for non-admins, red border for admins */
  isPrivate?: boolean;
  /** If true, viewer is site admin — sees private teams with red border */
  isSiteAdmin?: boolean;
}

const SIZES = {
  xs: { box: "w-4 h-4", text: "text-[7px]" },
  sm: { box: "w-5 h-5", text: "text-[8px]" },
  md: { box: "w-7 h-7", text: "text-[10px]" },
};

/** Deterministic color from team name */
function teamColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

function TeamBadgeInner({ teamName, teamNameLower, teamIconUrl, size = "sm", linkToTeam = true, isPrivate, isSiteAdmin }: TeamBadgeProps) {
  // Private teams hidden from non-admins
  if (isPrivate && !isSiteAdmin) return null;

  const s = SIZES[size];
  const abbr = teamName.slice(0, 2).toUpperCase();
  const slug = teamNameLower || teamName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const privateBorder = isPrivate && isSiteAdmin;

  const badge = teamIconUrl ? (
    <img
      src={teamIconUrl}
      alt={teamName}
      title={teamName}
      className={`${s.box} rounded-full object-cover shrink-0`}
      style={{ border: privateBorder ? "2px solid #ef4444" : "1px solid var(--color-fab-border)" }}
    />
  ) : (
    <span
      title={teamName}
      className={`${s.box} rounded-full flex items-center justify-center font-bold ${s.text} shrink-0`}
      style={{
        backgroundColor: teamColor(teamName),
        color: "#fff",
        border: privateBorder ? "2px solid #ef4444" : "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {abbr}
    </span>
  );

  if (linkToTeam) {
    return (
      <Link href={`/team/${slug}`} className="inline-flex hover:opacity-80 transition-opacity">
        {badge}
      </Link>
    );
  }

  return badge;
}

export const TeamBadge = memo(TeamBadgeInner);

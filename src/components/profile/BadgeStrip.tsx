"use client";
import { useState } from "react";
import { getProfileBadges } from "@/lib/profile-badges";
import { BADGE_ICON_MAP } from "./BadgeIcons";

export function BadgeStrip({ matchCount }: { matchCount: number }) {
  const badges = getProfileBadges(matchCount);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (badges.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 mt-1">
      {badges.map((badge) => {
        const Icon = BADGE_ICON_MAP[badge.id];
        if (!Icon) return null;
        return (
          <div
            key={badge.id}
            className="relative"
            onMouseEnter={() => setHoveredId(badge.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="text-fab-gold/70 transition-all hover:text-fab-gold hover:scale-110">
              <Icon className="w-5 h-5" />
            </div>
            {hoveredId === badge.id && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-fab-bg border border-fab-border text-[10px] text-fab-text whitespace-nowrap z-20 shadow-lg">
                {badge.description}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-fab-border" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

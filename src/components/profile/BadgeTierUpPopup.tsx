"use client";
import { useEffect, useState } from "react";
import { BADGE_ICON_MAP } from "./BadgeIcons";
import { BadgeTierWrapper } from "./BadgeTierWrapper";
import type { BadgeTierInfo } from "@/lib/badge-tiers";
import { TIER_VISUALS } from "@/lib/badge-tiers";

interface Props {
  badgeId: string;
  badgeName: string;
  tier: BadgeTierInfo;
  count: number;
  onClose: () => void;
}

export function BadgeTierUpPopup({ badgeId, badgeName, tier, count, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const Icon = BADGE_ICON_MAP[badgeId];
  const visual = TIER_VISUALS[tier.tier];
  const isFirstEarn = tier.level === 1;

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 200);
  }

  if (!Icon) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className={`relative bg-fab-bg border border-fab-border rounded-xl p-6 max-w-xs w-full text-center shadow-2xl transition-transform duration-300 ${visible ? "scale-100" : "scale-90"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Badge icon large with tier wrapper */}
        <div className="flex justify-center mb-4">
          <BadgeTierWrapper tier={tier.tier} size="lg">
            <div style={{ color: visual.ringColor === "transparent" ? "#C9A84C" : visual.ringColor }}>
              <Icon className="w-10 h-10" />
            </div>
          </BadgeTierWrapper>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-fab-text mb-1">
          {isFirstEarn ? "Badge Earned!" : "Badge Upgraded!"}
        </h2>

        {/* Badge name + tier */}
        <p className="text-fab-gold font-semibold text-base mb-1">
          {badgeName}
        </p>
        {tier.tier !== "base" && tier.tier !== "special" && (
          <p className="text-sm font-medium mb-2" style={{ color: visual.ringColor }}>
            {tier.label} Tier
          </p>
        )}

        {/* Count */}
        <p className="text-xs text-fab-muted mb-1">
          {count} {badgeId === "first-match" ? (count === 1 ? "match" : "matches") : (count === 1 ? "game" : "games")} completed
        </p>

        {/* Next tier progress */}
        {tier.nextThreshold && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-fab-dim mb-1">
              <span>{tier.label}</span>
              <span>{count}/{tier.nextThreshold}</span>
            </div>
            <div className="h-1.5 bg-fab-surface rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(((count - tier.threshold) / (tier.nextThreshold - tier.threshold)) * 100, 100)}%`,
                  backgroundColor: visual.ringColor === "transparent" ? "#C9A84C" : visual.ringColor,
                }}
              />
            </div>
          </div>
        )}

        {/* Dismiss */}
        <button
          onClick={handleClose}
          className="mt-5 px-6 py-2 rounded-lg text-sm font-semibold bg-fab-surface border border-fab-border text-fab-text hover:bg-fab-surface-hover transition-colors"
        >
          Nice!
        </button>
      </div>
    </div>
  );
}

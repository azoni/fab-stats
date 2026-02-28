"use client";
import { useState } from "react";
import { getAllBadges } from "@/lib/badges";
import { assignBadge, revokeBadge } from "@/lib/badge-service";
import { rarityColors } from "@/lib/achievements";
import { AchievementIcon } from "./AchievementIcons";
import type { Achievement } from "@/types";

interface AdminBadgePanelProps {
  userId: string;
  assignedBadgeIds: string[];
  onBadgeChange: (newIds: string[]) => void;
}

const RARITY_ORDER: Achievement["rarity"][] = ["legendary", "epic", "rare", "uncommon", "common"];

export function AdminBadgePanel({ userId, assignedBadgeIds, onBadgeChange }: AdminBadgePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [notify, setNotify] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const allBadges = getAllBadges();
  const assignedSet = new Set(assignedBadgeIds);

  // Sort: assigned first, then by rarity
  const sorted = [...allBadges].sort((a, b) => {
    const aAssigned = assignedSet.has(a.id) ? 0 : 1;
    const bAssigned = assignedSet.has(b.id) ? 0 : 1;
    if (aAssigned !== bAssigned) return aAssigned - bAssigned;
    return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
  });

  async function toggleBadge(badge: Achievement) {
    setLoadingId(badge.id);
    try {
      if (assignedSet.has(badge.id)) {
        await revokeBadge(userId, badge.id);
        onBadgeChange(assignedBadgeIds.filter((id) => id !== badge.id));
      } else {
        await assignBadge(userId, badge.id, notify);
        onBadgeChange([...assignedBadgeIds, badge.id]);
      }
    } catch {
      // silent fail
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="bg-fab-surface/50 border border-violet-500/30 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 group hover:bg-fab-surface/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <h2 className="text-sm font-semibold text-violet-300">Manage Badges</h2>
          <span className="text-xs text-fab-dim">
            {assignedBadgeIds.length} assigned
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Notify checkbox — stop propagation so clicking it doesn't toggle the panel */}
          <label
            className="flex items-center gap-1.5 text-xs text-fab-dim"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="accent-violet-400 w-3 h-3"
            />
            Notify
          </label>
          <svg
            className={`w-4 h-4 text-fab-muted transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {sorted.map((badge) => {
              const isAssigned = assignedSet.has(badge.id);
              const isLoading = loadingId === badge.id;
              const colors = rarityColors[badge.rarity];

              return (
                <button
                  key={badge.id}
                  onClick={() => toggleBadge(badge)}
                  disabled={isLoading}
                  className={`relative rounded-lg border p-3 text-left transition-all ${
                    isAssigned
                      ? `badge-special-card ${colors.border}`
                      : "bg-fab-surface/30 border-fab-border/50 opacity-50 hover:opacity-80"
                  } ${isLoading ? "animate-pulse" : ""}`}
                >
                  {/* Check / plus overlay */}
                  <div className="absolute top-1.5 right-1.5">
                    {isAssigned ? (
                      <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-fab-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    )}
                  </div>

                  {/* Icon */}
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center mb-1.5 ${isAssigned ? colors.bg : "bg-fab-surface/50"}`}>
                    <AchievementIcon icon={badge.icon} className={`w-4 h-4 ${isAssigned ? colors.text : "text-fab-dim"}`} />
                  </div>

                  {/* Name */}
                  <p className={`text-xs font-semibold truncate ${isAssigned ? "text-fab-text" : "text-fab-dim"}`}>
                    {badge.name}
                  </p>

                  {/* Description */}
                  <p className="text-[10px] text-fab-dim leading-tight mt-0.5 line-clamp-2">
                    {badge.description}
                  </p>

                  {/* Rarity tag */}
                  <span className={`inline-block text-[9px] mt-1 px-1.5 py-0.5 rounded ${isAssigned ? `${colors.bg} ${colors.text}` : "bg-fab-surface/50 text-fab-dim"}`}>
                    {badge.rarity}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

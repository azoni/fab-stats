"use client";
import { useState } from "react";
import type { HeroMastery } from "@/types";
import { tierConfig } from "@/lib/mastery";
import { AchievementIcon } from "./AchievementIcons";

export function HeroMasteryList({ masteries }: { masteries: HeroMastery[] }) {
  const [expanded, setExpanded] = useState(false);

  if (masteries.length === 0) return null;

  return (
    <div className="bg-fab-surface/50 border border-fab-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 group hover:bg-fab-surface/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AchievementIcon icon="section-mastery" className="w-4 h-4 text-fab-gold" />
          <h2 className="text-sm font-semibold text-fab-text">Hero Mastery</h2>
          <span className="text-xs text-fab-dim">{masteries.length} hero{masteries.length !== 1 ? "es" : ""}</span>
        </div>
        <svg
          className={`w-4 h-4 text-fab-muted group-hover:text-fab-text transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {masteries.map((m) => (
            <HeroMasteryCard key={m.heroName} mastery={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function HeroMasteryCard({ mastery }: { mastery: HeroMastery }) {
  const config = tierConfig[mastery.tier];
  const nextConfig = mastery.nextTier ? tierConfig[mastery.nextTier] : null;

  return (
    <div className={`rounded-lg border p-3 ${config.bg} ${config.border}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fab-text truncate">{mastery.heroName}</p>
          <p className={`text-xs font-bold ${config.color}`}>{config.label}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-sm font-bold ${mastery.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
            {mastery.winRate.toFixed(0)}%
          </p>
          <p className="text-[10px] text-fab-dim">{mastery.matches} games</p>
        </div>
      </div>
      {mastery.nextTier && nextConfig && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-fab-bg rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                mastery.tier === "novice" ? "bg-zinc-400" :
                mastery.tier === "apprentice" ? "bg-green-400" :
                mastery.tier === "skilled" ? "bg-blue-400" :
                mastery.tier === "expert" ? "bg-purple-400" :
                mastery.tier === "master" ? "bg-fab-gold" :
                mastery.tier === "grandmaster" ? "bg-fuchsia-400" :
                mastery.tier === "legend" ? "bg-sky-400" :
                "bg-red-400"
              }`}
              style={{ width: `${mastery.progress}%` }}
            />
          </div>
          <span className={`text-[10px] ${nextConfig.color}`}>{nextConfig.label}</span>
        </div>
      )}
    </div>
  );
}

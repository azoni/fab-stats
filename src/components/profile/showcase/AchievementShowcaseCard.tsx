"use client";
import type { Achievement } from "@/types";
import { AchievementIcon } from "@/components/gamification/AchievementIcons";

interface AchievementShowcaseCardProps {
  achievements: Achievement[];
}

const RARITY_STYLE: Record<string, { border: string; glow: string; text: string }> = {
  legendary: { border: "border-yellow-400/50", glow: "shadow-[0_0_8px_rgba(251,191,36,0.2)]", text: "text-yellow-400" },
  epic: { border: "border-purple-400/50", glow: "shadow-[0_0_8px_rgba(168,85,247,0.2)]", text: "text-purple-400" },
  rare: { border: "border-blue-400/50", glow: "shadow-[0_0_6px_rgba(96,165,250,0.15)]", text: "text-blue-400" },
  uncommon: { border: "border-green-400/40", glow: "", text: "text-green-400" },
  common: { border: "border-fab-border", glow: "", text: "text-fab-muted" },
};

export function AchievementShowcaseCard({ achievements }: AchievementShowcaseCardProps) {
  if (achievements.length === 0) return null;

  return (
    <div className="spotlight-card spotlight-rising bg-fab-surface border border-fab-border rounded-lg px-3 py-2 relative overflow-hidden">
      <img src="/assets/cards/bg-achievement.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.15] pointer-events-none" />
      <div className="relative flex items-center gap-2">
        {achievements.slice(0, 5).map((ach) => {
          const style = RARITY_STYLE[ach.rarity] || RARITY_STYLE.common;
          return (
            <div key={ach.id} className={`flex items-center gap-1.5 px-2 py-1 rounded border ${style.border} ${style.glow} bg-fab-bg/50 flex-1 min-w-0`}>
              <AchievementIcon icon={ach.icon} className="w-4 h-4 shrink-0" />
              <div className="min-w-0">
                <p className={`text-xs font-semibold truncate ${style.text}`}>{ach.name}</p>
                <p className="text-[10px] text-fab-dim truncate">{ach.rarity}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

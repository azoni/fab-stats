"use client";
import { localDate } from "@/lib/constants";
import { AchievementIcon } from "@/components/gamification/AchievementIcons";

interface PlayoffFinishData {
  type: "champion" | "finalist" | "top4" | "top8";
  eventName: string;
  eventDate: string;
  format: string;
  eventType: string;
  hero?: string;
}

interface BestFinishShowcaseProps {
  finish: PlayoffFinishData;
}

const FINISH_CFG: Record<string, { label: string; color: string; accent: string; icon: string }> = {
  champion: { label: "Champion", color: "text-yellow-400", accent: "bg-yellow-400/10 border-yellow-400/30", icon: "crown" },
  finalist: { label: "Finalist", color: "text-gray-300", accent: "bg-gray-300/10 border-gray-400/30", icon: "medal" },
  top4: { label: "Top 4", color: "text-amber-500", accent: "bg-amber-500/10 border-amber-500/30", icon: "badge" },
  top8: { label: "Top 8", color: "text-blue-400", accent: "bg-blue-400/10 border-blue-400/30", icon: "star-badge" },
};

export function BestFinishShowcase({ finish }: BestFinishShowcaseProps) {
  const cfg = FINISH_CFG[finish.type] || FINISH_CFG.top8;

  return (
    <div className="spotlight-card spotlight-grinder bg-fab-surface border border-fab-border rounded-lg px-3 py-2 relative overflow-hidden h-full min-h-[88px]">
      <img src="/assets/cards/bg-achievement.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.08] pointer-events-none" />
      <div className="relative">
      <div className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border ${cfg.accent} mb-1`}>
        <AchievementIcon icon={cfg.icon} className={`w-3.5 h-3.5 ${cfg.color}`} />
        <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
      </div>
      <p className="text-sm font-semibold text-fab-text truncate">{finish.eventName}</p>
      <p className="text-[11px] text-fab-dim truncate mt-0.5">
        {finish.eventType} · {finish.format} · {localDate(finish.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </p>
      </div>
    </div>
  );
}

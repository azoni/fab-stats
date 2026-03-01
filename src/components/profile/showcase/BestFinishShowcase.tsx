"use client";
import { localDate } from "@/lib/constants";

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

const FINISH_CFG: Record<string, { label: string; color: string; icon: string }> = {
  champion: { label: "Champion", color: "text-yellow-400", icon: "🏆" },
  finalist: { label: "Finalist", color: "text-gray-300", icon: "🥈" },
  top4: { label: "Top 4", color: "text-amber-500", icon: "🥉" },
  top8: { label: "Top 8", color: "text-blue-400", icon: "🎖️" },
};

export function BestFinishShowcase({ finish }: BestFinishShowcaseProps) {
  const cfg = FINISH_CFG[finish.type] || FINISH_CFG.top8;

  return (
    <div className="spotlight-card spotlight-grinder bg-fab-surface border border-fab-border rounded-lg px-3 py-2 relative overflow-hidden h-full">
      <div className="flex items-center gap-2">
        <span className="text-base shrink-0">{cfg.icon}</span>
        <span className={`text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
      </div>
      <p className="text-xs font-semibold text-fab-text truncate mt-0.5">{finish.eventName}</p>
      <p className="text-[9px] text-fab-dim truncate mt-0.5">
        {finish.eventType} · {finish.format} · {localDate(finish.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </p>
    </div>
  );
}

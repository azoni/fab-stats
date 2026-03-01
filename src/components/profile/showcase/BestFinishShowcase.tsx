"use client";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
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

const FINISH_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  champion: { label: "Champion", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", icon: "🏆" },
  finalist: { label: "Finalist", color: "text-gray-300", bg: "bg-gray-300/10", border: "border-gray-300/30", icon: "🥈" },
  top4: { label: "Top 4", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: "🥉" },
  top8: { label: "Top 8", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30", icon: "🎖️" },
};

export function BestFinishShowcase({ finish }: BestFinishShowcaseProps) {
  const cfg = FINISH_CONFIG[finish.type] || FINISH_CONFIG.top8;
  const heroInfo = finish.hero ? getHeroByName(finish.hero) : null;

  return (
    <div className="spotlight-card spotlight-grinder bg-fab-surface border border-fab-border rounded-lg px-4 py-3 relative overflow-hidden">
      <div className="flex items-center gap-3">
        {/* Finish badge */}
        <div className={`shrink-0 w-10 h-10 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
          <span className="text-lg">{cfg.icon}</span>
        </div>

        {/* Event info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
            <span className="text-[9px] text-fab-dim bg-fab-bg px-1.5 py-0.5 rounded">{finish.eventType}</span>
          </div>
          <p className="text-sm font-semibold text-fab-text truncate mt-0.5">{finish.eventName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {heroInfo && (
              <div className="flex items-center gap-1">
                <HeroClassIcon heroClass={heroInfo.classes[0]} size="sm" />
                <span className="text-[10px] text-fab-muted">{finish.hero}</span>
              </div>
            )}
            <span className="text-[10px] text-fab-dim">
              {localDate(finish.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="text-[10px] text-fab-dim">{finish.format}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

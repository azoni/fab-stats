"use client";
import type { MatchRecord } from "@/types";
import { MatchResult } from "@/types";

interface EventTypeMasteryCardProps {
  matches: MatchRecord[];
  sortBy?: "mostPlayed" | "bestWinRate";
  selectedItems?: string[];
}

interface EventTypeData {
  eventType: string;
  matches: number;
  wins: number;
  winRate: number;
}

function getEventType(match: MatchRecord): string {
  if (match.eventType) return match.eventType;
  const notes = match.notes?.split("|")[0]?.trim().toLowerCase() || "";
  if (notes.includes("armory")) return "Armory";
  if (notes.includes("skirmish")) return "Skirmish";
  if (notes.includes("proquest")) return "ProQuest";
  if (notes.includes("battle hardened")) return "Battle Hardened";
  if (notes.includes("calling")) return "The Calling";
  if (notes.includes("national")) return "Nationals";
  if (notes.includes("pro tour")) return "Pro Tour";
  if (notes.includes("rtn") || notes.includes("road to nationals")) return "RTN";
  return "Other";
}

export function EventTypeMasteryCard({ matches, sortBy = "mostPlayed", selectedItems }: EventTypeMasteryCardProps) {
  const typeMap = new Map<string, { matches: number; wins: number }>();
  for (const m of matches) {
    if (m.result === MatchResult.Bye) continue;
    const et = getEventType(m);
    const cur = typeMap.get(et) || { matches: 0, wins: 0 };
    cur.matches++;
    if (m.result === MatchResult.Win) cur.wins++;
    typeMap.set(et, cur);
  }

  const allTypes: EventTypeData[] = [...typeMap.entries()]
    .map(([eventType, data]) => ({
      eventType,
      matches: data.matches,
      wins: data.wins,
      winRate: data.matches > 0 ? (data.wins / data.matches) * 100 : 0,
    }))
    .sort((a, b) => sortBy === "bestWinRate" ? b.winRate - a.winRate || b.matches - a.matches : b.matches - a.matches);

  const types = selectedItems && selectedItems.length > 0
    ? allTypes.filter((t) => selectedItems.includes(t.eventType))
    : allTypes.slice(0, 8);

  if (types.length === 0) return null;
  const maxMatches = Math.max(...types.map((t) => t.matches));

  return (
    <div className="spotlight-card spotlight-active bg-fab-surface border border-fab-border rounded-lg px-3 py-2 relative overflow-hidden h-full min-h-[88px]">
      <img src="/assets/cards/bg-stats.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.15] pointer-events-none" />
      <div className="relative">
      <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider font-medium mb-1.5">
        Event Types {sortBy === "bestWinRate" ? "— by Win Rate" : "— by Matches"}
      </p>
      <div className="space-y-1">
        {types.map((t) => (
          <div key={t.eventType} className="flex items-center gap-1.5">
            <span className="text-[11px] text-fab-muted w-16 truncate shrink-0">{t.eventType}</span>
            <div className="flex-1 h-2.5 bg-fab-bg rounded-full overflow-hidden relative">
              <div className={`h-full rounded-full ${t.winRate >= 50 ? "bg-fab-win/25" : "bg-fab-loss/25"}`} style={{ width: `${(t.matches / maxMatches) * 100}%` }} />
              <span className="absolute inset-0 flex items-center px-1 text-[9px] font-medium text-fab-text">{t.matches}</span>
            </div>
            <span className={`text-[11px] font-semibold w-8 text-right ${t.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>{t.winRate.toFixed(0)}%</span>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

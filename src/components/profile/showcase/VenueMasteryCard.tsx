"use client";
import type { MatchRecord } from "@/types";
import { MatchResult } from "@/types";

interface VenueMasteryCardProps {
  matches: MatchRecord[];
  sortBy?: "mostPlayed" | "bestWinRate";
  selectedItems?: string[];
}

interface VenueData {
  venue: string;
  matches: number;
  wins: number;
  winRate: number;
}

function getVenue(match: MatchRecord): string {
  const v = (match.venue || "").trim();
  if (!v || v === "Unknown") return "";
  return v;
}

export function VenueMasteryCard({ matches, sortBy = "mostPlayed", selectedItems }: VenueMasteryCardProps) {
  const venueMap = new Map<string, { matches: number; wins: number }>();
  for (const m of matches) {
    if (m.result === MatchResult.Bye) continue;
    const venue = getVenue(m);
    if (!venue) continue;
    const cur = venueMap.get(venue) || { matches: 0, wins: 0 };
    cur.matches++;
    if (m.result === MatchResult.Win) cur.wins++;
    venueMap.set(venue, cur);
  }

  const allVenues: VenueData[] = [...venueMap.entries()]
    .map(([venue, data]) => ({
      venue,
      matches: data.matches,
      wins: data.wins,
      winRate: data.matches > 0 ? (data.wins / data.matches) * 100 : 0,
    }))
    .sort((a, b) => sortBy === "bestWinRate" ? b.winRate - a.winRate || b.matches - a.matches : b.matches - a.matches);

  const venues = selectedItems && selectedItems.length > 0
    ? allVenues.filter((v) => selectedItems.includes(v.venue))
    : allVenues.slice(0, 8);

  if (venues.length === 0) return null;
  const maxMatches = Math.max(...venues.map((v) => v.matches));

  return (
    <div className="spotlight-card spotlight-active bg-fab-surface border border-fab-border rounded-lg px-3 py-2 relative overflow-hidden h-full min-h-[88px]">
      <img src="/assets/cards/bg-stats.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.15] pointer-events-none" />
      <div className="relative">
      <p className="text-[10px] text-violet-400/70 uppercase tracking-wider font-medium mb-1.5">
        Venues {sortBy === "bestWinRate" ? "— by Win Rate" : "— by Matches"}
      </p>
      <div className="space-y-1">
        {venues.map((v) => (
          <div key={v.venue} className="flex items-center gap-1.5">
            <span className="text-[11px] text-fab-muted w-20 truncate shrink-0">{v.venue}</span>
            <div className="flex-1 h-2.5 bg-fab-bg rounded-full overflow-hidden relative">
              <div className={`h-full rounded-full ${v.winRate >= 50 ? "bg-fab-win/25" : "bg-fab-loss/25"}`} style={{ width: `${(v.matches / maxMatches) * 100}%` }} />
              <span className="absolute inset-0 flex items-center px-1 text-[9px] font-medium text-fab-text">{v.matches}</span>
            </div>
            <span className={`text-[11px] font-semibold w-8 text-right ${v.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>{v.winRate.toFixed(0)}%</span>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

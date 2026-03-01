"use client";
import type { MatchRecord } from "@/types";
import { MatchResult } from "@/types";

interface FormatMasteryCardProps {
  matches: MatchRecord[];
}

interface FormatData {
  format: string;
  matches: number;
  wins: number;
  winRate: number;
}

export function FormatMasteryCard({ matches }: FormatMasteryCardProps) {
  const formatMap = new Map<string, { matches: number; wins: number }>();
  for (const m of matches) {
    if (m.result === MatchResult.Bye) continue;
    const cur = formatMap.get(m.format) || { matches: 0, wins: 0 };
    cur.matches++;
    if (m.result === MatchResult.Win) cur.wins++;
    formatMap.set(m.format, cur);
  }

  const formats: FormatData[] = [...formatMap.entries()]
    .map(([format, data]) => ({
      format,
      matches: data.matches,
      wins: data.wins,
      winRate: data.matches > 0 ? (data.wins / data.matches) * 100 : 0,
    }))
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 4);

  if (formats.length === 0) return null;
  const maxMatches = formats[0].matches;

  return (
    <div className="spotlight-card spotlight-active bg-fab-surface border border-fab-border rounded-lg px-3 py-2 relative overflow-hidden h-full">
      <p className="text-[8px] text-fab-dim uppercase tracking-wider font-medium mb-1.5">Format Breakdown</p>
      <div className="space-y-1">
        {formats.map((f) => (
          <div key={f.format} className="flex items-center gap-1.5">
            <span className="text-[9px] text-fab-muted w-14 truncate shrink-0">{f.format}</span>
            <div className="flex-1 h-2.5 bg-fab-bg rounded-full overflow-hidden relative">
              <div className={`h-full rounded-full ${f.winRate >= 50 ? "bg-fab-win/25" : "bg-fab-loss/25"}`} style={{ width: `${(f.matches / maxMatches) * 100}%` }} />
              <span className="absolute inset-0 flex items-center px-1 text-[7px] font-medium text-fab-text">{f.matches}</span>
            </div>
            <span className={`text-[9px] font-semibold w-8 text-right ${f.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>{f.winRate.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

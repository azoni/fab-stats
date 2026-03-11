"use client";
import Link from "next/link";
import { MatchResult } from "@/types";
import type { MatchRecord } from "@/types";

interface LatestMatchesProps {
  matches: MatchRecord[];
}

const resultStyle: Record<string, string> = {
  [MatchResult.Win]: "bg-fab-win/15 text-fab-win",
  [MatchResult.Loss]: "bg-fab-loss/15 text-fab-loss",
  [MatchResult.Draw]: "bg-fab-draw/15 text-fab-draw",
  [MatchResult.Bye]: "bg-fab-dim/15 text-fab-dim",
};

const resultLabel: Record<string, string> = {
  [MatchResult.Win]: "W",
  [MatchResult.Loss]: "L",
  [MatchResult.Draw]: "D",
  [MatchResult.Bye]: "B",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function LatestMatches({ matches }: LatestMatchesProps) {
  const latest = matches.slice(0, 6);

  if (latest.length === 0) return null;

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-fab-border/50">
        <p className="text-sm font-semibold text-fab-text">Latest Matches</p>
        <Link href="/matches" className="text-xs font-semibold text-fab-gold border border-fab-gold/30 hover:bg-fab-gold/10 hover:border-fab-gold/50 px-2.5 py-1 rounded-md transition-colors">
          View all matches &rarr;
        </Link>
      </div>
      <div className="divide-y divide-fab-border/30">
        {latest.map((m, i) => (
          <Link key={m.id || i} href="/matches" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-fab-bg/50 transition-colors">
            {/* Result */}
            <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${resultStyle[m.result] || resultStyle[MatchResult.Draw]}`}>
              {resultLabel[m.result] || "?"}
            </span>

            {/* Opponent */}
            <span className="text-fab-text font-medium truncate min-w-0 flex-1">
              {m.opponentName || "Unknown"}
            </span>

            {/* Hero matchup */}
            <span className="text-[10px] text-fab-dim hidden sm:block shrink-0 truncate max-w-[120px]">
              {m.heroPlayed && m.opponentHero ? (
                <>{m.heroPlayed} <span className="text-fab-muted">vs</span> {m.opponentHero}</>
              ) : m.heroPlayed ? (
                m.heroPlayed
              ) : null}
            </span>

            {/* Date */}
            <span className="text-[10px] text-fab-dim shrink-0 tabular-nums">
              {formatDate(m.date)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

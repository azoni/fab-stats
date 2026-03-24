"use client";
import { useMemo } from "react";
import { getHeroByName } from "@/lib/heroes";
import { HeroImg } from "@/components/heroes/HeroImg";
import { MatchResult } from "@/types";
import type { MatchRecord } from "@/types";

interface BracketNode {
  round: string;
  opponentName: string;
  opponentHero: string;
  heroPlayed: string;
  result: MatchResult;
}

interface BracketViewProps {
  matches: MatchRecord[];
  playerName?: string;
}

const ROUND_ORDER: Record<string, number> = {
  "Top 8": 1,
  "Playoff": 1,
  "Quarterfinal": 1,
  "Quarterfinals": 1,
  "Top 4": 2,
  "Semifinal": 2,
  "Semifinals": 2,
  "Finals": 3,
  "Final": 3,
  "Grand Final": 3,
  "Skirmish": 0,
};

const ROUND_LABELS: Record<string, string> = {
  "Playoff": "Top 8",
  "Quarterfinal": "Top 8",
  "Quarterfinals": "Top 8",
  "Semifinal": "Top 4",
  "Semifinals": "Top 4",
  "Final": "Finals",
  "Grand Final": "Finals",
};

function getRoundLabel(round: string): string {
  if (/^Round P/i.test(round)) return "Top 8";
  return ROUND_LABELS[round] ?? round;
}

function getRoundOrder(round: string): number {
  if (/^Round P/i.test(round)) return 1;
  return ROUND_ORDER[round] ?? -1;
}

/** Extract round info from match notes, trying multiple formats. */
function extractRoundInfo(notes: string | undefined): string | null {
  if (!notes) return null;
  // Format: "Event Name | Round Info" or "Event Name | Round Info | extra"
  const parts = notes.split(" | ");
  if (parts.length >= 2 && parts[1].trim()) return parts[1].trim();
  return null;
}

export function BracketView({ matches, playerName }: BracketViewProps) {
  const nodes = useMemo(() => {
    const playoff: BracketNode[] = [];
    for (const m of matches) {
      const roundInfo = extractRoundInfo(m.notes);
      if (!roundInfo) continue;
      const order = getRoundOrder(roundInfo);
      if (order < 0) continue; // Unknown round type, skip

      playoff.push({
        round: getRoundLabel(roundInfo),
        opponentName: m.opponentName || "Unknown",
        opponentHero: m.opponentHero || "",
        heroPlayed: m.heroPlayed || "",
        result: m.result as MatchResult,
      });
    }
    return playoff.sort((a, b) => getRoundOrder(a.round) - getRoundOrder(b.round));
  }, [matches]);

  if (nodes.length === 0) {
    return (
      <p className="text-xs text-fab-dim text-center py-3">No playoff matches found for this event.</p>
    );
  }

  // Group by round
  const rounds = useMemo(() => {
    const map = new Map<string, BracketNode[]>();
    for (const n of nodes) {
      const existing = map.get(n.round) || [];
      existing.push(n);
      map.set(n.round, existing);
    }
    return [...map.entries()].sort((a, b) => getRoundOrder(a[0]) - getRoundOrder(b[0]));
  }, [nodes]);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 min-w-max py-2">
        {rounds.map(([round, roundNodes]) => (
          <div key={round} className="flex flex-col gap-2 min-w-[180px]">
            <h4 className="text-[10px] font-bold text-fab-dim uppercase tracking-wider text-center mb-1">
              {round}
            </h4>
            {roundNodes.map((node, i) => {
              const won = node.result === MatchResult.Win;
              const oppHeroInfo = getHeroByName(node.opponentHero);
              const myHeroInfo = getHeroByName(node.heroPlayed);
              return (
                <div
                  key={i}
                  className={`border rounded-lg overflow-hidden ${won ? "border-fab-win/30" : "border-fab-border"}`}
                >
                  {/* Player (you) */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 ${won ? "bg-fab-win/5" : "bg-fab-surface"}`}>
                    <HeroImg name={node.heroPlayed} size="sm" />
                    <span className={`text-xs font-medium flex-1 truncate ${won ? "text-fab-win" : "text-fab-text"}`}>
                      {playerName || "You"}
                    </span>
                    <span className={`text-xs font-bold ${won ? "text-fab-win" : "text-fab-loss"}`}>
                      {won ? "W" : node.result === MatchResult.Draw ? "D" : "L"}
                    </span>
                  </div>
                  {/* Opponent */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 border-t ${won ? "border-fab-win/10" : "border-fab-border/50"} bg-fab-bg/50`}>
                    <HeroImg name={node.opponentHero || "Unknown"} size="sm" />
                    <span className="text-xs text-fab-dim flex-1 truncate">
                      {node.opponentName}
                    </span>
                    <span className={`text-xs font-bold ${won ? "text-fab-loss" : "text-fab-win"}`}>
                      {won ? "L" : node.result === MatchResult.Draw ? "D" : "W"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";
import { useMemo } from "react";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
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
  "Top 4": 2,
  "Finals": 3,
  "Skirmish": 0,
};

function getRoundLabel(round: string): string {
  if (round === "Playoff" || /^Round P/i.test(round)) return "Top 8";
  return round;
}

function getRoundOrder(round: string): number {
  if (/^Round P/i.test(round)) return 1;
  return ROUND_ORDER[round] ?? 0;
}

export function BracketView({ matches, playerName }: BracketViewProps) {
  const nodes = useMemo(() => {
    const playoff: BracketNode[] = [];
    for (const m of matches) {
      const roundInfo = m.notes?.split(" | ")[1];
      if (!roundInfo) continue;
      const order = getRoundOrder(roundInfo);
      if (order === 0 && roundInfo !== "Skirmish") continue;

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
                    <HeroClassIcon heroClass={myHeroInfo?.classes[0]} size="sm" />
                    <span className={`text-xs font-medium flex-1 truncate ${won ? "text-fab-win" : "text-fab-text"}`}>
                      {playerName || "You"}
                    </span>
                    <span className={`text-xs font-bold ${won ? "text-fab-win" : "text-fab-loss"}`}>
                      {won ? "W" : node.result === MatchResult.Draw ? "D" : "L"}
                    </span>
                  </div>
                  {/* Opponent */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 border-t ${won ? "border-fab-win/10" : "border-fab-border/50"} bg-fab-bg/50`}>
                    <HeroClassIcon heroClass={oppHeroInfo?.classes[0]} size="sm" />
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

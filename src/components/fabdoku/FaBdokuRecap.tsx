"use client";

import { useState } from "react";
import { FaBdokuBoard } from "./FaBdokuBoard";
import { getHeroByName } from "@/lib/heroes";
import type { GameState, DailyPuzzle, UniquenessData, PickData } from "@/lib/fabdoku/types";

function getPctColor(pct: number): string {
  if (pct <= 5) return "text-fab-gold";
  if (pct <= 15) return "text-emerald-400";
  if (pct <= 30) return "text-sky-400";
  if (pct <= 50) return "text-fab-muted";
  return "text-fab-dim";
}

function getPctBarColor(pct: number): string {
  if (pct <= 5) return "bg-fab-gold/60";
  if (pct <= 15) return "bg-emerald-400/50";
  if (pct <= 30) return "bg-sky-400/40";
  if (pct <= 50) return "bg-fab-muted/30";
  return "bg-fab-dim/25";
}

interface FaBdokuRecapProps {
  dateStr: string;
  gameState: GameState;
  puzzle: DailyPuzzle;
  uniqueness: UniquenessData;
  pickData: PickData;
  onCollapse: () => void;
  onShare?: () => void;
}

export function FaBdokuRecap({
  dateStr,
  gameState,
  puzzle,
  uniqueness,
  pickData,
  onCollapse,
  onShare,
}: FaBdokuRecapProps) {
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>([0, 0]);

  const correctCount = gameState.cells.flat().filter((c) => c.correct).length;

  // Build cell breakdown for selected cell
  const breakdown = selectedCell ? (() => {
    const [r, c] = selectedCell;
    const key = `${r}-${c}`;
    const cellPicks = pickData.cells[key] ?? {};
    const total = pickData.totalPlayers;
    const userPick = gameState.cells[r][c].heroName;
    const rowCat = puzzle.rows[r];
    const colCat = puzzle.cols[c];

    const entries = Object.entries(cellPicks)
      .map(([hero, count]) => ({
        hero,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const top = entries.slice(0, 5);
    const rest = entries.slice(5);
    const otherCount = rest.reduce((sum, e) => sum + e.count, 0);
    const otherPct = total > 0 ? Math.round((otherCount / total) * 100) : 0;

    return { rowCat, colCat, top, otherCount: rest.length, otherPct, userPick, total };
  })() : null;

  return (
    <div className="bg-fab-surface border border-fab-border rounded-xl mb-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-sm font-semibold text-fab-text">Yesterday&apos;s Recap</h3>
          <span className="text-xs text-fab-dim">{dateStr}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-sm font-bold text-fab-gold font-mono">{uniqueness.score}</span>
            <span className="text-[10px] text-fab-dim ml-1">score</span>
          </div>
          <span className="text-[10px] text-fab-dim">
            {correctCount}/9 · {uniqueness.totalPlayers} player{uniqueness.totalPlayers !== 1 ? "s" : ""}
          </span>
          {onShare && (
            <button
              onClick={onShare}
              className="text-fab-dim hover:text-fab-gold transition-colors"
              title="Share yesterday's score"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
            </button>
          )}
          <button
            onClick={onCollapse}
            className="text-fab-dim hover:text-fab-muted transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="px-4 py-3">
        <FaBdokuBoard
          rows={puzzle.rows}
          cols={puzzle.cols}
          cells={gameState.cells}
          disabled={false}
          onCellClick={(r, c) => setSelectedCell(
            selectedCell?.[0] === r && selectedCell?.[1] === c ? null : [r, c]
          )}
          cellPcts={uniqueness.cellPcts}
          selectedCell={selectedCell}
        />
      </div>

      {/* Cell breakdown */}
      <div className="px-4 pb-4">
        {!breakdown ? (
          <p className="text-[10px] text-fab-dim text-center py-2">
            Tap a cell to see what others picked
          </p>
        ) : (
          <div className="bg-fab-bg/50 rounded-lg border border-fab-border p-3">
            {/* Cell label */}
            <p className="text-[10px] text-fab-dim uppercase tracking-wider mb-2">
              {breakdown.rowCat.label} × {breakdown.colCat.label}
            </p>

            {/* Hero entries */}
            <div className="space-y-1.5">
              {breakdown.top.map(({ hero, pct }) => {
                const heroInfo = getHeroByName(hero);
                const isUserPick = hero === breakdown.userPick;
                return (
                  <div key={hero} className="flex items-center gap-2">
                    {/* Hero thumbnail */}
                    {heroInfo?.imageUrl ? (
                      <img
                        src={heroInfo.imageUrl}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover object-top shrink-0 border border-fab-border"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-fab-surface-hover border border-fab-border shrink-0 flex items-center justify-center">
                        <span className="text-[8px] text-fab-dim">{hero.charAt(0)}</span>
                      </div>
                    )}
                    {/* Name */}
                    <span className={`text-xs truncate min-w-0 flex-1 ${isUserPick ? "text-fab-gold font-semibold" : "text-fab-text"}`}>
                      {hero.split(",")[0]}
                      {isUserPick && <span className="text-[9px] text-fab-gold/70 ml-1">★</span>}
                    </span>
                    {/* Percentage */}
                    <span className={`text-xs font-mono shrink-0 w-8 text-right ${getPctColor(pct)}`}>
                      {pct}%
                    </span>
                    {/* Bar */}
                    <div className="w-16 h-1.5 rounded-full bg-fab-border/50 shrink-0 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getPctBarColor(pct)}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Others row */}
              {breakdown.otherCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-fab-surface-hover border border-fab-border shrink-0 flex items-center justify-center">
                    <span className="text-[8px] text-fab-dim">+</span>
                  </div>
                  <span className="text-xs text-fab-dim truncate min-w-0 flex-1">
                    Others ({breakdown.otherCount})
                  </span>
                  <span className="text-xs font-mono text-fab-dim shrink-0 w-8 text-right">
                    {breakdown.otherPct}%
                  </span>
                  <div className="w-16 h-1.5 rounded-full bg-fab-border/50 shrink-0 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-fab-dim/20"
                      style={{ width: `${Math.min(breakdown.otherPct, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Player count */}
            <p className="text-[9px] text-fab-dim mt-2 text-right">
              {breakdown.total} player{breakdown.total !== 1 ? "s" : ""} completed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

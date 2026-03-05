"use client";

import { useState, useEffect } from "react";
import { getHeroByName } from "@/lib/heroes";
import { getCardById } from "@/lib/cards";
import type { PickData } from "@/lib/fabdoku/types";

function getPctBarColor(pct: number): string {
  if (pct <= 5) return "bg-fab-gold/60";
  if (pct <= 15) return "bg-emerald-400/50";
  if (pct <= 30) return "bg-sky-400/40";
  if (pct <= 50) return "bg-fab-muted/30";
  return "bg-fab-dim/25";
}

interface AdminPicksViewerProps {
  dateStr: string;
  loadPicks: (dateStr: string) => Promise<PickData | null>;
  /** Row/col labels for context. [row][col] = "RowLabel × ColLabel" */
  cellLabels: string[][];
  /** "heroes" uses getHeroByName for images, "cards" uses getCardById */
  mode: "heroes" | "cards";
}

function getImage(name: string, mode: "heroes" | "cards"): string | undefined {
  if (mode === "heroes") return getHeroByName(name)?.imageUrl;
  return getCardById(name)?.imageUrl;
}

function getDisplayName(name: string, mode: "heroes" | "cards"): string {
  if (mode === "heroes") return name.split(",")[0];
  const card = getCardById(name);
  if (!card) return name;
  const pitch = card.pitch ? ` (${card.pitch})` : "";
  return card.name.split(",")[0] + pitch;
}

export function AdminPicksViewer({ dateStr, loadPicks, cellLabels, mode }: AdminPicksViewerProps) {
  const [pickData, setPickData] = useState<PickData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedCell, setSelectedCell] = useState<string>("0-0");

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    loadPicks(dateStr)
      .then(setPickData)
      .catch(() => setPickData(null))
      .finally(() => setLoading(false));
  }, [expanded, dateStr, loadPicks]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="mt-3 w-full px-3 py-2 text-xs font-medium rounded-lg bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/50 transition-colors"
      >
        View Today&apos;s Picks (Admin)
      </button>
    );
  }

  if (loading) {
    return (
      <div className="mt-3 bg-fab-surface border border-fab-border rounded-lg p-4">
        <p className="text-xs text-fab-dim text-center">Loading picks...</p>
      </div>
    );
  }

  if (!pickData || pickData.totalPlayers === 0) {
    return (
      <div className="mt-3 bg-fab-surface border border-fab-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-fab-text">Today&apos;s Picks</p>
          <button onClick={() => setExpanded(false)} className="text-fab-dim hover:text-fab-muted text-xs">
            Close
          </button>
        </div>
        <p className="text-xs text-fab-dim text-center py-2">No picks yet</p>
      </div>
    );
  }

  const total = pickData.totalPlayers;

  // Build all cells list for the selector
  const cells: { key: string; label: string }[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells.push({ key: `${r}-${c}`, label: cellLabels[r]?.[c] ?? `Cell ${r},${c}` });
    }
  }

  const cellPicks = pickData.cells[selectedCell] ?? {};
  const entries = Object.entries(cellPicks)
    .map(([name, count]) => ({
      name,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="mt-3 bg-fab-surface border border-fab-border rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs font-semibold text-fab-text">Today&apos;s Picks</p>
          <p className="text-[10px] text-fab-dim">{total} player{total !== 1 ? "s" : ""} completed</p>
        </div>
        <button onClick={() => setExpanded(false)} className="text-fab-dim hover:text-fab-muted text-xs">
          Close
        </button>
      </div>

      {/* Cell selector */}
      <div className="grid grid-cols-3 gap-1 mb-3">
        {cells.map((cell) => (
          <button
            key={cell.key}
            onClick={() => setSelectedCell(cell.key)}
            className={`px-1.5 py-1 rounded text-[9px] font-medium truncate transition-colors ${
              selectedCell === cell.key
                ? "bg-fab-gold/15 text-fab-gold border border-fab-gold/30"
                : "bg-fab-bg/50 text-fab-dim border border-fab-border hover:text-fab-muted"
            }`}
          >
            {cell.label}
          </button>
        ))}
      </div>

      {/* Picks breakdown */}
      {entries.length === 0 ? (
        <p className="text-[10px] text-fab-dim text-center py-2">No picks for this cell</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {entries.map(({ name, count, pct }) => {
            const imgUrl = getImage(name, mode);
            const displayName = getDisplayName(name, mode);
            return (
              <div key={name} className="flex items-center gap-2">
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover object-top shrink-0 border border-fab-border"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-fab-surface-hover border border-fab-border shrink-0 flex items-center justify-center">
                    <span className="text-[8px] text-fab-dim">{displayName.charAt(0)}</span>
                  </div>
                )}
                <span className="text-xs text-fab-text truncate flex-1 min-w-0">
                  {displayName}
                </span>
                <span className="text-[10px] text-fab-dim font-mono shrink-0 w-6 text-right">
                  {count}
                </span>
                <span className="text-xs text-fab-muted font-mono shrink-0 w-8 text-right">
                  {pct}%
                </span>
                <div className="w-12 h-1.5 rounded-full bg-fab-border/50 shrink-0 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getPctBarColor(pct)}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { Fragment } from "react";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import { CardCell } from "./CardCell";
import type { CardCategoryDef } from "@/lib/fabdoku/card-categories";
import type { CardCellState } from "@/lib/fabdoku/card-game-state";

const TALENT_COLORS: Record<string, { bg: string; text: string }> = {
  Light: { bg: "bg-yellow-900/40", text: "text-yellow-300" },
  Shadow: { bg: "bg-purple-900/40", text: "text-purple-400" },
  Elemental: { bg: "bg-cyan-900/40", text: "text-cyan-400" },
  Draconic: { bg: "bg-red-900/40", text: "text-red-400" },
  Ice: { bg: "bg-blue-900/40", text: "text-blue-300" },
  Earth: { bg: "bg-emerald-900/40", text: "text-emerald-400" },
  Lightning: { bg: "bg-amber-900/40", text: "text-amber-400" },
};

const GROUP_COLORS: Record<string, { bg: string; text: string }> = {
  type: { bg: "bg-fab-gold/10", text: "text-fab-gold" },
  pitch: { bg: "bg-amber-900/40", text: "text-amber-400" },
  cost: { bg: "bg-slate-800/40", text: "text-slate-300" },
  keyword: { bg: "bg-violet-900/40", text: "text-violet-400" },
};

const PITCH_COLORS: Record<string, { bg: string; text: string }> = {
  "Red (1)": { bg: "bg-red-900/40", text: "text-red-400" },
  "Yellow (2)": { bg: "bg-yellow-900/40", text: "text-yellow-400" },
  "Blue (3)": { bg: "bg-blue-900/40", text: "text-blue-400" },
};

function getCategoryColors(cat: CardCategoryDef): { bg: string; text: string } {
  if (cat.group === "talent") return TALENT_COLORS[cat.label] ?? { bg: "bg-zinc-800/40", text: "text-zinc-400" };
  if (cat.group === "class") return { bg: "", text: "" };
  if (cat.group === "pitch") return PITCH_COLORS[cat.label] ?? GROUP_COLORS.pitch;
  return GROUP_COLORS[cat.group] ?? { bg: "bg-fab-gold/10", text: "text-fab-gold" };
}

function CategoryHeader({ cat, orientation }: { cat: CardCategoryDef; orientation: "row" | "col" }) {
  const isClass = cat.group === "class";
  const colors = getCategoryColors(cat);

  return (
    <div
      className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-1.5 py-1.5 sm:py-2 min-w-0 ${
        orientation === "col" ? "flex-col" : "flex-row"
      }`}
    >
      {isClass && cat.icon ? (
        <HeroClassIcon heroClass={cat.icon} size="sm" />
      ) : (
        <div
          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${colors.bg} border border-white/10 flex items-center justify-center shrink-0`}
        >
          <span className={`text-[8px] sm:text-[9px] font-bold ${colors.text}`}>
            {cat.label.charAt(0)}
          </span>
        </div>
      )}
      <span className={`text-[9px] sm:text-[10px] font-semibold leading-tight text-center ${isClass ? "" : colors.text}`}>
        {cat.label}
      </span>
    </div>
  );
}

interface CardFaBdokuBoardProps {
  rows: CardCategoryDef[];
  cols: CardCategoryDef[];
  cells: CardCellState[][];
  disabled: boolean;
  onCellClick: (row: number, col: number) => void;
  cellPcts?: number[][];
  selectedCell?: [number, number] | null;
}

export function CardFaBdokuBoard({
  rows,
  cols,
  cells,
  disabled,
  onCellClick,
  cellPcts,
  selectedCell,
}: CardFaBdokuBoardProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-[400px] mx-auto">
      <div />

      {cols.map((col) => (
        <CategoryHeader key={col.id} cat={col} orientation="col" />
      ))}

      {rows.map((row, ri) => (
        <Fragment key={row.id}>
          <CategoryHeader cat={row} orientation="row" />

          {cols.map((_, ci) => {
            const cell = cells[ri][ci];
            return (
              <CardCell
                key={`${ri}-${ci}`}
                cardId={cell.cardId}
                correct={cell.correct}
                locked={cell.locked}
                disabled={disabled}
                onClick={() => onCellClick(ri, ci)}
                pct={cellPcts?.[ri]?.[ci]}
                selected={selectedCell?.[0] === ri && selectedCell?.[1] === ci}
              />
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}

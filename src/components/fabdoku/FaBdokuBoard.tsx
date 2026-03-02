"use client";

import { Fragment } from "react";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import { FaBdokuCell } from "./FaBdokuCell";
import type { CategoryDef, CellState } from "@/lib/fabdoku/types";

/** Colors for talent category headers. */
const TALENT_COLORS: Record<string, { bg: string; text: string }> = {
  Light: { bg: "bg-yellow-900/40", text: "text-yellow-300" },
  Shadow: { bg: "bg-purple-900/40", text: "text-purple-400" },
  Elemental: { bg: "bg-cyan-900/40", text: "text-cyan-400" },
  Draconic: { bg: "bg-red-900/40", text: "text-red-400" },
  Ice: { bg: "bg-blue-900/40", text: "text-blue-300" },
  Earth: { bg: "bg-emerald-900/40", text: "text-emerald-400" },
  Lightning: { bg: "bg-amber-900/40", text: "text-amber-400" },
  Mystic: { bg: "bg-violet-900/40", text: "text-violet-400" },
  Royal: { bg: "bg-yellow-900/40", text: "text-yellow-400" },
  Chaos: { bg: "bg-rose-900/40", text: "text-rose-400" },
  "No Talent": { bg: "bg-zinc-800/40", text: "text-zinc-400" },
};

const GROUP_COLORS: Record<string, { bg: string; text: string }> = {
  age: { bg: "bg-sky-900/40", text: "text-sky-400" },
  stat: { bg: "bg-teal-900/40", text: "text-teal-400" },
  format: { bg: "bg-indigo-900/40", text: "text-indigo-400" },
};

function getCategoryColors(cat: CategoryDef): { bg: string; text: string } {
  if (cat.group === "talent") return TALENT_COLORS[cat.label] ?? TALENT_COLORS["No Talent"];
  if (cat.group === "class") return { bg: "", text: "" }; // HeroClassIcon handles its own colors
  return GROUP_COLORS[cat.group] ?? { bg: "bg-fab-gold/10", text: "text-fab-gold" };
}

function CategoryHeader({ cat, orientation }: { cat: CategoryDef; orientation: "row" | "col" }) {
  const isClass = cat.group === "class";
  const colors = getCategoryColors(cat);

  return (
    <div
      className={`flex items-center justify-center gap-1.5 px-1.5 py-2 ${
        orientation === "col" ? "flex-col" : "flex-row"
      }`}
    >
      {isClass && cat.icon ? (
        <HeroClassIcon heroClass={cat.icon} size="sm" />
      ) : (
        <div
          className={`w-6 h-6 rounded-full ${colors.bg} border border-white/10 flex items-center justify-center shrink-0`}
        >
          <span className={`text-[9px] font-bold ${colors.text}`}>
            {cat.label.charAt(0)}
          </span>
        </div>
      )}
      <span className={`text-[10px] font-semibold leading-tight text-center ${isClass ? "" : colors.text}`}>
        {cat.label}
      </span>
    </div>
  );
}

interface FaBdokuBoardProps {
  rows: CategoryDef[];
  cols: CategoryDef[];
  cells: CellState[][];
  disabled: boolean;
  onCellClick: (row: number, col: number) => void;
}

export function FaBdokuBoard({
  rows,
  cols,
  cells,
  disabled,
  onCellClick,
}: FaBdokuBoardProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-[400px] mx-auto">
      {/* Top-left corner — empty */}
      <div />

      {/* Column headers */}
      {cols.map((col) => (
        <CategoryHeader key={col.id} cat={col} orientation="col" />
      ))}

      {/* Rows */}
      {rows.map((row, ri) => (
        <Fragment key={row.id}>
          {/* Row header */}
          <CategoryHeader cat={row} orientation="row" />

          {/* Cells */}
          {cols.map((_, ci) => {
            const cell = cells[ri][ci];
            return (
              <FaBdokuCell
                key={`${ri}-${ci}`}
                heroName={cell.heroName}
                correct={cell.correct}
                locked={cell.locked}
                disabled={disabled || cell.locked}
                onClick={() => onCellClick(ri, ci)}
              />
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}

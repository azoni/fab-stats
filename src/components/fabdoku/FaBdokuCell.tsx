"use client";

import { useState } from "react";
import { getHeroByName } from "@/lib/heroes";

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

interface FaBdokuCellProps {
  heroName: string | null;
  correct: boolean;
  locked: boolean;
  disabled: boolean;
  onClick: () => void;
  /** Uniqueness percentage (0–100) shown after game completion */
  pct?: number;
}

function getPctColor(pct: number): string {
  if (pct <= 5) return "text-fab-gold";     // very unique
  if (pct <= 15) return "text-emerald-400"; // unique
  if (pct <= 30) return "text-sky-400";     // uncommon
  if (pct <= 50) return "text-fab-muted";   // common
  return "text-fab-dim";                     // very common
}

export function FaBdokuCell({
  heroName,
  correct,
  locked,
  disabled,
  onClick,
  pct,
}: FaBdokuCellProps) {
  const hero = heroName ? getHeroByName(heroName) : null;
  const [imgError, setImgError] = useState(false);
  const showImg = hero?.imageUrl && !imgError;

  // Empty cell
  if (!heroName) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className="relative aspect-square bg-fab-surface border border-fab-border rounded-lg flex items-center justify-center transition-all hover:border-fab-gold/50 hover:bg-fab-surface-hover disabled:opacity-40 disabled:cursor-not-allowed group"
      >
        <PlusIcon className="w-5 h-5 sm:w-6 sm:h-6 text-fab-dim group-hover:text-fab-gold transition-colors" />
      </button>
    );
  }

  // Filled cell
  const borderColor = correct
    ? "border-fab-win ring-1 ring-fab-win/30"
    : "border-fab-loss ring-1 ring-fab-loss/30";

  const shortName = heroName.split(",")[0];
  const canReplace = !disabled;

  return (
    <div
      role={canReplace ? "button" : undefined}
      tabIndex={canReplace ? 0 : undefined}
      onClick={canReplace ? onClick : undefined}
      onKeyDown={canReplace ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      className={`relative aspect-square rounded-lg overflow-hidden border-2 ${borderColor} transition-all ${
        canReplace ? "cursor-pointer hover:brightness-110 hover:ring-2 hover:ring-fab-gold/40" : ""
      }`}
    >
      {showImg ? (
        <img
          src={hero.imageUrl}
          alt={heroName}
          className="w-full h-full object-cover object-top"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full bg-fab-surface flex items-center justify-center p-1">
          <span className="text-[10px] sm:text-xs text-fab-muted text-center leading-tight font-medium">
            {shortName}
          </span>
        </div>
      )}
      {/* Status badge */}
      <div
        className={`absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center ${
          correct ? "bg-fab-win/90" : "bg-fab-loss/90"
        }`}
      >
        {correct ? (
          <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
        ) : (
          <XIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
        )}
      </div>
      {/* Uniqueness % center overlay */}
      {pct !== undefined && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <span
            className={`text-xl sm:text-2xl font-black ${getPctColor(pct)}`}
            style={{ textShadow: "0 0 8px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8)" }}
          >
            {pct}%
          </span>
        </div>
      )}
      {/* Hero name overlay */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-0.5 pt-2 sm:px-1.5 sm:pb-1 sm:pt-3">
        <p className="text-[8px] sm:text-[9px] font-bold text-white leading-tight truncate">
          {shortName}
        </p>
      </div>
    </div>
  );
}

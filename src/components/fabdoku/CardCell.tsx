"use client";

import { useState } from "react";
import { getCardById } from "@/lib/cards";

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

const PITCH_DOT: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-yellow-400",
  3: "bg-blue-500",
};

function getPctColor(pct: number): string {
  if (pct <= 5) return "text-fab-gold";
  if (pct <= 15) return "text-emerald-400";
  if (pct <= 30) return "text-sky-400";
  if (pct <= 50) return "text-fab-muted";
  return "text-fab-dim";
}

interface CardCellProps {
  cardId: string | null;
  correct: boolean;
  locked: boolean;
  disabled: boolean;
  onClick: () => void;
  pct?: number;
  selected?: boolean;
}

export function CardCell({
  cardId,
  correct,
  locked,
  disabled,
  onClick,
  pct,
  selected,
}: CardCellProps) {
  const card = cardId ? getCardById(cardId) : null;
  const [imgError, setImgError] = useState(false);
  const showImg = card?.imageUrl && !imgError;

  if (!cardId) {
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

  const borderColor = selected
    ? "border-fab-gold ring-2 ring-fab-gold/50"
    : correct
    ? "border-fab-win ring-1 ring-fab-win/30"
    : "border-fab-loss ring-1 ring-fab-loss/30";

  const shortName = card?.name.split(",")[0] ?? cardId;
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
          src={card.imageUrl}
          alt={card.name}
          className="w-full h-full object-cover object-[center_25%]"
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
      {/* Pitch dot */}
      {card?.pitch && (
        <div className={`absolute top-0.5 left-0.5 sm:top-1 sm:left-1 w-3 h-3 rounded-full ${PITCH_DOT[card.pitch]} ring-1 ring-black/30`} />
      )}
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
      {/* Card name overlay */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-0.5 pt-2 sm:px-1.5 sm:pb-1 sm:pt-3">
        <p className="text-[8px] sm:text-[9px] font-bold text-white leading-tight truncate">
          {shortName}
        </p>
      </div>
    </div>
  );
}

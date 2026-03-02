"use client";

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
}

export function FaBdokuCell({
  heroName,
  correct,
  locked,
  disabled,
  onClick,
}: FaBdokuCellProps) {
  const hero = heroName ? getHeroByName(heroName) : null;

  // Empty cell
  if (!heroName) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className="relative aspect-square bg-fab-surface border border-fab-border rounded-lg flex items-center justify-center transition-all hover:border-fab-gold/50 hover:bg-fab-surface-hover disabled:opacity-40 disabled:cursor-not-allowed group"
      >
        <PlusIcon className="w-6 h-6 text-fab-dim group-hover:text-fab-gold transition-colors" />
      </button>
    );
  }

  // Filled cell
  const borderColor = correct
    ? "border-fab-win ring-1 ring-fab-win/30"
    : "border-fab-loss ring-1 ring-fab-loss/30";

  return (
    <div
      className={`relative aspect-square rounded-lg overflow-hidden border-2 ${borderColor} transition-all`}
    >
      {hero?.imageUrl ? (
        <img
          src={hero.imageUrl}
          alt={heroName}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div className="w-full h-full bg-fab-surface flex items-center justify-center">
          <span className="text-[10px] text-fab-muted text-center px-1 leading-tight">
            {heroName.split(",")[0]}
          </span>
        </div>
      )}
      {/* Status badge */}
      <div
        className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center ${
          correct ? "bg-fab-win/90" : "bg-fab-loss/90"
        }`}
      >
        {correct ? (
          <CheckIcon className="w-3 h-3 text-white" />
        ) : (
          <XIcon className="w-3 h-3 text-white" />
        )}
      </div>
      {/* Hero name overlay */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-3">
        <p className="text-[9px] font-bold text-white leading-tight truncate">
          {heroName.split(",")[0]}
        </p>
      </div>
    </div>
  );
}

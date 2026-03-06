"use client";
import "./dice.css";

interface DiceFaceProps {
  value: number;
  size?: "sm" | "md" | "lg";
  rolling?: boolean;
  selected?: boolean;
  variant?: "attack" | "defend";
  delay?: number;
  onClick?: () => void;
}

/** 3x3 grid positions (0-8) where dots appear for each die value */
const DOT_POSITIONS: Record<number, number[]> = {
  1: [4],                    // center
  2: [2, 6],                 // top-right, bottom-left
  3: [2, 4, 6],              // top-right, center, bottom-left
  4: [0, 2, 6, 8],           // four corners
  5: [0, 2, 4, 6, 8],        // four corners + center
  6: [0, 3, 6, 2, 5, 8],     // left column + right column
};

const SIZES = {
  sm: { die: "w-10 h-10", dot: "w-1.5 h-1.5", gap: "gap-0.5", pad: "p-1" },
  md: { die: "w-14 h-14", dot: "w-2 h-2", gap: "gap-0.5", pad: "p-1.5" },
  lg: { die: "w-18 h-18", dot: "w-2.5 h-2.5", gap: "gap-1", pad: "p-2" },
};

export function DiceFace({
  value,
  size = "md",
  rolling,
  selected,
  variant = "attack",
  delay = 0,
  onClick,
}: DiceFaceProps) {
  const s = SIZES[size];
  const clamped = Math.min(Math.max(value, 1), 6);
  const dots = DOT_POSITIONS[clamped] || [];

  const isAttack = variant === "attack";
  const bgClass = isAttack ? "bg-[#2a1010]" : "bg-[#1a1a20]";
  const borderClass = isAttack ? "border-red-800/50" : "border-zinc-600/50";
  const dotClass = isAttack ? "bg-amber-200" : "bg-zinc-400";

  return (
    <div
      onClick={onClick}
      className={`
        ${s.die} rounded-lg border ${bgClass} ${borderClass} shadow-lg
        ${isAttack ? "shadow-red-950/50" : "shadow-zinc-900/50"}
        ${selected ? "ring-2 ring-amber-400 animate-dice-selected" : ""}
        ${onClick ? "cursor-pointer hover:border-amber-500/50 transition-colors" : ""}
        ${rolling ? "animate-dice-roll" : ""}
      `}
      style={rolling && delay > 0 ? { animationDelay: `${delay}s` } : undefined}
    >
      <div className={`grid grid-cols-3 grid-rows-3 ${s.gap} ${s.pad} h-full`}>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="flex items-center justify-center">
            {!rolling && dots.includes(i) && (
              <div className={`${s.dot} rounded-full ${dotClass} animate-dice-reveal`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

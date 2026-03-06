"use client";
import { useEffect, useRef } from "react";
import { DiceFace } from "./DiceFace";

interface DiceRollProps {
  dice: number[];
  rolling: boolean;
  onRollComplete?: () => void;
  selectedIndices?: number[];
  onToggleSelect?: (index: number) => void;
  variant?: "attack" | "defend";
  size?: "sm" | "md" | "lg";
  /** Indices of dice to re-roll; others remain static */
  partialRoll?: number[];
}

const ROLL_DURATION = 800; // ms, matches dice-roll animation
const STAGGER = 100; // ms between each die

export function DiceRoll({
  dice,
  rolling,
  onRollComplete,
  selectedIndices = [],
  onToggleSelect,
  variant = "attack",
  size = "md",
  partialRoll,
}: DiceRollProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (rolling && onRollComplete) {
      const totalDuration = ROLL_DURATION + (dice.length - 1) * STAGGER + 50;
      timerRef.current = setTimeout(onRollComplete, totalDuration);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [rolling, dice.length, onRollComplete]);

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {dice.map((value, i) => {
        const isSelected = selectedIndices.includes(i);
        const isRolling =
          rolling && (!partialRoll || partialRoll.includes(i));
        return (
          <DiceFace
            key={i}
            value={value}
            size={size}
            rolling={isRolling}
            selected={isSelected}
            variant={variant}
            delay={i * (STAGGER / 1000)}
            onClick={
              onToggleSelect && !rolling
                ? () => onToggleSelect(i)
                : undefined
            }
          />
        );
      })}
    </div>
  );
}

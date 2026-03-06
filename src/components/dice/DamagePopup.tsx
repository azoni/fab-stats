"use client";
import { useEffect, useState } from "react";
import "./dice.css";

interface DamagePopupProps {
  amount: number;
  type: "damage" | "bust" | "block" | "combo" | "intimidate";
  id: number;
}

const TYPE_STYLES: Record<DamagePopupProps["type"], string> = {
  damage: "text-amber-400 text-xl font-bold",
  bust: "text-red-500 text-lg font-bold",
  block: "text-zinc-400 text-base font-semibold",
  combo: "text-amber-300 text-lg font-bold",
  intimidate: "text-purple-400 text-base font-bold",
};

function formatText(amount: number, type: DamagePopupProps["type"]): string {
  switch (type) {
    case "damage":
      return `+${amount}`;
    case "bust":
      return "BUST!";
    case "block":
      return "BLOCKED!";
    case "combo":
      return String(amount);
    case "intimidate":
      return `-${amount} HP`;
  }
}

export function DamagePopup({ amount, type, id }: DamagePopupProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(timer);
  }, [id]);

  if (!visible) return null;

  return (
    <div
      className={`absolute top-0 left-1/2 -translate-x-1/2 animate-damage pointer-events-none ${TYPE_STYLES[type]}`}
    >
      {formatText(amount, type)}
    </div>
  );
}

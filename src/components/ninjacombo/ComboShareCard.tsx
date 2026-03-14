"use client";
import { useState } from "react";
import type { NinjaComboGameState } from "@/lib/ninjacombo/types";

export function ComboShareCard({
  gameState,
  dateStr,
  optimalScore,
  onClose,
  onShared,
}: {
  gameState: NinjaComboGameState;
  dateStr: string;
  optimalScore: number;
  onClose: () => void;
  onShared?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function buildShareText(): string {
    const lines: string[] = [];
    lines.push(`Katsu's Combo \u26A1 ${dateStr}`);

    // Emoji chain
    const chainEmoji = gameState.chain.map((slot) => {
      if (slot.card.type === "special" && slot.comboed) return "\u2728";
      if (slot.comboed) return "\u26A1";
      return "\u25FC";
    }).join("");
    lines.push(chainEmoji);

    const emoji = gameState.won ? "\uD83C\uDFC6" : "\uD83D\uDCA2";
    const pct = Math.round((gameState.totalDamage / optimalScore) * 100);
    lines.push(`DMG: ${gameState.totalDamage}/${gameState.targetDamage} (${pct}% optimal) ${emoji}`);
    lines.push("fabstats.net/ninjacombo");

    return lines.join("\n");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildShareText());
    setCopied(true);
    onShared?.();
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#081a1a] border border-cyan-900/40 rounded-lg p-5 max-w-sm w-full mx-4 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-cyan-100 text-center">Share Your Combo</h3>

        <pre className="bg-[#0a1212] border border-cyan-900/30 rounded-md p-3 text-xs text-cyan-200/70 whitespace-pre-wrap font-mono">
          {buildShareText()}
        </pre>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 py-2 rounded-lg font-semibold text-sm bg-cyan-700 hover:bg-cyan-600 text-cyan-50 transition-colors"
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-cyan-400/60 hover:text-cyan-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

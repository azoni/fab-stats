"use client";
import { useState } from "react";
import type { KnockoutGameState } from "@/lib/kayosknockout/types";

const DICE_UNICODE = ["\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685"];

export function KnockoutShareCard({
  gameState,
  dateStr,
  onClose,
}: {
  gameState: KnockoutGameState;
  dateStr: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function buildShareText(): string {
    const lines: string[] = [];
    lines.push(`Kayo's Knockout \ud83e\udd4a ${dateStr}`);
    lines.push(`Target: ${gameState.targetHP} HP`);

    for (let i = 0; i < gameState.roundHistory.length; i++) {
      const round = gameState.roundHistory[i];
      const diceStr = round.finalDice.map((d) => DICE_UNICODE[d - 1]).join("");
      let line = `R${i + 1}: ${diceStr}`;
      if (round.combo) {
        const emoji = round.damage >= 20 ? " \ud83d\udd25" : " \ud83d\udcaa";
        line += ` \u2192 ${round.combo}!${emoji} ${round.damage}`;
      } else {
        line += ` \u2192 ${round.damage}`;
      }
      lines.push(line);
    }

    const emoji = gameState.won ? " \ud83c\udfc6" : " \ud83d\ude24";
    lines.push(`\u2694\ufe0f ${gameState.score}/${gameState.targetHP}${emoji}`);
    lines.push("fabstats.net/kayosknockout");

    return lines.join("\n");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#1a0808] border border-red-900/40 rounded-lg p-5 max-w-sm w-full mx-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-red-100 text-center">Share Your Knockout</h3>

        <pre className="bg-[#0e0808] border border-red-900/30 rounded-md p-3 text-xs text-red-200/70 whitespace-pre-wrap font-mono">
          {buildShareText()}
        </pre>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 py-2 rounded-lg font-semibold text-sm bg-red-700 hover:bg-red-600 text-red-50 transition-colors"
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-red-400/60 hover:text-red-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

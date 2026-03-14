"use client";
import { useState } from "react";
import type { RampageGameState } from "@/lib/rhinarsrampage/types";

export function RampageShareCard({
  gameState,
  dateStr,
  onClose,
}: {
  gameState: RampageGameState;
  dateStr: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function buildShareText(): string {
    const lines: string[] = [];
    lines.push(`Rhinar's Rampage \u{1F3B2} ${dateStr}`);
    lines.push(`Target: ${gameState.currentTargetHP} HP`);

    const roundParts = gameState.roundHistory.map((r) => {
      const dice = "\u{1F3B2}".repeat(r.rolls.length);
      return r.banked ? `${dice} \u2192 \u{1F4B0}${r.total}` : `${dice} \u2192 \u{1F4A5}`;
    });
    lines.push(roundParts.join("  |  "));

    if (gameState.intimidateUsed) {
      lines.push(`\u{1F480} Intimidate: -${gameState.intimidateValue} HP`);
    }

    const emoji = gameState.won ? "\u{1F525}" : "\u{1F624}";
    lines.push(`\u2694\uFE0F ${gameState.score}/${gameState.currentTargetHP} ${emoji}`);
    lines.push("fabstats.net/rhinarsrampage");

    return lines.join("\n");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#1a0808] border border-red-900/40 rounded-lg p-5 max-w-sm w-full mx-4 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-red-100 text-center">Share Your Rampage</h3>

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

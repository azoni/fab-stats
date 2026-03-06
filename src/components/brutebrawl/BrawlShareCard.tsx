"use client";
import { useState } from "react";
import type { BrawlGameState } from "@/lib/brutebrawl/types";

export function BrawlShareCard({
  gameState,
  dateStr,
  onClose,
  onShared,
}: {
  gameState: BrawlGameState;
  dateStr: string;
  onClose: () => void;
  onShared?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function buildShareText(): string {
    const lines: string[] = [];
    lines.push(`Brute Brawl \u2694\uFE0F ${dateStr} (${gameState.difficulty})`);
    lines.push(`vs ${gameState.defenderName}`);

    for (let i = 0; i < gameState.roundHistory.length; i++) {
      const round = gameState.roundHistory[i];
      const aDice = `[${round.attackDice.join("+")}]`;
      const dDice = `[${round.defenseDice.join("+")}]`;

      let result = "";
      if (round.isSmash) {
        result = `${aDice} SMASH! vs ${dDice} \u2192 ${round.damage} \uD83D\uDCA5`;
      } else if (round.isBlock) {
        result = `${aDice} vs ${dDice} BLOCK! \uD83D\uDEE1\uFE0F`;
      } else if (round.damage > 0) {
        result = `${aDice} vs ${dDice} \u2192 ${round.damage} \uD83D\uDCA5`;
      } else {
        result = `${aDice} vs ${dDice} \u2192 0 dmg`;
      }

      lines.push(`R${i + 1}: ${result}`);
    }

    const emoji = gameState.won ? "\uD83C\uDFC6" : "\uD83D\uDCA2";
    lines.push(`DMG: ${gameState.totalDamage}/${gameState.targetDamage} ${emoji}`);
    lines.push("fabstats.net/brutebrawl");

    return lines.join("\n");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildShareText());
    setCopied(true);
    onShared?.();
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleNativeShare() {
    const text = buildShareText();
    if (navigator.share) {
      try {
        await navigator.share({ text });
        onShared?.();
      } catch {}
    } else {
      handleCopy();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#1a0808] border border-red-900/40 rounded-lg p-5 max-w-sm w-full mx-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-red-100 text-center">Share Your Brawl</h3>

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
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button
              onClick={handleNativeShare}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-800/60 hover:bg-red-700/60 text-red-200 transition-colors"
            >
              Share
            </button>
          )}
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

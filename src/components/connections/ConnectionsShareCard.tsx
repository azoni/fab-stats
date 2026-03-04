"use client";
import { useRef, useState } from "react";
import type { ConnectionsGuess, ConnectionsPuzzle } from "@/lib/connections/types";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";
import { MAX_MISTAKES } from "@/lib/connections/puzzle-generator";

const DIFFICULTY_EMOJI: Record<number, string> = {
  1: "\ud83d\udfe8", // yellow square
  2: "\ud83d\udfe9", // green square
  3: "\ud83d\udfe6", // blue square
  4: "\ud83d\udfea", // purple square
};

const DIFFICULTY_COLORS: Record<number, string> = {
  1: "bg-yellow-500",
  2: "bg-green-500",
  3: "bg-blue-500",
  4: "bg-purple-500",
};

function buildShareText(
  dateStr: string,
  won: boolean,
  guesses: ConnectionsGuess[],
  solveOrder: number[],
  puzzle: ConnectionsPuzzle,
): string {
  const lines: string[] = [`FaB Connections ${dateStr}`];

  // Build grid rows showing each guess
  for (const guess of guesses) {
    const row = guess.words
      .map((w) => {
        for (const g of puzzle.groups) {
          if (g.words.includes(w)) return DIFFICULTY_EMOJI[g.difficulty] || "\u2b1c";
        }
        return "\u2b1c";
      })
      .join("");
    lines.push(row);
  }

  lines.push("");
  lines.push("fabstats.net/connections");
  return lines.join("\n");
}

export function ConnectionsShareCard({
  dateStr,
  won,
  guesses,
  solveOrder,
  puzzle,
  onClose,
  onShared,
}: {
  dateStr: string;
  won: boolean;
  guesses: ConnectionsGuess[];
  solveOrder: number[];
  puzzle: ConnectionsPuzzle;
  onClose: () => void;
  onShared: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "downloaded">("idle");

  async function handleCopy() {
    const text = buildShareText(dateStr, won, guesses, solveOrder, puzzle);
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `connections-${dateStr}.png`,
      shareTitle: `FaB Connections ${dateStr}`,
      shareText: `FaB Connections ${dateStr} — ${won ? "Solved" : "Failed"}`,
      fallbackText: text,
    });
    if (result !== "failed") {
      setStatus("copied");
      onShared();
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  async function handleDownload() {
    if (cardRef.current) {
      await downloadCardImage(cardRef.current, {
        backgroundColor: "#0e0c08",
        fileName: `connections-${dateStr}.png`,
      });
    }
    setStatus("downloaded");
    onShared();
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl p-4 max-w-xs w-full space-y-3" onClick={(e) => e.stopPropagation()}>
        <div ref={cardRef} className="bg-[#0e0c08] rounded-lg p-4 space-y-3">
          <div className="text-center">
            <p className="text-sm font-bold text-fab-text">FaB Connections</p>
            <p className="text-[10px] text-fab-dim">{dateStr}</p>
            <p className={`text-lg font-bold mt-1 ${won ? "text-fab-win" : "text-fab-loss"}`}>
              {won ? "Solved" : "Failed"}
            </p>
          </div>

          {/* Guess grid */}
          <div className="space-y-1">
            {guesses.map((guess, gi) => (
              <div key={gi} className="flex justify-center gap-1">
                {guess.words.map((word, wi) => {
                  let difficulty = 0;
                  for (const g of puzzle.groups) {
                    if (g.words.includes(word)) {
                      difficulty = g.difficulty;
                      break;
                    }
                  }
                  return (
                    <div
                      key={wi}
                      className={`w-6 h-6 rounded-sm ${DIFFICULTY_COLORS[difficulty] || "bg-fab-border"} opacity-80`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <p className="text-center text-[8px] text-fab-dim">fabstats.net/connections</p>
        </div>

        <div className="flex gap-2">
          <button onClick={handleCopy} className="flex-1 px-3 py-2 bg-fab-gold/15 text-fab-gold text-xs font-medium rounded-lg hover:bg-fab-gold/25 transition-colors">
            {status === "copied" ? "Copied!" : "Copy"}
          </button>
          <button onClick={handleDownload} className="flex-1 px-3 py-2 bg-fab-surface border border-fab-border text-fab-muted text-xs font-medium rounded-lg hover:text-fab-text transition-colors">
            {status === "downloaded" ? "Saved!" : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}

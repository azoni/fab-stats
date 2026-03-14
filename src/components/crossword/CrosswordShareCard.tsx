"use client";

import { useRef, useState } from "react";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";
import type { CrosswordGameState, CrosswordPuzzle } from "@/lib/crossword/types";

interface CrosswordShareCardProps {
  gameState: CrosswordGameState;
  puzzle: CrosswordPuzzle;
  onClose: () => void;
  onShared?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CrosswordShareCard({ gameState, puzzle, onClose, onShared }: CrosswordShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "downloaded">("idle");

  const totalWords = puzzle.words.length;
  const wordsFound = gameState.solvedWords.length;

  async function handleCopy() {
    setStatus("copying");
    const statusText = gameState.won ? "Solved!" : `${wordsFound}/${totalWords}`;
    const timeText = gameState.won ? ` in ${formatTime(gameState.elapsedSeconds)}` : "";
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `crossword-${gameState.date}.png`,
      shareTitle: `FaB Crossword ${gameState.date}`,
      shareText: `FaB Crossword ${gameState.date} — ${statusText}${timeText}`,
      fallbackText: `FaB Crossword ${gameState.date}\n${statusText}${timeText}\nfabstats.net/crossword`,
    });
    setStatus(result === "failed" ? "idle" : "copied");
    if (result !== "failed") {
      onShared?.();
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  async function handleDownload() {
    await downloadCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `crossword-${gameState.date}.png`,
    });
    onShared?.();
    setStatus("downloaded");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-fab-surface border border-fab-border rounded-xl max-w-sm w-full overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
          <h3 className="text-sm font-semibold text-fab-text">Share Result</h3>
          <button onClick={onClose} className="text-fab-dim hover:text-fab-muted">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div ref={cardRef} className="bg-[#0e0c08] rounded-lg p-5 border border-fab-border">
            <div className="text-center mb-3">
              <h4 className="text-lg font-bold text-fab-gold">FaB Crossword</h4>
              <p className="text-xs text-fab-muted">{gameState.date}</p>
            </div>

            {/* Mini grid preview */}
            <div
              className="mx-auto mb-3"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${puzzle.width}, 1fr)`,
                gap: 1,
                maxWidth: puzzle.width * 14,
              }}
            >
              {Array.from({ length: puzzle.height }, (_, r) =>
                Array.from({ length: puzzle.width }, (_, c) => {
                  const sol = puzzle.solution[r][c];
                  const cell = gameState.cells[r]?.[c];
                  const isBlack = sol === null;
                  const isCorrect = cell?.letter === sol;
                  const isFilled = !!cell?.letter;

                  let bg = "#1a1814"; // black cell
                  if (!isBlack) {
                    if (isFilled && isCorrect) bg = "#22c55e33"; // green
                    else if (isFilled) bg = "#ef444433"; // red
                    else bg = "#2a2620"; // empty
                  }

                  return (
                    <div
                      key={`${r}-${c}`}
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        background: bg,
                        borderRadius: 1,
                      }}
                    />
                  );
                })
              )}
            </div>

            <div className="text-center">
              <p className="text-sm font-bold text-fab-text">
                {gameState.won ? "Solved!" : `${wordsFound}/${totalWords} words`}
              </p>
              {gameState.won && (
                <p className="text-lg text-fab-gold font-bold mt-1 font-mono">
                  {formatTime(gameState.elapsedSeconds)}
                </p>
              )}
              {gameState.checksUsed + gameState.revealsUsed === 0 && gameState.won && (
                <p className="text-[10px] text-fab-gold/70 mt-0.5">No hints used!</p>
              )}
            </div>

            <p className="text-[9px] text-fab-dim text-center mt-3">fabstats.net/crossword</p>
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-fab-gold text-fab-bg rounded-lg text-sm font-semibold hover:brightness-110 transition-all"
          >
            {status === "copied" ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
                {status === "copying" ? "Sharing..." : "Share"}
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-fab-surface-hover border border-fab-border rounded-lg text-sm font-medium text-fab-text hover:text-fab-gold transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

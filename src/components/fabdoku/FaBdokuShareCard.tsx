"use client";

import { useRef, useState } from "react";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}
import type { GameState } from "@/lib/fabdoku/types";

interface FaBdokuShareCardProps {
  gameState: GameState;
  onClose: () => void;
}

export function FaBdokuShareCard({ gameState, onClose }: FaBdokuShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "downloaded">("idle");

  const correctCount = gameState.cells.flat().filter((c) => c.correct).length;

  async function handleCopy() {
    setStatus("copying");
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `fabdoku-${gameState.date}.png`,
      shareTitle: `FaBdoku ${gameState.date}`,
      shareText: `FaBdoku ${gameState.date} — ${correctCount}/9 in ${gameState.guessesUsed} guesses`,
      fallbackText: `FaBdoku ${gameState.date}\n${correctCount}/9 in ${gameState.guessesUsed} guesses\nfabstats.net/fabdoku`,
    });
    setStatus(result === "failed" ? "idle" : "copied");
    if (result !== "failed") setTimeout(() => setStatus("idle"), 2000);
  }

  async function handleDownload() {
    await downloadCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `fabdoku-${gameState.date}.png`,
    });
    setStatus("downloaded");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-fab-surface border border-fab-border rounded-xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
          <h3 className="text-sm font-semibold text-fab-text">Share Result</h3>
          <button onClick={onClose} className="text-fab-dim hover:text-fab-muted">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Shareable card */}
        <div className="p-4">
          <div
            ref={cardRef}
            className="bg-[#0e0c08] rounded-lg p-5 border border-fab-border"
          >
            {/* Title */}
            <div className="text-center mb-3">
              <h4 className="text-lg font-bold text-fab-gold">FaBdoku</h4>
              <p className="text-xs text-fab-muted">{gameState.date}</p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-1.5 w-24 mx-auto mb-3">
              {gameState.cells.flat().map((cell, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-sm ${
                    cell.correct
                      ? "bg-fab-win"
                      : cell.locked
                      ? "bg-fab-loss"
                      : "bg-fab-border"
                  }`}
                />
              ))}
            </div>

            {/* Score */}
            <div className="text-center">
              <p className="text-sm font-bold text-fab-text">
                {correctCount}/9 in {gameState.guessesUsed} guesses
              </p>
              {gameState.won && (
                <p className="text-[10px] text-fab-gold mt-0.5">
                  Puzzle Solved!
                </p>
              )}
            </div>

            {/* Branding */}
            <p className="text-[9px] text-fab-dim text-center mt-3">
              fabstats.net/fabdoku
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-fab-gold text-fab-bg rounded-lg text-sm font-semibold hover:brightness-110 transition-all"
          >
            {status === "copied" ? (
              <>
                <CheckIcon className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <ShareIcon className="w-3.5 h-3.5" />
                {status === "copying" ? "Sharing..." : "Share"}
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-fab-surface-hover border border-fab-border rounded-lg text-sm font-medium text-fab-text hover:text-fab-gold transition-colors"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

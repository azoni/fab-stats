"use client";
import { useRef, useState } from "react";
import { GAMES } from "@/lib/games";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";

interface GameResult {
  slug: string;
  label: string;
  color: string;
  completed: boolean;
  won: boolean;
  detail: string; // e.g. "7/10", "5/5", "3 lives"
}

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function loadTodayResults(): GameResult[] {
  if (typeof window === "undefined") return [];
  const today = getTodayDateStr();
  const results: GameResult[] = [];

  for (const game of GAMES) {
    const key = `${game.slug}-${today}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const state = JSON.parse(raw);
      if (!state.completed) continue;

      let detail = "";
      switch (game.slug) {
        case "fabdoku":
          detail = `${state.score ?? 9}/9`;
          break;
        case "crossword":
          detail = state.won ? (state.elapsedSeconds ? `${Math.floor(state.elapsedSeconds / 60)}:${String(state.elapsedSeconds % 60).padStart(2, "0")}` : "Solved") : "DNF";
          break;
        case "heroguesser":
          detail = state.won ? `${(state.guesses?.length ?? 0)}/6` : "X/6";
          break;
        case "matchupmania":
          detail = `${state.score ?? 0}/10`;
          break;
        case "trivia":
          detail = `${state.score ?? 0}/5`;
          break;
        case "timeline":
          detail = state.won ? `${state.lives ?? 0} lives` : "0 lives";
          break;
        case "connections":
          detail = state.won ? `${state.mistakesRemaining ?? 0}/4 left` : `${4 - (state.mistakesRemaining ?? 0)} mistakes`;
          break;
        case "rhinarsrampage":
          detail = `${state.score ?? 0}/${state.currentTargetHP ?? "?"} dmg`;
          break;
        case "kayosknockout":
          detail = `${state.score ?? state.totalDamage ?? 0}/${state.targetHP ?? "?"} dmg`;
          break;
        case "brutebrawl":
          detail = `${state.totalDamage ?? 0}/${state.targetDamage ?? "?"} dmg`;
          break;
      }

      results.push({
        slug: game.slug,
        label: game.label,
        color: game.color,
        completed: true,
        won: state.won,
        detail,
      });
    } catch {
      // skip
    }
  }
  return results;
}

function buildShareText(results: GameResult[], dateStr: string): string {
  const wins = results.filter((r) => r.won).length;
  const lines = results.map((r) => `${r.won ? "✅" : "❌"} ${r.label} — ${r.detail}`);
  return `FaB Stats Daily Games ${dateStr}\n${wins}/${results.length} won\n\n${lines.join("\n")}\n\nfabstats.net/games`;
}

export function AllGamesShareCard({ onClose }: { onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "downloaded">("idle");
  const dateStr = getTodayDateStr();
  const results = loadTodayResults();

  const wins = results.filter((r) => r.won).length;
  const allWon = wins === results.length && results.length > 0;

  async function handleCopy() {
    const text = buildShareText(results, dateStr);
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `daily-games-${dateStr}.png`,
      shareTitle: `FaB Daily Games ${dateStr}`,
      shareText: `FaB Daily Games ${dateStr} — ${wins}/${results.length} won`,
      fallbackText: text,
    });
    if (result !== "failed") {
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  async function handleDownload() {
    if (cardRef.current) {
      await downloadCardImage(cardRef.current, {
        backgroundColor: "#0e0c08",
        fileName: `daily-games-${dateStr}.png`,
      });
    }
    setStatus("downloaded");
    setTimeout(() => setStatus("idle"), 2000);
  }

  if (results.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl p-4 max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
        <div ref={cardRef} className="bg-[#0e0c08] rounded-lg p-5 space-y-4">
          {/* Header */}
          <div className="text-center">
            <p className="text-sm font-bold text-fab-text">Daily Games</p>
            <p className="text-[10px] text-fab-dim">{dateStr}</p>
            <p className={`text-lg font-bold mt-1 ${allWon ? "text-fab-win" : wins > 0 ? "text-fab-gold" : "text-fab-loss"}`}>
              {wins}/{results.length} {allWon ? "Perfect!" : "Won"}
            </p>
          </div>

          {/* Game results grid */}
          <div className="space-y-1.5">
            {results.map((r) => (
              <div key={r.slug} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${r.won ? "bg-fab-win/20 text-fab-win" : "bg-fab-loss/20 text-fab-loss"}`}>
                  {r.won ? "✓" : "✗"}
                </div>
                <span className={`text-xs font-medium flex-1 ${r.color}`}>{r.label}</span>
                <span className="text-[11px] text-fab-dim font-mono">{r.detail}</span>
              </div>
            ))}
          </div>

          {/* Unplayed count */}
          {results.length < GAMES.length && (
            <p className="text-center text-[9px] text-fab-dim">
              {GAMES.length - results.length} game{GAMES.length - results.length !== 1 ? "s" : ""} not yet played
            </p>
          )}

          <p className="text-center text-[8px] text-fab-dim">fabstats.net/games</p>
        </div>

        {/* Action buttons */}
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

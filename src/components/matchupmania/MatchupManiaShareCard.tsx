"use client";
import { useRef, useState } from "react";
import type { MatchupRound } from "@/lib/matchupmania/types";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";
import { TOTAL_ROUNDS } from "@/lib/matchupmania/puzzle-generator";

function buildShareText(dateStr: string, won: boolean, rounds: MatchupRound[]): string {
  const score = rounds.filter((r) => r.correct).length;
  const header = `Matchup Mania ${dateStr}`;
  const result = `${score}/${TOTAL_ROUNDS}`;
  const grid = rounds.map((r) => (r.correct ? "✅" : "❌")).join("");
  return `${header}\n${result} ${won ? "🏆" : ""}\n${grid}\n\nfabstats.net/matchupmania`;
}

export function MatchupManiaShareCard({
  dateStr,
  won,
  rounds,
  onClose,
  onShared,
}: {
  dateStr: string;
  won: boolean;
  rounds: MatchupRound[];
  onClose: () => void;
  onShared: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "downloaded">("idle");
  const score = rounds.filter((r) => r.correct).length;

  async function handleCopy() {
    const text = buildShareText(dateStr, won, rounds);
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `matchupmania-${dateStr}.png`,
      shareTitle: `Matchup Mania ${dateStr}`,
      shareText: `Matchup Mania ${dateStr} — ${score}/${TOTAL_ROUNDS}`,
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
        fileName: `matchupmania-${dateStr}.png`,
      });
    }
    setStatus("downloaded");
    onShared();
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl p-4 max-w-xs w-full space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Card preview */}
        <div ref={cardRef} className="bg-[#0e0c08] rounded-lg p-4 space-y-3">
          <div className="text-center">
            <p className="text-sm font-bold text-fab-text">Matchup Mania</p>
            <p className="text-[10px] text-fab-dim">{dateStr}</p>
            <p className={`text-lg font-bold mt-1 ${won ? "text-fab-win" : "text-fab-loss"}`}>
              {score}/{TOTAL_ROUNDS}
            </p>
          </div>

          {/* Result grid */}
          <div className="flex justify-center gap-1 flex-wrap">
            {rounds.map((r, i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold ${
                  r.correct ? "bg-fab-win/40 text-fab-win" : "bg-fab-loss/40 text-fab-loss"
                }`}
              >
                {r.correct ? "✓" : "✗"}
              </div>
            ))}
          </div>

          <p className="text-center text-[8px] text-fab-dim">fabstats.net/matchupmania</p>
        </div>

        {/* Actions */}
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

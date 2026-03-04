"use client";
import { useRef, useState } from "react";
import type { TimelinePlacement } from "@/lib/timeline/types";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";
import { ITEMS_PER_GAME } from "@/lib/timeline/puzzle-generator";

function buildShareText(dateStr: string, won: boolean, placements: TimelinePlacement[], livesRemaining: number): string {
  const correct = placements.filter((p) => p.correct).length;
  const dots = placements.map((p) => (p.correct ? "\uD83D\uDFE2" : "\uD83D\uDD34")).join("");
  const hearts = "\u2764\uFE0F".repeat(livesRemaining) + "\uD83D\uDDA4".repeat(3 - livesRemaining);
  return `FaB Timeline ${dateStr}\n${correct}/${ITEMS_PER_GAME} ${won ? "\uD83C\uDFC6" : ""}\n${dots}\n${hearts}\n\nfabstats.net/timeline`;
}

export function TimelineShareCard({
  dateStr,
  won,
  placements,
  livesRemaining,
  onClose,
  onShared,
}: {
  dateStr: string;
  won: boolean;
  placements: TimelinePlacement[];
  livesRemaining: number;
  onClose: () => void;
  onShared: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "downloaded">("idle");
  const correct = placements.filter((p) => p.correct).length;

  async function handleCopy() {
    const text = buildShareText(dateStr, won, placements, livesRemaining);
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `timeline-${dateStr}.png`,
      shareTitle: `FaB Timeline ${dateStr}`,
      shareText: `FaB Timeline ${dateStr} \u2014 ${correct}/${ITEMS_PER_GAME}`,
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
        fileName: `timeline-${dateStr}.png`,
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
            <p className="text-sm font-bold text-fab-text">FaB Timeline</p>
            <p className="text-[10px] text-fab-dim">{dateStr}</p>
            <p className={`text-lg font-bold mt-1 ${won ? "text-fab-win" : "text-fab-loss"}`}>
              {correct}/{ITEMS_PER_GAME}
            </p>
          </div>

          <div className="flex justify-center gap-2">
            {placements.map((p, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  p.correct ? "bg-fab-win/40 text-fab-win" : "bg-fab-loss/40 text-fab-loss"
                }`}
              >
                {p.correct ? "\u2713" : "\u2717"}
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={`text-xs ${i < livesRemaining ? "text-fab-loss" : "text-fab-border opacity-30"}`}
              >
                {"\u2764"}
              </span>
            ))}
          </div>

          <p className="text-center text-[8px] text-fab-dim">fabstats.net/timeline</p>
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

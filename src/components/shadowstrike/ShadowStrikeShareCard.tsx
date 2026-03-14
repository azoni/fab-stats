"use client";
import { useRef, useState } from "react";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";
import { TOTAL_PAIRS } from "@/lib/shadowstrike/puzzle-generator";

function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildShareText(dateStr: string, won: boolean, flips: number, elapsedMs: number, hintsUsed: number): string {
  const time = formatTime(elapsedMs);
  const grid = won ? "🟢🟢🟢🟢\n🟢🟢🟢🟢" : "⬛⬛⬛⬛\n⬛⬛⬛⬛";
  const hintStr = hintsUsed > 0 ? ` · ${hintsUsed} hint${hintsUsed !== 1 ? "s" : ""}` : "";
  return `Shadow Strike ${dateStr}\n${TOTAL_PAIRS}/${TOTAL_PAIRS} pairs ${won ? "🏆" : ""}\n${flips} flips · ${time}${hintStr}\n\n${grid}\n\nfabstats.net/shadowstrike`;
}

export function ShadowStrikeShareCard({
  dateStr,
  won,
  flips,
  elapsedMs,
  hintsUsed,
  onClose,
  onShared,
}: {
  dateStr: string;
  won: boolean;
  flips: number;
  elapsedMs: number;
  hintsUsed: number;
  onClose: () => void;
  onShared: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "downloaded">("idle");

  async function handleCopy() {
    const text = buildShareText(dateStr, won, flips, elapsedMs, hintsUsed);
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `shadowstrike-${dateStr}.png`,
      shareTitle: `Shadow Strike ${dateStr}`,
      shareText: `Shadow Strike ${dateStr} — ${flips} flips · ${formatTime(elapsedMs)}`,
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
        fileName: `shadowstrike-${dateStr}.png`,
      });
    }
    setStatus("downloaded");
    onShared();
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl p-4 max-w-xs w-full space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div ref={cardRef} className="bg-[#0e0c08] rounded-lg p-4 space-y-3">
          <div className="text-center">
            <p className="text-sm font-bold text-fab-text">Shadow Strike</p>
            <p className="text-[10px] text-fab-dim">{dateStr}</p>
            <p className={`text-lg font-bold mt-1 ${won ? "text-fab-win" : "text-fab-loss"}`}>
              {TOTAL_PAIRS}/{TOTAL_PAIRS} pairs
            </p>
            <p className="text-xs text-fab-muted">{flips} flips · {formatTime(elapsedMs)}{hintsUsed > 0 && ` · ${hintsUsed} hint${hintsUsed !== 1 ? "s" : ""}`}</p>
          </div>

          <div className="grid grid-cols-4 gap-1 justify-items-center">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className={`w-5 h-5 rounded-sm ${won ? "bg-fab-win/40" : "bg-fab-border"}`} />
            ))}
          </div>

          <p className="text-center text-[8px] text-fab-dim">fabstats.net/shadowstrike</p>
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

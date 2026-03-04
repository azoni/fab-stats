"use client";
import { useRef, useState } from "react";
import type { HeroGuess } from "@/lib/heroguesser/types";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";

const EMOJI: Record<string, string> = {
  correct: "🟩",
  partial: "🟨",
  close: "🟨",
  wrong: "🟥",
};

function buildShareText(dateStr: string, won: boolean, guesses: HeroGuess[], maxGuesses: number): string {
  const header = `Hero Guesser ${dateStr}`;
  const result = won ? `${guesses.length}/${maxGuesses}` : `X/${maxGuesses}`;
  const grid = guesses.map((g) =>
    [g.clues.class, g.clues.talent, g.clues.age, g.clues.life, g.clues.intellect, g.clues.formats]
      .map((c) => EMOJI[c])
      .join("")
  ).join("\n");
  return `${header}\n${result}\n\n${grid}\n\nfabstats.net/heroguesser`;
}

const SQUARE_BG: Record<string, string> = {
  correct: "bg-fab-win",
  partial: "bg-yellow-500",
  close: "bg-yellow-500",
  wrong: "bg-fab-loss/60",
};

export function HeroGuesserShareCard({
  dateStr,
  won,
  guesses,
  maxGuesses,
  onClose,
  onShared,
}: {
  dateStr: string;
  won: boolean;
  guesses: HeroGuess[];
  maxGuesses: number;
  onClose: () => void;
  onShared: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "downloaded">("idle");

  async function handleCopy() {
    const text = buildShareText(dateStr, won, guesses, maxGuesses);
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `heroguesser-${dateStr}.png`,
      shareTitle: `Hero Guesser ${dateStr}`,
      shareText: `Hero Guesser ${dateStr} — ${won ? `${guesses.length}/${maxGuesses}` : `X/${maxGuesses}`}`,
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
        fileName: `heroguesser-${dateStr}.png`,
      });
    }
    setStatus("downloaded");
    onShared();
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl p-4 max-w-xs w-full space-y-3" onClick={(e) => e.stopPropagation()}>
        {/* Card preview */}
        <div ref={cardRef} className="bg-[#0e0c08] rounded-lg p-4 space-y-3">
          <div className="text-center">
            <p className="text-sm font-bold text-fab-text">Hero Guesser</p>
            <p className="text-[10px] text-fab-dim">{dateStr}</p>
            <p className={`text-lg font-bold mt-1 ${won ? "text-fab-win" : "text-fab-loss"}`}>
              {won ? `${guesses.length}/${maxGuesses}` : `X/${maxGuesses}`}
            </p>
          </div>

          {/* Grid */}
          <div className="flex flex-col items-center gap-1">
            {guesses.map((g, i) => (
              <div key={i} className="flex gap-1">
                {([g.clues.class, g.clues.talent, g.clues.age, g.clues.life, g.clues.intellect, g.clues.formats] as string[]).map((c, j) => (
                  <div key={j} className={`w-5 h-5 rounded-sm ${SQUARE_BG[c]}`} />
                ))}
              </div>
            ))}
          </div>

          <p className="text-center text-[8px] text-fab-dim">fabstats.net/heroguesser</p>
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

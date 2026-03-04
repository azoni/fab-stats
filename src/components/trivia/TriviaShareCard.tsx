"use client";
import { useRef, useState } from "react";
import type { TriviaAnswer } from "@/lib/trivia/types";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";
import { QUESTIONS_PER_GAME } from "@/lib/trivia/puzzle-generator";

function buildShareText(dateStr: string, won: boolean, answers: TriviaAnswer[]): string {
  const score = answers.filter((a) => a.correct).length;
  const dots = answers.map((a) => (a.correct ? "🟢" : "🔴")).join("");
  return `FaB Trivia ${dateStr}\n${score}/${QUESTIONS_PER_GAME} ${won ? "🏆" : ""}\n${dots}\n\nfabstats.net/trivia`;
}

export function TriviaShareCard({
  dateStr,
  won,
  answers,
  onClose,
  onShared,
}: {
  dateStr: string;
  won: boolean;
  answers: TriviaAnswer[];
  onClose: () => void;
  onShared: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "downloaded">("idle");
  const score = answers.filter((a) => a.correct).length;

  async function handleCopy() {
    const text = buildShareText(dateStr, won, answers);
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `trivia-${dateStr}.png`,
      shareTitle: `FaB Trivia ${dateStr}`,
      shareText: `FaB Trivia ${dateStr} — ${score}/${QUESTIONS_PER_GAME}`,
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
        fileName: `trivia-${dateStr}.png`,
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
            <p className="text-sm font-bold text-fab-text">FaB Trivia</p>
            <p className="text-[10px] text-fab-dim">{dateStr}</p>
            <p className={`text-lg font-bold mt-1 ${won ? "text-fab-win" : "text-fab-loss"}`}>
              {score}/{QUESTIONS_PER_GAME}
            </p>
          </div>

          <div className="flex justify-center gap-2">
            {answers.map((a, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  a.correct ? "bg-fab-win/40 text-fab-win" : "bg-fab-loss/40 text-fab-loss"
                }`}
              >
                {a.correct ? "✓" : "✗"}
              </div>
            ))}
          </div>

          <p className="text-center text-[8px] text-fab-dim">fabstats.net/trivia</p>
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

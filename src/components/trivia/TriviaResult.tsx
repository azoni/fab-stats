"use client";
import { useRef, useState } from "react";
import { copyCardImage } from "@/lib/share-image";
import { QUESTIONS_PER_GAME, WIN_THRESHOLD } from "@/lib/trivia/puzzle-generator";
import type { TriviaStats, TriviaAnswer } from "@/lib/trivia/types";

function CountdownToMidnight() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diff = tomorrow.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return (
    <p className="text-[10px] text-fab-dim text-center">
      Next quiz in {h}h {m}m
    </p>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
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

function buildShareText(dateStr: string, won: boolean, answers: TriviaAnswer[]): string {
  const score = answers.filter((a) => a.correct).length;
  const dots = answers.map((a) => (a.correct ? "🟢" : "🔴")).join("");
  return `FaB Trivia ${dateStr}\n${score}/${QUESTIONS_PER_GAME} ${won ? "🏆" : ""}\n${dots}\n\nfabstats.net/trivia`;
}

export function TriviaResult({
  won,
  score,
  stats,
  dateStr,
  answers,
  onShared,
}: {
  won: boolean;
  score: number;
  stats: TriviaStats | null;
  dateStr: string;
  answers: TriviaAnswer[];
  onShared?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [shareStatus, setShareStatus] = useState<"idle" | "shared">("idle");

  async function handleShare() {
    const text = buildShareText(dateStr, won, answers);
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `trivia-${dateStr}.png`,
      shareTitle: `FaB Trivia ${dateStr}`,
      shareText: `FaB Trivia ${dateStr} — ${score}/${QUESTIONS_PER_GAME}`,
      fallbackText: text,
    });
    if (result !== "failed") {
      setShareStatus("shared");
      onShared?.();
      setTimeout(() => setShareStatus("idle"), 2000);
    }
  }

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4 space-y-3">
      <div className="text-center">
        <p className={`text-lg font-bold ${won ? "text-fab-win" : "text-fab-loss"}`}>
          {won ? "Nailed It!" : "Better Luck Tomorrow"}
        </p>
        <p className="text-sm text-fab-muted">
          {score}/{QUESTIONS_PER_GAME} correct {won ? "" : `(need ${WIN_THRESHOLD})`}
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Played", value: stats.gamesPlayed },
            { label: "Win %", value: stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0 },
            { label: "Streak", value: stats.currentStreak },
            { label: "Best", value: stats.maxStreak },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-bold text-fab-text">{s.value}</p>
              <p className="text-[10px] text-fab-dim">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Share card preview */}
      <div className="flex justify-center">
        <div ref={cardRef} className="bg-[#0e0c08] rounded-lg p-4 space-y-3" style={{ width: '280px' }}>
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
      </div>

      {/* Actions */}
      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-fab-gold text-fab-bg rounded-lg text-sm font-semibold hover:brightness-110 transition-all"
      >
        {shareStatus === "shared" ? (<><CheckIcon className="w-3.5 h-3.5" /> Shared!</>) : (<><ShareIcon className="w-3.5 h-3.5" /> Share</>)}
      </button>

      <CountdownToMidnight />
    </div>
  );
}

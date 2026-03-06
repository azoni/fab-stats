"use client";
import { useRef, useState } from "react";
import { copyCardImage } from "@/lib/share-image";
import { WORDS_PER_GAME } from "@/lib/bladedash/puzzle-generator";
import type { BladeDashStats } from "@/lib/bladedash/types";

function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function CountdownToMidnight() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const diff = tomorrow.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return (
    <p className="text-[10px] text-fab-dim text-center">
      Next puzzle in {h}h {m}m
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

function buildShareText(dateStr: string, won: boolean, wordsSolved: number, elapsedMs: number, hintsUsed: number): string {
  const time = formatTime(elapsedMs);
  const dots = Array.from({ length: WORDS_PER_GAME }).map((_, i) => (i < wordsSolved ? "🟢" : "⬛")).join("");
  const hintText = hintsUsed === 0 ? "0 hints" : `${hintsUsed} hints`;
  return `Blade Dash ${dateStr}\n${wordsSolved}/${WORDS_PER_GAME} words ${won ? "⚔️" : ""}\n${time} · ${hintText}\n\n${dots}\n\nfabstats.net/bladedash`;
}

export function BladeDashResult({
  won,
  elapsedMs,
  hintsUsed,
  wordsSolved,
  stats,
  dateStr,
  onShared,
}: {
  won: boolean;
  elapsedMs: number;
  hintsUsed: number;
  wordsSolved: number;
  stats: BladeDashStats | null;
  dateStr: string;
  onShared?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "shared">("idle");
  const isPerfect = won && hintsUsed === 0;

  async function handleShare() {
    setShareStatus("sharing");
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `bladedash-${dateStr}.png`,
      shareTitle: `Blade Dash ${dateStr}`,
      shareText: `Blade Dash ${dateStr} — ${wordsSolved}/${WORDS_PER_GAME} words in ${formatTime(elapsedMs)}`,
      fallbackText: buildShareText(dateStr, won, wordsSolved, elapsedMs, hintsUsed),
    });
    if (result !== "failed") {
      setShareStatus("shared");
      onShared?.();
      setTimeout(() => setShareStatus("idle"), 2000);
    } else {
      setShareStatus("idle");
    }
  }

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4 space-y-3">
      <div className="text-center">
        <p className={`text-lg font-bold ${won ? "text-fab-win" : "text-fab-loss"}`}>
          {won ? (isPerfect ? "Blade Master!" : "Well Done!") : "Keep Practicing"}
        </p>
        <p className="text-sm text-fab-muted">
          {wordsSolved}/8 words · {formatTime(elapsedMs)}
          {isPerfect && <span className="ml-2 text-fab-gold">No hints!</span>}
          {!isPerfect && hintsUsed > 0 && <span className="text-fab-dim"> · {hintsUsed} hints</span>}
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

      {stats && stats.bestTimeMs > 0 && (
        <div className="flex justify-center gap-6 text-xs text-fab-muted">
          <span>Best time: <span className="font-bold text-fab-text">{formatTime(stats.bestTimeMs)}</span></span>
          <span>Perfect games: <span className="font-bold text-fab-text">{stats.perfectGames}</span></span>
        </div>
      )}

      <div className="flex justify-center">
        <div ref={cardRef} className="bg-[#0e0c08] rounded-lg p-4 space-y-3 border border-fab-border" style={{ width: '280px' }}>
          <div className="text-center">
            <p className="text-sm font-bold text-fab-text">Blade Dash</p>
            <p className="text-[10px] text-fab-dim">{dateStr}</p>
            <p className={`text-lg font-bold mt-1 ${won ? "text-fab-win" : "text-fab-loss"}`}>
              {wordsSolved}/{WORDS_PER_GAME} words
            </p>
            <p className="text-xs text-fab-muted">
              {formatTime(elapsedMs)} · {hintsUsed === 0 ? "No hints" : `${hintsUsed} hints`}
            </p>
          </div>

          <div className="flex justify-center gap-1.5">
            {Array.from({ length: WORDS_PER_GAME }).map((_, i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-sm ${i < wordsSolved ? "bg-fab-win/40" : "bg-fab-border"}`}
              />
            ))}
          </div>

          <p className="text-center text-[8px] text-fab-dim">fabstats.net/bladedash</p>
        </div>
      </div>

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

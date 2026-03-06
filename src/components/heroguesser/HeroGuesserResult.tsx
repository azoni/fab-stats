"use client";
import { useRef, useState, useEffect } from "react";
import { copyCardImage } from "@/lib/share-image";
import type { HeroGuesserStats, HeroGuess } from "@/lib/heroguesser/types";
import type { HeroInfo } from "@/types";

function getNextPuzzleCountdown(): string {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diff = tomorrow.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
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

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  );
}

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

export function HeroGuesserResult({
  won,
  guessCount,
  maxGuesses,
  answer,
  stats,
  dateStr,
  guesses,
  onShared,
}: {
  won: boolean;
  guessCount: number;
  maxGuesses: number;
  answer: HeroInfo;
  stats: HeroGuesserStats | null;
  dateStr: string;
  guesses: HeroGuess[];
  onShared?: () => void;
}) {
  const [countdown, setCountdown] = useState(getNextPuzzleCountdown());
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "shared">("idle");

  useEffect(() => {
    const id = setInterval(() => setCountdown(getNextPuzzleCountdown()), 1000);
    return () => clearInterval(id);
  }, []);

  async function handleCopy() {
    const text = buildShareText(dateStr, won, guesses, maxGuesses);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function handleShare() {
    const text = buildShareText(dateStr, won, guesses, maxGuesses);
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `heroguesser-${dateStr}.png`,
      shareTitle: `Hero Guesser ${dateStr}`,
      shareText: `Hero Guesser ${dateStr} — ${won ? `${guesses.length}/${maxGuesses}` : `X/${maxGuesses}`}`,
      fallbackText: text,
    });
    if (result !== "failed") {
      setShareStatus("shared");
      onShared?.();
      setTimeout(() => setShareStatus("idle"), 2000);
    }
  }

  const dist = stats?.guessDistribution ?? {};
  const maxDist = Math.max(1, ...Object.values(dist));

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="text-center">
        {won ? (
          <>
            <p className="text-lg font-bold text-fab-win">Got it!</p>
            <p className="text-xs text-fab-muted">in {guessCount}/{maxGuesses} guesses</p>
          </>
        ) : (
          <>
            <p className="text-lg font-bold text-fab-loss">Not this time</p>
            <p className="text-xs text-fab-muted">The answer was <span className="font-semibold text-fab-text">{answer.name}</span></p>
          </>
        )}
      </div>

      {/* Answer card */}
      <div className="flex items-center gap-3 bg-fab-bg rounded-lg p-3">
        <img src={answer.imageUrl} alt={answer.name} className="w-12 h-12 rounded-lg object-cover" />
        <div>
          <p className="text-sm font-semibold text-fab-text">{answer.name}</p>
          <p className="text-[10px] text-fab-muted">{answer.classes.join(", ")} · {answer.talents.length > 0 ? answer.talents.join(", ") : "No Talent"}</p>
          <p className="text-[10px] text-fab-dim">{answer.young ? "Young" : "Adult"} · {answer.life} Life · {answer.intellect} Int</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-sm font-bold text-fab-text">{stats.gamesPlayed}</p>
            <p className="text-[9px] text-fab-dim">Played</p>
          </div>
          <div>
            <p className="text-sm font-bold text-fab-text">{stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0}%</p>
            <p className="text-[9px] text-fab-dim">Win %</p>
          </div>
          <div>
            <p className="text-sm font-bold text-fab-text">{stats.currentStreak}</p>
            <p className="text-[9px] text-fab-dim">Streak</p>
          </div>
          <div>
            <p className="text-sm font-bold text-fab-text">{stats.maxStreak}</p>
            <p className="text-[9px] text-fab-dim">Best</p>
          </div>
        </div>
      )}

      {/* Guess distribution */}
      {stats && stats.gamesWon > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-fab-dim font-medium uppercase tracking-wider">Guess Distribution</p>
          {[1, 2, 3, 4, 5, 6].map((n) => {
            const count = dist[n] || 0;
            const pct = (count / maxDist) * 100;
            const isThis = won && guessCount === n;
            return (
              <div key={n} className="flex items-center gap-2">
                <span className="text-[10px] text-fab-dim w-3 text-right">{n}</span>
                <div className="flex-1 h-4 rounded-sm overflow-hidden bg-fab-bg">
                  <div
                    className={`h-full rounded-sm flex items-center justify-end px-1 ${isThis ? "bg-fab-win/40" : "bg-fab-muted/20"}`}
                    style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                  >
                    {count > 0 && <span className="text-[9px] font-medium text-fab-text">{count}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-fab-surface-hover border border-fab-border rounded-lg text-sm font-medium text-fab-text hover:text-fab-gold transition-colors"
        >
          {copied ? (<><CheckIcon className="w-3.5 h-3.5" /> Copied!</>) : (<><CopyIcon className="w-3.5 h-3.5" /> Copy</>)}
        </button>
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-fab-gold text-fab-bg rounded-lg text-sm font-semibold hover:brightness-110 transition-all"
        >
          {shareStatus === "shared" ? (<><CheckIcon className="w-3.5 h-3.5" /> Shared!</>) : (<><ShareIcon className="w-3.5 h-3.5" /> Share</>)}
        </button>
      </div>

      {/* Countdown */}
      <p className="text-center text-[10px] text-fab-dim">Next puzzle in {countdown}</p>

      {/* Hidden share card for image capture */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }} aria-hidden="true">
        <div ref={cardRef} className="bg-[#0e0c08] rounded-lg p-4 space-y-3" style={{ width: '280px' }}>
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
      </div>
    </div>
  );
}

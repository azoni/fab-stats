"use client";
import { useState } from "react";
import Link from "next/link";
import { GAMES } from "@/lib/games";
import { AllGamesShareCard } from "@/components/games/AllGamesShareCard";

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function getCompletedCount(): number {
  if (typeof window === "undefined") return 0;
  const today = getTodayDateStr();
  let count = 0;
  for (const game of GAMES) {
    try {
      const raw = localStorage.getItem(`${game.slug}-${today}`);
      if (raw) {
        const state = JSON.parse(raw);
        if (state.completed) count++;
      }
    } catch { /* skip */ }
  }
  return count;
}

function hasPlayedToday(slug: string): boolean {
  if (typeof window === "undefined") return false;
  const today = getTodayDateStr();
  const key = `${slug}-${today}`;
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

export default function GamesPage() {
  const [showShare, setShowShare] = useState(false);
  const completed = getCompletedCount();

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-fab-text">Daily Games</h1>
          <p className="text-xs text-fab-muted mt-1">New puzzles every day at midnight. Play, share, and track your streaks.</p>
        </div>
        {completed >= 2 && (
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-fab-gold/15 text-fab-gold text-xs font-medium rounded-lg hover:bg-fab-gold/25 transition-colors shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            Share All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GAMES.map((game) => {
          const played = hasPlayedToday(game.slug);
          return (
            <Link
              key={game.slug}
              href={game.href}
              className="group bg-fab-surface border border-fab-border rounded-lg p-4 hover:border-fab-muted transition-colors relative overflow-hidden"
            >
              {played && (
                <div className="absolute top-2 right-2">
                  <svg className="w-4 h-4 text-fab-win" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg bg-fab-bg flex items-center justify-center shrink-0 ${game.color}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={game.iconPath} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-fab-text group-hover:text-fab-gold transition-colors">{game.label}</h2>
                  </div>
                  <p className="text-[10px] text-fab-muted mt-0.5">{game.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {showShare && <AllGamesShareCard onClose={() => setShowShare(false)} />}
    </div>
  );
}

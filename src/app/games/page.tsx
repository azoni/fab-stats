"use client";
import Link from "next/link";
import { GAMES } from "@/lib/games";

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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
  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-fab-text">Daily Games</h1>
        <p className="text-xs text-fab-muted mt-1">New puzzles every day at midnight. Play, share, and track your streaks.</p>
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
    </div>
  );
}

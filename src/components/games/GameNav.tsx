"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { GAMES, GAME_CATEGORIES } from "@/lib/games";

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function hasPlayedToday(slug: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(`${slug}-${getTodayDateStr()}`) !== null;
  } catch {
    return false;
  }
}

export function GameNav({ current }: { current: string }) {
  const [openCat, setOpenCat] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenCat(null);
      }
    }
    if (openCat) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openCat]);

  const currentGame = GAMES.find((g) => g.slug === current);

  return (
    <div ref={navRef} className="flex items-center gap-1.5 mb-4 flex-wrap">
      <Link
        href="/games"
        className="text-sm font-medium text-fab-dim hover:text-fab-text px-3 py-2 rounded-lg hover:bg-fab-surface transition-colors shrink-0"
      >
        &larr; All Games
      </Link>
      <span className="text-fab-border/40 mx-0.5">|</span>

      {GAME_CATEGORIES.map((cat) => {
        const games = GAMES.filter((g) => g.category === cat.id);
        const isCurrentCat = currentGame?.category === cat.id;
        const isOpen = openCat === cat.id;

        return (
          <div key={cat.id} className="relative">
            <button
              onClick={() => setOpenCat(isOpen ? null : cat.id)}
              className={`text-sm font-medium px-3 py-2 rounded-lg shrink-0 transition-colors flex items-center gap-1.5 ${
                isCurrentCat
                  ? `${cat.color} bg-fab-surface/60`
                  : "text-fab-dim hover:text-fab-text hover:bg-fab-surface/50"
              }`}
            >
              {cat.label}
              <svg
                className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-fab-surface border border-fab-border rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="p-1.5">
                  {games.map((g) => {
                    const isCurrent = g.slug === current;
                    const played = hasPlayedToday(g.slug);
                    return (
                      <Link
                        key={g.slug}
                        href={g.href}
                        onClick={() => setOpenCat(null)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isCurrent
                            ? "text-fab-gold bg-fab-gold/10"
                            : `${g.color} hover:bg-fab-surface-hover`
                        }`}
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={g.iconPath} />
                        </svg>
                        <span className="truncate">{g.label}</span>
                        {played && (
                          <svg className="w-3 h-3 text-fab-win ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

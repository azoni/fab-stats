"use client";
import { useState, useRef, useEffect } from "react";
import type { HeroGuess } from "@/lib/heroguesser/types";
import type { HeroInfo } from "@/types";
import { getHeroByName, getHeroPortraitUrl } from "@/lib/heroes";

const CLUE_BG: Record<string, string> = {
  correct: "bg-fab-win/25 text-fab-win",
  partial: "bg-yellow-500/20 text-yellow-400",
  close: "bg-yellow-500/20 text-yellow-400",
  wrong: "bg-fab-loss/20 text-fab-loss",
};

const COLUMNS = [
  { key: "class", label: "Class" },
  { key: "talent", label: "Talent" },
  { key: "age", label: "Age" },
  { key: "life", label: "Life" },
  { key: "intellect", label: "Int" },
  { key: "formats", label: "Formats" },
] as const;

function getDisplayValue(guess: HeroGuess, col: typeof COLUMNS[number]["key"]): string {
  const hero = getHeroByName(guess.heroName);
  if (!hero) return "?";
  switch (col) {
    case "class": return hero.classes.join(", ") || "—";
    case "talent": return hero.talents.length > 0 ? hero.talents.join(", ") : "None";
    case "age": return hero.young ? "Young" : "Adult";
    case "life": return String(hero.life ?? "?");
    case "intellect": return String(hero.intellect ?? "?");
    case "formats": {
      const shorts: string[] = [];
      if (hero.legalFormats.some((f) => f.includes("Classic") || f.includes("CC"))) shorts.push("CC");
      if (hero.legalFormats.some((f) => f.includes("Blitz"))) shorts.push("B");
      if (hero.legalFormats.some((f) => f.includes("Living"))) shorts.push("LL");
      return shorts.join("/") || "—";
    }
  }
}

export function HeroGuesserBoard({
  guesses,
  maxGuesses,
  heroPool,
  completed,
  onGuess,
}: {
  guesses: HeroGuess[];
  maxGuesses: number;
  heroPool: HeroInfo[];
  completed: boolean;
  onGuess: (heroName: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const guessedNames = new Set(guesses.map((g) => g.heroName));
  const filtered = search.length >= 1
    ? heroPool.filter((h) => h.name.toLowerCase().includes(search.toLowerCase()) && !guessedNames.has(h.name)).slice(0, 8)
    : [];

  useEffect(() => {
    setHighlightIndex(-1);
  }, [search]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectHero(name: string) {
    onGuess(name);
    setSearch("");
    setShowDropdown(false);
    setHighlightIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filtered.length) {
        selectHero(filtered[highlightIndex].name);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setHighlightIndex(-1);
    }
  }

  return (
    <div className="space-y-3">
      {/* Search input */}
      {!completed && guesses.length < maxGuesses && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder="Type a hero name..."
            className="w-full bg-fab-bg border border-fab-border text-fab-text text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
            autoComplete="off"
          />
          {showDropdown && filtered.length > 0 && (
            <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-fab-surface border border-fab-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
              {filtered.map((h, idx) => (
                <button
                  key={h.name}
                  onClick={() => selectHero(h.name)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${idx === highlightIndex ? "bg-fab-gold/15 text-fab-gold" : "hover:bg-fab-surface-hover"}`}
                >
                  <img src={getHeroPortraitUrl(h.name) || h.imageUrl} alt="" className="w-6 h-6 rounded object-cover" />
                  <span className="text-xs text-fab-text">{h.name}</span>
                  <span className="text-[9px] text-fab-dim ml-auto">{h.classes.join(", ")}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Guess count */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-fab-dim">{guesses.length}/{maxGuesses} guesses</p>
        {!completed && guesses.length > 0 && (
          <div className="flex gap-0.5">
            {Array.from({ length: maxGuesses }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  i < guesses.length
                    ? guesses[i].clues.class === "correct" && guesses[i].clues.talent === "correct" ? "bg-fab-win" : "bg-fab-loss"
                    : "bg-fab-border"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Column headers */}
      {guesses.length > 0 && (
        <div className="grid grid-cols-[1fr_repeat(6,minmax(0,1fr))] gap-1 text-[8px] text-fab-dim uppercase tracking-wider font-medium">
          <div>Hero</div>
          {COLUMNS.map((c) => <div key={c.key} className="text-center">{c.label}</div>)}
        </div>
      )}

      {/* Guesses */}
      <div className="space-y-1">
        {guesses.map((guess, i) => (
          <div key={i} className="grid grid-cols-[1fr_repeat(6,minmax(0,1fr))] gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <img src={getHeroPortraitUrl(guess.heroName) || getHeroByName(guess.heroName)?.imageUrl} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
              <span className="text-[10px] text-fab-text font-medium truncate">{guess.heroName}</span>
            </div>
            {COLUMNS.map((col) => {
              const result = guess.clues[col.key];
              return (
                <div key={col.key} className={`flex items-center justify-center rounded px-1 py-1.5 ${CLUE_BG[result]}`}>
                  <span className="text-[9px] font-medium text-center leading-tight">{getDisplayValue(guess, col.key)}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

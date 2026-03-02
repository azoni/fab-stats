"use client";

import { useState, useRef, useEffect } from "react";
import { allHeroes, searchHeroes } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import type { HeroInfo } from "@/types";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

interface HeroSearchModalProps {
  usedHeroes: Set<string>;
  onSelect: (heroName: string) => void;
  onClose: () => void;
}

export function HeroSearchModal({
  usedHeroes,
  onSelect,
  onClose,
}: HeroSearchModalProps) {
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results: HeroInfo[] = query.trim()
    ? searchHeroes(query)
    : allHeroes;

  // Separate available from used
  const available = results.filter((h) => !usedHeroes.has(h.name));
  const used = results.filter((h) => usedHeroes.has(h.name));
  const displayList = [...available, ...used];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  // Scroll highlighted item into view
  useEffect(() => {
    const el = listRef.current?.children[highlighted] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, available.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hero = available[highlighted];
      if (hero) onSelect(hero.name);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[10vh] sm:pt-[15vh] px-3 sm:px-4"
      onClick={onClose}
    >
      <div
        className="bg-fab-surface border border-fab-border rounded-xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-fab-border">
          <SearchIcon className="w-4 h-4 text-fab-dim shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search heroes..."
            className="flex-1 bg-transparent outline-none text-fab-text placeholder:text-fab-dim text-sm"
          />
          <button
            onClick={onClose}
            className="text-fab-dim hover:text-fab-muted transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-[50vh] sm:max-h-72 overflow-y-auto">
          {available.length === 0 && used.length === 0 && (
            <div className="px-4 py-6 text-center text-fab-dim text-sm">
              No heroes found
            </div>
          )}

          {displayList.map((hero, i) => {
            const isUsed = usedHeroes.has(hero.name);
            const availableIdx = isUsed ? -1 : available.indexOf(hero);
            const isHighlighted = availableIdx === highlighted;

            return (
              <button
                key={hero.cardIdentifier}
                type="button"
                disabled={isUsed}
                onClick={() => {
                  if (!isUsed) onSelect(hero.name);
                }}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                  isUsed
                    ? "opacity-35 cursor-not-allowed"
                    : isHighlighted
                    ? "bg-fab-gold/15"
                    : "hover:bg-fab-surface-hover"
                }`}
              >
                {hero.imageUrl ? (
                  <img
                    src={hero.imageUrl}
                    alt=""
                    className="w-8 h-8 rounded object-cover object-top shrink-0"
                  />
                ) : (
                  <HeroClassIcon
                    heroClass={hero.classes[0]}
                    size="sm"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      isHighlighted ? "text-fab-gold" : "text-fab-text"
                    }`}
                  >
                    {hero.name}
                  </p>
                  <p className="text-[11px] text-fab-dim truncate">
                    {hero.classes.join(" / ")}
                    {hero.talents.length > 0
                      ? ` · ${hero.talents.join(", ")}`
                      : ""}
                    {hero.young ? " · Young" : ""}
                  </p>
                </div>
                {isUsed && (
                  <span className="text-[10px] text-fab-dim font-medium">
                    Used
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

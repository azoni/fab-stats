"use client";

import { useState, useRef, useEffect } from "react";
import { searchCards } from "@/lib/cards";
import type { CardInfo } from "@/types";

const PITCH_DOT: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-yellow-400",
  3: "bg-blue-500",
};

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

interface CardSearchModalProps {
  usedCards: Set<string>;
  onSelect: (cardIdentifier: string) => void;
  onClose: () => void;
}

export function CardSearchModal({
  usedCards,
  onSelect,
  onClose,
}: CardSearchModalProps) {
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const results: CardInfo[] = trimmed.length >= 2 ? searchCards(trimmed) : [];

  const available = results.filter((c) => !usedCards.has(c.cardIdentifier));
  const used = results.filter((c) => usedCards.has(c.cardIdentifier));
  const displayList = [...available, ...used];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

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
      const card = available[highlighted];
      if (card) onSelect(card.cardIdentifier);
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
            placeholder="Search cards..."
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
          {trimmed.length < 2 && (
            <div className="px-4 py-6 text-center text-fab-dim text-sm">
              Type at least 2 characters to search
            </div>
          )}

          {trimmed.length >= 2 && displayList.length === 0 && (
            <div className="px-4 py-6 text-center text-fab-dim text-sm">
              No cards found
            </div>
          )}

          {displayList.map((card) => {
            const isUsed = usedCards.has(card.cardIdentifier);
            const availableIdx = isUsed ? -1 : available.indexOf(card);
            const isHighlighted = availableIdx === highlighted;

            return (
              <button
                key={card.cardIdentifier}
                type="button"
                disabled={isUsed}
                onClick={() => {
                  if (!isUsed) onSelect(card.cardIdentifier);
                }}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                  isUsed
                    ? "opacity-35 cursor-not-allowed"
                    : isHighlighted
                    ? "bg-fab-gold/15"
                    : "hover:bg-fab-surface-hover"
                }`}
              >
                {card.imageUrl ? (
                  <img
                    src={card.imageUrl}
                    alt=""
                    className="w-8 h-8 rounded object-cover object-[center_25%] shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-fab-surface-hover flex items-center justify-center shrink-0">
                    <span className="text-[8px] text-fab-dim">{card.name.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {card.pitch && (
                      <div className={`w-2.5 h-2.5 rounded-full ${PITCH_DOT[card.pitch]} shrink-0`} />
                    )}
                    <p
                      className={`text-sm font-medium truncate ${
                        isHighlighted ? "text-fab-gold" : "text-fab-text"
                      }`}
                    >
                      {card.name}
                    </p>
                  </div>
                  <p className="text-[11px] text-fab-dim truncate">
                    {card.types[0]}
                    {card.classes.length > 0 && card.classes[0] !== "Generic"
                      ? ` · ${card.classes.join(" / ")}`
                      : ""}
                    {card.cost != null ? ` · Cost ${card.cost}` : ""}
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

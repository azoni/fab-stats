"use client";
import { useState, useRef, useEffect } from "react";
import { allHeroes, searchHeroes } from "@/lib/heroes";
import { CloseIcon } from "@/components/icons/NavIcons";
import type { HeroInfo } from "@/types";

interface HeroSelectProps {
  value: string;
  onChange: (heroName: string) => void;
  label: string;
}

export function HeroSelect({ value, onChange, label }: HeroSelectProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results: HeroInfo[] = query.trim()
    ? searchHeroes(query)
    : allHeroes;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  function handleSelect(hero: HeroInfo) {
    onChange(hero.name);
    setQuery("");
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && results[highlighted]) {
      e.preventDefault();
      handleSelect(results[highlighted]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-fab-muted mb-1">
        {label}
      </label>
      <div
        className="flex items-center gap-2 bg-fab-surface border border-fab-border rounded-md px-3 py-2 cursor-text"
        onClick={() => {
          inputRef.current?.focus();
          setIsOpen(true);
        }}
      >
        {value && !isOpen ? (
          <div className="flex items-center gap-2 flex-1">
            <span className="text-fab-text">{value}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setQuery("");
              }}
              className="ml-auto text-fab-dim hover:text-fab-muted"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search heroes..."
            className="flex-1 bg-transparent outline-none text-fab-text placeholder:text-fab-dim text-sm"
          />
        )}
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-fab-surface border border-fab-border rounded-md shadow-lg">
          {results.map((hero, i) => (
            <button
              key={hero.cardIdentifier}
              type="button"
              onClick={() => handleSelect(hero)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                i === highlighted
                  ? "bg-fab-gold/15 text-fab-gold"
                  : "text-fab-text hover:bg-fab-surface-hover"
              }`}
            >
              <span className="font-medium">{hero.name}</span>
              <span className="text-fab-dim text-xs">
                {hero.classes.join(" / ")}
                {hero.young ? " (Young)" : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

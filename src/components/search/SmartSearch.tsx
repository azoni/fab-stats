"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { searchUsernames } from "@/lib/firestore-storage";
import { searchTeams } from "@/lib/teams";
import { Search, X, Users } from "lucide-react";
import Link from "next/link";

interface PlayerResult {
  type: "player";
  username: string;
  userId: string;
}

interface TeamResult {
  type: "team";
  teamId: string;
  name: string;
  nameLower: string;
}

type SearchResult = PlayerResult | TeamResult;

interface SmartSearchProps {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SmartSearch({ placeholder = "Search players or teams...", className = "", autoFocus = false }: SmartSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const [players, teams] = await Promise.all([
          searchUsernames(query.trim(), 8).catch(() => []),
          searchTeams(query.trim(), 5).catch(() => []),
        ]);

        const combined: SearchResult[] = [
          ...teams.map((t): TeamResult => ({ type: "team", ...t })),
          ...players.map((p): PlayerResult => ({ type: "player", ...p })),
        ];

        setResults(combined);
        setIsOpen(combined.length > 0);
        setHighlighted(-1);
      } catch (err) {
        console.error("[SmartSearch] Search failed:", err);
        setResults([]);
      }
      setSearching(false);
    }, 200);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function navigate(result: SearchResult) {
    if (result.type === "player") {
      router.push(`/player/${result.username}`);
    } else {
      router.push(`/team/${result.nameLower}`);
    }
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || results.length === 0) {
      if (e.key === "Enter" && query.trim()) {
        e.preventDefault();
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && results[highlighted]) {
        navigate(results[highlighted]);
      } else if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fab-dim pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-9 pr-8 py-2 rounded-lg bg-fab-surface border border-fab-border text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/40 transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setIsOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fab-dim hover:text-fab-muted"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {searching && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border-2 border-fab-dim border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-fab-surface border border-fab-border rounded-lg shadow-xl overflow-hidden max-h-80 overflow-y-auto">
          {results.map((r, i) => {
            const isHighlighted = i === highlighted;

            if (r.type === "team") {
              return (
                <Link
                  key={`team-${r.teamId}`}
                  href={`/team/${r.nameLower}`}
                  onClick={() => { setQuery(""); setIsOpen(false); }}
                  className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                    isHighlighted ? "bg-fab-gold/10" : "hover:bg-fab-surface-hover"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fab-text truncate">{r.name}</p>
                    <p className="text-[10px] text-fab-dim">Team</p>
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={`player-${r.userId}`}
                href={`/player/${r.username}`}
                onClick={() => { setQuery(""); setIsOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                  isHighlighted ? "bg-fab-gold/10" : "hover:bg-fab-surface-hover"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-fab-gold/15 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-fab-gold">{r.username.charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fab-text truncate">@{r.username}</p>
                  <p className="text-[10px] text-fab-dim">Player</p>
                </div>
              </Link>
            );
          })}

          {/* Footer link to full search */}
          <Link
            href={`/search?q=${encodeURIComponent(query.trim())}`}
            onClick={() => { setQuery(""); setIsOpen(false); }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-fab-gold hover:bg-fab-surface-hover transition-colors border-t border-fab-border"
          >
            <Search className="w-3 h-3" />
            See all results for &quot;{query.trim()}&quot;
          </Link>
        </div>
      )}
    </div>
  );
}

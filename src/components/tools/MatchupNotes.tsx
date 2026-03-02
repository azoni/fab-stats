"use client";
import { useState, useMemo } from "react";
import { useMatchupNotes } from "@/hooks/useMatchupNotes";
import { HeroSelect } from "@/components/heroes/HeroSelect";
import { allHeroes, getHeroByName } from "@/lib/heroes";
import type { MatchRecord } from "@/types";

function HeroIcon({ name }: { name: string }) {
  const hero = getHeroByName(name);
  const cls = hero?.classes[0] || "";
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-fab-surface text-fab-muted text-[8px] font-bold shrink-0 border border-fab-border" title={cls}>
      {cls.charAt(0) || "?"}
    </span>
  );
}

interface MatchupNotesProps {
  matches: MatchRecord[];
  isAuthenticated: boolean;
}

export function MatchupNotes({ matches, isAuthenticated }: MatchupNotesProps) {
  const [selectedHero, setSelectedHero] = useState<string>("");
  const [search, setSearch] = useState("");

  // Heroes the user has played (sorted by match count)
  const playedHeroes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of matches) {
      if (m.heroPlayed && m.heroPlayed !== "Unknown") {
        counts.set(m.heroPlayed, (counts.get(m.heroPlayed) || 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);
  }, [matches]);

  // Split opponents into faced vs other heroes
  const { faced, other } = useMemo(() => {
    if (!selectedHero) return { faced: [], other: [] };
    const set = new Set<string>();
    for (const m of matches) {
      if (m.heroPlayed === selectedHero && m.opponentHero && m.opponentHero !== "Unknown") {
        set.add(m.opponentHero);
      }
    }
    return {
      faced: [...set].sort(),
      other: allHeroes
        .map((h) => h.name)
        .filter((h) => !set.has(h) && h !== selectedHero)
        .sort(),
    };
  }, [matches, selectedHero]);

  // Filter by search
  const lowerSearch = search.toLowerCase();
  const filteredFaced = lowerSearch ? faced.filter((h) => h.toLowerCase().includes(lowerSearch)) : faced;
  const filteredOther = lowerSearch ? other.filter((h) => h.toLowerCase().includes(lowerSearch)) : other;
  const totalFiltered = filteredFaced.length + filteredOther.length;

  const { general, matchups, loading, saving, updateGeneral, updateMatchup, flushGeneral, flushMatchup } =
    useMatchupNotes(selectedHero || null);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12 text-fab-dim">
        <p className="text-lg mb-1">Sign in to use Matchup Notes</p>
        <p className="text-sm">Your notes are private and saved to your account.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Hero selector */}
      <div className="mb-5 max-w-xs">
        <HeroSelect
          value={selectedHero}
          onChange={setSelectedHero}
          label="Select Your Hero"
        />
      </div>

      {/* Quick-pick played heroes */}
      {!selectedHero && playedHeroes.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-fab-dim mb-2">Your heroes:</p>
          <div className="flex flex-wrap gap-1.5">
            {playedHeroes.map((hero) => (
              <button
                key={hero}
                onClick={() => setSelectedHero(hero)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium bg-fab-surface border border-fab-border hover:border-fab-gold/30 hover:text-fab-gold transition-colors"
              >
                <HeroIcon name={hero} />
                {hero}
              </button>
            ))}
          </div>
        </div>
      )}

      {!selectedHero && (
        <div className="text-center py-8 text-fab-dim">
          <p className="text-sm">Select a hero to view and edit matchup notes.</p>
        </div>
      )}

      {selectedHero && (
        <div>
          {/* Save indicator */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-fab-text flex items-center gap-2">
              <HeroIcon name={selectedHero} />
              {selectedHero} Notes
            </h3>
            <span className={`text-xs transition-opacity ${saving ? "text-fab-gold opacity-100" : "text-fab-dim opacity-0"}`}>
              Saving...
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-24 bg-fab-surface rounded animate-pulse" />
              <div className="h-16 bg-fab-surface rounded animate-pulse" />
            </div>
          ) : (
            <>
              {/* General notes */}
              <div className="mb-5">
                <label className="block text-xs text-fab-muted font-medium mb-1.5">
                  General Game Plan
                </label>
                <textarea
                  value={general}
                  onChange={(e) => updateGeneral(e.target.value)}
                  onBlur={() => flushGeneral()}
                  placeholder="Sideboard strategy, key cards, game plan..."
                  className="w-full bg-fab-surface border border-fab-border rounded-lg p-3 text-sm text-fab-text placeholder:text-fab-dim resize-y min-h-[80px] focus:outline-none focus:border-fab-gold/50 transition-colors"
                  rows={3}
                />
              </div>

              {/* Per-matchup notes */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-xs text-fab-muted font-medium shrink-0">
                    Matchup Notes
                  </p>
                  <div className="flex-1 max-w-xs relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fab-dim pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search heroes..."
                      className="w-full bg-fab-surface border border-fab-border rounded-md pl-8 pr-3 py-1.5 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/50 transition-colors"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-fab-dim hover:text-fab-muted"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-fab-dim shrink-0">{totalFiltered} heroes</span>
                </div>

                {/* Faced opponents */}
                {filteredFaced.length > 0 && (
                  <div className="mb-3">
                    {!lowerSearch && <p className="text-[11px] text-fab-dim uppercase tracking-wider mb-1.5">Faced ({filteredFaced.length})</p>}
                    <div className="space-y-1.5">
                      {filteredFaced.map((opp) => (
                        <MatchupNoteRow
                          key={opp}
                          opponent={opp}
                          note={matchups[opp] || ""}
                          onChange={(val) => updateMatchup(opp, val)}
                          onBlur={() => flushMatchup(opp, matchups[opp] || "")}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other heroes */}
                {filteredOther.length > 0 && (
                  <div>
                    {!lowerSearch && <p className="text-[11px] text-fab-dim uppercase tracking-wider mb-1.5">Other Heroes ({filteredOther.length})</p>}
                    <div className="space-y-1.5">
                      {filteredOther.map((opp) => (
                        <MatchupNoteRow
                          key={opp}
                          opponent={opp}
                          note={matchups[opp] || ""}
                          onChange={(val) => updateMatchup(opp, val)}
                          onBlur={() => flushMatchup(opp, matchups[opp] || "")}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {totalFiltered === 0 && search && (
                  <p className="text-center py-4 text-sm text-fab-dim">No heroes matching &ldquo;{search}&rdquo;</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MatchupNoteRow({
  opponent,
  note,
  onChange,
  onBlur,
}: {
  opponent: string;
  note: string;
  onChange: (val: string) => void;
  onBlur: () => void;
}) {
  const [expanded, setExpanded] = useState(!!note);

  return (
    <div className="border border-fab-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-fab-surface/50 transition-colors"
      >
        <HeroIcon name={opponent} />
        <span className="font-medium text-fab-text">{opponent}</span>
        {note && !expanded && (
          <span className="text-xs text-fab-dim truncate ml-2 flex-1 text-left">{note}</span>
        )}
        <svg
          className={`w-3.5 h-3.5 text-fab-dim shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {expanded && (
        <div className="px-3 pb-2">
          <textarea
            value={note}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={`Notes vs ${opponent}...`}
            className="w-full bg-fab-bg border border-fab-border/50 rounded-md p-2 text-sm text-fab-text placeholder:text-fab-dim resize-y min-h-[48px] focus:outline-none focus:border-fab-gold/50 transition-colors"
            rows={2}
          />
        </div>
      )}
    </div>
  );
}

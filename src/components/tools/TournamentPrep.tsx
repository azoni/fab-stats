"use client";
import { useState, useMemo } from "react";
import { computeHeroStats } from "@/lib/stats";
import { computeMetaStats, getAvailableFormats, getAvailableEventTypes, computeTop8HeroMeta } from "@/lib/meta-stats";
import { useMatchupNotes } from "@/hooks/useMatchupNotes";
import { HeroSelect } from "@/components/heroes/HeroSelect";
import { HeroImg } from "@/components/heroes/HeroImg";
import { getHeroByName } from "@/lib/heroes";
import type { MatchRecord, LeaderboardEntry } from "@/types";

interface TournamentPrepProps {
  matches: MatchRecord[];
  entries: LeaderboardEntry[];
  isLoaded: boolean;
  isAuthenticated: boolean;
}

interface ThreatRow {
  hero: string;
  heroClass?: string;
  metaShare: number;
  communityWR: number;
  yourWinRate: number | null;
  yourMatches: number;
  yourWins: number;
  yourLosses: number;
  dangerScore: number;
}

type SortKey = "danger" | "meta" | "winrate";

export function TournamentPrep({ matches, entries, isLoaded, isAuthenticated }: TournamentPrepProps) {
  const [yourHero, setYourHero] = useState("");
  const [format, setFormat] = useState("");
  const [eventType, setEventType] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("danger");
  const [editingNote, setEditingNote] = useState<string | null>(null);

  const formats = useMemo(() => getAvailableFormats(entries), [entries]);
  const eventTypes = useMemo(() => getAvailableEventTypes(entries), [entries]);

  // Matchup notes for the selected hero
  const { matchups: notes, updateMatchup, flushMatchup, saving } =
    useMatchupNotes(yourHero || null);

  // Community meta
  const { heroStats: metaHeroes } = useMemo(
    () => computeMetaStats(entries, format || undefined, eventType || undefined),
    [entries, format, eventType],
  );

  // Top 8 heroes
  const top8Heroes = useMemo(
    () => computeTop8HeroMeta(entries, eventType || undefined, format || undefined),
    [entries, eventType, format],
  );

  // Your matchups for the selected hero
  const yourHeroStats = useMemo(() => {
    if (!yourHero) return null;
    let filtered = matches;
    if (format) filtered = filtered.filter((m) => m.format === format);
    return computeHeroStats(filtered).find((h) => h.heroName === yourHero) || null;
  }, [matches, yourHero, format]);

  // Top 10 meta heroes
  const topMeta = metaHeroes.slice(0, 10);
  const totalMetaMatches = topMeta.reduce((s, h) => s + h.totalMatches, 0);

  // Threat rows
  const threats: ThreatRow[] = useMemo(() => {
    return topMeta.map((mh) => {
      const mu = yourHeroStats?.matchups.find((m) => m.opponentHero === mh.hero);
      const yourWinRate = mu ? mu.winRate : null;
      const yourMatches = mu ? mu.totalMatches : 0;
      const effectiveWR = yourWinRate ?? (100 - mh.avgWinRate);
      const dangerScore = mh.metaShare * ((100 - effectiveWR) / 100);
      const heroInfo = getHeroByName(mh.hero);
      return {
        hero: mh.hero,
        heroClass: heroInfo?.classes[0],
        metaShare: mh.metaShare,
        communityWR: mh.avgWinRate,
        yourWinRate,
        yourMatches,
        yourWins: mu?.wins ?? 0,
        yourLosses: mu?.losses ?? 0,
        dangerScore,
      };
    }).sort((a, b) => {
      if (sortBy === "meta") return b.metaShare - a.metaShare;
      if (sortBy === "winrate") return (a.yourWinRate ?? 999) - (b.yourWinRate ?? 999);
      return b.dangerScore - a.dangerScore;
    });
  }, [topMeta, yourHeroStats, sortBy]);

  // Practice suggestions: high danger + low data
  const practiceSuggestions = useMemo(
    () => threats.filter((t) => t.yourMatches < 3 && t.metaShare > 2).slice(0, 5),
    [threats],
  );

  if (!isLoaded) {
    return <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />;
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div className="max-w-[200px]">
          <HeroSelect value={yourHero} onChange={setYourHero} label="Your Hero" />
        </div>
        <div className="flex flex-wrap gap-1 self-end">
          <button
            onClick={() => setFormat("")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              !format ? "bg-fab-gold/15 text-fab-gold" : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
            }`}
          >
            All Formats
          </button>
          {formats.map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                format === f ? "bg-fab-gold/15 text-fab-gold" : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
              }`}
            >
              {f === "Classic Constructed" ? "CC" : f}
            </button>
          ))}
        </div>
        {eventTypes.length > 0 && (
          <div className="flex flex-wrap gap-1 self-end">
            <button
              onClick={() => setEventType("")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                !eventType ? "bg-teal-500/15 text-teal-400" : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
              }`}
            >
              All Events
            </button>
            {eventTypes.map((et) => (
              <button
                key={et}
                onClick={() => setEventType(et)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  eventType === et ? "bg-teal-500/15 text-teal-400" : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
                }`}
              >
                {et}
              </button>
            ))}
          </div>
        )}
      </div>

      {topMeta.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-fab-muted">No community data for these filters.</p>
          <p className="text-fab-dim text-sm mt-1">Try adjusting the format or event type.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Meta Overview ── */}
          <section>
            <h3 className="text-sm font-bold text-fab-text mb-1">Expected Meta</h3>
            <p className="text-[10px] text-fab-dim mb-3">
              Hero distribution from community data
              {format && ` · ${format === "Classic Constructed" ? "CC" : format}`}
              {eventType && ` · ${eventType}`}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {topMeta.map((hero) => {
                const heroInfo = getHeroByName(hero.hero);
                const pct = totalMetaMatches > 0 ? (hero.totalMatches / totalMetaMatches) * 100 : 0;
                return (
                  <div key={hero.hero} className="bg-fab-surface border border-fab-border rounded-lg p-2 text-center relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 right-0 bg-teal-500/10 transition-all" style={{ height: `${pct}%` }} />
                    <div className="relative">
                      <div className="flex justify-center mb-1">
                        <HeroImg name={hero.hero} size="sm" />
                      </div>
                      <p className="text-[11px] font-medium text-fab-text truncate">{hero.hero.split(",")[0]}</p>
                      <p className="text-xs font-bold text-teal-400">{hero.metaShare.toFixed(1)}%</p>
                      <p className={`text-[10px] ${hero.avgWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                        {hero.avgWinRate.toFixed(0)}% WR
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Threat Table ── */}
          {yourHero ? (
            <section>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-fab-text">Threat Assessment</h3>
                {saving && <span className="text-xs text-fab-gold">Saving...</span>}
              </div>
              <p className="text-[10px] text-fab-dim mb-3">
                Danger = meta share weighted by how often you lose the matchup
              </p>

              {/* Column headers */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 text-[10px] text-fab-dim font-medium uppercase tracking-wider">
                <span className="flex-1">Opponent</span>
                <button
                  onClick={() => setSortBy("meta")}
                  className={`w-12 text-right transition-colors ${sortBy === "meta" ? "text-fab-gold" : "hover:text-fab-text"}`}
                >
                  Meta{sortBy === "meta" ? " ↓" : ""}
                </button>
                <span className="w-14 text-right">Comm WR</span>
                <button
                  onClick={() => setSortBy("winrate")}
                  className={`w-16 text-right transition-colors ${sortBy === "winrate" ? "text-fab-gold" : "hover:text-fab-text"}`}
                >
                  Record{sortBy === "winrate" ? " ↑" : ""}
                </button>
                <button
                  onClick={() => setSortBy("danger")}
                  className={`w-12 text-right transition-colors ${sortBy === "danger" ? "text-fab-gold" : "hover:text-fab-text"}`}
                >
                  Danger{sortBy === "danger" ? " ↓" : ""}
                </button>
              </div>

              <div className="space-y-1.5">
                {threats.map((t) => {
                  const rowBg = t.yourWinRate === null
                    ? "bg-fab-surface"
                    : t.yourWinRate >= 55
                      ? "bg-green-500/5 border-green-500/15"
                      : t.yourWinRate >= 45
                        ? "bg-yellow-500/5 border-yellow-500/15"
                        : "bg-red-500/5 border-red-500/15";

                  const wrColor = t.yourWinRate === null
                    ? "text-fab-dim"
                    : t.yourWinRate >= 55
                      ? "text-fab-win"
                      : t.yourWinRate >= 45
                        ? "text-yellow-400"
                        : "text-fab-loss";

                  const dangerColor = t.dangerScore > 3
                    ? "text-fab-loss"
                    : t.dangerScore > 1.5
                      ? "text-yellow-400"
                      : "text-fab-win";

                  const communityWRColor = t.communityWR >= 50 ? "text-fab-win" : "text-fab-loss";

                  const note = notes[t.hero] || "";
                  const isEditing = editingNote === t.hero;

                  return (
                    <div key={t.hero} className={`rounded-lg border ${rowBg} px-3 py-2`}>
                      <div className="flex items-center gap-2">
                        <HeroImg name={t.hero} size="sm" />
                        <span className="text-sm font-medium text-fab-text flex-1 truncate">
                          {t.hero.split(",")[0]}
                        </span>
                        <span className="w-12 text-right text-xs text-fab-muted">
                          {t.metaShare.toFixed(1)}%
                        </span>
                        <span className={`w-14 text-right text-xs font-semibold ${communityWRColor}`}>
                          {t.communityWR.toFixed(0)}%
                        </span>
                        <span className={`w-16 text-right text-xs font-semibold ${wrColor}`}>
                          {t.yourMatches > 0 ? `${t.yourWins}-${t.yourLosses}` : "no data"}
                        </span>
                        <span className={`w-12 text-right text-xs font-bold ${dangerColor}`}>
                          {t.dangerScore.toFixed(1)}
                        </span>
                      </div>

                      {/* Note display / edit */}
                      {isEditing && isAuthenticated ? (
                        <div className="mt-2 ml-7">
                          <textarea
                            value={note}
                            onChange={(e) => updateMatchup(t.hero, e.target.value)}
                            onBlur={() => {
                              flushMatchup(t.hero, note);
                              setEditingNote(null);
                            }}
                            placeholder={`Notes vs ${t.hero.split(",")[0]}...`}
                            className="w-full bg-fab-bg border border-fab-border/50 rounded-md p-2 text-sm text-fab-text placeholder:text-fab-dim resize-y min-h-[48px] focus:outline-none focus:border-fab-gold/50 transition-colors"
                            rows={2}
                            autoFocus
                          />
                        </div>
                      ) : note ? (
                        <button
                          onClick={() => isAuthenticated && setEditingNote(t.hero)}
                          className="w-full text-left mt-1 ml-7"
                        >
                          <p className="text-[11px] text-fab-dim italic leading-tight line-clamp-2">
                            {note}
                          </p>
                        </button>
                      ) : isAuthenticated ? (
                        <button
                          onClick={() => setEditingNote(t.hero)}
                          className="mt-1 ml-7 text-[10px] text-fab-dim/50 hover:text-fab-dim transition-colors"
                        >
                          + add note
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 pt-2 px-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500/40" />
                  <span className="text-[10px] text-fab-dim">Favorable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-500/40" />
                  <span className="text-[10px] text-fab-dim">Even</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/40" />
                  <span className="text-[10px] text-fab-dim">Unfavorable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-fab-surface border border-fab-border" />
                  <span className="text-[10px] text-fab-dim">No data</span>
                </div>
              </div>
            </section>
          ) : (
            <div className="text-center py-6 text-fab-dim border border-dashed border-fab-border rounded-lg">
              <p className="text-sm">Select your hero above to see threat assessment and matchup notes.</p>
            </div>
          )}

          {/* ── Top 8 Analysis ── */}
          {top8Heroes.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-fab-text mb-1">Recent Top 8 Finishes</h3>
              <p className="text-[10px] text-fab-dim mb-3">
                Heroes making top 8s
                {format && ` in ${format === "Classic Constructed" ? "CC" : format}`}
                {eventType && ` at ${eventType}`}
              </p>
              <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
                {top8Heroes.slice(0, 8).map((t8, i) => {
                  const heroInfo = getHeroByName(t8.hero);
                  return (
                    <div key={t8.hero} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-fab-border" : ""}`}>
                      <HeroImg name={t8.hero} size="sm" />
                      <span className="text-sm font-medium text-fab-text flex-1 truncate">{t8.hero}</span>
                      <span className="text-xs text-fab-dim">
                        {t8.count} top 8{t8.count !== 1 ? "s" : ""}
                      </span>
                      {t8.champions > 0 && (
                        <span className="text-xs font-semibold text-fab-gold">
                          {t8.champions} win{t8.champions !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Practice Suggestions ── */}
          {yourHero && practiceSuggestions.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-fab-text mb-1">Practice Suggestions</h3>
              <p className="text-[10px] text-fab-dim mb-3">
                Common meta heroes you haven&apos;t played much against
              </p>
              <div className="flex flex-wrap gap-2">
                {practiceSuggestions.map((t) => (
                  <div
                    key={t.hero}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-fab-surface border border-fab-border"
                  >
                    <HeroImg name={t.hero} size="sm" />
                    <span className="text-sm font-medium text-fab-text">{t.hero.split(",")[0]}</span>
                    <span className="text-xs text-fab-dim">
                      {t.metaShare.toFixed(1)}% meta
                      {t.yourMatches > 0 ? ` · ${t.yourMatches} game${t.yourMatches !== 1 ? "s" : ""}` : " · no data"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!isAuthenticated && yourHero && (
            <p className="text-[10px] text-fab-dim italic">
              Sign in to see your personal matchup data and notes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

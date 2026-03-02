"use client";
import { useState, useMemo } from "react";
import { computeHeroStats } from "@/lib/stats";
import { computeMetaStats, getAvailableFormats, getAvailableEventTypes } from "@/lib/meta-stats";
import { HeroSelect } from "@/components/heroes/HeroSelect";
import { getHeroByName } from "@/lib/heroes";
import type { MatchRecord, LeaderboardEntry } from "@/types";
import type { HeroMetaStats } from "@/lib/meta-stats";

function HeroIcon({ name }: { name: string }) {
  const hero = getHeroByName(name);
  const cls = hero?.classes[0] || "";
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-fab-surface text-fab-muted text-[8px] font-bold shrink-0 border border-fab-border" title={cls}>
      {cls.charAt(0) || "?"}
    </span>
  );
}

interface TournamentPrepProps {
  matches: MatchRecord[];
  entries: LeaderboardEntry[];
  isLoaded: boolean;
}

interface ThreatRow {
  hero: string;
  metaShare: number;
  yourWinRate: number | null;
  yourMatches: number;
  dangerScore: number;
}

export function TournamentPrep({ matches, entries, isLoaded }: TournamentPrepProps) {
  const [format, setFormat] = useState<string>("");
  const [eventType, setEventType] = useState<string>("");
  const [yourHero, setYourHero] = useState<string>("");

  const formats = useMemo(() => getAvailableFormats(entries), [entries]);
  const eventTypes = useMemo(() => getAvailableEventTypes(entries), [entries]);

  // Community meta
  const { heroStats: metaHeroes } = useMemo(
    () => computeMetaStats(entries, format || undefined, eventType || undefined),
    [entries, format, eventType]
  );

  // Your matchups for selected hero
  const yourHeroStats = useMemo(() => {
    if (!yourHero) return null;
    let filtered = matches;
    if (format) filtered = filtered.filter((m) => m.format === format);
    const all = computeHeroStats(filtered);
    return all.find((h) => h.heroName === yourHero) || null;
  }, [matches, yourHero, format]);

  // Top 15 meta heroes
  const topMeta = metaHeroes.slice(0, 15);

  // Threat assessment
  const threats: ThreatRow[] = useMemo(() => {
    return topMeta.map((mh) => {
      const mu = yourHeroStats?.matchups.find((m) => m.opponentHero === mh.hero);
      const yourWinRate = mu ? mu.winRate : null;
      const yourMatches = mu ? mu.totalMatches : 0;
      // dangerScore = metaShare * (100 - yourWinRate) / 100
      // If no data, assume 50% win rate
      const effectiveWR = yourWinRate !== null ? yourWinRate : 50;
      const dangerScore = mh.metaShare * ((100 - effectiveWR) / 100);
      return {
        hero: mh.hero,
        metaShare: mh.metaShare,
        yourWinRate,
        yourMatches,
        dangerScore,
      };
    }).sort((a, b) => b.dangerScore - a.dangerScore);
  }, [topMeta, yourHeroStats]);

  // Practice suggestions: high danger + low data
  const practiceSuggestions = useMemo(
    () => threats.filter((t) => t.yourMatches < 3 && t.metaShare > 2).slice(0, 5),
    [threats]
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
        <div className="flex flex-wrap gap-1.5 self-end">
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
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                format === f ? "bg-fab-gold/15 text-fab-gold" : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {eventTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 self-end">
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
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
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
        <div className="text-center py-12 text-fab-dim">
          <p className="text-lg mb-1">No community meta data</p>
          <p className="text-sm">Meta data will appear as players log matches.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Meta distribution */}
          <section>
            <h3 className="text-sm font-bold text-fab-text mb-3">Expected Meta Distribution</h3>
            <div className="space-y-1">
              {topMeta.map((hero, i) => {
                const maxShare = topMeta[0]?.metaShare || 1;
                const barWidth = (hero.metaShare / maxShare) * 100;
                return (
                  <div key={hero.hero} className="flex items-center gap-2 py-1">
                    <span className="w-5 text-right text-xs text-fab-dim">{i + 1}</span>
                    <HeroIcon name={hero.hero} />
                    <span className="w-32 min-w-[80px] text-sm font-medium text-fab-text truncate">{hero.hero}</span>
                    <div className="flex-1 h-4 bg-fab-bg rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500/25 rounded-full" style={{ width: `${barWidth}%` }} />
                    </div>
                    <span className="w-14 text-right text-xs text-fab-muted">{hero.metaShare.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Threat assessment (requires hero selection) */}
          {yourHero && (
            <section>
              <h3 className="text-sm font-bold text-fab-text mb-1">Threat Assessment</h3>
              <p className="text-xs text-fab-dim mb-3">
                Danger = meta share weighted by how often you lose the matchup
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-xs text-fab-muted">
                      <th className="text-left p-2 font-medium border-b border-fab-border">Hero</th>
                      <th className="text-right p-2 font-medium border-b border-fab-border">Meta %</th>
                      <th className="text-right p-2 font-medium border-b border-fab-border">Your WR</th>
                      <th className="text-right p-2 font-medium border-b border-fab-border">Games</th>
                      <th className="text-right p-2 font-medium border-b border-fab-border">Danger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {threats.map((t) => {
                      const dangerColor =
                        t.dangerScore > 3
                          ? "text-fab-loss"
                          : t.dangerScore > 1.5
                            ? "text-fab-draw"
                            : "text-fab-win";
                      const wrColor =
                        t.yourWinRate === null
                          ? "text-fab-dim"
                          : t.yourWinRate >= 55
                            ? "text-fab-win"
                            : t.yourWinRate >= 45
                              ? "text-fab-draw"
                              : "text-fab-loss";

                      return (
                        <tr key={t.hero} className="hover:bg-fab-surface/50 transition-colors">
                          <td className="p-2 border-b border-fab-border/50">
                            <div className="flex items-center gap-2">
                              <HeroIcon name={t.hero} />
                              <span className="font-medium text-fab-text">{t.hero}</span>
                            </div>
                          </td>
                          <td className="p-2 text-right border-b border-fab-border/50 text-fab-muted">
                            {t.metaShare.toFixed(1)}%
                          </td>
                          <td className={`p-2 text-right border-b border-fab-border/50 font-semibold ${wrColor}`}>
                            {t.yourWinRate !== null ? `${t.yourWinRate.toFixed(0)}%` : "—"}
                          </td>
                          <td className="p-2 text-right border-b border-fab-border/50 text-fab-dim">
                            {t.yourMatches || "—"}
                          </td>
                          <td className={`p-2 text-right border-b border-fab-border/50 font-bold ${dangerColor}`}>
                            {t.dangerScore.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Practice suggestions */}
          {yourHero && practiceSuggestions.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-fab-text mb-1">Practice Suggestions</h3>
              <p className="text-xs text-fab-dim mb-3">
                Common meta heroes you haven&apos;t played much against
              </p>
              <div className="flex flex-wrap gap-2">
                {practiceSuggestions.map((t) => (
                  <div
                    key={t.hero}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-fab-surface border border-fab-border"
                  >
                    <HeroIcon name={t.hero} />
                    <span className="text-sm font-medium text-fab-text">{t.hero}</span>
                    <span className="text-xs text-fab-dim">
                      {t.metaShare.toFixed(1)}% meta
                      {t.yourMatches > 0 ? ` · ${t.yourMatches} game${t.yourMatches !== 1 ? "s" : ""}` : " · no data"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!yourHero && (
            <div className="text-center py-6 text-fab-dim border border-dashed border-fab-border rounded-lg">
              <p className="text-sm">Select your hero above to see threat assessment and practice suggestions.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";
import { useState, useMemo } from "react";
import { computeHeroStats } from "@/lib/stats";
import { computeMetaStats, getAvailableFormats, getAvailableEventTypes, computeTop8HeroMeta } from "@/lib/meta-stats";
import { HeroSelect } from "@/components/heroes/HeroSelect";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import { getHeroByName } from "@/lib/heroes";
import type { MatchRecord, LeaderboardEntry } from "@/types";

interface EventScoutProps {
  matches: MatchRecord[];
  entries: LeaderboardEntry[];
  isLoaded: boolean;
}

export function EventScout({ matches, entries, isLoaded }: EventScoutProps) {
  const [format, setFormat] = useState("");
  const [eventType, setEventType] = useState("");
  const [yourHero, setYourHero] = useState("");

  const formats = useMemo(() => getAvailableFormats(entries), [entries]);
  const eventTypes = useMemo(() => getAvailableEventTypes(entries), [entries]);

  // Community meta filtered by format + event type
  const { heroStats: metaHeroes } = useMemo(
    () => computeMetaStats(entries, format || undefined, eventType || undefined),
    [entries, format, eventType],
  );

  // Top 8 heroes for this format + event type
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

  // Top 5 threats
  const threats = useMemo(() => {
    return topMeta.slice(0, 5).map((mh) => {
      const mu = yourHeroStats?.matchups.find((m) => m.opponentHero === mh.hero);
      return {
        hero: mh.hero,
        heroClass: getHeroByName(mh.hero)?.classes[0],
        metaShare: mh.metaShare,
        communityWR: mh.avgWinRate,
        yourWinRate: mu?.winRate ?? null,
        yourMatches: mu?.totalMatches ?? 0,
      };
    });
  }, [topMeta, yourHeroStats]);

  if (!isLoaded) {
    return <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />;
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        {formats.length > 0 && (
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
        )}
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
          {/* Expected Meta — horizontal bar chart */}
          <section>
            <h3 className="text-sm font-bold text-fab-text mb-1">Expected Meta</h3>
            <p className="text-[10px] text-fab-dim mb-3">
              Hero distribution from community data{format && ` · ${format === "Classic Constructed" ? "CC" : format}`}{eventType && ` · ${eventType}`}
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
                        <HeroClassIcon heroClass={heroInfo?.classes[0]} size="sm" />
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

          {/* Top 5 Threats */}
          <section>
            <h3 className="text-sm font-bold text-fab-text mb-1">Top Threats</h3>
            <p className="text-[10px] text-fab-dim mb-3">Most played heroes with community win rates</p>
            <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
              {threats.map((t, i) => (
                <div key={t.hero} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-fab-border" : ""}`}>
                  <span className="text-xs font-bold w-4 text-center text-fab-dim">{i + 1}</span>
                  <HeroClassIcon heroClass={t.heroClass} size="sm" />
                  <span className="text-sm font-medium text-fab-text flex-1 truncate">{t.hero}</span>
                  <span className="text-xs text-fab-muted">{t.metaShare.toFixed(1)}%</span>
                  <span className={`text-xs font-semibold ${t.communityWR >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                    {t.communityWR.toFixed(0)}% WR
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Your Matchup Preview */}
          <section>
            <h3 className="text-sm font-bold text-fab-text mb-1">Your Matchup Preview</h3>
            <p className="text-[10px] text-fab-dim mb-3">Select your hero to see your personal record vs the expected meta</p>
            <div className="max-w-[200px] mb-3">
              <HeroSelect value={yourHero} onChange={setYourHero} label="Your Hero" />
            </div>
            {yourHero ? (
              <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
                {threats.map((t, i) => {
                  const wrColor = t.yourWinRate === null
                    ? "text-fab-dim"
                    : t.yourWinRate >= 55
                      ? "text-fab-win"
                      : t.yourWinRate >= 45
                        ? "text-yellow-400"
                        : "text-fab-loss";
                  return (
                    <div key={t.hero} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-fab-border" : ""}`}>
                      <HeroClassIcon heroClass={t.heroClass} size="sm" />
                      <span className="text-sm font-medium text-fab-text flex-1 truncate">{t.hero.split(",")[0]}</span>
                      <span className={`text-xs font-semibold ${wrColor}`}>
                        {t.yourWinRate !== null ? `${t.yourWinRate.toFixed(0)}%` : "—"}
                      </span>
                      <span className="text-xs text-fab-dim w-16 text-right">
                        {t.yourMatches > 0 ? `${t.yourMatches} game${t.yourMatches !== 1 ? "s" : ""}` : "no data"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-fab-dim border border-dashed border-fab-border rounded-lg">
                <p className="text-sm">Select your hero above to see your personal matchup data.</p>
              </div>
            )}
          </section>

          {/* Recent Top 8 Results */}
          {top8Heroes.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-fab-text mb-1">Recent Top 8 Finishes</h3>
              <p className="text-[10px] text-fab-dim mb-3">
                Heroes making top 8s{format && ` in ${format === "Classic Constructed" ? "CC" : format}`}{eventType && ` at ${eventType}`}
              </p>
              <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
                {top8Heroes.slice(0, 8).map((t8, i) => {
                  const heroInfo = getHeroByName(t8.hero);
                  return (
                    <div key={t8.hero} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-fab-border" : ""}`}>
                      <HeroClassIcon heroClass={heroInfo?.classes[0]} size="sm" />
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
        </div>
      )}
    </div>
  );
}

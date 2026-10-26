"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { HeroImg } from "@/components/heroes/HeroImg";
import { MatchCard } from "@/components/matches/MatchCard";
import { MatchFilterSelect } from "@/components/matches/MatchFilterSelect";
import { useDragScroll } from "@/hooks/useDragScroll";
import { useMatchupFilters } from "@/hooks/useMatchupFilters";
import { getMatchFilterOptions } from "@/lib/match-history";
import { getPersonalMatchups, type MatchupFilters } from "@/lib/personal-matchups";
import { MatchResult, type HeroStats, type MatchRecord, type MatchupRecord } from "@/types";

const control =
  "min-h-11 w-full min-w-0 rounded-md border border-fab-border bg-fab-surface px-3 py-2 text-sm text-fab-text outline-none focus-visible:ring-2 focus-visible:ring-fab-gold/50 sm:min-h-9 sm:py-1.5";
const action =
  "min-h-11 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-fab-gold/50 sm:min-h-9 sm:py-1.5";
const privacyKey = "fab-stats-hide-opponent-names";

function subscribePrivacy(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("fab-stats-opponent-privacy", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("fab-stats-opponent-privacy", callback);
  };
}
function readPrivacy() {
  try {
    return window.localStorage.getItem(privacyKey) === "true";
  } catch {
    return false;
  }
}

function rateStyle(rate: number, total: number) {
  if (total < 5) return { text: "text-fab-muted", bg: "bg-fab-surface" };
  if (rate >= 60) return { text: "text-fab-win", bg: "bg-fab-win/15" };
  if (rate >= 45) return { text: "text-fab-draw", bg: "bg-fab-draw/10" };
  return { text: "text-fab-loss", bg: "bg-fab-loss/15" };
}

function pairLabel(hero: string, matchup: MatchupRecord) {
  return `${hero} versus ${matchup.opponentHero}: ${matchup.wins} wins, ${matchup.losses} losses, ${matchup.draws} draws, ${matchup.winRate.toFixed(0)}% win rate. View ${matchup.totalMatches} matches`;
}

export function MatchupMatrix({ matches, isLoaded }: { matches: MatchRecord[]; isLoaded: boolean }) {
  const { filters, setFilters, clearFilters } = useMatchupFilters();
  const savedPrivacy = useSyncExternalStore(subscribePrivacy, readPrivacy, () => false);
  const [privacyOverride, setPrivacyOverride] = useState<boolean | null>(null);
  const hideNames = privacyOverride ?? savedPrivacy;
  const options = useMemo(() => getMatchFilterOptions(matches.filter((m) => m.result !== MatchResult.Bye)), [matches]);
  const { records, heroStats, missingHeroes } = useMemo(
    () => getPersonalMatchups(matches, filters),
    [matches, filters],
  );
  const detailRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);
  const returningPair = useRef<string | null>(null);
  const exactPair = !!(filters.hero && filters.opponentHero && records.length);
  const pairKey = JSON.stringify([filters.hero, filters.opponentHero]);
  const hasFilters = !!(
    filters.hero ||
    filters.opponentHero ||
    filters.opponent ||
    filters.event ||
    filters.format ||
    filters.eventType ||
    filters.rated ||
    filters.from ||
    filters.to
  );
  const advancedCount = [filters.format, filters.eventType, filters.rated, filters.from, filters.to].filter(
    Boolean,
  ).length;
  const pairCount = heroStats.reduce((count, hero) => count + hero.matchups.length, 0);
  const invalidRange = !!(filters.from && filters.to && filters.from > filters.to);

  useEffect(() => {
    if (!exactPair && returningPair.current && rootRef.current) {
      const pair = returningPair.current;
      returningPair.current = null;
      const button = [...rootRef.current.querySelectorAll<HTMLButtonElement>("button[data-pair]")].find(
        (item) => item.dataset.pair === pair,
      );
      const target = button || rootRef.current.querySelector<HTMLButtonElement>("button");
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "nearest" });
    }
    if (!pendingFocus.current || !exactPair || !detailRef.current) return;
    pendingFocus.current = false;
    detailRef.current.focus({ preventScroll: true });
    detailRef.current.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [exactPair, pairKey]);

  function openPair(hero: string, opponentHero: string) {
    pendingFocus.current = true;
    setFilters({ hero, opponentHero });
  }

  const playerOptions = hideNames
    ? options.opponents.map((option, index) => ({ value: option.value, label: `Player ${index + 1}` }))
    : options.opponents;

  if (!isLoaded)
    return (
      <p role="status" className="py-12 text-center text-sm text-fab-muted">
        Loading your matchups…
      </p>
    );

  return (
    <div ref={rootRef} className="space-y-5">
      <section
        aria-label="Filter your matchups"
        className="space-y-3 rounded-lg border border-fab-border bg-fab-surface/30 p-3 sm:p-4"
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MatchFilterSelect
            label="Your hero"
            value={filters.hero}
            onChange={(hero) => setFilters({ hero })}
            options={options.heroes.filter((o) => o.value !== "none")}
            allLabel="All heroes"
          />
          <MatchFilterSelect
            label="Opponent hero"
            value={filters.opponentHero}
            onChange={(opponentHero) => setFilters({ opponentHero })}
            options={options.opponentHeroes.filter((o) => o.value !== "none")}
            allLabel="All heroes"
          />
          <MatchFilterSelect
            label="Opponent player"
            value={filters.opponent}
            onChange={(opponent) => setFilters({ opponent })}
            options={playerOptions}
            allLabel="All players"
          />
          <MatchFilterSelect
            label="Event"
            value={filters.event}
            onChange={(event) => setFilters({ event })}
            options={options.events}
            allLabel="All events"
          />
        </div>
        <details className="group" open={advancedCount > 0 || undefined}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm text-fab-muted outline-none hover:text-fab-text focus-visible:ring-2 focus-visible:ring-fab-gold/50 sm:min-h-9">
            <span aria-hidden="true" className="text-fab-gold group-open:rotate-90">
              ▸
            </span>
            Format, event type & dates {advancedCount > 0 && <span className="text-fab-gold">({advancedCount})</span>}
          </summary>
          <div className="grid grid-cols-1 gap-3 pt-2 min-[390px]:grid-cols-2 lg:grid-cols-5">
            <MatchFilterSelect
              label="Format"
              value={filters.format}
              onChange={(format) => setFilters({ format })}
              options={options.formats}
              allLabel="All formats"
            />
            <MatchFilterSelect
              label="Event type"
              value={filters.eventType}
              onChange={(eventType) => setFilters({ eventType })}
              options={options.eventTypes}
              allLabel="All event types"
            />
            <label className="min-w-0 text-[13px] font-medium text-fab-muted">
              Rating
              <select
                className={`${control} mt-1 block`}
                value={filters.rated}
                onChange={(e) => setFilters({ rated: e.target.value as MatchupFilters["rated"] })}
              >
                <option value="">All ratings</option>
                <option value="rated">Rated</option>
                <option value="unrated">Unrated</option>
              </select>
            </label>
            <label className="min-w-0 text-[13px] font-medium text-fab-muted">
              From
              <input
                className={`${control} mt-1 block`}
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ from: e.target.value })}
                aria-invalid={invalidRange || undefined}
                aria-describedby={invalidRange ? "matchup-date-error" : undefined}
              />
            </label>
            <label className="min-w-0 text-[13px] font-medium text-fab-muted">
              Through
              <input
                className={`${control} mt-1 block`}
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ to: e.target.value })}
                aria-invalid={invalidRange || undefined}
                aria-describedby={invalidRange ? "matchup-date-error" : undefined}
              />
            </label>
          </div>
        </details>
        {invalidRange && (
          <p id="matchup-date-error" role="alert" className="text-sm text-fab-loss">
            Choose an end date on or after the start date.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-fab-border/60 pt-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-fab-muted sm:min-h-9">
            <input
              type="checkbox"
              checked={hideNames}
              className="h-4 w-4 accent-fab-gold"
              onChange={(e) => {
                // Privacy still works for this view when browser storage is blocked.
                setPrivacyOverride(e.target.checked);
                try {
                  window.localStorage.setItem(privacyKey, String(e.target.checked));
                  window.dispatchEvent(new Event("fab-stats-opponent-privacy"));
                  setPrivacyOverride(null);
                } catch {
                  /* Storage may be unavailable in private browsing. */
                }
              }}
            />
            Hide player names
          </label>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className={`${action} text-fab-gold hover:bg-fab-gold/10`}>
              Clear filters
            </button>
          )}
        </div>
      </section>

      {missingHeroes > 0 && (
        <div className="flex items-center gap-3 text-xs leading-relaxed text-fab-muted">
          <p className="min-w-0 flex-1">
            {missingHeroes} {missingHeroes === 1 ? "match is" : "matches are"} missing hero selections and excluded from
            these pairings.
          </p>
          <Link
            href="/matches"
            className="inline-flex min-h-11 shrink-0 items-center text-fab-gold underline underline-offset-4 sm:min-h-9"
          >
            Review matches
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-fab-muted">
          <span className="font-semibold tabular-nums text-fab-text">{records.length}</span> matches ·{" "}
          <span className="tabular-nums">{pairCount}</span> {pairCount === 1 ? "pairing" : "pairings"}
        </p>
        {!exactPair && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.view === "list" && (
              <label className="flex items-center gap-2 text-xs text-fab-muted">
                Sort
                <select
                  className={control}
                  value={filters.order}
                  onChange={(e) => setFilters({ order: e.target.value as MatchupFilters["order"] })}
                >
                  <option value="played">Most played</option>
                  <option value="worst">Lowest win rate</option>
                  <option value="best">Highest win rate</option>
                  <option value="alpha">Hero A–Z</option>
                </select>
              </label>
            )}
            <div className="flex rounded-md border border-fab-border p-0.5" role="group" aria-label="Matchup view">
              {(["list", "grid"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  aria-pressed={filters.view === view}
                  className={`${action} ${filters.view === view ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"}`}
                  onClick={() => setFilters({ view })}
                >
                  {view === "list" ? "List" : "Grid"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {records.length === 0 ? (
        <div className="rounded-lg border border-fab-border py-12 px-4 text-center">
          <h2 className="font-semibold text-fab-text">
            {hasFilters ? "No matchups match these filters" : "Your matchups start here"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fab-muted">
            {hasFilters
              ? "Try another hero, player or event, or clear your filters."
              : "Import matches with both heroes recorded to see your results by pairing."}
          </p>
          {hasFilters ? (
            <button className={`${action} mt-3 text-fab-gold hover:bg-fab-gold/10`} onClick={clearFilters}>
              Reset matchup filters
            </button>
          ) : (
            <Link href="/import" className={`${action} mt-3 inline-flex items-center bg-fab-gold/15 text-fab-gold`}>
              Import matches
            </Link>
          )}
        </div>
      ) : exactPair ? (
        <div
          ref={detailRef}
          tabIndex={-1}
          className="scroll-mt-20 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-fab-gold/50"
          aria-label={`${filters.hero} versus ${filters.opponentHero}`}
        >
          <PairDetail
            key={JSON.stringify(filters)}
            records={records}
            hero={heroStats[0]}
            hideNames={hideNames}
            onClose={() => {
              returningPair.current = pairKey;
              setFilters({ hero: "", opponentHero: "" });
            }}
          />
        </div>
      ) : filters.view === "list" ? (
        <PersonalList heroStats={heroStats} order={filters.order} onPair={openPair} />
      ) : (
        <PersonalGrid heroStats={heroStats} onPair={openPair} />
      )}

      {records.length > 0 && (
        <p className="text-xs leading-relaxed text-fab-dim">
          Win rate = wins ÷ matches, including draws. Byes are excluded. Pairings with fewer than 5 matches are marked
          as a small sample.
        </p>
      )}
    </div>
  );
}

function PersonalList({
  heroStats,
  order,
  onPair,
}: {
  heroStats: HeroStats[];
  order: MatchupFilters["order"];
  onPair: (hero: string, opponent: string) => void;
}) {
  return (
    <div className="space-y-6">
      {heroStats.map((hero) => {
        const matchups = [...hero.matchups].sort((a, b) => {
          if (order === "alpha") return a.opponentHero.localeCompare(b.opponentHero);
          if (order === "best") return b.winRate - a.winRate || b.totalMatches - a.totalMatches;
          if (order === "worst") return a.winRate - b.winRate || b.totalMatches - a.totalMatches;
          return b.totalMatches - a.totalMatches || a.opponentHero.localeCompare(b.opponentHero);
        });
        return (
          <section key={hero.heroName} aria-label={`${hero.heroName} matchups`}>
            <div className="mb-3 flex items-center gap-2">
              <HeroImg name={hero.heroName} size="md" />
              <h2 className="min-w-0 text-sm font-bold text-fab-text">{hero.heroName}</h2>
              <span className="ml-auto shrink-0 text-xs tabular-nums text-fab-muted">{hero.totalMatches} matches</span>
            </div>
            <div className="divide-y divide-fab-border/50 rounded-lg border border-fab-border bg-fab-surface/20">
              {matchups.map((mu) => {
                const style = rateStyle(mu.winRate, mu.totalMatches);
                return (
                  <button
                    type="button"
                    key={mu.opponentHero}
                    aria-label={pairLabel(hero.heroName, mu)}
                    data-pair={JSON.stringify([hero.heroName, mu.opponentHero])}
                    onClick={() => onPair(hero.heroName, mu.opponentHero)}
                    className="flex min-h-16 w-full items-center gap-3 rounded-md px-3 py-3 text-left outline-none transition-colors hover:bg-fab-gold/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fab-gold"
                  >
                    <HeroImg name={mu.opponentHero} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-fab-text">{mu.opponentHero}</span>
                      <span className="mt-0.5 block text-xs text-fab-muted">
                        {mu.totalMatches} matches{mu.totalMatches < 5 ? " · Small sample" : ""}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-fab-border sm:block"
                    >
                      <span
                        className={`block h-full rounded-full ${mu.totalMatches < 5 ? "bg-fab-muted" : mu.winRate >= 60 ? "bg-fab-win" : mu.winRate >= 45 ? "bg-fab-draw" : "bg-fab-loss"}`}
                        style={{ width: `${mu.winRate}%` }}
                      />
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      <span className={`block text-base font-bold ${style.text}`}>{mu.winRate.toFixed(0)}%</span>
                      <span className="block text-xs text-fab-muted">
                        {mu.wins}W–{mu.losses}L{mu.draws > 0 ? `–${mu.draws}D` : ""}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-fab-dim">
                      ›
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PersonalGrid({
  heroStats,
  onPair,
}: {
  heroStats: HeroStats[];
  onPair: (hero: string, opponent: string) => void;
}) {
  const { ref, onMouseDown, movedRef } = useDragScroll();
  const opponents = [...new Set(heroStats.flatMap((hero) => hero.matchups.map((mu) => mu.opponentHero)))].sort();
  return (
    <div>
      <p className="mb-2 text-xs text-fab-muted">
        Your heroes are rows; opponent heroes are columns. Select a result to see its matches.
      </p>
      <div
        ref={ref}
        onMouseDown={onMouseDown}
        tabIndex={0}
        role="region"
        aria-label="Your matchup grid, scroll to see more heroes"
        className="max-h-[65vh] overflow-auto rounded-lg border border-fab-border bg-fab-bg outline-none focus-visible:ring-2 focus-visible:ring-fab-gold/50"
      >
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Your hero versus opponent hero. Each cell shows win rate and wins, losses, draws.
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky top-0 left-0 z-30 min-w-28 border-b border-fab-border bg-fab-surface p-3 text-left text-xs text-fab-muted"
              >
                Your hero /<br />
                opponent
              </th>
              {opponents.map((opponent) => (
                <th
                  key={opponent}
                  scope="col"
                  className="sticky top-0 z-20 min-w-32 border-b border-fab-border bg-fab-surface p-2 text-center font-medium text-fab-muted"
                >
                  <span className="flex flex-col items-center gap-1">
                    <HeroImg name={opponent} />
                    <span className="max-w-40 text-xs leading-snug">{opponent}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heroStats.map((hero) => (
              <tr key={hero.heroName}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 max-w-48 border-b border-fab-border/50 bg-fab-surface p-2 text-left text-xs font-semibold text-fab-text"
                >
                  <span className="flex items-center gap-2">
                    <HeroImg name={hero.heroName} />
                    <span>{hero.heroName}</span>
                  </span>
                </th>
                {opponents.map((opponent) => {
                  const mu = hero.matchups.find((m) => m.opponentHero === opponent);
                  if (!mu)
                    return (
                      <td key={opponent} className="border-b border-fab-border/50 text-center text-fab-dim">
                        <span aria-label="No matches">—</span>
                      </td>
                    );
                  const style = rateStyle(mu.winRate, mu.totalMatches);
                  return (
                    <td key={opponent} className={`border-b border-fab-border/50 p-0 ${style.bg}`}>
                      <button
                        type="button"
                        aria-label={pairLabel(hero.heroName, mu)}
                        data-pair={JSON.stringify([hero.heroName, mu.opponentHero])}
                        onClick={(e) => {
                          if (e.detail === 0 || !movedRef.current) onPair(hero.heroName, opponent);
                        }}
                        className="min-h-16 w-full px-2 py-3 text-center outline-none hover:ring-1 hover:ring-inset hover:ring-fab-gold/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fab-gold"
                      >
                        <span className={`block font-bold tabular-nums ${style.text}`}>{mu.winRate.toFixed(0)}%</span>
                        <span className="block text-xs tabular-nums text-fab-muted">
                          {mu.wins}W–{mu.losses}L{mu.draws ? `–${mu.draws}D` : ""}
                        </span>
                        {mu.totalMatches < 5 && <span className="block text-[10px] text-fab-dim">Small sample</span>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PairDetail({
  records,
  hero,
  hideNames,
  onClose,
}: {
  records: MatchRecord[];
  hero: HeroStats;
  hideNames: boolean;
  onClose: () => void;
}) {
  const [limit, setLimit] = useState(10);
  const matchup = hero.matchups[0];
  const style = rateStyle(matchup.winRate, matchup.totalMatches);
  return (
    <section aria-labelledby="pair-detail-heading" className="space-y-4">
      <div className="rounded-lg border border-fab-border bg-fab-surface/50 p-4">
        <button type="button" onClick={onClose} className={`${action} -ml-3 mb-2 text-fab-gold hover:bg-fab-gold/10`}>
          ← All pairings
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <HeroImg name={hero.heroName} size="md" />
          <h2 id="pair-detail-heading" className="text-base font-bold text-fab-text">
            {hero.heroName} <span className="font-normal text-fab-muted">vs</span> {matchup.opponentHero}
          </h2>
          <HeroImg name={matchup.opponentHero} size="md" />
        </div>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2 tabular-nums">
          <span className={`text-2xl font-bold ${style.text}`}>
            {matchup.winRate.toFixed(1)}% <span className="text-xs font-normal text-fab-muted">win rate</span>
          </span>
          <span className="text-sm text-fab-text">
            {matchup.wins}W · {matchup.losses}L · {matchup.draws}D
          </span>
          <span className="text-sm text-fab-muted">{records.length} matches</span>
        </div>
        {records.length < 5 && (
          <p className="mt-2 text-xs text-fab-muted">
            Small sample — a few more games will give you a clearer picture.
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-fab-text">Matches behind this matchup</h3>
        <p className="text-xs text-fab-muted">
          Newest first · {Math.min(limit, records.length)} of {records.length}
        </p>
      </div>
      <div className="space-y-2">
        {records.slice(0, limit).map((match) => (
          <MatchCard key={match.id} match={match} obfuscateOpponents={hideNames} />
        ))}
      </div>
      {limit < records.length && (
        <button
          type="button"
          className={`${action} w-full border border-fab-border text-fab-gold hover:bg-fab-gold/5`}
          onClick={() => setLimit((current) => current + 10)}
        >
          Show more matches
        </button>
      )}
    </section>
  );
}

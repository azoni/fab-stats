"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MetaMatchupMatrix } from "@/components/meta/MetaMatchupMatrix";
import { MatchupMatrix } from "@/components/matchups/MatchupMatrix";
import { MatchFilterSelect } from "@/components/matches/MatchFilterSelect";
import { useAuth } from "@/contexts/AuthContext";
import { useMatches } from "@/hooks/useMatches";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { getAvailableEventTypes } from "@/lib/meta-stats";
import { GameFormat } from "@/types";

const control =
  "min-h-11 w-full rounded-md border border-fab-border bg-fab-surface px-3 py-2 text-sm text-fab-text outline-none focus-visible:ring-2 focus-visible:ring-fab-gold/50 disabled:opacity-50 sm:min-h-9 sm:py-1.5";
const action =
  "min-h-11 rounded-lg px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-fab-gold/50";

type Tab = "community" | "personal";

export default function MatchupsPageContent() {
  const params = useSearchParams();
  const { user, isGuest, loading } = useAuth();
  const { matches, isLoaded, error, refreshMatches } = useMatches();
  const [retrying, setRetrying] = useState(false);
  const requestedTab = params.get("scope");
  const tab: Tab =
    requestedTab === "personal" || requestedTab === "community"
      ? requestedTab
      : user || (isGuest && matches.length > 0)
        ? "personal"
        : "community";

  function setTab(scope: Tab) {
    const url = new URL(window.location.href);
    url.searchParams.set("scope", scope);
    window.history.pushState(null, "", url);
  }

  if ((loading && !isGuest) || (isGuest && !isLoaded))
    return (
      <p role="status" className="py-12 text-center text-sm text-fab-muted">
        Loading matchups…
      </p>
    );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5">
        <h1 className="mb-1 text-2xl font-bold text-fab-text">Matchup Matrix</h1>
        <p className="text-sm leading-relaxed text-fab-muted">
          Find a hero pairing, compare your results and see the matches behind the numbers.
        </p>
      </div>
      <div
        role="group"
        aria-label="Matchup data"
        className="mb-5 flex items-center gap-1 border-b border-fab-border pb-3"
      >
        {(["personal", "community"] as const).map((scope) => (
          <button
            key={scope}
            type="button"
            aria-pressed={tab === scope}
            onClick={() => setTab(scope)}
            className={`${action} ${tab === scope ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"}`}
          >
            {scope === "personal" ? "My Matchups" : "Community"}
          </button>
        ))}
      </div>
      {tab === "community" ? (
        <CommunityMatchups />
      ) : user || isGuest ? (
        error ? (
          <div role="alert" className="rounded-lg border border-fab-border p-6 text-center">
            <p className="text-sm text-fab-muted">Your matches could not be loaded. Try again to see your matchups.</p>
            <button
              type="button"
              className={`${action} mt-3 text-fab-gold`}
              disabled={retrying}
              onClick={async () => {
                setRetrying(true);
                try {
                  await refreshMatches();
                } catch {
                  /* The hook retains its recoverable error. */
                } finally {
                  setRetrying(false);
                }
              }}
            >
              {retrying ? "Retrying…" : "Retry"}
            </button>
          </div>
        ) : (
          <MatchupMatrix matches={matches} isLoaded={!!isLoaded} />
        )
      ) : (
        <div className="rounded-lg border border-fab-border px-4 py-12 text-center">
          <h2 className="font-semibold text-fab-text">See your personal matchups</h2>
          <p className="mt-2 text-sm text-fab-muted">
            Sign in to explore your own match history, or browse community results.
          </p>
          <Link href="/login" className={`${action} mt-4 inline-flex items-center bg-fab-gold/15 text-fab-gold`}>
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}

function CommunityMatchups() {
  const [format, setFormat] = useState("");
  const [eventType, setEventType] = useState("");
  const [rated, setRated] = useState<"" | "rated" | "unrated">("");
  const [period, setPeriod] = useState("all");
  const { entries } = useLeaderboard();
  const eventTypes = getAvailableEventTypes(entries);
  const now = new Date();
  const months = Number(period);
  const since =
    period === "all"
      ? undefined
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1)).toISOString().slice(0, 10);
  const until = since ? now.toISOString().slice(0, 10) : undefined;
  const hasFilters = !!(format || eventType || rated || period !== "all");

  return (
    <div className="space-y-4">
      <section
        aria-label="Filter community matchups"
        className="space-y-3 rounded-lg border border-fab-border bg-fab-surface/30 p-3 sm:p-4"
      >
        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 lg:grid-cols-4">
          <MatchFilterSelect
            label="Format"
            value={format}
            onChange={setFormat}
            allLabel="All formats"
            disabled={!!rated}
            options={Object.values(GameFormat).map((value) => ({ value, label: value }))}
          />
          <MatchFilterSelect
            label="Event type"
            value={eventType}
            onChange={setEventType}
            allLabel="All event types"
            disabled={!!rated}
            options={eventTypes.map((value) => ({ value, label: value }))}
          />
          <label className="text-[13px] font-medium text-fab-muted">
            Rating
            <select
              value={rated}
              onChange={(e) => setRated(e.target.value as typeof rated)}
              disabled={!!(format || eventType)}
              aria-describedby={format || eventType || rated ? "community-rating-help" : undefined}
              className={`${control} mt-1 block`}
            >
              <option value="">All ratings</option>
              <option value="rated">Rated</option>
              <option value="unrated">Unrated</option>
            </select>
          </label>
          <label className="text-[13px] font-medium text-fab-muted">
            Period
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className={`${control} mt-1 block`}>
              <option value="all">All time</option>
              <option value="1">This month</option>
              <option value="3">Last 3 months</option>
              <option value="6">Last 6 months</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs leading-relaxed text-fab-muted">
            {since ? `${since} through today. ` : ""}Community results are grouped by calendar month.
          </p>
          {hasFilters && (
            <button
              type="button"
              className={`${action} text-fab-gold hover:bg-fab-gold/10`}
              onClick={() => {
                setFormat("");
                setEventType("");
                setRated("");
                setPeriod("all");
              }}
            >
              Clear community filters
            </button>
          )}
        </div>
        {(format || eventType || rated) && (
          <p id="community-rating-help" className="text-xs leading-relaxed text-fab-muted">
            {rated
              ? "Choose All ratings to filter by format or event type."
              : "Choose All formats and All event types to filter by rating."}{" "}
            Combined rating breakdowns are not available in community data.
          </p>
        )}
      </section>
      <MetaMatchupMatrix
        enableExplorer
        format={format || undefined}
        eventType={eventType || undefined}
        rated={rated || undefined}
        sinceDate={since}
        untilDate={until}
      />
    </div>
  );
}

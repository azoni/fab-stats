"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useSeasons } from "@/hooks/useSeasons";
import { computeMetaStats, getAvailableFormats, getAvailableEventTypes, computeTop8HeroMeta, type HeroMetaStats, type MetaPeriod, type Top8HeroMeta } from "@/lib/meta-stats";
import { getWeekStart, getMonthStart } from "@/lib/leaderboard";
import { getSeasonWeeks } from "@/lib/seasons";
import { getHeroByName } from "@/lib/heroes";
import { HeroImg } from "@/components/heroes/HeroImg";
import { MetaShareModal } from "@/components/meta/MetaShareCard";
import { MetaOverviewShareModal } from "@/components/meta/MetaOverviewShareCard";
import { MetaMatchupMatrix } from "@/components/meta/MetaMatchupMatrix";
import { MiniDonut, DONUT_COLORS } from "@/components/charts/MiniDonut";
import { WinRateRing } from "@/components/charts/WinRateRing";
import { SegmentedBar } from "@/components/charts/SegmentedBar";
import { StatCard } from "@/components/ui/StatCard";
import { FilterToolbar } from "@/components/ui/PageHero";
import { Users, Swords, Shield, Trophy, Grid3X3, CalendarDays } from "lucide-react";

type SortKey = "usage" | "winrate";
type PeriodSelection = MetaPeriod | `season:${string}` | "custom";
const HERO_PAGE_SIZE = 10;

const BASE_PERIOD_TABS: { id: PeriodSelection; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "monthly", label: "Last 30 Days" },
  { id: "weekly", label: "Last 7 Days" },
];

function updateMetaUrl(params: Record<string, string>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) {
    if (v && v !== "all") url.searchParams.set(k, v);
    else url.searchParams.delete(k);
  }
  window.history.replaceState({}, "", url.toString());
}

export default function MetaPage() {
  const { entries, loading } = useLeaderboard(true);
  const { seasons } = useSeasons();
  const searchParams = useSearchParams();

  const [sortBy, setSortBy] = useState<SortKey>("usage");
  const [search, setSearch] = useState("");
  const [filterFormat, setFilterFormat] = useState(searchParams.get("format") || "all");
  const [filterEventType, setFilterEventType] = useState(searchParams.get("eventType") || "all");
  const [periodSelection, setPeriodSelection] = useState<PeriodSelection>(
    (searchParams.get("period") as PeriodSelection) || "weekly"
  );
  const [customStart, setCustomStart] = useState(searchParams.get("from") || "");
  const [customEnd, setCustomEnd] = useState(searchParams.get("to") || "");
  const [heroPage, setHeroPage] = useState(1);
  const [playoffPage, setPlayoffPage] = useState(1);
  const [metaShareOpen, setMetaShareOpen] = useState(false);
  const [overviewShareOpen, setOverviewShareOpen] = useState(false);

  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);

  // URL-synced filter setters
  const setFormatWithUrl = (v: string) => { setFilterFormat(v); updateMetaUrl({ format: v, period: periodSelection, eventType: filterEventType }); };
  const setEventTypeWithUrl = (v: string) => { setFilterEventType(v); updateMetaUrl({ format: filterFormat, period: periodSelection, eventType: v }); };
  const setPeriodWithUrl = (v: PeriodSelection) => {
    setPeriodSelection(v);
    const isSeason = v.startsWith("season:");
    const leavingSeason = periodSelection.startsWith("season:") && !isSeason;
    const season = isSeason ? seasons.find((s) => s.id === v.slice(7)) : null;
    const nextFormat = season?.format || (leavingSeason ? "all" : filterFormat);
    const nextEventType = season?.eventType || (leavingSeason ? "all" : filterEventType);
    setFilterFormat(nextFormat);
    setFilterEventType(nextEventType);
    updateMetaUrl({ format: nextFormat, period: v, eventType: nextEventType });
  };

  // Build dynamic period tabs: base tabs + "Seasons" (if any exist) + "Custom"
  const periodTabs = useMemo(() => {
    const tabs = [...BASE_PERIOD_TABS];
    tabs.push({ id: "custom", label: "Custom" });
    return tabs;
  }, []);

  // Resolve the currently selected season (if any)
  const activeSeason = useMemo(() => {
    if (!periodSelection.startsWith("season:")) return null;
    const id = periodSelection.slice(7);
    return seasons.find((s) => s.id === id) || null;
  }, [periodSelection, seasons]);

  // Effective format/eventType. Seasons set sensible defaults, but the visible
  // filters still control the actual query so mobile users can change them.
  const effectiveFormat = filterFormat !== "all" ? filterFormat : undefined;
  const effectiveEventType = filterEventType !== "all" ? filterEventType : undefined;

  // Always use "all" as the base period — date-range filtering via sinceDate/untilDate
  // is more accurate than the pre-computed weekly/monthly breakdowns on leaderboard entries
  // (those are snapshots from each user's last sync, not the actual current time window).
  const basePeriod: MetaPeriod = "all";

  // Derive date range for Top 8 filtering
  // Season dates are padded ±1 day to account for timezone differences in GEM event dates
  const { sinceDate, untilDate } = useMemo(() => {
    if (activeSeason) {
      const pad = (d: string, days: number) => {
        const dt = new Date(d + "T00:00:00");
        dt.setDate(dt.getDate() + days);
        return dt.toISOString().slice(0, 10);
      };
      return { sinceDate: pad(activeSeason.startDate, -1), untilDate: pad(activeSeason.endDate, 1) };
    }
    if (periodSelection === "custom" && customStart && customEnd) return { sinceDate: customStart, untilDate: customEnd };
    if (periodSelection === "weekly") return { sinceDate: getWeekStart(), untilDate: undefined };
    if (periodSelection === "monthly") return { sinceDate: getMonthStart(), untilDate: undefined };
    return { sinceDate: undefined, untilDate: undefined };
  }, [periodSelection, activeSeason, customStart, customEnd]);

  const allFormats = useMemo(
    () => getAvailableFormats(entries, effectiveEventType, sinceDate, untilDate),
    [entries, effectiveEventType, sinceDate, untilDate],
  );
  const allEventTypes = useMemo(
    () => getAvailableEventTypes(entries, effectiveFormat, sinceDate, untilDate),
    [entries, effectiveFormat, sinceDate, untilDate],
  );
  const formatOptions = useMemo(
    () => filterFormat !== "all" && !allFormats.includes(filterFormat) ? [filterFormat, ...allFormats] : allFormats,
    [allFormats, filterFormat],
  );
  const eventTypeOptions = useMemo(
    () => filterEventType !== "all" && !allEventTypes.includes(filterEventType) ? [filterEventType, ...allEventTypes] : allEventTypes,
    [allEventTypes, filterEventType],
  );

  const { overview, heroStats } = useMemo(
    () => computeMetaStats(
      entries,
      effectiveFormat,
      effectiveEventType,
      basePeriod,
      sinceDate,
      untilDate,
    ),
    [entries, effectiveFormat, effectiveEventType, basePeriod, sinceDate, untilDate],
  );

  // Top 8 heroes — filtered by period/season/custom, format, and event type
  const top8Heroes = useMemo(() => {
    return computeTop8HeroMeta(
      entries,
      effectiveEventType,
      effectiveFormat,
      sinceDate,
      untilDate,
    );
  }, [entries, effectiveEventType, effectiveFormat, sinceDate, untilDate]);

  const sortedHeroes = useMemo(() => {
    let list = [...heroStats];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((h) => h.hero.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "winrate": {
        // Minimum-sample floor: a hero with a single 1-0 community record used to
        // top the win-rate board above a 300-match hero at 60%. Rank heroes with
        // enough games (≥10) above low-sample ones so the top is trustworthy;
        // low-sample heroes still appear, just below the proven decks.
        const MIN_WR_SAMPLE = 10;
        return list.sort((a, b) => {
          const aQ = a.totalMatches >= MIN_WR_SAMPLE;
          const bQ = b.totalMatches >= MIN_WR_SAMPLE;
          if (aQ !== bQ) return aQ ? -1 : 1;
          return b.avgWinRate - a.avgWinRate || b.totalMatches - a.totalMatches;
        });
      }
      default:
        return list.sort((a, b) => b.totalMatches - a.totalMatches);
    }
  }, [heroStats, sortBy, search]);

  // Reset hero page when filters change
  useEffect(() => { setHeroPage(1); setPlayoffPage(1); }, [sortBy, search, filterFormat, filterEventType, periodSelection, customStart, customEnd]);

  const heroTotalPages = Math.max(1, Math.ceil(sortedHeroes.length / HERO_PAGE_SIZE));
  const heroSafePage = Math.min(heroPage, heroTotalPages);
  const heroStartIdx = (heroSafePage - 1) * HERO_PAGE_SIZE;
  const pageHeroes = sortedHeroes.slice(heroStartIdx, heroStartIdx + HERO_PAGE_SIZE);

  // Top hero for the overview card
  const topHero = heroStats.length > 0
    ? [...heroStats].sort((a, b) => b.totalMatches - a.totalMatches)[0]
    : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-20 animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-16 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-fab-border bg-fab-surface/95 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-fab-gold" />
              <h1 className="text-lg font-black text-fab-text sm:text-xl">{activeSeason ? activeSeason.name : "Community Meta"}</h1>
              <span className="rounded bg-fab-gold/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fab-gold">Beta</span>
            </div>
            <p className="mt-1 text-[11px] text-fab-muted sm:text-xs">
              {overview.totalPlayers} public players · {overview.totalMatches.toLocaleString()} matches · {overview.totalHeroes} heroes
            </p>
          </div>
          {(effectiveFormat || effectiveEventType) && (
            <p className="text-xs font-semibold text-fab-gold">
              {[effectiveFormat, effectiveEventType].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </section>

      {/* Period tabs */}
      <div className="flex gap-1 mb-4 flex-wrap items-center">
        {/* Season button first on mobile for visibility */}
        {seasons.length > 0 && (
          <div className="relative sm:hidden">
            <button
              onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                periodSelection.startsWith("season:")
                  ? "bg-fab-gold text-fab-bg"
                  : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
              }`}
            >
              {activeSeason ? activeSeason.name : "Seasons"}
              <svg className={`w-3 h-3 transition-transform ${seasonDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {seasonDropdownOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setSeasonDropdownOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-30 bg-fab-surface border border-fab-border rounded-lg shadow-xl py-1 min-w-[220px] max-h-[300px] overflow-y-auto">
                  {seasons.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setPeriodWithUrl(`season:${s.id}`); setSeasonDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                        periodSelection === `season:${s.id}`
                          ? "bg-fab-gold/15 text-fab-gold font-semibold"
                          : "text-fab-text hover:bg-fab-bg"
                      }`}
                    >
                      <span className="flex-1 truncate">{s.name}</span>
                      {s.active && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-fab-win/15 text-fab-win shrink-0">Live</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {periodTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setPeriodWithUrl(tab.id); setSeasonDropdownOpen(false); }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              periodSelection === tab.id
                ? "bg-fab-gold text-fab-bg"
                : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Seasons dropdown (desktop — mobile version is above) */}
        {seasons.length > 0 && (
          <div className="relative hidden sm:block">
            <button
              onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                periodSelection.startsWith("season:")
                  ? "bg-fab-gold text-fab-bg"
                  : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
              }`}
            >
              {activeSeason ? activeSeason.name : "Seasons"}
              <svg className={`w-3 h-3 transition-transform ${seasonDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {seasonDropdownOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setSeasonDropdownOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-30 bg-fab-surface border border-fab-border rounded-lg shadow-xl py-1 min-w-[220px] max-h-[300px] overflow-y-auto">
                  {seasons.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setPeriodWithUrl(`season:${s.id}`); setSeasonDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                        periodSelection === `season:${s.id}`
                          ? "bg-fab-gold/15 text-fab-gold font-semibold"
                          : "text-fab-text hover:bg-fab-bg"
                      }`}
                    >
                      <span className="flex-1 truncate">{s.name}</span>
                      {s.active && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-fab-win/15 text-fab-win shrink-0">Live</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Custom date range picker */}
      {periodSelection === "custom" && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <label className="text-xs text-fab-dim">From</label>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
          />
          <label className="text-xs text-fab-dim">To</label>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
          />
          {customStart && customEnd && (
            <span className="text-[10px] text-fab-dim">Top 8s filtered to this date range</span>
          )}
        </div>
      )}

      {/* Season info bar */}
      {activeSeason && (() => {
        const weeks = getSeasonWeeks(activeSeason);
        return (
          <div className="mb-4 bg-fab-surface border border-fab-border rounded-lg px-4 py-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-fab-text">{activeSeason.name}</span>
              <span className="text-[10px] text-fab-dim">{activeSeason.startDate} — {activeSeason.endDate}</span>
              <span className="text-[10px] text-fab-dim">·</span>
              <span className="text-[10px] text-fab-dim">{activeSeason.eventType} · {activeSeason.format === "Classic Constructed" ? "CC" : activeSeason.format}</span>
              {weeks.length > 1 && (
                <>
                  <span className="text-[10px] text-fab-dim">·</span>
                  <span className="text-[10px] text-fab-dim">{weeks.length} weeks</span>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {(formatOptions.length > 0 || eventTypeOptions.length > 0 || filterFormat !== "all" || filterEventType !== "all") && (
        <FilterToolbar className="mb-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-fab-dim">Filters</span>
          <div className="grid w-full grid-cols-2 gap-2 sm:hidden">
            <select
              value={filterFormat}
              onChange={(e) => setFormatWithUrl(e.target.value)}
              className="min-w-0 rounded-lg border border-fab-border bg-fab-bg px-2.5 py-2 text-xs font-bold text-fab-text focus:border-fab-gold/50 focus:outline-none"
            >
              <option value="all">All Formats</option>
              {formatOptions.map((f) => (
                <option key={f} value={f}>{f === "Classic Constructed" ? "CC" : f}</option>
              ))}
            </select>
            <select
              value={filterEventType}
              onChange={(e) => setEventTypeWithUrl(e.target.value)}
              className="min-w-0 rounded-lg border border-fab-border bg-fab-bg px-2.5 py-2 text-xs font-bold text-fab-text focus:border-fab-gold/50 focus:outline-none"
            >
              <option value="all">All Events</option>
              {eventTypeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {formatOptions.length > 0 && (
            <div className="hidden gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border sm:flex">
              <button
                onClick={() => setFormatWithUrl("all")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  filterFormat === "all" ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
                }`}
              >
                All Formats
              </button>
              {formatOptions.map((f) => (
                <button
                  key={f}
                  onClick={() => setFormatWithUrl(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    filterFormat === f ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
                  }`}
                >
                  {f === "Classic Constructed" ? "CC" : f}
                </button>
              ))}
            </div>
          )}
          {eventTypeOptions.length > 0 && (
            <div className="hidden gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border overflow-x-auto scrollbar-hide sm:flex">
              <button
                onClick={() => setEventTypeWithUrl("all")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  filterEventType === "all" ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
                }`}
              >
                All Events
              </button>
              {eventTypeOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => setEventTypeWithUrl(t)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    filterEventType === t ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </FilterToolbar>
      )}

      {/* Community Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Players" value={overview.totalPlayers} icon={<Users className="w-3.5 h-3.5" />} />
        <StatCard label="Total Matches" value={overview.totalMatches.toLocaleString()} icon={<Swords className="w-3.5 h-3.5" />} />
        <StatCard label="Total Events" value={overview.totalEvents} icon={<CalendarDays className="w-3.5 h-3.5" />} />
        <StatCard label="Heroes Played" value={overview.totalHeroes} icon={<Shield className="w-3.5 h-3.5" />} />
        {/* Custom Most Played tile — hero portrait + truncated single-line
            name so long heroes like "Ira, Crimson Haze" don't wrap to three
            lines like they did with the StatCard's text-lg value slot. */}
        <div className="fab-card bg-fab-surface/95 border border-fab-border rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-3.5 h-3.5 text-fab-dim" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fab-muted">Most Played</p>
          </div>
          {topHero ? (
            <div className="flex items-center gap-2.5">
              <HeroImg name={topHero.hero} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-fab-text truncate" title={topHero.hero}>{topHero.hero}</p>
                <p className="text-[10px] text-fab-dim tabular-nums">{topHero.uniqueEvents} events · {topHero.metaShare.toFixed(0)}%</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-fab-dim">—</p>
          )}
        </div>
      </div>

      {/* Overview share modal */}
      {overviewShareOpen && heroStats.length > 0 && (
        <MetaOverviewShareModal
          overview={overview}
          heroStats={heroStats}
          title={activeSeason ? activeSeason.name : periodSelection === "weekly" ? "This Week's Meta" : periodSelection === "monthly" ? "This Month's Meta" : "Community Meta — All Time"}
          subtitle={activeSeason ? `${activeSeason.format} · ${activeSeason.eventType}` : effectiveFormat || effectiveEventType ? [effectiveFormat, effectiveEventType].filter(Boolean).join(" · ") : undefined}
          onClose={() => setOverviewShareOpen(false)}
        />
      )}

      {/* Meta share modal */}
      {metaShareOpen && top8Heroes.length > 0 && (
        <MetaShareModal
          heroes={top8Heroes}
          title={activeSeason ? `${activeSeason.name} Top 8s` : periodSelection === "weekly" ? "This Week's Top 8s" : periodSelection === "monthly" ? "This Month's Top 8s" : "Top 8 Heroes — All Time"}
          subtitle={activeSeason ? `${activeSeason.format} · ${activeSeason.eventType}` : effectiveFormat || effectiveEventType ? [effectiveFormat, effectiveEventType].filter(Boolean).join(" · ") : undefined}
          onClose={() => setMetaShareOpen(false)}
        />
      )}

      {/* Hero Distribution + Top 8 Heroes — side by side on desktop */}
      {(heroStats.length >= 3 || top8Heroes.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Hero Distribution Donut */}
          {heroStats.length >= 3 && (
            <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-fab-text">Hero Meta Distribution</h2>
                <button
                  onClick={() => setOverviewShareOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-fab-bg border border-fab-border text-fab-dim hover:text-fab-text hover:border-fab-muted transition-colors"
                  title="Share meta overview" aria-label="Share meta overview"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                  <span className="text-[10px] font-semibold">Share</span>
                </button>
              </div>
              <div className="flex flex-col items-center gap-4">
                <MiniDonut
                  segments={heroStats.slice(0, 10).map((h, i) => ({
                    value: h.metaShare,
                    color: DONUT_COLORS[i % DONUT_COLORS.length],
                    label: h.hero,
                  }))}
                  size={140}
                  strokeWidth={20}
                  centerLabel={
                    <span className="flex flex-col items-center">
                      <span className="text-lg font-bold text-fab-text">{overview.totalPlayers}</span>
                      <span className="text-[9px] text-fab-dim uppercase tracking-wider">Players</span>
                    </span>
                  }
                />
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full">
                  {heroStats.slice(0, 10).map((h, i) => (
                    <div key={h.hero} className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="text-xs text-fab-text truncate flex-1">{h.hero}</span>
                      <span className="text-[10px] text-fab-muted tabular-nums shrink-0">{h.metaShare.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top 8 Heroes */}
          {top8Heroes.length > 0 && (() => {
            const pTotalPages = Math.max(1, Math.ceil(top8Heroes.length / 10));
            const pSafePage = Math.min(playoffPage, pTotalPages);
            const pStart = (pSafePage - 1) * 10;
            const pSlice = top8Heroes.slice(pStart, pStart + 10);
            return (
              <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-fab-border/50">
                  <h2 className="text-sm font-semibold text-fab-text">Top 8 Heroes</h2>
                  <button
                    onClick={() => setMetaShareOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-fab-bg border border-fab-border text-fab-dim hover:text-fab-text hover:border-fab-muted transition-colors"
                    title="Share meta breakdown" aria-label="Share meta breakdown"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                    <span className="text-[10px] font-semibold">Share</span>
                  </button>
                  {top8Heroes.length > 10 && (
                    <span className="text-[10px] text-fab-dim ml-auto">{top8Heroes.length} heroes</span>
                  )}
                </div>
                <div className="flex-1">
                  {pSlice.map((t8, i) => {
                    const globalIdx = pStart + i;
                    return (
                      <div key={t8.hero} className={`flex items-center gap-2.5 px-4 py-2 ${i > 0 ? "border-t border-fab-border/50" : ""}`}>
                        <span className={`text-xs font-bold w-4 text-center shrink-0 ${globalIdx === 0 ? "text-amber-400" : globalIdx < 3 ? "text-fab-text" : "text-fab-dim"}`}>
                          {globalIdx + 1}
                        </span>
                        <HeroImg name={t8.hero} size="sm" />
                        <span className={`text-sm font-medium flex-1 truncate ${globalIdx === 0 ? "text-amber-400" : "text-fab-text"}`}>
                          {t8.hero}
                        </span>
                        <span className="text-[10px] text-fab-dim shrink-0">
                          {t8.count} top 8{t8.count !== 1 ? "s" : ""}
                        </span>
                        {t8.champions > 0 && (
                          <span className="text-[10px] font-semibold text-fab-gold shrink-0">
                            {t8.champions}W
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {pTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 px-4 py-2 border-t border-fab-border/50">
                    <button
                      onClick={() => setPlayoffPage((p) => Math.max(1, p - 1))}
                      disabled={pSafePage <= 1}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-fab-dim">
                      {pSafePage}/{pTotalPages}
                    </span>
                    <button
                      onClick={() => setPlayoffPage((p) => Math.min(pTotalPages, p + 1))}
                      disabled={pSafePage >= pTotalPages}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Season/custom disclaimer for hero win-rate data */}
      {(activeSeason || (periodSelection === "custom" && customStart && customEnd)) && (
        <p className="text-[10px] text-fab-dim mb-3 italic">
          Top 8 data and hero win rates are filtered to the selected dates when imported event dates are available.
        </p>
      )}

      {/* Filters + Sort + Search */}
      <FilterToolbar className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search heroes..."
          className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm placeholder:text-fab-dim focus:outline-none focus:border-fab-gold w-40"
        />

        {/* Sort toggle */}
        <div className="flex gap-1 ml-auto">
          {([
            { id: "usage", label: "Most Played" },
            { id: "winrate", label: "Best Win Rate" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSortBy(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sortBy === tab.id
                  ? "bg-fab-gold/15 text-fab-gold"
                  : "bg-fab-surface text-fab-muted hover:text-fab-text"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </FilterToolbar>

      {/* Hero List */}
      {sortedHeroes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-fab-muted">No hero data available yet.</p>
          <p className="text-fab-dim text-sm mt-1">
            {basePeriod !== "all"
              ? "No data for this time period. Players need to re-import matches for weekly/monthly stats."
              : effectiveFormat || effectiveEventType
                ? "No data for the selected filters. Players need to re-import matches for filtered stats."
                : "Players need to import matches for meta data to appear."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-fab-dim mb-2">
            Showing {heroStartIdx + 1}-{Math.min(heroStartIdx + HERO_PAGE_SIZE, sortedHeroes.length)} of {sortedHeroes.length} heroes
          </p>
          <div className="space-y-2">
            {pageHeroes.map((hero, i) => (
              <HeroMetaRow key={hero.hero} hero={hero} index={heroStartIdx + i} />
            ))}
          </div>
          {heroTotalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => setHeroPage((p) => Math.max(1, p - 1))}
                disabled={heroSafePage <= 1}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-fab-dim">
                Page {heroSafePage} of {heroTotalPages}
              </span>
              <button
                onClick={() => setHeroPage((p) => Math.min(heroTotalPages, p + 1))}
                disabled={heroSafePage >= heroTotalPages}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Community Matchup Matrix */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-1">
          <Grid3X3 className="w-4 h-4 text-fab-muted" />
          <h2 className="text-sm font-semibold text-fab-text">Community Matchup Matrix</h2>
        </div>
        <p className="text-[10px] text-fab-dim mb-3">
          Win rates from linked matches across the community
          {activeSeason ? ` · ${activeSeason.name}` : ""}
          {effectiveFormat ? ` · ${effectiveFormat === "Classic Constructed" ? "CC" : effectiveFormat}` : ""}
        </p>
        <MetaMatchupMatrix
          format={effectiveFormat}
          eventType={effectiveEventType}
          sinceDate={sinceDate}
          untilDate={untilDate}
        />
      </div>
    </div>
  );
}

function HeroMetaRow({ hero, index }: { hero: HeroMetaStats; index: number }) {
  const heroInfo = getHeroByName(hero.hero);
  const heroClass = heroInfo?.classes[0];

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg px-4 py-3 flex items-center gap-3">
      {/* Rank */}
      <span className="text-sm font-bold w-6 text-center shrink-0 text-fab-dim">
        {index + 1}
      </span>

      {/* Hero Icon */}
      <HeroImg name={hero.hero} size="lg" />

      {/* Name + class + meta share bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="font-semibold text-fab-text truncate">{hero.hero}</p>
          {heroClass && (
            <span className="text-[10px] text-fab-dim shrink-0">{heroClass}</span>
          )}
        </div>
        <SegmentedBar
          segments={[
            { value: hero.metaShare, color: "var(--color-fab-gold)" },
            { value: Math.max(100 - hero.metaShare, 0), color: "var(--color-fab-bg)" },
          ]}
          height="md"
          className="mt-1"
        />
        <span className="text-[10px] text-fab-dim mt-0.5 block">
          {hero.uniqueEvents} event{hero.uniqueEvents !== 1 ? "s" : ""} · {hero.metaShare.toFixed(1)}% of meta
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-semibold text-fab-text">{hero.uniqueEvents}</p>
          <p className="text-[10px] text-fab-dim">events</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-fab-text">{hero.playerCount}</p>
          <p className="text-[10px] text-fab-dim">players</p>
        </div>
        <WinRateRing value={hero.avgWinRate} size={36} strokeWidth={3.5} />
      </div>
    </div>
  );
}

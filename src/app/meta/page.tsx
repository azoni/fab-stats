"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useSeasons } from "@/hooks/useSeasons";
import { computeMetaStats, getAvailableFormats, getAvailableEventTypes, computeTop8HeroMeta, type HeroMetaStats, type MetaPeriod, type Top8HeroMeta } from "@/lib/meta-stats";
import { getWeekStart, getMonthStart } from "@/lib/leaderboard";
import { getSeasonWeeks } from "@/lib/seasons";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import { MetaShareModal } from "@/components/meta/MetaShareCard";
import { MetaOverviewShareModal } from "@/components/meta/MetaOverviewShareCard";
import { MetaMatchupMatrix } from "@/components/meta/MetaMatchupMatrix";
import { MiniDonut, DONUT_COLORS } from "@/components/charts/MiniDonut";
import { WinRateRing } from "@/components/charts/WinRateRing";
import { SegmentedBar } from "@/components/charts/SegmentedBar";
import { StatCard } from "@/components/ui/StatCard";
import { Users, Swords, Shield, Trophy, Grid3X3 } from "lucide-react";

type SortKey = "usage" | "winrate";
type PeriodSelection = MetaPeriod | `season:${string}` | "custom";
const HERO_PAGE_SIZE = 20;

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
    (searchParams.get("period") as PeriodSelection) || "all"
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
  const setPeriodWithUrl = (v: PeriodSelection) => { setPeriodSelection(v); updateMetaUrl({ format: filterFormat, period: v, eventType: filterEventType }); };

  // Default to most recent season when seasons load (only if no URL period param)
  useEffect(() => {
    if (seasons.length > 0 && periodSelection === "all" && !searchParams.get("period")) {
      const sorted = [...seasons].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
      const seasonId = `season:${sorted[0].id}` as PeriodSelection;
      setPeriodSelection(seasonId);
      updateMetaUrl({ period: seasonId });
    }
  }, [seasons]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Effective format/eventType (season overrides manual filter)
  const effectiveFormat = activeSeason ? activeSeason.format : filterFormat !== "all" ? filterFormat : undefined;
  const effectiveEventType = activeSeason ? activeSeason.eventType : filterEventType !== "all" ? filterEventType : undefined;

  // Derive the MetaPeriod for computeMetaStats (seasons/custom use "all" base)
  const basePeriod: MetaPeriod = periodSelection === "weekly" ? "weekly" : periodSelection === "monthly" ? "monthly" : "all";

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

  const allFormats = useMemo(() => getAvailableFormats(entries), [entries]);
  const allEventTypes = useMemo(() => getAvailableEventTypes(entries), [entries]);

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
      case "winrate":
        return list.sort((a, b) => b.avgWinRate - a.avgWinRate || b.totalMatches - a.totalMatches);
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
    <div>
      <div className="flex items-center gap-3 mb-6 relative overflow-hidden">
        <img src="/assets/icons/globe.png" alt="" className="absolute right-0 top-1/2 -translate-y-1/2 w-20 h-20 object-contain opacity-[0.12] pointer-events-none" />
        <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center ring-1 ring-inset ring-teal-500/20">
          <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-fab-text leading-tight">Community Meta</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-fab-gold/15 text-fab-gold">Beta</span>
            </div>
            <p className="text-xs text-fab-muted leading-tight">
              {overview.totalPlayers} public players{basePeriod !== "all" && " · recent imports only"}
              {activeSeason && ` · ${activeSeason.format}`}
            </p>
          </div>
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 mb-4 flex-wrap items-center">
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

        {/* Seasons dropdown */}
        {seasons.length > 0 && (
          <div className="relative">
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

      {/* Community Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Players" value={overview.totalPlayers} icon={<Users className="w-3.5 h-3.5" />} />
        <StatCard label="Total Matches" value={overview.totalMatches.toLocaleString()} icon={<Swords className="w-3.5 h-3.5" />} />
        <StatCard label="Heroes Played" value={overview.totalHeroes} icon={<Shield className="w-3.5 h-3.5" />} />
        <StatCard
          label="Most Played"
          value={topHero?.hero || "—"}
          sub={topHero ? `${topHero.metaShare.toFixed(1)}% of matches` : undefined}
          icon={<Trophy className="w-3.5 h-3.5" />}
          chart={topHero ? (
            <MiniDonut
              segments={[
                { value: topHero.metaShare, color: "var(--color-fab-gold)" },
                { value: 100 - topHero.metaShare, color: "var(--color-fab-border)" },
              ]}
              size={36}
              strokeWidth={5}
            />
          ) : undefined}
        />
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

      {/* Hero Distribution Donut */}
      {heroStats.length >= 3 && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
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
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <MiniDonut
              segments={heroStats.slice(0, 10).map((h, i) => ({
                value: h.metaShare,
                color: DONUT_COLORS[i % DONUT_COLORS.length],
                label: h.hero,
              }))}
              size={160}
              strokeWidth={22}
              centerLabel={
                <span className="flex flex-col items-center">
                  <span className="text-xl font-bold text-fab-text">{overview.totalPlayers}</span>
                  <span className="text-[9px] text-fab-dim uppercase tracking-wider">Players</span>
                </span>
              }
            />
            <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1.5 w-full">
              {heroStats.slice(0, 10).map((h, i) => (
                <div key={h.hero} className="flex items-center gap-1.5 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-xs text-fab-text truncate flex-1">{h.hero}</span>
                  <span className="text-[10px] text-fab-muted tabular-nums shrink-0">{h.uniqueEvents}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Meta share modal */}
      {metaShareOpen && top8Heroes.length > 0 && (
        <MetaShareModal
          heroes={top8Heroes}
          title={activeSeason ? `${activeSeason.name} Top 8s` : periodSelection === "weekly" ? "This Week's Top 8s" : periodSelection === "monthly" ? "This Month's Top 8s" : "Playoff Heroes — All Time"}
          subtitle={activeSeason ? `${activeSeason.format} · ${activeSeason.eventType}` : effectiveFormat || effectiveEventType ? [effectiveFormat, effectiveEventType].filter(Boolean).join(" · ") : undefined}
          onClose={() => setMetaShareOpen(false)}
        />
      )}

      {/* Playoff Heroes — which heroes are making top 8s */}
      {top8Heroes.length > 0 && (() => {
        const pTotalPages = Math.max(1, Math.ceil(top8Heroes.length / 10));
        const pSafePage = Math.min(playoffPage, pTotalPages);
        const pStart = (pSafePage - 1) * 10;
        const pSlice = top8Heroes.slice(pStart, pStart + 10);
        return (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-sm font-semibold text-fab-text">
                Playoff Heroes
              </h2>
              <button
                onClick={() => setMetaShareOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-fab-surface border border-fab-border text-fab-dim hover:text-fab-text hover:border-fab-muted transition-colors"
                title="Share meta breakdown" aria-label="Share meta breakdown"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                <span className="text-[10px] font-semibold">Share</span>
              </button>
            </div>
            <p className="text-[10px] text-fab-dim mb-3">
              Heroes making top 8s{periodSelection === "weekly" ? " (last 7 days)" : periodSelection === "monthly" ? " (last 30 days)" : activeSeason ? ` (${activeSeason.name})` : periodSelection === "custom" && sinceDate && untilDate ? ` (${sinceDate} — ${untilDate})` : ""}
              {top8Heroes.length > 10 && ` \u00b7 ${top8Heroes.length} heroes`}
            </p>
            <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
              {pSlice.map((t8, i) => {
                const globalIdx = pStart + i;
                const heroInfo = getHeroByName(t8.hero);
                const heroClass = heroInfo?.classes[0];
                return (
                  <div key={t8.hero} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-fab-border" : ""}`}>
                    <span className={`text-xs font-bold w-5 text-center shrink-0 ${globalIdx === 0 ? "text-amber-400" : globalIdx < 3 ? "text-fab-text" : "text-fab-dim"}`}>
                      {globalIdx + 1}
                    </span>
                    <HeroClassIcon heroClass={heroClass} size="sm" />
                    <span className={`text-sm font-medium flex-1 truncate ${globalIdx === 0 ? "text-amber-400" : "text-fab-text"}`}>
                      {t8.hero}
                    </span>
                    <span className="text-xs text-fab-dim shrink-0">
                      {t8.count} top 8{t8.count !== 1 ? "s" : ""}
                    </span>
                    {t8.champions > 0 && (
                      <span className="text-xs font-semibold text-fab-gold shrink-0">
                        {t8.champions} win{t8.champions !== 1 ? "s" : ""}
                      </span>
                    )}
                    {t8.finalists > 0 && (
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {t8.finalists} final{t8.finalists !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {pTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-3">
                <button
                  onClick={() => setPlayoffPage((p) => Math.max(1, p - 1))}
                  disabled={pSafePage <= 1}
                  className="px-3 py-1.5 rounded-md text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-fab-dim">
                  Page {pSafePage} of {pTotalPages}
                </span>
                <button
                  onClick={() => setPlayoffPage((p) => Math.min(pTotalPages, p + 1))}
                  disabled={pSafePage >= pTotalPages}
                  className="px-3 py-1.5 rounded-md text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Season/custom disclaimer for hero win-rate data */}
      {(activeSeason || (periodSelection === "custom" && customStart && customEnd)) && (
        <p className="text-[10px] text-fab-dim mb-3 italic">
          Top 8 data is filtered to the selected date range. Hero win rates below are based on all-time data.
        </p>
      )}

      {/* Filters + Sort + Search */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search heroes..."
          className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm placeholder:text-fab-dim focus:outline-none focus:border-fab-gold w-40"
        />

        {/* Format pills (hidden when season auto-sets format) */}
        {allFormats.length > 1 && !activeSeason && (
          <div className="flex gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border">
            <button
              onClick={() => setFormatWithUrl("all")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                filterFormat === "all" ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
              }`}
            >
              All
            </button>
            {allFormats.map((f) => (
              <button
                key={f}
                onClick={() => setFormatWithUrl(f)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                  filterFormat === f ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
                }`}
              >
                {f === "Classic Constructed" ? "CC" : f}
              </button>
            ))}
          </div>
        )}

        {/* Event type pills (hidden when season auto-sets event type) */}
        {allEventTypes.length > 1 && !activeSeason && (
          <div className="flex gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setEventTypeWithUrl("all")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                filterEventType === "all" ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
              }`}
            >
              All
            </button>
            {allEventTypes.map((t) => (
              <button
                key={t}
                onClick={() => setEventTypeWithUrl(t)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                  filterEventType === t ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

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
      </div>

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
      <HeroClassIcon heroClass={heroClass} size="lg" />

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
          {hero.metaShare.toFixed(1)}% meta share
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-semibold text-fab-text">{hero.totalMatches.toLocaleString()}</p>
          <p className="text-[10px] text-fab-dim">matches</p>
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

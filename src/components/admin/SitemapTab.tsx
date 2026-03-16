"use client";
import { useState, useRef, useCallback } from "react";
import {
  fetchSitemapUrls,
  fetchDecklist,
  saveDecklists,
  getScrapedSlugs,
  searchDecklists,
  getScrapeStatus,
  updateScrapeStatus,
  getAllDecklistSummaries,
  computeHeroMeta,
  computeEventSummaries,
  clearAllDecklists,
  fetchTournamentUrls,
  discoverCoverage,
  fetchCoverageRounds,
  fetchCoverageResults,
  saveCoverageMatches,
  saveCoverageEvent,
  getScrapedCoverageEvents,
  getAllCoverageMatches,
  clearCoverageData,
  computeCoverageMatchups,
  rebuildMatchupSummaries,
  type SitemapDecklist,
  type DecklistSummary,
  type HeroMetaStat,
  type EventSummary,
  type CoverageMatch,
  type CoverageEvent,
  type HeroMatchupStat,
} from "@/lib/sitemap-scraper";

export default function SitemapTab() {
  // Scrape state
  const [urls, setUrls] = useState<string[]>([]);
  const [scrapedSlugs, setScrapedSlugs] = useState<Set<string>>(new Set());
  const [scraping, setScraping] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState(0);
  const [scrapeTotal, setScrapeTotal] = useState(0);
  const [currentUrl, setCurrentUrl] = useState("");
  const [scrapeErrors, setScrapeErrors] = useState<string[]>([]);
  const [fetchingUrls, setFetchingUrls] = useState(false);
  const abortRef = useRef(false);

  // Search state
  const [searchHero, setSearchHero] = useState("");
  const [searchPlayer, setSearchPlayer] = useState("");
  const [searchEvent, setSearchEvent] = useState("");
  const [results, setResults] = useState<SitemapDecklist[]>([]);
  const [searching, setSearching] = useState(false);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [lastSlug, setLastSlug] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  // Stats
  const [statusMsg, setStatusMsg] = useState("");

  // Coverage scrape state
  const [coverageScraping, setCoverageScraping] = useState(false);
  const [coverageProgress, setCoverageProgress] = useState("");
  const [coverageEvents, setCoverageEvents] = useState<CoverageEvent[]>([]);
  const coverageAbortRef = useRef(false);

  // Coverage analytics state
  const [coverageMatches, setCoverageMatches] = useState<CoverageMatch[]>([]);
  const [matchupStats, setMatchupStats] = useState<HeroMatchupStat[]>([]);
  const [coverageLoaded, setCoverageLoaded] = useState(false);
  const [loadingCoverage, setLoadingCoverage] = useState(false);
  const [matchupEventFilter, setMatchupEventFilter] = useState("");
  const [matchupFormatFilter, setMatchupFormatFilter] = useState("");

  // Analytics state
  const [allDecklists, setAllDecklists] = useState<DecklistSummary[]>([]);
  const [heroStats, setHeroStats] = useState<HeroMetaStat[]>([]);
  const [eventSummaries, setEventSummaries] = useState<EventSummary[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  // ── Fetch Sitemap URLs ──

  const handleFetchUrls = useCallback(async () => {
    setFetchingUrls(true);
    setStatusMsg("");
    try {
      const [fetchedUrls, slugs] = await Promise.all([
        fetchSitemapUrls(),
        getScrapedSlugs(),
      ]);
      setUrls(fetchedUrls);
      setScrapedSlugs(slugs);
      const remaining = fetchedUrls.filter((u) => {
        const slug = u.match(/\/decklists\/([^/]+)\/?$/)?.[1];
        return slug && !slugs.has(slug);
      });
      setStatusMsg(
        `Found ${fetchedUrls.length} decklist URLs. ${slugs.size} already scraped. ${remaining.length} remaining.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch URLs";
      setStatusMsg(`Error: ${msg}`);
    } finally {
      setFetchingUrls(false);
    }
  }, []);

  // ── Scrape Decklists ──

  const handleStartScrape = useCallback(async () => {
    if (urls.length === 0) return;
    abortRef.current = false;
    setScraping(true);
    setScrapeErrors([]);

    // Filter to unscrapped URLs
    const remaining = urls.filter((u) => {
      const slug = u.match(/\/decklists\/([^/]+)\/?$/)?.[1];
      return slug && !scrapedSlugs.has(slug);
    });

    setScrapeTotal(remaining.length);
    setScrapeProgress(0);

    const batch: Omit<SitemapDecklist, "playerLower" | "scrapedAt">[] = [];
    let processed = 0;

    for (const url of remaining) {
      if (abortRef.current) break;

      setCurrentUrl(url);

      try {
        const decklist = await fetchDecklist(url);
        batch.push(decklist);

        // Save in batches of 20
        if (batch.length >= 20) {
          await saveDecklists([...batch]);
          // Track the new slugs locally
          for (const dl of batch) {
            scrapedSlugs.add(dl.slug);
          }
          batch.length = 0;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setScrapeErrors((prev) => [...prev.slice(-19), `${url}: ${msg}`]);
      }

      processed++;
      setScrapeProgress(processed);

      // 500ms delay between requests
      if (!abortRef.current) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Save any remaining in batch
    if (batch.length > 0) {
      try {
        await saveDecklists([...batch]);
        for (const dl of batch) {
          scrapedSlugs.add(dl.slug);
        }
      } catch {
        // ignore final batch error
      }
    }

    // Update metadata
    try {
      await updateScrapeStatus({
        totalUrls: urls.length,
        scrapedCount: scrapedSlugs.size,
        lastScrapeAt: new Date().toISOString(),
      });
    } catch {
      // ignore
    }

    setScraping(false);
    setCurrentUrl("");
    setStatusMsg(
      abortRef.current
        ? `Stopped. Scraped ${processed} of ${remaining.length}.`
        : `Done! Scraped ${processed} decklists.`
    );
  }, [urls, scrapedSlugs]);

  const handleStop = useCallback(() => {
    abortRef.current = true;
  }, []);

  // ── Search ──

  const handleSearch = useCallback(
    async (append = false) => {
      setSearching(true);
      try {
        const pageSize = 50;
        const data = await searchDecklists({
          hero: searchHero || undefined,
          player: searchPlayer || undefined,
          event: searchEvent || undefined,
          pageSize,
          lastSlug: append ? lastSlug : undefined,
        });
        if (append) {
          setResults((prev) => [...prev, ...data]);
        } else {
          setResults(data);
        }
        setHasMore(data.length === pageSize);
        if (data.length > 0) {
          setLastSlug(data[data.length - 1].slug);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Search failed";
        setStatusMsg(`Search error: ${msg}`);
      } finally {
        setSearching(false);
      }
    },
    [searchHero, searchPlayer, searchEvent, lastSlug]
  );

  // ── Analytics ──

  const handleLoadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const data = await getAllDecklistSummaries();
      setAllDecklists(data);
      setHeroStats(computeHeroMeta(data));
      setEventSummaries(computeEventSummaries(data));
      setAnalyticsLoaded(true);
      setSelectedEvent("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load analytics";
      setStatusMsg(`Analytics error: ${msg}`);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  const handleEventFilter = useCallback(
    (event: string) => {
      setSelectedEvent(event);
      if (event) {
        setHeroStats(computeHeroMeta(allDecklists, event));
      } else {
        setHeroStats(computeHeroMeta(allDecklists));
      }
    },
    [allDecklists]
  );

  // ── Coverage Scraping ──

  const handleScrapeCoverage = useCallback(async () => {
    coverageAbortRef.current = false;
    setCoverageScraping(true);
    setCoverageProgress("Fetching tournament URLs...");

    try {
      const tournamentUrls = await fetchTournamentUrls();
      setCoverageProgress(`Found ${tournamentUrls.length} tournaments. Checking for coverage...`);

      const scrapedEvents = await getScrapedCoverageEvents();
      const scrapedSlugs = new Set(scrapedEvents.map((e) => e.slug));
      setCoverageEvents(scrapedEvents);

      let eventsProcessed = 0;
      let totalMatches = 0;

      for (const tUrl of tournamentUrls) {
        if (coverageAbortRef.current) break;

        const slug = tUrl.replace(/\/$/, "").split("/").pop() || "";
        if (scrapedSlugs.has(slug)) {
          eventsProcessed++;
          continue;
        }

        setCoverageProgress(`[${eventsProcessed + 1}/${tournamentUrls.length}] Checking ${slug}...`);

        try {
          const discovery = await discoverCoverage(tUrl);
          if (!discovery) {
            eventsProcessed++;
            await new Promise((r) => setTimeout(r, 300));
            continue;
          }

          setCoverageProgress(`[${eventsProcessed + 1}/${tournamentUrls.length}] Found coverage for ${discovery.tournamentName}. Getting rounds...`);
          await new Promise((r) => setTimeout(r, 300));

          const roundInfo = await fetchCoverageRounds(discovery.coverageUrl);

          if (roundInfo.resultUrls.length === 0) {
            eventsProcessed++;
            continue;
          }

          setCoverageProgress(`[${eventsProcessed + 1}/${tournamentUrls.length}] ${discovery.tournamentName}: scraping ${roundInfo.resultUrls.length} rounds...`);

          const allMatches: CoverageMatch[] = [];

          for (const resultUrl of roundInfo.resultUrls) {
            if (coverageAbortRef.current) break;

            try {
              const parsed = await fetchCoverageResults(resultUrl);
              for (const m of parsed) {
                allMatches.push({
                  ...m,
                  event: roundInfo.eventName || discovery.tournamentName,
                  coverageUrl: discovery.coverageUrl,
                  eventDate: discovery.eventDate || "",
                  format: roundInfo.format || "",
                });
              }
            } catch {
              // skip failed round
            }

            await new Promise((r) => setTimeout(r, 500));
          }

          if (allMatches.length > 0) {
            await saveCoverageMatches(allMatches);
            await saveCoverageEvent({
              slug,
              coverageUrl: discovery.coverageUrl,
              tournamentUrl: tUrl,
              eventName: roundInfo.eventName || discovery.tournamentName,
              eventDate: discovery.eventDate || "",
              format: roundInfo.format || "",
              roundCount: roundInfo.resultUrls.length,
              matchCount: allMatches.length,
              scrapedAt: new Date().toISOString(),
            });
            totalMatches += allMatches.length;
            scrapedSlugs.add(slug);
          }
        } catch {
          // skip failed tournament
        }

        eventsProcessed++;
        await new Promise((r) => setTimeout(r, 300));
      }

      setCoverageProgress(
        coverageAbortRef.current
          ? `Stopped. Processed ${eventsProcessed} tournaments, ${totalMatches} new matches.`
          : `Done! Processed ${eventsProcessed} tournaments, ${totalMatches} new matches.`
      );

      const updated = await getScrapedCoverageEvents();
      setCoverageEvents(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Coverage scrape failed";
      setCoverageProgress(`Error: ${msg}`);
    } finally {
      setCoverageScraping(false);
    }
  }, []);

  const handleLoadCoverage = useCallback(async () => {
    setLoadingCoverage(true);
    try {
      const [matches, events] = await Promise.all([
        getAllCoverageMatches(),
        getScrapedCoverageEvents(),
      ]);
      setCoverageMatches(matches);
      setCoverageEvents(events);
      setMatchupStats(computeCoverageMatchups(matches));
      setCoverageLoaded(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load coverage data";
      setCoverageProgress(`Error: ${msg}`);
    } finally {
      setLoadingCoverage(false);
    }
  }, []);

  const handleMatchupFilter = useCallback(
    (event: string, format: string) => {
      setMatchupEventFilter(event);
      setMatchupFormatFilter(format);
      setMatchupStats(
        computeCoverageMatchups(coverageMatches, {
          event: event || undefined,
          format: format || undefined,
        })
      );
    },
    [coverageMatches]
  );

  const progressPct =
    scrapeTotal > 0 ? Math.round((scrapeProgress / scrapeTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-fab-text mb-1">
          FABTCG Sitemap Scraper
        </h2>
        <p className="text-xs text-fab-dim">
          Scrape official decklists from fabtcg.com sitemap. Data includes
          player names, heroes, events, placements, and full card lists.
        </p>
      </div>

      {/* ── Scrape Controls ── */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-fab-text">Scrape Controls</h3>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleFetchUrls}
            disabled={fetchingUrls || scraping}
            className="px-4 py-2 rounded-md text-xs font-medium bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
          >
            {fetchingUrls ? "Fetching..." : "Fetch Sitemap URLs"}
          </button>

          {urls.length > 0 && !scraping && (
            <button
              onClick={handleStartScrape}
              className="px-4 py-2 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-500 transition-colors"
            >
              Start Scraping
            </button>
          )}

          {scraping && (
            <button
              onClick={handleStop}
              className="px-4 py-2 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-500 transition-colors"
            >
              Stop
            </button>
          )}

          {!scraping && (
            <button
              onClick={async () => {
                if (!confirm("Clear all scraped decklists? You'll need to re-scrape.")) return;
                setStatusMsg("Clearing...");
                try {
                  const count = await clearAllDecklists();
                  setScrapedSlugs(new Set());
                  setResults([]);
                  setAnalyticsLoaded(false);
                  setStatusMsg(`Cleared ${count} decklists.`);
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : "Clear failed";
                  setStatusMsg(`Error: ${msg}`);
                }
              }}
              className="px-4 py-2 rounded-md text-xs font-medium bg-fab-surface border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {statusMsg && (
          <p className="text-xs text-fab-muted">{statusMsg}</p>
        )}

        {/* Progress bar */}
        {scraping && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-fab-dim">
              <span>
                {scrapeProgress} / {scrapeTotal}
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="w-full bg-fab-bg rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-fab-gold rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {currentUrl && (
              <p className="text-[10px] text-fab-dim truncate">
                {currentUrl.replace("https://fabtcg.com/decklists/", "")}
              </p>
            )}
          </div>
        )}

        {/* Errors */}
        {scrapeErrors.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-red-400">
              Errors ({scrapeErrors.length}):
            </p>
            <div className="max-h-24 overflow-y-auto space-y-0.5">
              {scrapeErrors.map((e, i) => (
                <p key={i} className="text-[10px] text-red-400/70 truncate">
                  {e}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Search / Browse ── */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-fab-text">
          Search Decklists
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] text-fab-dim mb-0.5">
              Player
            </label>
            <input
              type="text"
              value={searchPlayer}
              onChange={(e) => setSearchPlayer(e.target.value)}
              placeholder="e.g. Michael Hamilton"
              className="w-full bg-fab-bg border border-fab-border rounded-md px-2 py-1.5 text-xs text-fab-text outline-none focus:border-fab-gold/50 placeholder:text-fab-dim/50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-fab-dim mb-0.5">
              Hero
            </label>
            <input
              type="text"
              value={searchHero}
              onChange={(e) => setSearchHero(e.target.value)}
              placeholder="e.g. Aurora"
              className="w-full bg-fab-bg border border-fab-border rounded-md px-2 py-1.5 text-xs text-fab-text outline-none focus:border-fab-gold/50 placeholder:text-fab-dim/50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-fab-dim mb-0.5">
              Event
            </label>
            <input
              type="text"
              value={searchEvent}
              onChange={(e) => setSearchEvent(e.target.value)}
              placeholder="e.g. Calling: Tampa Bay"
              className="w-full bg-fab-bg border border-fab-border rounded-md px-2 py-1.5 text-xs text-fab-text outline-none focus:border-fab-gold/50 placeholder:text-fab-dim/50"
            />
          </div>
        </div>

        <button
          onClick={() => handleSearch(false)}
          disabled={searching}
          className="px-4 py-2 rounded-md text-xs font-medium bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
        >
          {searching ? "Searching..." : "Search"}
        </button>

        {/* Results table */}
        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-fab-dim">
              Showing {results.length} results
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-fab-border text-left text-fab-dim">
                    <th className="py-1.5 pr-2">Player</th>
                    <th className="py-1.5 pr-2">Hero</th>
                    <th className="py-1.5 pr-2">Event</th>
                    <th className="py-1.5 pr-2">Placement</th>
                    <th className="py-1.5 pr-2">Cards</th>
                    <th className="py-1.5">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((dl) => (
                    <>
                      <tr
                        key={dl.slug}
                        className="border-b border-fab-border/50 hover:bg-fab-bg/50 cursor-pointer"
                        onClick={() =>
                          setExpandedSlug(
                            expandedSlug === dl.slug ? null : dl.slug
                          )
                        }
                      >
                        <td className="py-1.5 pr-2 text-fab-text">
                          {dl.player}
                        </td>
                        <td className="py-1.5 pr-2 text-fab-muted">
                          {dl.hero}
                        </td>
                        <td className="py-1.5 pr-2 text-fab-muted">
                          {dl.event}
                        </td>
                        <td className="py-1.5 pr-2 text-fab-gold">
                          {dl.placement || "-"}
                        </td>
                        <td className="py-1.5 pr-2 text-fab-dim">
                          {dl.cards.length}
                        </td>
                        <td className="py-1.5">
                          <a
                            href={dl.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View
                          </a>
                        </td>
                      </tr>
                      {expandedSlug === dl.slug && (
                        <tr key={`${dl.slug}-cards`}>
                          <td
                            colSpan={6}
                            className="py-2 px-4 bg-fab-bg/30"
                          >
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 text-[10px] text-fab-muted">
                              {dl.cards.map((c, i) => (
                                <span key={i}>
                                  {c.count}x {c.name}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <button
                onClick={() => handleSearch(true)}
                disabled={searching}
                className="px-4 py-2 rounded-md text-xs font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors disabled:opacity-50"
              >
                {searching ? "Loading..." : "Load More"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Tournament Meta Analytics ── */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-fab-text">Tournament Meta</h3>
            <p className="text-[10px] text-fab-dim">Hero distribution and placement data from official FABTCG decklists</p>
          </div>
          <button
            onClick={handleLoadAnalytics}
            disabled={loadingAnalytics}
            className="px-4 py-2 rounded-md text-xs font-medium bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
          >
            {loadingAnalytics ? "Loading..." : analyticsLoaded ? "Refresh" : "Load Data"}
          </button>
        </div>

        {analyticsLoaded && (
          <>
            {/* Overview cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-fab-bg rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-fab-gold">{allDecklists.length}</p>
                <p className="text-[10px] text-fab-dim">Decklists</p>
              </div>
              <div className="bg-fab-bg rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-fab-gold">{eventSummaries.length}</p>
                <p className="text-[10px] text-fab-dim">Events</p>
              </div>
              <div className="bg-fab-bg rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-fab-gold">{heroStats.length}</p>
                <p className="text-[10px] text-fab-dim">Heroes</p>
              </div>
              <div className="bg-fab-bg rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-fab-gold">
                  {new Set(allDecklists.map((d) => d.player)).size}
                </p>
                <p className="text-[10px] text-fab-dim">Players</p>
              </div>
            </div>

            {/* Event filter */}
            <div>
              <label className="block text-[10px] text-fab-dim mb-0.5">Filter by Event</label>
              <select
                value={selectedEvent}
                onChange={(e) => handleEventFilter(e.target.value)}
                className="w-full bg-fab-bg border border-fab-border rounded-md px-2 py-1.5 text-xs text-fab-text outline-none focus:border-fab-gold/50"
              >
                <option value="">All Events ({allDecklists.length} decklists)</option>
                {eventSummaries.map((es) => (
                  <option key={es.event} value={es.event}>
                    {es.event} ({es.decklistCount})
                  </option>
                ))}
              </select>
            </div>

            {/* Hero meta table */}
            <div>
              <h4 className="text-xs font-semibold text-fab-text mb-2">
                Hero Meta {selectedEvent ? `— ${selectedEvent}` : "— All Events"}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-fab-border text-left text-fab-dim">
                      <th className="py-1.5 pr-2 w-6">#</th>
                      <th className="py-1.5 pr-2">Hero</th>
                      <th className="py-1.5 pr-2 text-right">Decklists</th>
                      <th className="py-1.5 pr-2 text-right">Meta %</th>
                      <th className="py-1.5 pr-2 text-right">Wins</th>
                      <th className="py-1.5 pr-2">Meta Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heroStats.map((h, i) => (
                      <tr key={h.hero} className="border-b border-fab-border/30">
                        <td className="py-1.5 pr-2 text-fab-dim">{i + 1}</td>
                        <td className="py-1.5 pr-2 text-fab-text font-medium">{h.hero}</td>
                        <td className="py-1.5 pr-2 text-right text-fab-muted">{h.count}</td>
                        <td className="py-1.5 pr-2 text-right text-fab-gold font-medium">{h.metaShare}%</td>
                        <td className="py-1.5 pr-2 text-right text-fab-muted">{h.wins}</td>
                        <td className="py-1.5 pr-2 w-32">
                          <div className="w-full bg-fab-bg rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-fab-gold/60 rounded-full"
                              style={{ width: `${Math.min(h.metaShare * 2, 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Event breakdown */}
            {selectedEvent && (() => {
              const evtData = eventSummaries.find((e) => e.event === selectedEvent);
              if (!evtData) return null;
              return (
                <div>
                  <h4 className="text-xs font-semibold text-fab-text mb-2">
                    Placements — {selectedEvent}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-fab-border text-left text-fab-dim">
                          <th className="py-1.5 pr-2">Hero</th>
                          <th className="py-1.5 pr-2 text-right">Count</th>
                          <th className="py-1.5 pr-2 text-right">Share</th>
                          <th className="py-1.5 pr-2">Placements</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evtData.heroes.map((h) => (
                          <tr key={h.hero} className="border-b border-fab-border/30">
                            <td className="py-1.5 pr-2 text-fab-text font-medium">{h.hero}</td>
                            <td className="py-1.5 pr-2 text-right text-fab-muted">{h.count}</td>
                            <td className="py-1.5 pr-2 text-right text-fab-gold">{h.metaShare}%</td>
                            <td className="py-1.5 pr-2 text-fab-dim">
                              {h.placements.slice(0, 5).join(", ")}
                              {h.placements.length > 5 && ` +${h.placements.length - 5}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* ── Coverage Match Scraper ── */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-fab-text">Coverage Match Data</h3>
            <p className="text-[10px] text-fab-dim">Scrape round-by-round match results from FABTCG coverage pages (hero vs hero, win/loss)</p>
          </div>
          <div className="flex gap-2">
            {!coverageScraping && (
              <>
                <button
                  onClick={handleScrapeCoverage}
                  className="px-4 py-2 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-500 transition-colors"
                >
                  Scrape Coverage
                </button>
                <button
                  onClick={async () => {
                    setCoverageProgress("Rebuilding matchup summaries...");
                    try {
                      const count = await rebuildMatchupSummaries();
                      setCoverageProgress(`Rebuilt ${count} matchup summaries.`);
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : "Rebuild failed";
                      setCoverageProgress(`Error: ${msg}`);
                    }
                  }}
                  className="px-4 py-2 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                >
                  Rebuild Summaries
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("Clear all coverage match data?")) return;
                    setCoverageProgress("Clearing...");
                    try {
                      const count = await clearCoverageData();
                      setCoverageEvents([]);
                      setCoverageMatches([]);
                      setMatchupStats([]);
                      setCoverageLoaded(false);
                      setCoverageProgress(`Cleared ${count} matches.`);
                    } catch {
                      setCoverageProgress("Clear failed.");
                    }
                  }}
                  className="px-4 py-2 rounded-md text-xs font-medium bg-fab-surface border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Clear
                </button>
              </>
            )}
            {coverageScraping && (
              <button
                onClick={() => { coverageAbortRef.current = true; }}
                className="px-4 py-2 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </div>

        {coverageProgress && (
          <p className="text-xs text-fab-muted">{coverageProgress}</p>
        )}

        {coverageEvents.length > 0 && (
          <div>
            <p className="text-[10px] text-fab-dim mb-1">{coverageEvents.length} events scraped</p>
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {coverageEvents.map((e) => (
                <p key={e.slug} className="text-[10px] text-fab-muted">
                  {e.eventName} — {e.roundCount} rounds, {e.matchCount} matches
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Hero vs Hero Matchup Matrix ── */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-fab-text">Tournament Matchup Matrix</h3>
            <p className="text-[10px] text-fab-dim">Hero vs hero win rates from official tournament coverage data</p>
          </div>
          <button
            onClick={handleLoadCoverage}
            disabled={loadingCoverage}
            className="px-4 py-2 rounded-md text-xs font-medium bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
          >
            {loadingCoverage ? "Loading..." : coverageLoaded ? "Refresh" : "Load Data"}
          </button>
        </div>

        {coverageLoaded && (
          <>
            {/* Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-fab-bg rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-fab-gold">{coverageMatches.length}</p>
                <p className="text-[10px] text-fab-dim">Matches</p>
              </div>
              <div className="bg-fab-bg rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-fab-gold">{coverageEvents.length}</p>
                <p className="text-[10px] text-fab-dim">Events</p>
              </div>
              <div className="bg-fab-bg rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-fab-gold">{matchupStats.length}</p>
                <p className="text-[10px] text-fab-dim">Matchups</p>
              </div>
              <div className="bg-fab-bg rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-fab-gold">
                  {new Set(coverageMatches.flatMap((m) => [m.player1Hero, m.player2Hero]).filter(Boolean)).size}
                </p>
                <p className="text-[10px] text-fab-dim">Heroes</p>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-fab-dim mb-0.5">Filter by Event</label>
                <select
                  value={matchupEventFilter}
                  onChange={(e) => handleMatchupFilter(e.target.value, matchupFormatFilter)}
                  className="w-full bg-fab-bg border border-fab-border rounded-md px-2 py-1.5 text-xs text-fab-text outline-none focus:border-fab-gold/50"
                >
                  <option value="">All Events</option>
                  {coverageEvents.map((e) => (
                    <option key={e.slug} value={e.eventName}>{e.eventName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-fab-dim mb-0.5">Filter by Format</label>
                <select
                  value={matchupFormatFilter}
                  onChange={(e) => handleMatchupFilter(matchupEventFilter, e.target.value)}
                  className="w-full bg-fab-bg border border-fab-border rounded-md px-2 py-1.5 text-xs text-fab-text outline-none focus:border-fab-gold/50"
                >
                  <option value="">All Formats</option>
                  {[...new Set(coverageMatches.map((m) => m.format).filter(Boolean))].sort().map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Matchup table */}
            {matchupStats.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-fab-text mb-2">
                  Hero vs Hero ({matchupStats.length} matchups, {matchupStats.reduce((s, m) => s + m.total, 0)} games)
                </h4>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-fab-surface">
                      <tr className="border-b border-fab-border text-left text-fab-dim">
                        <th className="py-1.5 pr-2">Hero 1</th>
                        <th className="py-1.5 pr-2">Hero 2</th>
                        <th className="py-1.5 pr-2 text-right">H1 Wins</th>
                        <th className="py-1.5 pr-2 text-right">H2 Wins</th>
                        <th className="py-1.5 pr-2 text-right">Draws</th>
                        <th className="py-1.5 pr-2 text-right">Total</th>
                        <th className="py-1.5 pr-2 text-right">H1 WR%</th>
                        <th className="py-1.5 w-28">Spread</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchupStats.filter((m) => m.total >= 3).map((m) => {
                        const h1wr = m.total > 0 ? Math.round(((m.hero1Wins / (m.total - m.draws)) || 0) * 1000) / 10 : 0;
                        const h1pct = m.total > 0 ? (m.hero1Wins / m.total) * 100 : 50;
                        const h2pct = m.total > 0 ? (m.hero2Wins / m.total) * 100 : 50;
                        const drawPct = m.total > 0 ? (m.draws / m.total) * 100 : 0;
                        return (
                          <tr key={`${m.hero1}__${m.hero2}`} className="border-b border-fab-border/30">
                            <td className="py-1.5 pr-2 text-fab-text font-medium">{m.hero1}</td>
                            <td className="py-1.5 pr-2 text-fab-text font-medium">{m.hero2}</td>
                            <td className="py-1.5 pr-2 text-right text-green-400">{m.hero1Wins}</td>
                            <td className="py-1.5 pr-2 text-right text-red-400">{m.hero2Wins}</td>
                            <td className="py-1.5 pr-2 text-right text-fab-dim">{m.draws}</td>
                            <td className="py-1.5 pr-2 text-right text-fab-muted">{m.total}</td>
                            <td className={`py-1.5 pr-2 text-right font-medium ${h1wr >= 55 ? "text-green-400" : h1wr <= 45 ? "text-red-400" : "text-fab-muted"}`}>
                              {m.total - m.draws > 0 ? `${h1wr}%` : "-"}
                            </td>
                            <td className="py-1.5 w-28">
                              <div className="flex h-2 rounded-full overflow-hidden bg-fab-bg">
                                <div className="bg-green-500/70" style={{ width: `${h1pct}%` }} />
                                <div className="bg-fab-dim/30" style={{ width: `${drawPct}%` }} />
                                <div className="bg-red-500/70" style={{ width: `${h2pct}%` }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-fab-dim mt-1">Showing matchups with 3+ games</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

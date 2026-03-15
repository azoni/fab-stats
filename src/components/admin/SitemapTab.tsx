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
  type SitemapDecklist,
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
    </div>
  );
}

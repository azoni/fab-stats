"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeOpponentStats } from "@/lib/stats";
import { MatchCard } from "@/components/matches/MatchCard";
import { ChevronUpIcon, ChevronDownIcon } from "@/components/icons/NavIcons";
import { MatchResult, type OpponentStats } from "@/types";
import { allHeroes as knownHeroes } from "@/lib/heroes";
import { getEventType } from "@/lib/stats";
import { RivalryCard, buildRivalryUrl } from "@/components/opponents/RivalryCard";
import { toBlob } from "html-to-image";

const VALID_HERO_NAMES = new Set(knownHeroes.map((h) => h.name));
const PAGE_SIZE = 25;

export default function OpponentsPage() {
  const searchParams = useSearchParams();
  const { matches, isLoaded } = useMatches();
  const { user, profile } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"matches" | "winRate" | "lossRate" | "name" | "recent">("matches");
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");
  const [filterHero, setFilterHero] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Pre-fill search from URL query param (e.g. /opponents?q=PlayerName)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setSearch(q);
      setExpanded(q);
    }
  }, [searchParams]);

  // Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setPage(1);
  }, [filterFormat, filterEventType, filterHero, sortBy, search]);

  const allFormats = useMemo(() => {
    return [...new Set(matches.map((m) => m.format))];
  }, [matches]);

  const allEventTypes = useMemo(() => {
    const types = new Set<string>();
    for (const m of matches) {
      const et = m.eventType || getEventType(m);
      if (et && et !== "Other") types.add(et);
    }
    if (types.size < matches.length) types.add("Other");
    return [...types].sort();
  }, [matches]);

  const allHeroes = useMemo(() => {
    const heroes = new Set(matches.map((m) => m.heroPlayed).filter((h) => h && VALID_HERO_NAMES.has(h)));
    return Array.from(heroes).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    let filtered = matches;
    if (filterFormat !== "all") {
      filtered = filtered.filter((m) => m.format === filterFormat);
    }
    if (filterEventType !== "all") {
      filtered = filtered.filter((m) => {
        const et = m.eventType || getEventType(m);
        return et === filterEventType;
      });
    }
    if (filterHero !== "all") {
      filtered = filtered.filter((m) => m.heroPlayed === filterHero);
    }
    return filtered;
  }, [matches, filterFormat, filterEventType, filterHero]);

  const opponentStats = useMemo(() => computeOpponentStats(filteredMatches), [filteredMatches]);

  const displayList = useMemo(() => {
    let list = opponentStats.filter((o) => o.opponentName !== "Unknown");
    const unknown = opponentStats.find((o) => o.opponentName === "Unknown");

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) => o.opponentName.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (sortBy === "winRate") return b.winRate - a.winRate;
      if (sortBy === "lossRate") {
        const aLossRate = a.totalMatches > 0 ? (a.losses / a.totalMatches) * 100 : 0;
        const bLossRate = b.totalMatches > 0 ? (b.losses / b.totalMatches) * 100 : 0;
        return bLossRate - aLossRate;
      }
      if (sortBy === "name") return a.opponentName.localeCompare(b.opponentName);
      if (sortBy === "recent") {
        const aDate = Math.max(...a.matches.map((m) => new Date(m.date).getTime()));
        const bDate = Math.max(...b.matches.map((m) => new Date(m.date).getTime()));
        return bDate - aDate;
      }
      return b.totalMatches - a.totalMatches;
    });

    if (unknown && !search.trim()) list.push(unknown);
    return list;
  }, [opponentStats, sortBy, search]);

  const totalPages = Math.max(1, Math.ceil(displayList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageOpponents = displayList.slice(startIdx, startIdx + PAGE_SIZE);

  if (!isLoaded) {
    return <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />;
  }

  if (opponentStats.length === 0) {
    return (
      <div className="text-center py-16 text-fab-dim">
        <p className="text-lg mb-1">No opponent data yet</p>
        <p className="text-sm mb-4">
          {user ? "Import your tournament history to see your win rate against each opponent" : "Sign up and import your matches to see head-to-head stats against every opponent"}
        </p>
        {!user && (
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
          >
            Sign Up to Get Started
          </Link>
        )}
      </div>
    );
  }

  const totalOpponents = opponentStats.filter((o) => o.opponentName !== "Unknown").length;
  const totalMatchCount = opponentStats.reduce((s, o) => s + o.totalMatches, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-fab-gold mb-2">Opponents</h1>
      <p className="text-fab-muted text-sm mb-4">
        Your head-to-head record against {totalOpponents} opponents across {totalMatchCount} matches
      </p>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm placeholder:text-fab-dim focus:outline-none focus:border-fab-gold w-36 sm:w-44"
        />
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
          >
            <option value="matches">Most Played</option>
            <option value="winRate">Win Rate</option>
            <option value="lossRate">Loss Rate</option>
            <option value="recent">Most Recent</option>
            <option value="name">Name</option>
          </select>
          {allFormats.length > 1 && (
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
            >
              <option value="all">All Formats</option>
              {allFormats.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          )}
          {allEventTypes.length > 1 && (
            <select
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
            >
              <option value="all">All Event Types</option>
              {allEventTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
          {allHeroes.length > 1 && (
            <select
              value={filterHero}
              onChange={(e) => setFilterHero(e.target.value)}
              className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
            >
              <option value="all">All Heroes</option>
              {allHeroes.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {displayList.length === 0 ? (
        <div className="text-center py-12 text-fab-dim">
          <p className="text-lg mb-1">No opponents found</p>
          <p className="text-sm">Try adjusting your filters{search ? " or search" : ""}</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-fab-dim mb-2">
            Showing {startIdx + 1}-{Math.min(startIdx + PAGE_SIZE, displayList.length)} of {displayList.length} opponent{displayList.length !== 1 ? "s" : ""}
          </p>

          <div className="space-y-2">
            {pageOpponents.map((opp) => (
              <OpponentRow
                key={opp.opponentName}
                opp={opp}
                isExpanded={expanded === opp.opponentName}
                onToggle={() => setExpanded(expanded === opp.opponentName ? null : opp.opponentName)}
                matchOwnerUid={user?.uid}
                playerName={profile?.displayName}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-fab-dim">
                Page {safePage} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OpponentRow({ opp, isExpanded, onToggle, matchOwnerUid, playerName }: { opp: OpponentStats; isExpanded: boolean; onToggle: () => void; matchOwnerUid?: string; playerName?: string }) {
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "sharing">("idle");
  const cardRef = useRef<HTMLDivElement>(null);
  // Compute streak vs this opponent (most recent results)
  const sortedMatches = [...opp.matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let currentStreak = 0;
  let streakType: MatchResult | null = null;
  for (const m of sortedMatches) {
    if (m.result === MatchResult.Draw) break;
    if (!streakType) {
      streakType = m.result;
      currentStreak = 1;
    } else if (m.result === streakType) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Unique events
  const events = [...new Set(opp.matches.map((m) => m.notes?.split(" | ")[0]).filter(Boolean))];
  // Unique formats
  const formats = [...new Set(opp.matches.map((m) => m.format))];
  // Date range
  const dates = opp.matches.map((m) => new Date(m.date).getTime());
  const firstDate = new Date(Math.min(...dates)).toLocaleDateString();
  const lastDate = new Date(Math.max(...dates)).toLocaleDateString();

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden relative">
      <button onClick={onToggle} className="w-full p-4 text-left hover:bg-fab-surface-hover transition-colors">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/search?q=${encodeURIComponent(opp.opponentName)}`}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-fab-text text-lg hover:text-fab-gold transition-colors"
              >
                {opp.opponentName}
              </Link>
              {currentStreak > 1 && streakType && (
                <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                  streakType === MatchResult.Win ? "bg-fab-win/15 text-fab-win" : "bg-fab-loss/15 text-fab-loss"
                }`}>
                  {currentStreak} {streakType === MatchResult.Win ? "W" : "L"} streak
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-fab-dim flex-wrap">
              <span>{opp.totalMatches} matches</span>
              <span>{firstDate === lastDate ? firstDate : `${firstDate} - ${lastDate}`}</span>
              {formats.map((f) => (
                <span key={f} className="px-1.5 py-0.5 rounded bg-fab-bg">{f}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="text-sm text-fab-muted">
                {opp.wins}W - {opp.losses}L{opp.draws > 0 ? ` - ${opp.draws}D` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 w-28">
              <div className="flex-1 h-2.5 bg-fab-bg rounded-full overflow-hidden">
                <div className="h-full bg-fab-win rounded-full transition-all" style={{ width: `${opp.winRate}%` }} />
              </div>
              <span className={`text-sm font-bold w-12 text-right ${opp.winRate >= 50 ? "text-fab-win" : opp.winRate === 50 ? "text-fab-draw" : "text-fab-loss"}`}>
                {opp.winRate.toFixed(0)}%
              </span>
            </div>
            {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-fab-dim" /> : <ChevronDownIcon className="w-4 h-4 text-fab-dim" />}
          </div>
        </div>

        {/* Recent results dots */}
        <div className="mt-2 flex gap-1">
          {sortedMatches.slice(0, 20).reverse().map((m, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${
                m.result === MatchResult.Win ? "bg-fab-win" : m.result === MatchResult.Loss ? "bg-fab-loss" : "bg-fab-draw"
              }`}
              title={`${new Date(m.date).toLocaleDateString()} - ${m.result}`}
            />
          ))}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-fab-border">
          {/* Stats breakdown */}
          <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-fab-bg rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-fab-text">{opp.totalMatches}</p>
              <p className="text-xs text-fab-dim">Total Games</p>
            </div>
            <div className="bg-fab-bg rounded-lg p-3 text-center">
              <p className={`text-lg font-bold ${opp.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>{opp.winRate.toFixed(1)}%</p>
              <p className="text-xs text-fab-dim">Win Rate</p>
            </div>
            <div className="bg-fab-bg rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-fab-text">{events.length}</p>
              <p className="text-xs text-fab-dim">Events Together</p>
            </div>
            <div className="bg-fab-bg rounded-lg p-3 text-center">
              <p className={`text-lg font-bold ${streakType === MatchResult.Win ? "text-fab-win" : streakType === MatchResult.Loss ? "text-fab-loss" : "text-fab-text"}`}>
                {currentStreak > 0 ? `${currentStreak}${streakType === MatchResult.Win ? "W" : "L"}` : "-"}
              </p>
              <p className="text-xs text-fab-dim">Current Streak</p>
            </div>
          </div>

          {/* Hidden card for image capture */}
          {playerName && (
            <div style={{ position: "absolute", left: "-9999px", top: 0 }} aria-hidden>
              <div ref={cardRef}>
                <RivalryCard data={{
                  playerName,
                  opponentName: opp.opponentName,
                  wins: opp.wins,
                  losses: opp.losses,
                  draws: opp.draws,
                  winRate: opp.winRate,
                  matches: opp.totalMatches,
                  recentResults: sortedMatches.slice(0, 20).reverse().map((m) => m.result),
                  playerHeroes: opp.heroesPlayed.filter((h) => h !== "Unknown"),
                  opponentHeroes: opp.opponentHeroes.filter((h) => h !== "Unknown"),
                }} />
              </div>
            </div>
          )}

          {/* Share button */}
          {playerName && (
            <div className="px-4 pb-2">
              <button
                disabled={shareStatus === "sharing"}
                onClick={async () => {
                  const recentResults = sortedMatches.slice(0, 20).reverse().map((m) => m.result);
                  const url = buildRivalryUrl(
                    window.location.origin,
                    playerName,
                    opp.opponentName,
                    opp.wins,
                    opp.losses,
                    opp.draws,
                    recentResults,
                    opp.heroesPlayed.filter((h) => h !== "Unknown"),
                    opp.opponentHeroes.filter((h) => h !== "Unknown")
                  );
                  const shareText = `${playerName} vs ${opp.opponentName}: ${opp.wins}W-${opp.losses}L${opp.draws > 0 ? `-${opp.draws}D` : ""} (${opp.winRate.toFixed(0)}%)\n${url}`;

                  setShareStatus("sharing");
                  try {
                    // Capture the rivalry card as an image
                    const blob = cardRef.current
                      ? await toBlob(cardRef.current, { pixelRatio: 2, backgroundColor: "#0c0a0e" })
                      : null;

                    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
                    if (isMobile && blob && navigator.share && navigator.canShare?.({ files: [new File([blob], "rivalry.png", { type: "image/png" })] })) {
                      // Mobile: share image + link via native share sheet
                      const file = new File([blob], "rivalry.png", { type: "image/png" });
                      await navigator.share({ title: "FaB Stats Rivalry", text: shareText, files: [file] });
                    } else if (blob && navigator.clipboard?.write) {
                      // Desktop: copy image only to clipboard
                      await navigator.clipboard.write([
                        new ClipboardItem({ "image/png": blob }),
                      ]);
                      setShareStatus("copied");
                      setTimeout(() => setShareStatus("idle"), 2000);
                      return;
                    } else {
                      // Fallback: copy link text
                      await navigator.clipboard.writeText(url);
                      setShareStatus("copied");
                      setTimeout(() => setShareStatus("idle"), 2000);
                      return;
                    }
                  } catch {
                    // If image capture fails, fall back to link-only
                    try {
                      await navigator.clipboard.writeText(url);
                    } catch { /* ignore */ }
                  }
                  setShareStatus("idle");
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {shareStatus === "sharing" ? "Capturing..." : shareStatus === "copied" ? "Image Copied!" : "Share Rivalry"}
              </button>
            </div>
          )}

          {/* Events list */}
          {events.length > 0 && (
            <div className="px-4 pb-3">
              <p className="text-xs text-fab-muted mb-2">Events</p>
              <div className="flex flex-wrap gap-1">
                {events.map((e, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded bg-fab-bg text-fab-dim">{e}</span>
                ))}
              </div>
            </div>
          )}

          {/* Match history */}
          <div className="px-4 pb-4">
            <p className="text-xs text-fab-muted mb-2">Match History ({sortedMatches.length})</p>
            <div className="space-y-2">
              {sortedMatches.map((match) => (
                <MatchCard key={match.id} match={match} matchOwnerUid={matchOwnerUid} enableComments />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

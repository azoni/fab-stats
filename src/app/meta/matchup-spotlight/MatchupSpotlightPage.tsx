"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { getCommunityHeroMatchups, getMonthsForPreset, type CommunityMatchupCell } from "@/lib/hero-matchups";
import { HeroImg } from "@/components/heroes/HeroImg";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";

export default function MatchupSpotlightPage() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CommunityMatchupCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "copied" | "downloading">("idle");

  useEffect(() => {
    getCommunityHeroMatchups(getMonthsForPreset("90d"))
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const spotlight = useMemo(() => {
    if (data.length === 0) return null;

    const maxTotal = Math.max(...data.map((c) => c.total));
    let best: { cell: CommunityMatchupCell; score: number; winRate: number; winner: string; loser: string } | null = null;

    for (const cell of data) {
      if (cell.total < 20) continue;
      const h1Rate = cell.total > 0 ? cell.hero1Wins / cell.total : 0.5;
      const winRate = Math.max(h1Rate, 1 - h1Rate);
      const winner = h1Rate >= 0.5 ? cell.hero1 : cell.hero2;
      const loser = h1Rate >= 0.5 ? cell.hero2 : cell.hero1;
      const lopsidedness = Math.abs(winRate - 0.5) * 2;
      const volumeScore = maxTotal > 0 ? Math.log2(cell.total) / Math.log2(maxTotal) : 0;
      const score = lopsidedness * 0.6 + volumeScore * 0.4;
      if (!best || score > best.score) {
        best = { cell, score, winRate, winner, loser };
      }
    }
    return best;
  }, [data]);

  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  async function handleCopy() {
    if (!spotlight) return;
    setStatus("copied");
    const wr = (spotlight.winRate * 100).toFixed(0);
    await copyCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: "fab-matchup-spotlight.png",
      shareTitle: "FaB Matchup Spotlight",
      shareText: `${spotlight.winner.split(",")[0]} vs ${spotlight.loser.split(",")[0]} — ${wr}% win rate — fabstats.net/meta/matchup-spotlight`,
      fallbackText: "https://www.fabstats.net/meta/matchup-spotlight",
    });
    setTimeout(() => setStatus("idle"), 2000);
  }

  async function handleDownload() {
    setStatus("downloading");
    await downloadCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: "fab-matchup-spotlight.png",
    });
    setStatus("idle");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-fab-gold/30 border-t-fab-gold rounded-full animate-spin" />
        <span className="ml-3 text-sm text-fab-dim">Loading matchup data...</span>
      </div>
    );
  }

  if (!spotlight) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-fab-muted text-sm">Not enough community matchup data yet.</p>
      </div>
    );
  }

  const { cell, winRate, winner, loser } = spotlight;
  const winPct = (winRate * 100).toFixed(0);
  const losePct = (100 - winRate * 100).toFixed(0);
  const winnerShort = winner.split(",")[0];
  const loserShort = loser.split(",")[0];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold text-fab-text">Matchup Spotlight</h1>
        <p className="text-xs text-fab-dim">The most lopsided matchup from the last 90 days</p>
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        <button onClick={handleCopy} className="px-4 py-2 rounded-lg text-sm font-medium bg-fab-gold/15 text-fab-gold hover:bg-fab-gold/25 transition-colors">
          {status === "copied" ? "Copied!" : "Copy Image"}
        </button>
        <button onClick={handleDownload} className="px-4 py-2 rounded-lg text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors">
          {status === "downloading" ? "Saving..." : "Download"}
        </button>
      </div>

      <div className="flex justify-center">
        <div ref={cardRef} className="rounded-xl overflow-hidden border border-fab-border" style={{ width: 480, backgroundColor: "#0e0c08" }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-fab-gold/20 via-fab-gold/10 to-transparent px-5 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-fab-gold text-[10px] uppercase tracking-[0.2em] font-bold">FaB Stats</p>
                <p className="text-fab-text text-lg font-bold mt-0.5">Matchup Spotlight</p>
              </div>
              <div className="text-right">
                <p className="text-fab-dim text-[10px]">{dateStr}</p>
                <p className="text-fab-dim text-[10px]">Last 90 days</p>
              </div>
            </div>
          </div>

          {/* Hero VS Hero */}
          <div className="px-5 py-5">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <HeroImg name={winner} size="lg" />
                <p className="text-fab-text text-sm font-bold mt-2">{winnerShort}</p>
                <p className="text-fab-win text-2xl font-black">{winPct}%</p>
              </div>
              <div className="text-center">
                <p className="text-fab-gold text-xs font-black uppercase tracking-widest">VS</p>
              </div>
              <div className="text-center">
                <HeroImg name={loser} size="lg" />
                <p className="text-fab-text text-sm font-bold mt-2">{loserShort}</p>
                <p className="text-fab-loss text-2xl font-black">{losePct}%</p>
              </div>
            </div>

            {/* Win rate bar */}
            <div className="mt-4 flex rounded-full overflow-hidden h-3">
              <div className="bg-fab-win/50" style={{ width: `${winPct}%` }} />
              <div className="bg-fab-loss/50" style={{ width: `${losePct}%` }} />
            </div>

            {/* Stats */}
            <div className="mt-3 text-center">
              <p className="text-fab-muted text-xs">{cell.total} matches · {cell.draws} draws</p>
            </div>

            {/* Caption */}
            <div className="mt-3 text-center">
              <p className="text-fab-dim text-[11px] italic leading-relaxed">
                {winnerShort} dominates this matchup with a {winPct}% win rate across {cell.total} community games.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-2 border-t border-fab-border/30 flex items-center justify-between">
            <p className="text-fab-gold/50 text-[9px] font-semibold tracking-wider">fabstats.net</p>
            <p className="text-fab-dim text-[8px]">Community data · 90 days</p>
          </div>
        </div>
      </div>
    </div>
  );
}

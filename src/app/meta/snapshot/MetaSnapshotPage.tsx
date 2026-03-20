"use client";

import { useRef, useState, useMemo } from "react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { computeMetaStats, computeTop8HeroMeta } from "@/lib/meta-stats";
import { HeroImg } from "@/components/heroes/HeroImg";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";
import { DonutChart, buildSegments } from "@/components/meta/MetaShareCard";

export default function MetaSnapshotPage() {
  const { entries, loading } = useLeaderboard();
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "downloading">("idle");

  const metaStats = useMemo(() => {
    if (entries.length === 0) return [];
    return computeMetaStats(entries).heroStats.slice(0, 15);
  }, [entries]);

  const top8Heroes = useMemo(() => {
    if (entries.length === 0) return [];
    return computeTop8HeroMeta(entries);
  }, [entries]);

  const segments = useMemo(() => buildSegments(top8Heroes, 10), [top8Heroes]);
  const totalTop8s = top8Heroes.reduce((sum, h) => sum + h.count, 0);
  const totalPlayers = entries.length;
  const totalMatches = entries.reduce((sum, e) => sum + (e.totalMatches || 0), 0);

  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  async function handleCopy() {
    setStatus("copied");
    await copyCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: "fab-meta-snapshot.png",
      shareTitle: "FaB Meta Snapshot",
      shareText: `FaB Meta Snapshot — ${dateStr} — fabstats.net/meta/snapshot`,
      fallbackText: "https://www.fabstats.net/meta/snapshot",
    });
    setTimeout(() => setStatus("idle"), 2000);
  }

  async function handleDownload() {
    setStatus("downloading");
    await downloadCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: "fab-meta-snapshot.png",
    });
    setStatus("idle");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-fab-gold/30 border-t-fab-gold rounded-full animate-spin" />
        <span className="ml-3 text-sm text-fab-dim">Loading meta data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold text-fab-text">Meta Snapshot</h1>
        <p className="text-xs text-fab-dim">Screenshot or share this card</p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={handleCopy}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-fab-gold/15 text-fab-gold hover:bg-fab-gold/25 transition-colors"
        >
          {status === "copied" ? "Copied!" : "Copy Image"}
        </button>
        <button
          onClick={handleDownload}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors"
        >
          {status === "downloading" ? "Saving..." : "Download"}
        </button>
      </div>

      {/* The Card */}
      <div className="flex justify-center">
        <div
          ref={cardRef}
          className="rounded-xl overflow-hidden border border-fab-border"
          style={{ width: 480, backgroundColor: "#0e0c08" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-fab-gold/20 via-fab-gold/10 to-transparent px-5 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-fab-gold text-[10px] uppercase tracking-[0.2em] font-bold">FaB Stats</p>
                <p className="text-fab-text text-lg font-bold mt-0.5">Community Meta Snapshot</p>
              </div>
              <div className="text-right">
                <p className="text-fab-dim text-[10px]">{dateStr}</p>
                <p className="text-fab-dim text-[10px]">{totalPlayers.toLocaleString()} players · {totalMatches.toLocaleString()} matches</p>
              </div>
            </div>
          </div>

          {/* Top 8 Donut + Legend */}
          {segments.length > 0 && (
            <div className="px-5 py-3 flex items-center gap-4">
              <div className="shrink-0 relative">
                <DonutChart segments={segments} size={120} strokeWidth={20} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-fab-text text-xl font-black leading-none">{totalTop8s}</p>
                  <p className="text-fab-dim text-[8px] uppercase tracking-wider font-bold">Top 8s</p>
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                {segments.map((seg) => (
                  <div key={seg.hero} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="text-fab-text text-[10px] font-medium truncate flex-1">{seg.hero.split(",")[0]}</span>
                    <span className="text-fab-muted text-[9px] font-bold tabular-nums">{seg.count}</span>
                    <span className="text-fab-dim text-[8px] tabular-nums w-7 text-right">{seg.percent.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hero Win Rates Table */}
          <div className="px-5 pb-1">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-fab-dim text-[9px] uppercase tracking-wider font-semibold">Hero Win Rates</p>
              <p className="text-fab-dim text-[9px]">Play Rate / Win Rate / Matches</p>
            </div>
          </div>
          <div className="px-5 pb-4">
            {metaStats.map((hero, i) => {
              const barWidth = Math.max(hero.avgWinRate, 2);
              return (
                <div key={hero.hero} className="flex items-center gap-2 py-[3px]">
                  <span className="text-fab-dim text-[10px] w-4 text-right tabular-nums">{i + 1}</span>
                  <HeroImg name={hero.hero} size="sm" />
                  <span className="text-fab-text text-[11px] font-medium truncate w-24" title={hero.hero}>{hero.hero.split(",")[0]}</span>
                  <span className="text-fab-muted text-[9px] tabular-nums w-10 text-right">{hero.metaShare.toFixed(1)}%</span>
                  <div className="flex-1 h-3 bg-fab-surface rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${hero.avgWinRate >= 52 ? "bg-fab-win/40" : hero.avgWinRate <= 48 ? "bg-fab-loss/40" : "bg-fab-muted/30"}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold tabular-nums w-10 text-right ${hero.avgWinRate >= 52 ? "text-fab-win" : hero.avgWinRate <= 48 ? "text-fab-loss" : "text-fab-muted"}`}>
                    {hero.avgWinRate.toFixed(1)}%
                  </span>
                  <span className="text-fab-dim text-[9px] tabular-nums w-10 text-right">{hero.totalMatches.toLocaleString()}</span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-5 py-2 border-t border-fab-border/30 flex items-center justify-between">
            <p className="text-fab-gold/50 text-[9px] font-semibold tracking-wider">fabstats.net</p>
            <p className="text-fab-dim text-[8px]">Community data · All formats</p>
          </div>
        </div>
      </div>
    </div>
  );
}

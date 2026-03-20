"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { getCommunityHeroMatchups, getMonthsForPreset, type CommunityMatchupCell } from "@/lib/hero-matchups";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { computeMetaStats, type HeroMetaStats } from "@/lib/meta-stats";
import { HeroImg } from "@/components/heroes/HeroImg";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";

interface HotTake {
  id: string;
  headline: string;
  body: string;
  tweetText: string;
  heroes: string[];
  type: "matchup" | "overperformer" | "underperformer" | "popular" | "dominant";
}

function generateHotTakes(matchups: CommunityMatchupCell[], heroStats: HeroMetaStats[]): HotTake[] {
  const takes: HotTake[] = [];

  // 1. Most lopsided matchup
  let bestMatchup: { cell: CommunityMatchupCell; winRate: number; winner: string; loser: string } | null = null;
  for (const cell of matchups) {
    if (cell.total < 20) continue;
    const h1Rate = cell.total > 0 ? cell.hero1Wins / cell.total : 0.5;
    const wr = Math.max(h1Rate, 1 - h1Rate);
    if (!bestMatchup || wr > bestMatchup.winRate) {
      const winner = h1Rate >= 0.5 ? cell.hero1 : cell.hero2;
      const loser = h1Rate >= 0.5 ? cell.hero2 : cell.hero1;
      bestMatchup = { cell, winRate: wr, winner, loser };
    }
  }
  if (bestMatchup) {
    const w = bestMatchup.winner.split(",")[0];
    const l = bestMatchup.loser.split(",")[0];
    const pct = (bestMatchup.winRate * 100).toFixed(0);
    takes.push({
      id: "lopsided",
      headline: `${w} owns ${l}`,
      body: `${pct}% win rate across ${bestMatchup.cell.total} games — it's not even close.`,
      tweetText: `${w} owns ${l} — ${pct}% win rate across ${bestMatchup.cell.total} community games\n\nfabstats.net/meta/hot-takes`,
      heroes: [bestMatchup.winner, bestMatchup.loser],
      type: "matchup",
    });
  }

  // 2. Most popular but losing
  const popularLoser = heroStats
    .filter((h) => h.totalMatches >= 50 && h.avgWinRate < 49)
    .sort((a, b) => b.metaShare - a.metaShare)[0];
  if (popularLoser) {
    const name = popularLoser.hero.split(",")[0];
    takes.push({
      id: "popular-loser",
      headline: `${name}: Popular but struggling`,
      body: `${popularLoser.metaShare.toFixed(1)}% of the meta but only a ${popularLoser.avgWinRate.toFixed(1)}% win rate. The community's favorite underdog.`,
      tweetText: `${name} is ${popularLoser.metaShare.toFixed(1)}% of the meta but only winning ${popularLoser.avgWinRate.toFixed(1)}% — the community's favorite punching bag\n\nfabstats.net/meta/hot-takes`,
      heroes: [popularLoser.hero],
      type: "underperformer",
    });
  }

  // 3. Hidden overperformer
  const medianShare = heroStats.length > 0 ? heroStats[Math.floor(heroStats.length / 2)].metaShare : 0;
  const overperformer = heroStats
    .filter((h) => h.totalMatches >= 30 && h.metaShare < medianShare && h.avgWinRate > 54)
    .sort((a, b) => b.avgWinRate - a.avgWinRate)[0];
  if (overperformer) {
    const name = overperformer.hero.split(",")[0];
    takes.push({
      id: "overperformer",
      headline: `Sleep on ${name} at your own risk`,
      body: `Only ${overperformer.metaShare.toFixed(1)}% meta share but boasting a ${overperformer.avgWinRate.toFixed(1)}% win rate. Under the radar and overdelivering.`,
      tweetText: `Sleep on ${name} at your own risk — ${overperformer.avgWinRate.toFixed(1)}% win rate with just ${overperformer.metaShare.toFixed(1)}% meta share\n\nfabstats.net/meta/hot-takes`,
      heroes: [overperformer.hero],
      type: "overperformer",
    });
  }

  // 4. Most played matchup
  const mostPlayed = matchups.filter((c) => c.total >= 10).sort((a, b) => b.total - a.total)[0];
  if (mostPlayed) {
    const h1 = mostPlayed.hero1.split(",")[0];
    const h2 = mostPlayed.hero2.split(",")[0];
    takes.push({
      id: "most-played",
      headline: `The rivalry everyone's playing`,
      body: `${h1} vs ${h2}: ${mostPlayed.total} games, split ${mostPlayed.hero1Wins}-${mostPlayed.hero2Wins}${mostPlayed.draws > 0 ? `-${mostPlayed.draws}` : ""}.`,
      tweetText: `The most played matchup in FaB right now: ${h1} vs ${h2} — ${mostPlayed.total} games, split ${mostPlayed.hero1Wins}-${mostPlayed.hero2Wins}\n\nfabstats.net/meta/hot-takes`,
      heroes: [mostPlayed.hero1, mostPlayed.hero2],
      type: "popular",
    });
  }

  // 5. Dominant hero
  const dominant = heroStats
    .filter((h) => h.totalMatches >= 50)
    .sort((a, b) => b.avgWinRate - a.avgWinRate)[0];
  if (dominant && dominant.avgWinRate > 52) {
    const name = dominant.hero.split(",")[0];
    takes.push({
      id: "dominant",
      headline: `${name} can't stop winning`,
      body: `${dominant.avgWinRate.toFixed(1)}% win rate across ${dominant.totalMatches} matches — the community's winningest hero right now.`,
      tweetText: `${name} can't stop winning — ${dominant.avgWinRate.toFixed(1)}% win rate across ${dominant.totalMatches} matches\n\nfabstats.net/meta/hot-takes`,
      heroes: [dominant.hero],
      type: "dominant",
    });
  }

  return takes;
}

export default function HotTakesPage() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [matchups, setMatchups] = useState<CommunityMatchupCell[]>([]);
  const [matchupsLoading, setMatchupsLoading] = useState(true);
  const { entries, loading: lbLoading } = useLeaderboard();
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    getCommunityHeroMatchups(getMonthsForPreset("90d"))
      .then(setMatchups)
      .catch(() => setMatchups([]))
      .finally(() => setMatchupsLoading(false));
  }, []);

  const heroStats = useMemo(() => {
    if (entries.length === 0) return [];
    return computeMetaStats(entries).heroStats;
  }, [entries]);

  const takes = useMemo(() => generateHotTakes(matchups, heroStats), [matchups, heroStats]);

  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const loading = matchupsLoading || lbLoading;

  const handleCopy = useCallback(async (index: number, take: HotTake) => {
    const el = cardRefs.current[index];
    if (!el) return;
    setStatuses((s) => ({ ...s, [take.id]: "copied" }));
    await copyCardImage(el, {
      backgroundColor: "#0e0c08",
      fileName: `fab-hot-take-${take.id}.png`,
      shareTitle: `FaB Hot Take: ${take.headline}`,
      shareText: take.tweetText,
      fallbackText: "https://www.fabstats.net/meta/hot-takes",
    });
    setTimeout(() => setStatuses((s) => ({ ...s, [take.id]: "" })), 2000);
  }, []);

  const handleDownload = useCallback(async (index: number, take: HotTake) => {
    const el = cardRefs.current[index];
    if (!el) return;
    setStatuses((s) => ({ ...s, [take.id]: "downloading" }));
    await downloadCardImage(el, {
      backgroundColor: "#0e0c08",
      fileName: `fab-hot-take-${take.id}.png`,
    });
    setStatuses((s) => ({ ...s, [take.id]: "" }));
  }, []);

  const handleCopyTweet = useCallback(async (take: HotTake) => {
    await navigator.clipboard.writeText(take.tweetText);
    setStatuses((s) => ({ ...s, [`${take.id}-tweet`]: "copied" }));
    setTimeout(() => setStatuses((s) => ({ ...s, [`${take.id}-tweet`]: "" })), 2000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-fab-gold/30 border-t-fab-gold rounded-full animate-spin" />
        <span className="ml-3 text-sm text-fab-dim">Generating hot takes...</span>
      </div>
    );
  }

  if (takes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-fab-muted text-sm">Not enough community data to generate hot takes yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-fab-text">Community Hot Takes</h1>
        <p className="text-xs text-fab-dim">Data-driven observations from the last 90 days. Share the ones that spark discussion.</p>
      </div>

      <div className="space-y-6">
        {takes.map((take, i) => (
          <div key={take.id}>
            {/* Action buttons above card */}
            <div className="flex items-center gap-2 mb-2 justify-center">
              <button
                onClick={() => handleCopy(i, take)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-fab-gold/15 text-fab-gold hover:bg-fab-gold/25 transition-colors"
              >
                {statuses[take.id] === "copied" ? "Copied!" : "Copy Image"}
              </button>
              <button
                onClick={() => handleDownload(i, take)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors"
              >
                {statuses[take.id] === "downloading" ? "Saving..." : "Download"}
              </button>
              <button
                onClick={() => handleCopyTweet(take)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors"
              >
                {statuses[`${take.id}-tweet`] === "copied" ? "Copied!" : "Copy Tweet"}
              </button>
            </div>

            {/* The Card */}
            <div className="flex justify-center">
              <div
                ref={(el) => { cardRefs.current[i] = el; }}
                className="rounded-xl overflow-hidden border border-fab-border"
                style={{ width: 480, backgroundColor: "#0e0c08" }}
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-fab-gold/20 via-fab-gold/10 to-transparent px-5 pt-3 pb-2">
                  <div className="flex items-center justify-between">
                    <p className="text-fab-gold text-[10px] uppercase tracking-[0.2em] font-bold">FaB Stats · Hot Take</p>
                    <p className="text-fab-dim text-[10px]">{dateStr}</p>
                  </div>
                </div>

                {/* Content */}
                <div className="px-5 py-4">
                  {/* Hero portraits */}
                  <div className="flex items-center gap-2 mb-3">
                    {take.heroes.map((hero) => (
                      <HeroImg key={hero} name={hero} size="lg" />
                    ))}
                  </div>

                  {/* Headline */}
                  <p className="text-fab-text text-base font-bold leading-tight">{take.headline}</p>

                  {/* Body */}
                  <p className="text-fab-muted text-sm mt-1.5 leading-relaxed">{take.body}</p>
                </div>

                {/* Footer */}
                <div className="px-5 py-2 border-t border-fab-border/30 flex items-center justify-between">
                  <p className="text-fab-gold/50 text-[9px] font-semibold tracking-wider">fabstats.net</p>
                  <p className="text-fab-dim text-[8px]">Community data · 90 days</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

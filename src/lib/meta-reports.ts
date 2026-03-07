import { computeMetaStats, type HeroMetaStats, type MetaPeriod } from "./meta-stats";
import type { LeaderboardEntry } from "@/types";

export interface MetaMover {
  hero: string;
  currentShare: number;
  previousShare: number;
  shareChange: number;
  currentWR: number;
  previousWR: number;
  wrChange: number;
}

export interface MetaReport {
  current: HeroMetaStats[];
  previous: HeroMetaStats[];
  movers: MetaMover[];
  emerging: MetaMover[];
  declining: MetaMover[];
}

export function computeMetaReport(
  entries: LeaderboardEntry[],
  format?: string,
  currentPeriod: MetaPeriod = "weekly",
  previousPeriod: MetaPeriod = "monthly",
): MetaReport {
  const { heroStats: current } = computeMetaStats(entries, format, undefined, currentPeriod);
  const { heroStats: previous } = computeMetaStats(entries, format, undefined, previousPeriod);

  const prevMap = new Map<string, HeroMetaStats>();
  for (const h of previous) prevMap.set(h.hero, h);

  const currMap = new Map<string, HeroMetaStats>();
  for (const h of current) currMap.set(h.hero, h);

  // All heroes that appear in either period
  const allHeroes = new Set([...current.map((h) => h.hero), ...previous.map((h) => h.hero)]);

  const movers: MetaMover[] = [];
  for (const hero of allHeroes) {
    const cur = currMap.get(hero);
    const prev = prevMap.get(hero);
    const currentShare = cur?.metaShare ?? 0;
    const previousShare = prev?.metaShare ?? 0;
    const currentWR = cur?.avgWinRate ?? 0;
    const previousWR = prev?.avgWinRate ?? 0;

    movers.push({
      hero,
      currentShare,
      previousShare,
      shareChange: currentShare - previousShare,
      currentWR,
      previousWR,
      wrChange: currentWR - previousWR,
    });
  }

  // Sort by absolute share change
  movers.sort((a, b) => Math.abs(b.shareChange) - Math.abs(a.shareChange));

  // Emerging: heroes gaining >1% share
  const emerging = movers
    .filter((m) => m.shareChange > 1)
    .sort((a, b) => b.shareChange - a.shareChange);

  // Declining: heroes losing >1% share
  const declining = movers
    .filter((m) => m.shareChange < -1)
    .sort((a, b) => a.shareChange - b.shareChange);

  return { current, previous, movers, emerging, declining };
}

"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlignLeft } from "lucide-react";
import { SegmentedBar } from "@/components/charts/SegmentedBar";
import { WinRateRing } from "@/components/charts/WinRateRing";
import { MiniDonut } from "@/components/charts/MiniDonut";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { computeMetaStats, getAvailableFormats, computeTop8HeroMeta, type HeroMetaStats, type MetaPeriod, type Top8HeroMeta } from "@/lib/meta-stats";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";

type Tier = "S" | "A" | "B" | "C" | "D";

const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string; border: string; min: number }> = {
  S: { label: "S", color: "text-fuchsia-400", bg: "bg-fuchsia-400/10", border: "border-fuchsia-400/30", min: 80 },
  A: { label: "A", color: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/30", min: 65 },
  B: { label: "B", color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/30", min: 50 },
  C: { label: "C", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", min: 35 },
  D: { label: "D", color: "text-gray-400", bg: "bg-gray-400/10", border: "border-gray-400/30", min: 0 },
};

const TIERS: Tier[] = ["S", "A", "B", "C", "D"];

interface ScoredHero {
  hero: string;
  heroClass?: string;
  score: number;
  tier: Tier;
  winRate: number;
  metaShare: number;
  top8Count: number;
  totalMatches: number;
  playerCount: number;
}

function assignTier(score: number): Tier {
  if (score >= 80) return "S";
  if (score >= 65) return "A";
  if (score >= 50) return "B";
  if (score >= 35) return "C";
  return "D";
}

function computeTierList(heroStats: HeroMetaStats[], top8Heroes: Top8HeroMeta[]): ScoredHero[] {
  if (heroStats.length === 0) return [];

  const top8Map = new Map<string, Top8HeroMeta>();
  for (const t of top8Heroes) top8Map.set(t.hero, t);

  const maxMetaShare = Math.max(...heroStats.map((h) => h.metaShare), 1);
  const maxTop8Count = Math.max(...top8Heroes.map((h) => h.count), 1);

  return heroStats.map((h) => {
    const t8 = top8Map.get(h.hero);
    const wrScore = (h.avgWinRate / 100) * 40;
    const playScore = (h.metaShare / maxMetaShare) * 30;
    const top8Score = ((t8?.count ?? 0) / maxTop8Count) * 30;
    const score = wrScore + playScore + top8Score;
    const heroInfo = getHeroByName(h.hero);

    return {
      hero: h.hero,
      heroClass: heroInfo?.classes[0],
      score,
      tier: assignTier(score),
      winRate: h.avgWinRate,
      metaShare: h.metaShare,
      top8Count: t8?.count ?? 0,
      totalMatches: h.totalMatches,
      playerCount: h.playerCount,
    };
  }).sort((a, b) => b.score - a.score);
}

function updateTierUrl(params: Record<string, string>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) {
    if (v && v !== "all") url.searchParams.set(k, v);
    else url.searchParams.delete(k);
  }
  window.history.replaceState({}, "", url.toString());
}

export default function TierListPage() {
  const { entries, loading } = useLeaderboard(true);
  const searchParams = useSearchParams();
  const [filterFormat, setFilterFormat] = useState(searchParams.get("format") || "all");
  const [period, setPeriod] = useState<MetaPeriod>((searchParams.get("period") as MetaPeriod) || "all");
  const [expandedHero, setExpandedHero] = useState<string | null>(null);

  const setFormatWithUrl = (v: string) => { setFilterFormat(v); updateTierUrl({ format: v, period }); };
  const setPeriodWithUrl = (v: MetaPeriod) => { setPeriod(v); updateTierUrl({ format: filterFormat, period: v }); };

  const allFormats = useMemo(() => getAvailableFormats(entries), [entries]);

  const effectiveFormat = filterFormat !== "all" ? filterFormat : undefined;

  const { heroStats } = useMemo(
    () => computeMetaStats(entries, effectiveFormat, undefined, period),
    [entries, effectiveFormat, period],
  );

  const top8Heroes = useMemo(
    () => computeTop8HeroMeta(entries, undefined, effectiveFormat),
    [entries, effectiveFormat],
  );

  const scoredHeroes = useMemo(
    () => computeTierList(heroStats, top8Heroes),
    [heroStats, top8Heroes],
  );

  const tierGroups = useMemo(() => {
    const groups: Record<Tier, ScoredHero[]> = { S: [], A: [], B: [], C: [], D: [] };
    for (const h of scoredHeroes) groups[h.tier].push(h);
    return groups;
  }, [scoredHeroes]);

  const maxMetaShare = useMemo(() => Math.max(...heroStats.map((h) => h.metaShare), 1), [heroStats]);
  const maxTop8Count = useMemo(() => Math.max(...top8Heroes.map((h) => h.count), 1), [top8Heroes]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />
        {TIERS.map((t) => (
          <div key={t} className="h-20 bg-fab-surface border border-fab-border rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center ring-1 ring-inset ring-fuchsia-500/20">
          <AlignLeft className="w-4 h-4 text-fuchsia-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-fab-text leading-tight">Hero Tier List</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-fab-gold/15 text-fab-gold">Beta</span>
          </div>
          <p className="text-xs text-fab-muted leading-tight">
            Data-driven rankings from community stats
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Period pills */}
        <div className="flex gap-1">
          {([
            { id: "all" as MetaPeriod, label: "All Time" },
            { id: "monthly" as MetaPeriod, label: "Last 30 Days" },
            { id: "weekly" as MetaPeriod, label: "Last 7 Days" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriodWithUrl(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                period === tab.id
                  ? "bg-fab-gold text-fab-bg"
                  : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Format pills */}
        {allFormats.length > 1 && (
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
      </div>

      {/* Scoring info */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] text-fab-dim">
          Score = Win Rate (40%) + Play Rate (30%) + Top 8 Rate (30%)
        </p>
        <Link href="/meta" className="text-[10px] text-fab-dim hover:text-fab-text transition-colors">
          Full meta stats →
        </Link>
      </div>

      {/* Tier distribution donut */}
      {scoredHeroes.length > 0 && (
        <div className="flex items-center gap-4 mb-6 bg-fab-surface border border-fab-border rounded-lg p-4">
          <MiniDonut
            size={100}
            strokeWidth={14}
            segments={TIERS.filter((t) => tierGroups[t].length > 0).map((t) => ({
              value: tierGroups[t].length,
              color: { S: "#e879f9", A: "#38bdf8", B: "#4ade80", C: "#facc15", D: "#9ca3af" }[t],
              label: t,
            }))}
            centerLabel={<span className="text-xs font-bold text-fab-text">{scoredHeroes.length}</span>}
          />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-1.5 flex-1">
            {TIERS.filter((t) => tierGroups[t].length > 0).map((t) => {
              const config = TIER_CONFIG[t];
              return (
                <div key={t} className="flex items-center gap-2">
                  <span className={`text-sm font-black ${config.color}`}>{t}</span>
                  <span className="text-xs text-fab-muted">{tierGroups[t].length} heroes</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tier rows */}
      {scoredHeroes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-fab-muted">No hero data available yet.</p>
          <p className="text-fab-dim text-sm mt-1">
            {period !== "all"
              ? "No data for this time period. Players need to re-import matches."
              : "Players need to import matches for tier data to appear."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {TIERS.map((tier) => {
            const heroes = tierGroups[tier];
            if (heroes.length === 0) return null;
            const config = TIER_CONFIG[tier];
            return (
              <div key={tier} className={`border ${config.border} rounded-lg overflow-hidden`}>
                <div className="flex items-stretch">
                  {/* Tier label */}
                  <div className={`${config.bg} flex items-center justify-center w-12 sm:w-14 shrink-0 border-r ${config.border}`}>
                    <span className={`text-2xl font-black ${config.color}`}>{config.label}</span>
                  </div>

                  {/* Heroes */}
                  <div className="flex-1 p-2 sm:p-3">
                    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                      {heroes.map((h) => (
                        <button
                          key={h.hero}
                          onClick={() => setExpandedHero(expandedHero === h.hero ? null : h.hero)}
                          className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all ${
                            expandedHero === h.hero
                              ? `${config.bg} ${config.border}`
                              : "border-fab-border bg-fab-surface hover:border-fab-muted"
                          }`}
                          title={`${h.hero} — Score: ${h.score.toFixed(1)}`}
                        >
                          <HeroClassIcon heroClass={h.heroClass} size="sm" />
                          <span className="text-xs font-medium text-fab-text truncate max-w-[100px] sm:max-w-[140px]">
                            {h.hero.split(",")[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expanded hero detail */}
                <AnimatePresence initial={false}>
                  {heroes.some((h) => h.hero === expandedHero) && (
                    <motion.div
                      key={expandedHero}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <HeroDetail
                        hero={heroes.find((h) => h.hero === expandedHero)!}
                        borderClass={config.border}
                        bgClass={config.bg}
                        colorClass={config.color}
                        maxMetaShare={maxMetaShare}
                        maxTop8Count={maxTop8Count}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HeroDetail({ hero: h, borderClass, bgClass, colorClass, maxMetaShare, maxTop8Count }: {
  hero: ScoredHero;
  borderClass: string;
  bgClass: string;
  colorClass: string;
  maxMetaShare: number;
  maxTop8Count: number;
}) {
  // Recompute score components for the breakdown bar
  const wrComponent = (h.winRate / 100) * 40;
  const playComponent = maxMetaShare > 0 ? (h.metaShare / maxMetaShare) * 30 : 0;
  const t8Component = maxTop8Count > 0 ? (h.top8Count / maxTop8Count) * 30 : 0;

  return (
    <div className={`border-t ${borderClass} px-4 py-3 ${bgClass}`}>
      <div className="flex items-center gap-3 mb-3">
        <HeroClassIcon heroClass={h.heroClass} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-fab-text">{h.hero}</p>
          <p className="text-[10px] text-fab-dim">
            Composite Score: <span className={`font-bold ${colorClass}`}>{h.score.toFixed(1)}</span>
          </p>
        </div>
        <WinRateRing value={h.winRate} size={40} strokeWidth={3.5} />
      </div>

      {/* Score composition bar */}
      <div className="mb-3">
        <p className="text-[10px] text-fab-dim mb-1">Score Breakdown</p>
        <SegmentedBar
          segments={[
            { value: wrComponent, color: "var(--color-fab-win)", label: `WR ${wrComponent.toFixed(0)}` },
            { value: playComponent, color: "var(--color-fab-gold)", label: `Play ${playComponent.toFixed(0)}` },
            { value: t8Component, color: "#60a5fa", label: `T8 ${t8Component.toFixed(0)}` },
          ]}
          height="md"
          showLabels
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-fab-bg/50 rounded-lg p-2">
          <p className="text-sm font-bold text-fab-text">{h.metaShare.toFixed(1)}%</p>
          <p className="text-[10px] text-fab-dim">Meta Share</p>
        </div>
        <div className="bg-fab-bg/50 rounded-lg p-2">
          <p className="text-sm font-bold text-fab-text">{h.top8Count}</p>
          <p className="text-[10px] text-fab-dim">Top 8s</p>
        </div>
        <div className="bg-fab-bg/50 rounded-lg p-2">
          <p className="text-sm font-bold text-fab-text">{h.totalMatches.toLocaleString()}</p>
          <p className="text-[10px] text-fab-dim">Matches</p>
        </div>
        <div className="bg-fab-bg/50 rounded-lg p-2">
          <p className="text-sm font-bold text-fab-text">{h.playerCount}</p>
          <p className="text-[10px] text-fab-dim">Players</p>
        </div>
      </div>
    </div>
  );
}

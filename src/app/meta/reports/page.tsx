"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { getAvailableFormats } from "@/lib/meta-stats";
import { computeMetaReport, type MetaMover } from "@/lib/meta-reports";
import { getHeroByName } from "@/lib/heroes";
import { HeroImg } from "@/components/heroes/HeroImg";

type CompareMode = "week_vs_month" | "month_vs_all";

export default function MetaReportsPage() {
  const { entries, loading } = useLeaderboard(true);
  const [filterFormat, setFilterFormat] = useState("all");
  const [compareMode, setCompareMode] = useState<CompareMode>("week_vs_month");

  const allFormats = useMemo(() => getAvailableFormats(entries), [entries]);
  const effectiveFormat = filterFormat !== "all" ? filterFormat : undefined;

  const report = useMemo(() => {
    const [current, previous] = compareMode === "week_vs_month"
      ? ["weekly" as const, "monthly" as const]
      : ["monthly" as const, "all" as const];
    return computeMetaReport(entries, effectiveFormat, current, previous);
  }, [entries, effectiveFormat, compareMode]);

  const topHeroes = report.current.slice(0, 10);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-fab-surface border border-fab-border rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center ring-1 ring-inset ring-violet-500/20">
          <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-fab-text leading-tight">Meta Report</h1>
          <p className="text-xs text-fab-muted leading-tight">
            {compareMode === "week_vs_month" ? "This Week vs Last 30 Days" : "This Month vs All Time"}
          </p>
        </div>
        <Link href="/meta" className="text-xs text-fab-dim hover:text-fab-text transition-colors">
          Full meta →
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex gap-1">
          {([
            { id: "week_vs_month" as CompareMode, label: "Week vs Month" },
            { id: "month_vs_all" as CompareMode, label: "Month vs All" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCompareMode(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                compareMode === tab.id
                  ? "bg-fab-gold text-fab-bg"
                  : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {allFormats.length > 1 && (
          <div className="flex gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border">
            <button
              onClick={() => setFilterFormat("all")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                filterFormat === "all" ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
              }`}
            >
              All
            </button>
            {allFormats.map((f) => (
              <button
                key={f}
                onClick={() => setFilterFormat(f)}
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

      {report.current.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-fab-muted">No meta data for this period.</p>
          <p className="text-fab-dim text-sm mt-1">Try a different time range or wait for more players to import matches.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Heroes */}
          <section>
            <h2 className="text-sm font-bold text-fab-text mb-3">Top Heroes</h2>
            <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
              {topHeroes.map((hero, i) => {
                const heroInfo = getHeroByName(hero.hero);
                const mover = report.movers.find((m) => m.hero === hero.hero);
                return (
                  <div key={hero.hero} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-fab-border" : ""}`}>
                    <span className="text-xs font-bold w-4 text-center text-fab-dim">{i + 1}</span>
                    <HeroImg name={hero.hero} size="sm" />
                    <span className="text-sm font-medium text-fab-text flex-1 truncate">{hero.hero}</span>
                    <span className="text-xs text-fab-muted">{hero.metaShare.toFixed(1)}%</span>
                    {mover && (
                      <DeltaBadge value={mover.shareChange} suffix="%" />
                    )}
                    <span className={`text-xs font-semibold ${hero.avgWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                      {hero.avgWinRate.toFixed(0)}% WR
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Biggest Movers */}
          {report.movers.filter((m) => Math.abs(m.shareChange) > 0.5).length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-fab-text mb-3">Biggest Movers</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {report.movers
                  .filter((m) => Math.abs(m.shareChange) > 0.5)
                  .slice(0, 8)
                  .map((m) => (
                    <MoverCard key={m.hero} mover={m} />
                  ))}
              </div>
            </section>
          )}

          {/* Emerging Threats */}
          {report.emerging.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-fab-text mb-1">Emerging Threats</h2>
              <p className="text-[10px] text-fab-dim mb-3">Heroes gaining meta share</p>
              <div className="space-y-1.5">
                {report.emerging.slice(0, 5).map((m) => (
                  <MoverRow key={m.hero} mover={m} />
                ))}
              </div>
            </section>
          )}

          {/* Declining Heroes */}
          {report.declining.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-fab-text mb-1">Declining Heroes</h2>
              <p className="text-[10px] text-fab-dim mb-3">Heroes losing meta share</p>
              <div className="space-y-1.5">
                {report.declining.slice(0, 5).map((m) => (
                  <MoverRow key={m.hero} mover={m} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function DeltaBadge({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (Math.abs(value) < 0.1) return null;
  const isPositive = value > 0;
  return (
    <span className={`text-[10px] font-bold ${isPositive ? "text-fab-win" : "text-fab-loss"}`}>
      {isPositive ? "+" : ""}{value.toFixed(1)}{suffix}
    </span>
  );
}

function MoverCard({ mover }: { mover: MetaMover }) {
  const heroInfo = getHeroByName(mover.hero);
  const isUp = mover.shareChange > 0;

  return (
    <div className={`bg-fab-surface border rounded-lg p-3 flex items-center gap-3 ${isUp ? "border-fab-win/20" : "border-fab-loss/20"}`}>
      <HeroImg name={mover.hero} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fab-text truncate">{mover.hero.split(",")[0]}</p>
        <p className="text-[10px] text-fab-dim">
          {mover.currentShare.toFixed(1)}% meta share
        </p>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1">
          <svg className={`w-3 h-3 ${isUp ? "text-fab-win" : "text-fab-loss"}`} fill="currentColor" viewBox="0 0 20 20">
            {isUp
              ? <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
              : <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
            }
          </svg>
          <span className={`text-xs font-bold ${isUp ? "text-fab-win" : "text-fab-loss"}`}>
            {isUp ? "+" : ""}{mover.shareChange.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function MoverRow({ mover }: { mover: MetaMover }) {
  const heroInfo = getHeroByName(mover.hero);
  const isUp = mover.shareChange > 0;

  return (
    <div className="flex items-center gap-3 bg-fab-surface border border-fab-border rounded-lg px-3 py-2">
      <HeroImg name={mover.hero} size="sm" />
      <span className="text-sm font-medium text-fab-text flex-1 truncate">{mover.hero}</span>
      <span className="text-xs text-fab-muted">{mover.currentShare.toFixed(1)}%</span>
      <DeltaBadge value={mover.shareChange} suffix="%" />
      <span className={`text-xs ${mover.currentWR >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
        {mover.currentWR.toFixed(0)}% WR
      </span>
    </div>
  );
}

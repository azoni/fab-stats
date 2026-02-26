"use client";
import Link from "next/link";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import type { HeroMetaStats } from "@/lib/meta-stats";

interface MetaSnapshotProps {
  topHeroes: HeroMetaStats[];
}

export function MetaSnapshot({ topHeroes }: MetaSnapshotProps) {
  if (topHeroes.length === 0) return null;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-fab-text">Meta Snapshot</h2>
        <Link href="/meta" className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors">
          View Full Meta
        </Link>
      </div>
      <div className="bg-fab-surface border border-fab-border rounded-lg divide-y divide-fab-border flex-1">
        {topHeroes.slice(0, 5).map((hero, i) => {
          const heroInfo = getHeroByName(hero.hero);
          const heroClass = heroInfo?.classes[0];

          return (
            <div key={hero.hero} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-sm font-bold w-5 text-center text-fab-dim">{i + 1}</span>
              <HeroClassIcon heroClass={heroClass} size="sm" />
              <span className="font-medium text-fab-text flex-1 truncate text-sm">{hero.hero}</span>
              <span className="text-xs text-fab-dim shrink-0">{hero.metaShare.toFixed(1)}%</span>
              <span className={`text-xs font-semibold shrink-0 w-14 text-right ${hero.avgWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                {hero.avgWinRate.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";
import { useMemo } from "react";
import Link from "next/link";
import type { PlayoffFinish } from "@/lib/stats";
import { TIER_MAP, EVENT_ABBR, PLACEMENT_TEXT, col, glowFilter } from "@/components/profile/TrophyCase";

interface MemberFinish extends PlayoffFinish {
  memberName: string;
  memberUsername?: string;
}

interface TeamRecentPlacementsProps {
  finishes: MemberFinish[];
  accentColor?: string;
}

const PLACEMENT_LABEL: Record<PlayoffFinish["type"], string> = {
  champion: "Champion",
  finalist: "Finalist",
  top4: "Top 4",
  top8: "Top 8",
};

function PlacementBadge({ type }: { type: PlayoffFinish["type"] }) {
  const c = col(type);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ background: `${c.from}20`, color: c.from }}
    >
      {PLACEMENT_LABEL[type]}
    </span>
  );
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function TeamRecentPlacements({ finishes, accentColor = "#d4a843" }: TeamRecentPlacementsProps) {
  const recent = useMemo(() => {
    return [...finishes]
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
      .slice(0, 8);
  }, [finishes]);

  if (recent.length === 0) return null;

  // Count summary
  const summary = useMemo(() => {
    const wins = finishes.filter((f) => f.type === "champion").length;
    const finals = finishes.filter((f) => f.type === "finalist").length;
    const top4 = finishes.filter((f) => f.type === "top4").length;
    const top8 = finishes.filter((f) => f.type === "top8").length;
    return { wins, finals, top4, top8, total: finishes.length };
  }, [finishes]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-fab-text uppercase tracking-wider">Accomplishments</h2>
        <div className="flex items-center gap-3 text-[10px] text-fab-dim">
          {summary.wins > 0 && <span><span className="text-amber-400 font-bold">{summary.wins}</span> wins</span>}
          {summary.finals > 0 && <span><span className="text-gray-400 font-bold">{summary.finals}</span> finals</span>}
          {summary.top4 > 0 && <span><span className="text-amber-600 font-bold">{summary.top4}</span> top 4</span>}
          {summary.top8 > 0 && <span><span className="text-blue-400 font-bold">{summary.top8}</span> top 8</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {recent.map((f, i) => {
          const abbr = EVENT_ABBR[f.eventType] || f.eventType.slice(0, 3).toUpperCase();
          const c = col(f.type);

          return (
            <div
              key={`${f.eventName}-${f.eventDate}-${i}`}
              className="relative bg-fab-surface border border-fab-border rounded-xl p-4 hover:border-white/10 transition-colors group overflow-hidden"
            >
              {/* Subtle accent glow */}
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 pointer-events-none"
                style={{ background: c.from }}
              />

              <div className="relative flex items-start gap-3">
                {/* Event type badge */}
                <div
                  className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-black"
                  style={{ background: `${c.from}15`, color: c.from }}
                >
                  {abbr}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <PlacementBadge type={f.type} />
                    {f.hero && (
                      <span className="text-[10px] text-fab-dim truncate">on {f.hero.split(",")[0]}</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-fab-text truncate">{f.eventName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {f.memberUsername ? (
                      <Link href={`/player/${f.memberUsername}`} className="text-xs text-fab-muted hover:text-fab-text transition-colors">
                        {f.memberName}
                      </Link>
                    ) : (
                      <span className="text-xs text-fab-muted">{f.memberName}</span>
                    )}
                    <span className="text-fab-dim">·</span>
                    <span className="text-[10px] text-fab-dim">{formatDate(f.eventDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {finishes.length > 8 && (
        <p className="text-center text-[10px] text-fab-dim mt-3">
          Showing 8 most recent of {finishes.length} total placements
        </p>
      )}
    </div>
  );
}

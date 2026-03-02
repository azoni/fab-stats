"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import {
  computeTrends,
  computeRollingWinRate,
  computeHeroStats,
  computeEventStats,
  computeEventTypeStats,
  computeVenueStats,
  computeStreaks,
  computePlayoffFinishes,
  getEventType,
} from "@/lib/stats";
import { MatchResult } from "@/types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { localDate } from "@/lib/constants";
import { TrendsIcon } from "@/components/icons/NavIcons";

const COLORS = {
  gold: "#c9a84c",
  win: "#22c55e",
  loss: "#ef4444",
  draw: "#eab308",
  muted: "#888899",
  border: "#2a2a3e",
  surface: "#141420",
  text: "#e5e5e5",
};

const FORMAT_COLORS = [
  "#c9a84c",
  "#8b1a1a",
  "#22c55e",
  "#6366f1",
  "#eab308",
  "#ec4899",
  "#14b8a6",
];

const EVENT_TYPE_COLORS: Record<string, string> = {
  Armory: "#22c55e",
  Skirmish: "#6366f1",
  ProQuest: "#c9a84c",
  "Road to Nationals": "#f59e0b",
  "Battle Hardened": "#ef4444",
  "The Calling": "#ec4899",
  Nationals: "#8b5cf6",
  "Pro Tour": "#14b8a6",
  Worlds: "#f97316",
  "Pre-Release": "#64748b",
  "On Demand": "#64748b",
  Other: "#888899",
};

const FINISH_COLORS: Record<string, string> = {
  champion: "#c9a84c",
  finalist: "#94a3b8",
  top4: "#d97706",
  top8: "#3b82f6",
};

const FINISH_LABELS: Record<string, string> = {
  champion: "Champion",
  finalist: "Finalist",
  top4: "Top 4",
  top8: "Top 8",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const tooltipStyle = {
  backgroundColor: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  color: COLORS.text,
};

export default function TrendsPage() {
  const { matches, isLoaded } = useMatches();
  const { user } = useAuth();
  const [granularity, setGranularity] = useState<"weekly" | "monthly">("weekly");
  const [windowSize, setWindowSize] = useState(10);

  // Win Rate by Format
  const formatWinRate = useMemo(() => {
    const map = new Map<string, { w: number; l: number; d: number }>();
    for (const m of matches) {
      const f = m.format;
      const entry = map.get(f) ?? { w: 0, l: 0, d: 0 };
      if (m.result === MatchResult.Win) entry.w++;
      else if (m.result === MatchResult.Loss) entry.l++;
      else entry.d++;
      map.set(f, entry);
    }
    return Array.from(map.entries())
      .map(([format, { w, l, d }]) => {
        const total = w + l + d;
        return { format, wins: w, losses: l, draws: d, total, winRate: total > 0 ? Math.round((w / total) * 100) : 0 };
      })
      .filter((f) => f.total >= 2)
      .sort((a, b) => b.total - a.total);
  }, [matches]);

  // Win Rate by Day of Week
  const dayOfWeekData = useMemo(() => {
    const days = DAYS.map(() => ({ w: 0, l: 0, d: 0 }));
    for (const m of matches) {
      const day = localDate(m.date).getDay();
      if (m.result === MatchResult.Win) days[day].w++;
      else if (m.result === MatchResult.Loss) days[day].l++;
      else days[day].d++;
    }
    return DAYS.map((name, i) => {
      const { w, l, d } = days[i];
      const total = w + l + d;
      return { day: name, wins: w, losses: l, total, winRate: total > 0 ? Math.round((w / total) * 100) : 0 };
    }).filter((d) => d.total > 0);
  }, [matches]);

  // Win Rate by Event Type
  const eventTypeWinRate = useMemo(() => {
    const map = new Map<string, { w: number; l: number; d: number }>();
    for (const m of matches) {
      const et = getEventType(m);
      const entry = map.get(et) ?? { w: 0, l: 0, d: 0 };
      if (m.result === MatchResult.Win) entry.w++;
      else if (m.result === MatchResult.Loss) entry.l++;
      else entry.d++;
      map.set(et, entry);
    }
    return Array.from(map.entries())
      .map(([eventType, { w, l, d }]) => {
        const total = w + l + d;
        return { eventType, wins: w, losses: l, draws: d, total, winRate: total > 0 ? Math.round((w / total) * 100) : 0 };
      })
      .filter((e) => e.total >= 2)
      .sort((a, b) => b.total - a.total);
  }, [matches]);

  // First half vs second half of career
  const halfComparison = useMemo(() => {
    if (matches.length < 10) return null;
    const sorted = [...matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const mid = Math.floor(sorted.length / 2);
    const first = sorted.slice(0, mid);
    const second = sorted.slice(mid);
    const wr = (arr: typeof matches) => {
      const w = arr.filter((m) => m.result === MatchResult.Win).length;
      return arr.length > 0 ? Math.round((w / arr.length) * 100) : 0;
    };
    return {
      firstCount: first.length,
      secondCount: second.length,
      firstWR: wr(first),
      secondWR: wr(second),
      diff: wr(second) - wr(first),
    };
  }, [matches]);

  // Rated vs Unrated
  const ratedComparison = useMemo(() => {
    const rated = matches.filter((m) => m.rated === true);
    const unrated = matches.filter((m) => m.rated !== true);
    if (rated.length < 2 || unrated.length < 2) return null;
    const wr = (arr: typeof matches) => {
      const w = arr.filter((m) => m.result === MatchResult.Win).length;
      return arr.length > 0 ? Math.round((w / arr.length) * 100) : 0;
    };
    return { ratedCount: rated.length, unratedCount: unrated.length, ratedWR: wr(rated), unratedWR: wr(unrated) };
  }, [matches]);

  // ── New data computations ──

  // Streaks
  const streakInfo = useMemo(() => {
    const sorted = [...matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return computeStreaks(sorted);
  }, [matches]);

  // Events played
  const eventStats = useMemo(() => computeEventStats(matches), [matches]);

  // Event type stats for "Best Event Type" card
  const eventTypeStats = useMemo(() => computeEventTypeStats(matches), [matches]);
  const bestEventType = useMemo(() => {
    const qualified = eventTypeStats.filter((e) => e.totalMatches >= 5);
    if (qualified.length === 0) return null;
    return qualified.reduce((best, e) => e.winRate > best.winRate ? e : best);
  }, [eventTypeStats]);

  // Unique heroes
  const uniqueHeroes = useMemo(() => new Set(matches.map((m) => m.heroPlayed)).size, [matches]);

  // Hero performance
  const heroStats = useMemo(() => computeHeroStats(matches).filter((h) => h.totalMatches >= 3), [matches]);

  // Cumulative record over time
  const cumulativeData = useMemo(() => {
    const sorted = [...matches]
      .filter((m) => m.result !== MatchResult.Bye)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sorted.length === 0) return [];
    let wins = 0;
    let losses = 0;
    // Sample at most ~100 points for performance
    const step = Math.max(1, Math.floor(sorted.length / 100));
    const data: { index: number; date: string; wins: number; losses: number }[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].result === MatchResult.Win) wins++;
      else if (sorted[i].result === MatchResult.Loss) losses++;
      if (i % step === 0 || i === sorted.length - 1) {
        data.push({ index: i + 1, date: sorted[i].date, wins, losses });
      }
    }
    return data;
  }, [matches]);

  // Event type win rate over time (monthly)
  const eventTypeOverTime = useMemo(() => {
    const sorted = [...matches]
      .filter((m) => m.result !== MatchResult.Bye)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sorted.length === 0) return { data: [] as Record<string, unknown>[], eventTypes: [] as string[] };

    // Group by month + event type
    const monthMap = new Map<string, Map<string, { w: number; t: number }>>();
    const allEventTypes = new Set<string>();
    for (const m of sorted) {
      const d = localDate(m.date);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const et = getEventType(m);
      allEventTypes.add(et);
      if (!monthMap.has(month)) monthMap.set(month, new Map());
      const etMap = monthMap.get(month)!;
      const cur = etMap.get(et) ?? { w: 0, t: 0 };
      cur.t++;
      if (m.result === MatchResult.Win) cur.w++;
      etMap.set(et, cur);
    }

    // Only include event types with meaningful data (>= 5 total matches)
    const etTotals = new Map<string, number>();
    for (const etMap of monthMap.values()) {
      for (const [et, { t }] of etMap) {
        etTotals.set(et, (etTotals.get(et) ?? 0) + t);
      }
    }
    const qualifiedTypes = [...etTotals.entries()]
      .filter(([, total]) => total >= 5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([et]) => et);

    if (qualifiedTypes.length === 0) return { data: [], eventTypes: [] };

    const data = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, etMap]) => {
        const point: Record<string, unknown> = { month };
        for (const et of qualifiedTypes) {
          const stats = etMap.get(et);
          if (stats && stats.t >= 2) {
            point[et] = Math.round((stats.w / stats.t) * 100);
          }
        }
        return point;
      });

    return { data, eventTypes: qualifiedTypes };
  }, [matches]);

  // Best & worst opponent matchups (aggregate across all heroes)
  const opponentMatchups = useMemo(() => {
    const aggMap = new Map<string, { w: number; l: number; d: number }>();
    for (const hero of computeHeroStats(matches)) {
      for (const mu of hero.matchups) {
        if (!mu.opponentHero || mu.opponentHero === "Unknown") continue;
        const cur = aggMap.get(mu.opponentHero) ?? { w: 0, l: 0, d: 0 };
        cur.w += mu.wins;
        cur.l += mu.losses;
        cur.d += mu.draws;
        aggMap.set(mu.opponentHero, cur);
      }
    }
    const all = [...aggMap.entries()]
      .map(([hero, { w, l, d }]) => {
        const total = w + l + d;
        return { hero, wins: w, losses: l, draws: d, total, winRate: total > 0 ? Math.round((w / total) * 100) : 0 };
      })
      .filter((m) => m.total >= 3);
    const sorted = [...all].sort((a, b) => b.winRate - a.winRate || b.total - a.total);
    return {
      best: sorted.slice(0, 5),
      worst: [...all].sort((a, b) => a.winRate - b.winRate || b.total - a.total).slice(0, 5),
    };
  }, [matches]);

  // Venue performance
  const venueData = useMemo(() => {
    const stats = computeVenueStats(matches)
      .filter((v) => v.venue !== "Unknown" && v.totalMatches >= 3);
    return stats;
  }, [matches]);

  // Tournament finishes
  const playoffFinishes = useMemo(() => computePlayoffFinishes(eventStats), [eventStats]);

  if (!isLoaded) {
    return <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />;
  }

  if (matches.length < 2) {
    return (
      <div className="text-center py-16 text-fab-dim">
        <p className="text-lg mb-1">Not enough data yet</p>
        <p className="text-sm mb-4">
          {user ? "Import a few more matches and charts will appear here showing how your performance changes over time." : "Sign up and import your matches to see performance trends and charts."}
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

  const trendData = computeTrends(matches, granularity);
  const rollingData = computeRollingWinRate(matches, windowSize);

  // Format breakdown for pie chart
  const formatCounts = new Map<string, number>();
  for (const m of matches) {
    formatCounts.set(m.format, (formatCounts.get(m.format) ?? 0) + 1);
  }
  const pieData = Array.from(formatCounts.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center ring-1 ring-inset ring-emerald-500/20">
          <TrendsIcon className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-fab-text leading-tight">Performance Trends</h1>
          <p className="text-xs text-fab-muted leading-tight">See how your win rate and activity change over time</p>
        </div>
      </div>

      {/* Stat Cards — Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Matches" value={matches.length.toString()} />
        <StatCard
          label="Overall Win Rate"
          value={`${Math.round((matches.filter((m) => m.result === MatchResult.Win).length / matches.length) * 100)}%`}
          color={matches.filter((m) => m.result === MatchResult.Win).length / matches.length >= 0.5 ? "win" : "loss"}
        />
        <StatCard
          label="Best Day"
          value={dayOfWeekData.length > 0 ? dayOfWeekData.reduce((best, d) => d.winRate > best.winRate ? d : best).day : "-"}
          sub={dayOfWeekData.length > 0 ? `${dayOfWeekData.reduce((best, d) => d.winRate > best.winRate ? d : best).winRate}% WR` : undefined}
        />
        {halfComparison && (
          <StatCard
            label="Improvement"
            value={`${halfComparison.diff >= 0 ? "+" : ""}${halfComparison.diff}%`}
            sub={`${halfComparison.firstWR}% → ${halfComparison.secondWR}%`}
            color={halfComparison.diff >= 0 ? "win" : "loss"}
          />
        )}
      </div>

      {/* Stat Cards — Row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Events Played" value={eventStats.length.toString()} />
        <StatCard
          label="Win Streak"
          value={streakInfo.longestWinStreak.toString()}
          sub={streakInfo.currentStreak?.type === MatchResult.Win ? `${streakInfo.currentStreak.count} current` : undefined}
          color="win"
        />
        <StatCard label="Unique Heroes" value={uniqueHeroes.toString()} />
        {bestEventType && (
          <StatCard
            label="Best Event Type"
            value={bestEventType.eventType}
            sub={`${Math.round(bestEventType.winRate)}% WR (${bestEventType.totalMatches})`}
            color={bestEventType.winRate >= 50 ? "win" : "loss"}
          />
        )}
      </div>

      {/* Rolling Win Rate */}
      {rollingData.length > 0 && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-fab-text">Rolling Win Rate</h2>
            <div className="flex gap-1">
              {[5, 10, 20].map((w) => (
                <button
                  key={w}
                  onClick={() => setWindowSize(w)}
                  className={`px-2 py-1 rounded text-xs ${
                    windowSize === w
                      ? "bg-fab-gold/15 text-fab-gold"
                      : "text-fab-muted hover:text-fab-text"
                  }`}
                >
                  Last {w}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={rollingData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="date" tick={{ fill: COLORS.muted, fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: COLORS.muted, fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="winRate"
                stroke={COLORS.gold}
                strokeWidth={2}
                dot={false}
                name="Win Rate %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Matches Over Time */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-fab-text">Matches Over Time</h2>
          <div className="flex gap-1">
            {(["weekly", "monthly"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-2 py-1 rounded text-xs ${
                  granularity === g
                    ? "bg-fab-gold/15 text-fab-gold"
                    : "text-fab-muted hover:text-fab-text"
                }`}
              >
                {g === "weekly" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis dataKey="label" tick={{ fill: COLORS.muted, fontSize: 11 }} />
            <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="wins" fill={COLORS.win} name="Wins" stackId="a" />
            <Bar
              dataKey="matches"
              fill={COLORS.loss}
              name="Total"
              stackId="b"
              opacity={0.3}
            />
            <Legend />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative Record */}
      {cumulativeData.length > 2 && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <h2 className="text-lg font-semibold text-fab-text mb-4">Cumulative Record</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="date" tick={{ fill: COLORS.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: number, name: string) => {
                  return [value, name === "wins" ? "Wins" : "Losses"];
                }) as any}
              />
              <Area type="monotone" dataKey="wins" stroke={COLORS.win} fill={COLORS.win} fillOpacity={0.15} strokeWidth={2} name="wins" />
              <Area type="monotone" dataKey="losses" stroke={COLORS.loss} fill={COLORS.loss} fillOpacity={0.15} strokeWidth={2} name="losses" />
              <Legend formatter={(value: string) => value === "wins" ? "Wins" : "Losses"} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Win Rate by Format + Format Breakdown side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win Rate by Format */}
        {formatWinRate.length > 0 && (
          <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
            <h2 className="text-lg font-semibold text-fab-text mb-4">Win Rate by Format</h2>
            <div className="space-y-3">
              {formatWinRate.map((f) => (
                <Link key={f.format} href={`/events?format=${encodeURIComponent(f.format)}`} className="block hover:opacity-80 transition-opacity">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-fab-text">{f.format}</span>
                    <span className="text-fab-dim">{f.wins}W-{f.losses}L{f.draws > 0 ? `-${f.draws}D` : ""} <span className={f.winRate >= 50 ? "text-fab-win font-medium" : "text-fab-loss font-medium"}>({f.winRate}%)</span></span>
                  </div>
                  <div className="h-2 bg-fab-bg rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${f.winRate >= 50 ? "bg-fab-win" : "bg-fab-loss"}`}
                      style={{ width: `${f.winRate}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Format Breakdown */}
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <h2 className="text-lg font-semibold text-fab-text mb-4">Format Breakdown</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={FORMAT_COLORS[i % FORMAT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Win Rate by Event Type */}
      {eventTypeWinRate.length > 1 && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <h2 className="text-lg font-semibold text-fab-text mb-4">Win Rate by Event Type</h2>
          <div className="space-y-3">
            {eventTypeWinRate.map((e) => (
              <Link key={e.eventType} href={`/events?type=${encodeURIComponent(e.eventType)}`} className="block hover:opacity-80 transition-opacity">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-fab-text">{e.eventType}</span>
                  <span className="text-fab-dim">{e.wins}W-{e.losses}L{e.draws > 0 ? `-${e.draws}D` : ""} ({e.total}) <span className={e.winRate >= 50 ? "text-fab-win font-medium" : "text-fab-loss font-medium"}>{e.winRate}%</span></span>
                </div>
                <div className="h-2 bg-fab-bg rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${e.winRate >= 50 ? "bg-fab-win" : "bg-fab-loss"}`}
                    style={{ width: `${e.winRate}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Event Type Win Rate Over Time */}
      {eventTypeOverTime.data.length > 1 && eventTypeOverTime.eventTypes.length > 0 && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <h2 className="text-lg font-semibold text-fab-text mb-1">Event Type Performance Over Time</h2>
          <p className="text-xs text-fab-dim mb-4">Monthly win rate by event type (min 2 matches/month)</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={eventTypeOverTime.data}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="month" tick={{ fill: COLORS.muted, fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: COLORS.muted, fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: number) => [`${value}%`, undefined]) as any}
              />
              {eventTypeOverTime.eventTypes.map((et) => (
                <Line
                  key={et}
                  type="monotone"
                  dataKey={et}
                  stroke={EVENT_TYPE_COLORS[et] || COLORS.muted}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                  name={et}
                />
              ))}
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Hero Performance */}
      {heroStats.length > 0 && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <h2 className="text-lg font-semibold text-fab-text mb-1">Hero Performance</h2>
          <p className="text-xs text-fab-dim mb-4">Win rate by hero played (min 3 matches)</p>
          <div className="space-y-2.5">
            {heroStats.slice(0, 10).map((h) => (
              <div key={h.heroName}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-fab-text font-medium">{h.heroName}</span>
                  <span className="text-fab-dim">
                    {h.wins}W-{h.losses}L{h.draws > 0 ? `-${h.draws}D` : ""}{" "}
                    <span className={`font-medium ${h.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                      {Math.round(h.winRate)}%
                    </span>
                  </span>
                </div>
                <div className="h-2 bg-fab-bg rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${h.winRate >= 50 ? "bg-fab-win" : "bg-fab-loss"}`}
                    style={{ width: `${Math.min(h.winRate, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best & Worst Opponent Matchups */}
      {(opponentMatchups.best.length > 0 || opponentMatchups.worst.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Best Matchups */}
          {opponentMatchups.best.length > 0 && (
            <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
              <h2 className="text-lg font-semibold text-fab-text mb-1">Best Matchups</h2>
              <p className="text-xs text-fab-dim mb-4">Opponent heroes you dominate (min 3 matches)</p>
              <div className="space-y-2.5">
                {opponentMatchups.best.map((m) => (
                  <div key={m.hero}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-fab-text">{m.hero}</span>
                      <span className="text-fab-dim">
                        {m.wins}W-{m.losses}L{" "}
                        <span className="text-fab-win font-medium">{m.winRate}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-fab-bg rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-fab-win" style={{ width: `${Math.min(m.winRate, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Worst Matchups */}
          {opponentMatchups.worst.length > 0 && (
            <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
              <h2 className="text-lg font-semibold text-fab-text mb-1">Toughest Matchups</h2>
              <p className="text-xs text-fab-dim mb-4">Opponent heroes you struggle against (min 3 matches)</p>
              <div className="space-y-2.5">
                {opponentMatchups.worst.map((m) => (
                  <div key={m.hero}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-fab-text">{m.hero}</span>
                      <span className="text-fab-dim">
                        {m.wins}W-{m.losses}L{" "}
                        <span className="text-fab-loss font-medium">{m.winRate}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-fab-bg rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-fab-loss" style={{ width: `${Math.min(m.winRate, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Win Rate by Day of Week */}
      {dayOfWeekData.length > 1 && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <h2 className="text-lg font-semibold text-fab-text mb-4">Win Rate by Day of Week</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="day" tick={{ fill: COLORS.muted, fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: COLORS.muted, fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: number, name: string) => {
                  if (name === "winRate") return [`${value}%`, "Win Rate"];
                  return [value, name];
                }) as any}
              />
              <Bar dataKey="winRate" name="winRate" radius={[4, 4, 0, 0]}>
                {dayOfWeekData.map((entry, i) => (
                  <Cell key={i} fill={entry.winRate >= 50 ? COLORS.win : COLORS.loss} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-fab-dim justify-center">
            {dayOfWeekData.map((d) => (
              <span key={d.day}>{d.day}: {d.total} matches</span>
            ))}
          </div>
        </div>
      )}

      {/* Venue Performance */}
      {venueData.length >= 2 && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <h2 className="text-lg font-semibold text-fab-text mb-1">Venue Performance</h2>
          <p className="text-xs text-fab-dim mb-4">Win rate by location (min 3 matches)</p>
          <div className="space-y-3">
            {venueData.slice(0, 8).map((v) => (
              <div key={v.venue}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-fab-text truncate mr-3">{v.venue}</span>
                  <span className="text-fab-dim shrink-0">
                    {v.wins}W-{v.losses}L ({v.totalMatches}){" "}
                    <span className={`font-medium ${v.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                      {Math.round(v.winRate)}%
                    </span>
                  </span>
                </div>
                <div className="h-2 bg-fab-bg rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${v.winRate >= 50 ? "bg-fab-win" : "bg-fab-loss"}`}
                    style={{ width: `${v.winRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tournament Finishes Timeline */}
      {playoffFinishes.length > 0 && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <h2 className="text-lg font-semibold text-fab-text mb-1">Tournament Finishes</h2>
          <p className="text-xs text-fab-dim mb-4">Your competitive playoff placements over time</p>
          <div className="space-y-2">
            {playoffFinishes.map((f, i) => (
              <div key={`${f.eventName}-${f.eventDate}-${i}`} className="flex items-center gap-3 py-1.5 border-b border-fab-border last:border-0">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: FINISH_COLORS[f.type] }}
                />
                <span className="text-xs text-fab-dim w-20 shrink-0">{f.eventDate}</span>
                <span
                  className="text-xs font-semibold w-16 shrink-0"
                  style={{ color: FINISH_COLORS[f.type] }}
                >
                  {FINISH_LABELS[f.type]}
                </span>
                <span className="text-sm text-fab-text truncate">{f.eventName}</span>
                {f.hero && <span className="text-xs text-fab-muted shrink-0 ml-auto">{f.hero}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rated vs Unrated Comparison */}
      {ratedComparison && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <h2 className="text-lg font-semibold text-fab-text mb-4">Rated vs Casual</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-fab-dim uppercase tracking-wider mb-1">Rated</p>
              <p className={`text-2xl font-bold ${ratedComparison.ratedWR >= 50 ? "text-fab-win" : "text-fab-loss"}`}>{ratedComparison.ratedWR}%</p>
              <p className="text-xs text-fab-dim mt-0.5">{ratedComparison.ratedCount} matches</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-fab-dim uppercase tracking-wider mb-1">Casual</p>
              <p className={`text-2xl font-bold ${ratedComparison.unratedWR >= 50 ? "text-fab-win" : "text-fab-loss"}`}>{ratedComparison.unratedWR}%</p>
              <p className="text-xs text-fab-dim mt-0.5">{ratedComparison.unratedCount} matches</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: "win" | "loss" }) {
  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-3">
      <p className="text-xs text-fab-dim uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold ${color === "win" ? "text-fab-win" : color === "loss" ? "text-fab-loss" : "text-fab-gold"}`}>{value}</p>
      {sub && <p className="text-xs text-fab-dim mt-0.5">{sub}</p>}
    </div>
  );
}

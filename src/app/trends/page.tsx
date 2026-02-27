"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeTrends, computeRollingWinRate, getEventType } from "@/lib/stats";
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
} from "recharts";
import { localDate } from "@/lib/constants";

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
      <div>
        <h1 className="text-2xl font-bold text-fab-gold">Performance Trends</h1>
        <p className="text-fab-muted text-sm mt-1">See how your win rate and activity change over time</p>
      </div>

      {/* Stat Cards */}
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

"use client";
import { useState } from "react";
import Link from "next/link";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeTrends, computeRollingWinRate } from "@/lib/stats";
import { GameFormat, MatchResult } from "@/types";
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

const COLORS = {
  gold: "#c9a84c",
  win: "#22c55e",
  loss: "#ef4444",
  draw: "#eab308",
  muted: "#888899",
  border: "#2a2a3e",
  surface: "#141420",
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

export default function TrendsPage() {
  const { matches, isLoaded } = useMatches();
  const { user } = useAuth();
  const [granularity, setGranularity] = useState<"weekly" | "monthly">("weekly");
  const [windowSize, setWindowSize] = useState(10);

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
              <Tooltip
                contentStyle={{
                  backgroundColor: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  color: "#e5e5e5",
                }}
              />
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
            <Tooltip
              contentStyle={{
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                color: "#e5e5e5",
              }}
            />
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

      {/* Format Breakdown */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
        <h2 className="text-lg font-semibold text-fab-text mb-4">Format Breakdown</h2>
        <div className="flex flex-col md:flex-row items-center gap-4">
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
              <Tooltip
                contentStyle={{
                  backgroundColor: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  color: "#e5e5e5",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

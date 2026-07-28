"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import type { League } from "@/types";
import { pointsProgression, type PooledMatch, type ProgressionRow } from "@/lib/leagues-insights";

const CHART = { border: "#2a2a30", muted: "#888899" };
// [0] = fab-gold so the leader is always gold; wraps modulo for > palette length.
const LINE_PALETTE = [
  "#e0b34d", "#38bdf8", "#f472b6", "#34d399", "#a78bfa", "#fb923c",
  "#22d3ee", "#facc15", "#f87171", "#4ade80", "#c084fc", "#60a5fa",
  "#fbbf24", "#2dd4bf", "#e879f9", "#94a3b8",
];

/** The league "Trending" tab: a cumulative points-race line chart. One line per
 *  player, ending at their exact standings points (built from the same pool +
 *  scoring). Leader is gold, the viewer is highlighted; the legend chips toggle
 *  lines and hover-emphasize them. */
export function PointsProgression({
  matches,
  league,
  viewerUid,
}: {
  matches: PooledMatch[];
  league: League;
  viewerUid: string | null;
}) {
  const { rows, series, eventDates } = useMemo(() => pointsProgression(matches, league), [matches, league]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hoverUid, setHoverUid] = useState<string | null>(null);

  const colorByUid = useMemo(() => {
    const m: Record<string, string> = {};
    series.forEach((s, i) => (m[s.uid] = LINE_PALETTE[i % LINE_PALETTE.length]));
    return m;
  }, [series]);
  const nameByUid = useMemo(() => Object.fromEntries(series.map((s) => [s.uid, s.name])), [series]);
  // Numeric domain (pin the 0 line so a league with negative loss points still reads).
  const yDomain = useMemo<[number, number]>(() => {
    let min = 0;
    let max = 1;
    for (const r of rows)
      for (const s of series) {
        const v = r[s.uid];
        if (typeof v === "number") {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    return [Math.min(0, min), max];
  }, [rows, series]);

  const leaderUid = series[0]?.uid;
  const toggle = (uid: string) =>
    setHidden((p) => {
      const n = new Set(p);
      if (n.has(uid)) n.delete(uid);
      else n.add(uid);
      return n;
    });
  const focusTop = (n: number) =>
    setHidden(new Set(series.filter((s) => s.rank > n && s.uid !== viewerUid).map((s) => s.uid)));
  const showAll = () => setHidden(new Set());

  if (series.length === 0) {
    return (
      <p className="rounded-xl border border-fab-border bg-fab-surface p-4 text-sm text-fab-muted">
        No scored matches in view yet.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-fab-border bg-fab-surface p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-fab-dim">
          <TrendingUp className="h-4 w-4 text-fab-gold" /> Points progression
        </h3>
        {series.length > 6 && (
          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={showAll}
              className="rounded-md border border-fab-border/60 bg-fab-bg/60 px-2 py-0.5 font-bold text-fab-dim hover:text-fab-gold"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => focusTop(5)}
              className="rounded-md border border-fab-border/60 bg-fab-bg/60 px-2 py-0.5 font-bold text-fab-dim hover:text-fab-gold"
            >
              Top 5
            </button>
          </div>
        )}
      </div>

      {eventDates.length < 2 && (
        <p className="mb-2 text-[11px] text-fab-muted">
          Only one league night so far — the race chart fills out as more events are played.
        </p>
      )}

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.border} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: CHART.muted, fontSize: 11 }} minTickGap={16} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fill: CHART.muted, fontSize: 11 }} width={44} domain={yDomain} />
          <Tooltip
            cursor={{ stroke: CHART.border }}
            content={(props) => {
              if (!props.active || !props.payload?.length) return null;
              const payload = props.payload as unknown as Array<{ dataKey: string; value: number; payload: ProgressionRow }>;
              const date = payload[0]?.payload?.date;
              const items = payload
                .filter((it) => !hidden.has(it.dataKey))
                .map((it) => ({ uid: it.dataKey, value: it.value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 8);
              return (
                <div className="rounded-lg border bg-fab-surface px-2.5 py-2 text-xs shadow-lg" style={{ borderColor: CHART.border }}>
                  <p className="mb-1 font-bold text-fab-dim">{date ? date : "Season start"}</p>
                  <ul className="space-y-0.5">
                    {items.map((it, i) => (
                      <li key={it.uid} className="flex items-center gap-1.5">
                        <span className="text-[10px] tabular-nums text-fab-dim">{i + 1}</span>
                        <span className="h-2 w-2 rounded-full" style={{ background: colorByUid[it.uid] }} />
                        <span
                          className={`truncate ${it.uid === viewerUid ? "font-black text-fab-gold" : "text-fab-text"}`}
                          style={{ maxWidth: 120 }}
                        >
                          {nameByUid[it.uid]}
                        </span>
                        <span className="ml-auto font-bold tabular-nums text-fab-text">{it.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }}
          />
          {/* A hidden line can't be the emphasis target — otherwise hovering (or the
              click that hides) an off chip would fade every visible line to nothing. */}
          {series.map((s) => {
            const hover = hoverUid && !hidden.has(hoverUid) ? hoverUid : null;
            const isHidden = hidden.has(s.uid);
            const isEmph = hover ? hover === s.uid : s.uid === leaderUid || s.uid === viewerUid;
            const dimmed = hover ? hover !== s.uid : false;
            return (
              <Line
                key={s.uid}
                type="linear"
                dataKey={s.uid}
                name={s.name}
                hide={isHidden}
                stroke={colorByUid[s.uid]}
                strokeWidth={isEmph ? (s.uid === leaderUid ? 3 : 2.6) : 1.6}
                strokeOpacity={dimmed ? 0.12 : isEmph ? 1 : 0.5}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>

      {/* Interactive legend — chips wrap below the chart (better mobile control than
          recharts' built-in Legend, which would steal plot width). */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {series.map((s) => {
          const off = hidden.has(s.uid);
          return (
            <button
              key={s.uid}
              type="button"
              onClick={() => toggle(s.uid)}
              onMouseEnter={() => setHoverUid(s.uid)}
              onMouseLeave={() => setHoverUid(null)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold transition-opacity ${
                off ? "border-fab-border/50 opacity-40" : "border-fab-border/70"
              } ${s.uid === viewerUid ? "ring-1 ring-inset ring-fab-gold/40" : ""}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: colorByUid[s.uid] }} />
              <span className="text-fab-dim tabular-nums">#{s.rank}</span>
              <span className={`max-w-[96px] truncate ${off ? "text-fab-dim line-through" : "text-fab-text"}`}>{s.name}</span>
              {s.uid === viewerUid && <span className="text-[9px] text-fab-gold">you</span>}
              <span className="tabular-nums text-fab-muted">{s.final}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

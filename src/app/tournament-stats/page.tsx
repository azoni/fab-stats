"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import dynamic from "next/dynamic";
import { computeEventStats, computeTournamentAnalytics, type TournamentAnalytics } from "@/lib/stats";

const TournamentShareModal = dynamic(() => import("@/components/tournament-stats/TournamentShareCard").then(m => ({ default: m.TournamentShareModal })), { ssr: false });
import { WinRateRing } from "@/components/charts/WinRateRing";
import { SegmentedBar } from "@/components/charts/SegmentedBar";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
  text: "#e5e5e5",
};

const tooltipStyle = {
  backgroundColor: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  color: COLORS.text,
};

const selectClass = "bg-fab-surface border border-fab-border rounded-md px-3 py-2 text-sm text-fab-text outline-none focus:border-fab-gold/40 transition-colors min-w-0";

const EVENT_TYPE_OPTIONS = [
  { value: "rated", label: "All Tournaments (Rated)" },
  { value: "all", label: "All Events" },
  { value: "Armory", label: "Armory" },
  { value: "Skirmish", label: "Skirmish" },
  { value: "Road to Nationals", label: "Road to Nationals" },
  { value: "ProQuest", label: "ProQuest" },
  { value: "Battle Hardened", label: "Battle Hardened" },
  { value: "The Calling", label: "The Calling" },
  { value: "Nationals", label: "Nationals" },
  { value: "Pro Tour", label: "Pro Tour" },
  { value: "Worlds", label: "Worlds" },
];

export default function TournamentStatsPage() {
  const { matches, isLoaded } = useMatches();
  const { user, profile } = useAuth();
  const [filterEventType, setFilterEventType] = useState("rated");
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterHero, setFilterHero] = useState("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [shareOpen, setShareOpen] = useState(false);

  const toggle = (id: string) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Compute events from matches
  const allEvents = useMemo(() => computeEventStats(matches), [matches]);

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = allEvents;
    if (filterEventType === "rated") {
      filtered = filtered.filter(e => e.rated);
    } else if (filterEventType !== "all") {
      filtered = filtered.filter(e => e.eventType === filterEventType);
    }
    if (filterFormat !== "all") {
      filtered = filtered
        .filter(e => e.formats.includes(filterFormat))
        .map(e => {
          const fmtMatches = e.matches.filter(m => m.format === filterFormat);
          if (fmtMatches.length === e.matches.length) return e;
          const wins = fmtMatches.filter(m => m.result === "win").length;
          const losses = fmtMatches.filter(m => m.result === "loss").length;
          const draws = fmtMatches.filter(m => m.result === "draw").length;
          const totalMatches = wins + losses + draws;
          return { ...e, matches: fmtMatches, wins, losses, draws, totalMatches, winRate: totalMatches > 0 ? (wins / totalMatches) * 100 : 0 };
        })
        .filter(e => e.matches.length > 0);
    }
    if (filterHero !== "all") filtered = filtered.filter(e => e.matches.some(m => m.heroPlayed === filterHero));
    return filtered;
  }, [allEvents, filterEventType, filterFormat, filterHero]);

  // Cross-filtered options
  const { formats, heroes, eventTypes } = useMemo(() => {
    const fmts = new Set<string>();
    const hrs = new Set<string>();
    const ets = new Set<string>();
    for (const e of allEvents) {
      if (e.eventType) ets.add(e.eventType);
      for (const f of e.formats) fmts.add(f);
      for (const m of e.matches) {
        if (m.heroPlayed && m.heroPlayed !== "Unknown") hrs.add(m.heroPlayed);
      }
    }
    return { formats: [...fmts].sort(), heroes: [...hrs].sort(), eventTypes: [...ets].sort() };
  }, [allEvents]);

  // Tournament analytics
  const analytics = useMemo(() => computeTournamentAnalytics(filteredEvents), [filteredEvents]);


  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-fab-surface border border-fab-border rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-fab-surface border border-fab-border rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16 text-fab-muted">
        <p className="text-lg mb-2">Sign in to view your tournament stats</p>
        <Link href="/login" className="text-fab-gold hover:underline">Sign in</Link>
      </div>
    );
  }

  const hasEvents = filteredEvents.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center ring-1 ring-inset ring-amber-500/20">
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.704 6.023 6.023 0 01-2.77-.704" />
          </svg>
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-fab-gold">Tournament Stats</h1>
          <p className="text-xs text-fab-muted">Round-by-round analysis of your tournament performance</p>
        </div>
        {hasEvents && profile && (
          <button
            onClick={() => setShareOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fab-gold/15 text-fab-gold text-xs font-semibold hover:bg-fab-gold/25 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            Share
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filterEventType} onChange={(e) => setFilterEventType(e.target.value)} className={selectClass}>
          {EVENT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filterFormat} onChange={(e) => setFilterFormat(e.target.value)} className={selectClass}>
          <option value="all">All Formats</option>
          {formats.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={filterHero} onChange={(e) => setFilterHero(e.target.value)} className={selectClass}>
          <option value="all">All Heroes</option>
          {heroes.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>

      {!hasEvents ? (
        <div className="text-center py-16 text-fab-muted">
          <svg className="w-12 h-12 mx-auto mb-3 text-fab-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497" />
          </svg>
          <p className="text-sm">No tournament data found for these filters.</p>
          <p className="text-xs mt-1 text-fab-dim">Try adjusting filters or log some matches with event info.</p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <StatCardsRow analytics={analytics} />

          {/* First Round Performance */}
          <Section id="first-round" title="First Round Performance" collapsed={collapsed.has("first-round")} toggle={toggle}>
            <FirstRoundSection analytics={analytics} />
          </Section>

          {/* Starting Records */}
          <Section id="start-patterns" title="Starting Records" collapsed={collapsed.has("start-patterns")} toggle={toggle}>
            <StartPatternsSection analytics={analytics} />
          </Section>

          {/* Record by Round */}
          <Section id="round-breakdown" title="Record by Round" collapsed={collapsed.has("round-breakdown")} toggle={toggle}>
            <RoundBreakdownSection analytics={analytics} />
          </Section>

          {/* Momentum & Mental Game */}
          <Section id="momentum" title="Momentum & Mental Game" collapsed={collapsed.has("momentum")} toggle={toggle}>
            <MomentumSection analytics={analytics} />
          </Section>

          {/* Tournament Outcomes */}
          <Section id="outcomes" title="Tournament Outcomes" collapsed={collapsed.has("outcomes")} toggle={toggle}>
            <OutcomesSection analytics={analytics} />
          </Section>

          {/* Hero Performance */}
          {analytics.heroTournamentStats.length > 1 && (
            <Section id="heroes" title="Hero Tournament Performance" collapsed={collapsed.has("heroes")} toggle={toggle}>
              <HeroTournamentSection analytics={analytics} />
            </Section>
          )}

          {/* Top 8s by Venue */}
          {analytics.venueTop8s.length > 0 && (
            <Section id="venues" title="Top 8s by Venue" collapsed={collapsed.has("venues")} toggle={toggle}>
              <VenueTop8Section analytics={analytics} />
            </Section>
          )}

          {/* Trends Over Time */}
          {analytics.eventTimeline.length >= 3 && (
            <Section id="trends" title="Tournament Trends" collapsed={collapsed.has("trends")} toggle={toggle}>
              <TrendsSection analytics={analytics} />
            </Section>
          )}
        </>
      )}

      {shareOpen && analytics && profile && (
        <TournamentShareModal
          data={{
            playerName: profile.displayName,
            totalEvents: analytics.totalEvents,
            totalMatches: analytics.totalMatches,
            overallWinRate: analytics.overallWinRate,
            r1WinRate: analytics.r1WinRate,
            r1Wins: analytics.r1Wins,
            r1Losses: analytics.r1Losses,
            top8Count: analytics.top8Count,
            top8Rate: analytics.top8Rate,
            undefeatedSwissCount: analytics.undefeatedSwissCount,
            longestCrossEventWinStreak: analytics.longestCrossEventWinStreak,
            consecutiveTop8s: analytics.consecutiveTop8s,
            consecutiveEventWins: analytics.consecutiveEventWins,
            championCount: analytics.championCount,
            finalistCount: analytics.finalistCount,
            top4Count: analytics.top4Count,
            submarineCount: analytics.submarineCount,
          }}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

// ── Section wrapper ──

function Section({ id, title, collapsed, toggle, children }: {
  id: string; title: string; collapsed: boolean; toggle: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
      <button onClick={() => toggle(id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-fab-surface-hover transition-colors">
        <h2 className="section-header text-sm font-semibold text-fab-text flex-1">{title}</h2>
        <svg className={`w-4 h-4 text-fab-dim transition-transform ${collapsed ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {!collapsed && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ── Stat Cards ──

function StatCardsRow({ analytics: a }: { analytics: TournamentAnalytics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-fab-surface border border-fab-border rounded-lg p-3 text-center">
        <WinRateRing value={a.r1WinRate} size={52} label={`${Math.round(a.r1WinRate)}%`} />
        <p className="text-xs text-fab-muted mt-1.5">R1 Win Rate</p>
        <p className="text-[10px] text-fab-dim">{a.r1Wins}W-{a.r1Losses}L{a.r1Draws > 0 ? `-${a.r1Draws}D` : ""}</p>
      </div>
      <div className="bg-fab-surface border border-fab-border rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-fab-text">{a.overallWinRate.toFixed(1)}%</p>
        <p className="text-xs text-fab-muted mt-1">Overall Win Rate</p>
        <p className="text-[10px] text-fab-dim">{a.totalMatches} matches</p>
      </div>
      <div className="bg-fab-surface border border-fab-border rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-fab-gold">{a.totalEvents}</p>
        <p className="text-xs text-fab-muted mt-1">Events Played</p>
        <p className="text-[10px] text-fab-dim">Avg {a.avgFinalRecord.wins.toFixed(1)}-{a.avgFinalRecord.losses.toFixed(1)}</p>
      </div>
      <div className="bg-fab-surface border border-fab-border rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-fab-win">{a.top8Count}</p>
        <p className="text-xs text-fab-muted mt-1">Top 8 Finishes</p>
        <p className="text-[10px] text-fab-dim">{a.top8Rate.toFixed(0)}% conversion</p>
      </div>
    </div>
  );
}

// ── First Round ──

function FirstRoundSection({ analytics: a }: { analytics: TournamentAnalytics }) {
  const r1Total = a.r1Wins + a.r1Losses + a.r1Draws;
  if (r1Total === 0) return <p className="text-sm text-fab-muted">No round 1 data available.</p>;

  const diff = a.r1WinRate - a.overallWinRate;
  const diffText = diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
  const diffColor = diff > 0 ? "text-fab-win" : diff < 0 ? "text-fab-loss" : "text-fab-muted";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <WinRateRing value={a.r1WinRate} size={72} strokeWidth={5} label={`${Math.round(a.r1WinRate)}%`} />
        <div className="flex-1 space-y-2">
          <SegmentedBar
            segments={[
              { value: a.r1Wins, color: COLORS.win, label: `${a.r1Wins}W` },
              { value: a.r1Draws, color: COLORS.draw, label: a.r1Draws > 0 ? `${a.r1Draws}D` : undefined },
              { value: a.r1Losses, color: COLORS.loss, label: `${a.r1Losses}L` },
            ].filter(s => s.value > 0)}
            height="md"
            showLabels
          />
          <p className="text-xs text-fab-muted">
            You win Round 1 <span className="text-fab-text font-semibold">{a.r1WinRate.toFixed(1)}%</span> of the time vs{" "}
            <span className="text-fab-text font-semibold">{a.overallWinRate.toFixed(1)}%</span> overall{" "}
            <span className={`font-semibold ${diffColor}`}>({diffText})</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Start Patterns ──

function StartPatternsSection({ analytics: a }: { analytics: TournamentAnalytics }) {
  if (a.startPatterns.length === 0) return <p className="text-sm text-fab-muted">Need events with 2+ rounds to show start patterns.</p>;

  const patternColors: Record<string, string> = {
    "2-0": COLORS.win,
    "1-0": "#86efac",
    "1-1": COLORS.draw,
    "0-1": "#fca5a5",
    "0-2": COLORS.loss,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {a.startPatterns.map((sp) => (
          <div key={sp.pattern} className="flex items-center gap-3 bg-fab-bg rounded-lg px-3 py-2.5">
            <span className="text-lg font-bold text-fab-text w-12 text-center" style={{ color: patternColors[sp.pattern] || COLORS.muted }}>
              {sp.pattern}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs text-fab-muted">{sp.count} events ({sp.pct.toFixed(0)}%)</span>
                <span className="text-xs font-semibold" style={{ color: sp.conversionRate >= 50 ? COLORS.win : COLORS.loss }}>
                  {sp.conversionRate.toFixed(0)}% win event
                </span>
              </div>
              <div className="mt-1 h-1.5 bg-fab-border rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${sp.pct}%`, backgroundColor: patternColors[sp.pattern] || COLORS.muted }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-fab-dim">
        Based on {a.startPatterns.reduce((sum, sp) => sum + sp.count, 0)} events with 2+ rounds logged. &quot;Win event&quot; = finished with more wins than losses.
      </p>
    </div>
  );
}

// ── Round Breakdown ──

function RoundBreakdownSection({ analytics: a }: { analytics: TournamentAnalytics }) {
  if (a.roundBreakdown.length === 0) return <p className="text-sm text-fab-muted">No round data available.</p>;

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={a.roundBreakdown} barGap={1}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
          <XAxis dataKey="round" tick={{ fill: COLORS.muted, fontSize: 11 }} />
          <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Bar dataKey="wins" stackId="a" fill={COLORS.win} name="Wins" radius={[0, 0, 0, 0]} />
          <Bar dataKey="draws" stackId="a" fill={COLORS.draw} name="Draws" />
          <Bar dataKey="losses" stackId="a" fill={COLORS.loss} name="Losses" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-fab-muted text-left">
              <th className="px-2 py-1.5">Round</th>
              <th className="px-2 py-1.5 text-center">W</th>
              <th className="px-2 py-1.5 text-center">L</th>
              <th className="px-2 py-1.5 text-center">D</th>
              <th className="px-2 py-1.5 text-center">Total</th>
              <th className="px-2 py-1.5 text-right">WR%</th>
            </tr>
          </thead>
          <tbody>
            {a.roundBreakdown.map((r) => (
              <tr key={r.round} className="border-t border-fab-border/50">
                <td className="px-2 py-1.5 font-semibold text-fab-text">{r.round}</td>
                <td className="px-2 py-1.5 text-center text-fab-win">{r.wins}</td>
                <td className="px-2 py-1.5 text-center text-fab-loss">{r.losses}</td>
                <td className="px-2 py-1.5 text-center text-fab-draw">{r.draws}</td>
                <td className="px-2 py-1.5 text-center text-fab-muted">{r.total}</td>
                <td className="px-2 py-1.5 text-right font-semibold" style={{ color: r.winRate >= 50 ? COLORS.win : COLORS.loss }}>
                  {r.winRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Momentum & Mental Game ──

function MomentumSection({ analytics: a }: { analytics: TournamentAnalytics }) {
  const stats = [
    {
      label: "Bounce-Back Rate",
      desc: "Win rate in the round immediately after a loss",
      value: a.bounceBackRate,
      detail: `${a.bounceBackWins}/${a.bounceBackTotal}`,
      show: a.bounceBackTotal > 0,
    },
    {
      label: "Streak Win Rate",
      desc: "Win rate when already on a 2+ win streak",
      value: a.streakWinRate,
      detail: `${a.streakWins}/${a.streakTotal}`,
      show: a.streakTotal > 0,
    },
    {
      label: "After-Bye Win Rate",
      desc: "Win rate in the round immediately after a bye",
      value: a.afterByeWinRate,
      detail: `${a.afterByeWins}/${a.afterByeTotal}`,
      show: a.afterByeTotal > 0,
    },
    {
      label: "Closer Rate",
      desc: "Win rate in the final swiss round",
      value: a.closerRate,
      detail: `${a.closerWins}/${a.closerTotal}`,
      show: a.closerTotal > 0,
    },
  ];

  const visible = stats.filter(s => s.show);
  if (visible.length === 0) return <p className="text-sm text-fab-muted">Not enough data for momentum analysis.</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visible.map((s) => (
          <div key={s.label} className="bg-fab-bg rounded-lg px-3 py-3 flex items-center gap-3">
            <WinRateRing value={s.value} size={44} label={`${Math.round(s.value)}%`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-fab-text">{s.label}</p>
              <p className="text-[10px] text-fab-dim">{s.desc}</p>
              <p className="text-xs text-fab-muted mt-0.5">{s.detail} matches</p>
            </div>
          </div>
        ))}
      </div>

      {/* Best/worst round callout */}
      {(a.bestRound || a.worstRound) && (
        <div className="flex flex-wrap gap-3 text-xs">
          {a.bestRound && (
            <div className="flex items-center gap-1.5 bg-fab-win/10 border border-fab-win/20 rounded-md px-2.5 py-1.5">
              <span className="text-fab-win font-semibold">Best Round:</span>
              <span className="text-fab-text">{a.bestRound.round} — {a.bestRound.winRate.toFixed(0)}% WR ({a.bestRound.wins}W-{a.bestRound.losses}L)</span>
            </div>
          )}
          {a.worstRound && a.worstRound.round !== a.bestRound?.round && (
            <div className="flex items-center gap-1.5 bg-fab-loss/10 border border-fab-loss/20 rounded-md px-2.5 py-1.5">
              <span className="text-fab-loss font-semibold">Toughest Round:</span>
              <span className="text-fab-text">{a.worstRound.round} — {a.worstRound.winRate.toFixed(0)}% WR ({a.worstRound.wins}W-{a.worstRound.losses}L)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tournament Outcomes ──

function OutcomesSection({ analytics: a }: { analytics: TournamentAnalytics }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <MiniStat label="Top 8 Rate" value={`${a.top8Rate.toFixed(0)}%`} detail={`${a.top8Count} of ${a.totalEvents} events`} />
        <MiniStat label="Undefeated Swiss" value={`${a.undefeatedSwissCount}`} detail={`${a.undefeatedSwissRate.toFixed(0)}% of events`} />
        <MiniStat label="Avg Final Record" value={`${a.avgFinalRecord.wins.toFixed(1)}-${a.avgFinalRecord.losses.toFixed(1)}`} detail={a.avgFinalRecord.draws > 0.05 ? `${a.avgFinalRecord.draws.toFixed(1)} draws` : ""} />
        <MiniStat label="Best Event Streak" value={`${a.longestEventWinStreak}`} detail="consecutive round wins" />
        <MiniStat label="Submarines" value={`${a.submarineCount}`} detail="lost R1 but made top 8" />
        <MiniStat label="Right Record, Wrong Order" value={`${a.rightRecordWrongOrder}`} detail="had the record but missed top 8" />
        {a.dropCount > 0 && (
          <MiniStat label="Drops" value={`${a.dropCount}`} detail={`${a.dropRate.toFixed(0)}% of events`} />
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="bg-fab-bg rounded-lg px-3 py-2.5 text-center">
      <p className="text-lg font-bold text-fab-text">{value}</p>
      <p className="text-xs text-fab-muted">{label}</p>
      {detail && <p className="text-[10px] text-fab-dim mt-0.5">{detail}</p>}
    </div>
  );
}

// ── Hero Tournament Performance ──

function HeroTournamentSection({ analytics: a }: { analytics: TournamentAnalytics }) {
  const [sortBy, setSortBy] = useState<"events" | "winRate" | "eventWinRate">("events");
  const sorted = useMemo(() =>
    [...a.heroTournamentStats].sort((x, y) => {
      if (sortBy === "winRate") return y.winRate - x.winRate;
      if (sortBy === "eventWinRate") return y.eventWinRate - x.eventWinRate;
      return y.events - x.events;
    }),
    [a.heroTournamentStats, sortBy]
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-fab-muted text-left">
            <th className="px-2 py-1.5">Hero</th>
            <th className="px-2 py-1.5 text-center cursor-pointer hover:text-fab-text" onClick={() => setSortBy("events")}>
              Events{sortBy === "events" ? " ▼" : ""}
            </th>
            <th className="px-2 py-1.5 text-center">W-L-D</th>
            <th className="px-2 py-1.5 text-right cursor-pointer hover:text-fab-text" onClick={() => setSortBy("winRate")}>
              Match WR{sortBy === "winRate" ? " ▼" : ""}
            </th>
            <th className="px-2 py-1.5 text-right cursor-pointer hover:text-fab-text" onClick={() => setSortBy("eventWinRate")}>
              Event WR{sortBy === "eventWinRate" ? " ▼" : ""}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((h) => (
            <tr key={h.hero} className="border-t border-fab-border/50">
              <td className="px-2 py-1.5 font-semibold text-fab-text truncate max-w-[160px]">{h.hero}</td>
              <td className="px-2 py-1.5 text-center text-fab-muted">{h.events}</td>
              <td className="px-2 py-1.5 text-center text-fab-muted">{h.wins}-{h.losses}{h.draws > 0 ? `-${h.draws}` : ""}</td>
              <td className="px-2 py-1.5 text-right font-semibold" style={{ color: h.winRate >= 50 ? COLORS.win : COLORS.loss }}>
                {h.winRate.toFixed(1)}%
              </td>
              <td className="px-2 py-1.5 text-right font-semibold" style={{ color: h.eventWinRate >= 50 ? COLORS.win : COLORS.loss }}>
                {h.eventWinRate.toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-fab-dim mt-2">Event WR = % of events finishing with more wins than losses.</p>
    </div>
  );
}

// ── Top 8s by Venue ──

function VenueTop8Section({ analytics: a }: { analytics: TournamentAnalytics }) {
  const [sortBy, setSortBy] = useState<"events" | "top8s" | "top8Rate" | "winRate">("events");
  const sorted = useMemo(() =>
    [...a.venueTop8s].sort((x, y) => {
      if (sortBy === "top8s") return y.top8s - x.top8s;
      if (sortBy === "top8Rate") return y.top8Rate - x.top8Rate;
      if (sortBy === "winRate") return y.winRate - x.winRate;
      return y.events - x.events;
    }),
    [a.venueTop8s, sortBy]
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-fab-muted text-left">
            <th className="px-2 py-1.5">Venue</th>
            <th className="px-2 py-1.5 text-center cursor-pointer hover:text-fab-text" onClick={() => setSortBy("events")}>
              Events{sortBy === "events" ? " ▼" : ""}
            </th>
            <th className="px-2 py-1.5 text-center cursor-pointer hover:text-fab-text" onClick={() => setSortBy("top8s")}>
              Top 8s{sortBy === "top8s" ? " ▼" : ""}
            </th>
            <th className="px-2 py-1.5 text-right cursor-pointer hover:text-fab-text" onClick={() => setSortBy("top8Rate")}>
              Top 8 %{sortBy === "top8Rate" ? " ▼" : ""}
            </th>
            <th className="px-2 py-1.5 text-center">W-L-D</th>
            <th className="px-2 py-1.5 text-right cursor-pointer hover:text-fab-text" onClick={() => setSortBy("winRate")}>
              WR%{sortBy === "winRate" ? " ▼" : ""}
            </th>
            <th className="px-2 py-1.5 text-center">Trophies</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((v) => (
            <tr key={v.venue} className="border-t border-fab-border/50">
              <td className="px-2 py-1.5 font-semibold text-fab-text truncate max-w-[200px]" title={v.venue}>{v.venue}</td>
              <td className="px-2 py-1.5 text-center text-fab-muted">{v.events}</td>
              <td className="px-2 py-1.5 text-center text-fab-gold font-semibold">{v.top8s}</td>
              <td className="px-2 py-1.5 text-right font-semibold" style={{ color: v.top8Rate >= 50 ? COLORS.win : v.top8Rate > 0 ? COLORS.gold : COLORS.muted }}>
                {v.top8Rate.toFixed(0)}%
              </td>
              <td className="px-2 py-1.5 text-center text-fab-muted">{v.wins}-{v.losses}{v.draws > 0 ? `-${v.draws}` : ""}</td>
              <td className="px-2 py-1.5 text-right font-semibold" style={{ color: v.winRate >= 50 ? COLORS.win : COLORS.loss }}>
                {v.winRate.toFixed(1)}%
              </td>
              <td className="px-2 py-1.5 text-center">
                {v.champions > 0 && <span className="text-yellow-400" title={`${v.champions} win${v.champions > 1 ? "s" : ""}`}>{"🏆".repeat(Math.min(v.champions, 3))}{v.champions > 3 ? `+${v.champions - 3}` : ""}</span>}
                {v.finalists > 0 && v.champions === 0 && <span className="text-fab-dim" title={`${v.finalists} finalist`}>🥈</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tournament Trends ──

function TrendsSection({ analytics: a }: { analytics: TournamentAnalytics }) {
  return (
    <div className="space-y-6">
      {/* Rolling Win Rate */}
      <div>
        <h3 className="text-xs font-semibold text-fab-muted mb-2">Rolling Win Rate (10-event window)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={a.eventTimeline}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis dataKey="date" tick={{ fill: COLORS.muted, fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fill: COLORS.muted, fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number | undefined) => v != null ? [`${v.toFixed(1)}%`, "Win Rate"] : ["-", "Win Rate"]} labelFormatter={(label) => {
              const entry = a.eventTimeline.find(e => e.date === String(label));
              return entry ? `${entry.eventName} (${label})` : String(label);
            }} />
            <Line type="monotone" dataKey="rollingWinRate" stroke={COLORS.gold} strokeWidth={2} dot={false} name="Rolling WR" />
            <Line type="monotone" dataKey="winRate" stroke={COLORS.muted} strokeWidth={1} dot={{ r: 2, fill: COLORS.muted }} strokeDasharray="4 4" name="Event WR" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Events per Month */}
      {a.eventsPerMonth.length >= 2 && (
        <div>
          <h3 className="text-xs font-semibold text-fab-muted mb-2">Events per Month</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={a.eventsPerMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="month" tick={{ fill: COLORS.muted, fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: COLORS.muted, fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={COLORS.gold} name="Events" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

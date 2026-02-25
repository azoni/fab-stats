"use client";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useMatches } from "@/hooks/useMatches";
import { computeWrappedStats } from "@/lib/wrapped";
import { getHeroByName } from "@/lib/heroes";
import {
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

function Section({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section
      className={`py-12 px-4 ${
        accent
          ? "bg-fab-gold/[0.03] border-y border-fab-gold/10"
          : ""
      }`}
    >
      <div className="max-w-2xl mx-auto text-center">{children}</div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-[0.2em] text-fab-muted mb-2">
      {children}
    </p>
  );
}

function BigNumber({
  children,
  color = "text-fab-gold",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return <p className={`text-6xl font-black ${color} mb-1`}>{children}</p>;
}

function Subtitle({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-fab-dim mt-1">{children}</p>;
}

function HeroImage({ heroName }: { heroName: string }) {
  const hero = getHeroByName(heroName);
  if (!hero) return null;
  return (
    <div className="relative inline-block mb-4">
      <div className="absolute inset-0 rounded-xl bg-fab-gold/20 blur-xl" />
      <img
        src={hero.imageUrl}
        alt={hero.name}
        className="relative w-48 h-48 object-cover rounded-xl border-2 border-fab-gold/30"
      />
    </div>
  );
}

export default function WrappedPage() {
  const { matches, isLoaded } = useMatches();
  const searchParams = useSearchParams();
  const year = searchParams.get("year") || "2025";

  const yearMatches = useMemo(
    () => matches.filter((m) => m.date.startsWith(year)),
    [matches, year]
  );

  const stats = useMemo(
    () => (yearMatches.length > 0 ? computeWrappedStats(yearMatches) : null),
    [yearMatches]
  );

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-fab-gold/30 border-t-fab-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats || yearMatches.length < 5) {
    return (
      <div className="text-center py-24">
        <p className="text-5xl mb-4">&#9876;</p>
        <h1 className="text-2xl font-bold text-fab-gold mb-2">
          {year} Wrapped
        </h1>
        <p className="text-fab-muted max-w-md mx-auto">
          Not enough {year} data yet. Import at least 5 matches from {year} to
          unlock your year in review.
        </p>
        <p className="text-fab-dim text-sm mt-2">
          {yearMatches.length} match{yearMatches.length !== 1 ? "es" : ""} found
        </p>
      </div>
    );
  }

  const hasPlayoffs =
    stats.playoffAppearances.top8 +
      stats.playoffAppearances.top4 +
      stats.playoffAppearances.finals >
    0;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <section className="py-16 px-4 text-center bg-gradient-to-b from-fab-gold/[0.08] to-transparent border-b border-fab-gold/10">
        <div className="max-w-2xl mx-auto">
          <p className="text-fab-gold text-4xl mb-4">&#10024;</p>
          <h1 className="text-4xl sm:text-5xl font-black text-fab-gold mb-3">
            Your {year} Season
          </h1>
          <p className="text-fab-dim text-lg">
            {formatDate(stats.dateRange.first)} &mdash;{" "}
            {formatDate(stats.dateRange.last)}
          </p>
          <div className="flex justify-center gap-8 mt-6">
            <div>
              <p className="text-3xl font-black text-fab-text">
                {stats.totalMatches}
              </p>
              <p className="text-xs text-fab-muted">Matches</p>
            </div>
            <div>
              <p className="text-3xl font-black text-fab-text">
                {stats.totalEvents}
              </p>
              <p className="text-xs text-fab-muted">Events</p>
            </div>
            <div>
              <p className="text-3xl font-black text-fab-text">
                {stats.formatBreakdown.length}
              </p>
              <p className="text-xs text-fab-muted">Formats</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Record ──────────────────────────────────────────── */}
      <Section accent>
        <Label>The Record</Label>
        <BigNumber
          color={stats.record.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}
        >
          {stats.record.winRate.toFixed(1)}%
        </BigNumber>
        <p className="text-xl font-bold text-fab-text">
          {stats.record.wins}W &ndash; {stats.record.losses}L
          {stats.record.draws > 0 ? ` \u2013 ${stats.record.draws}D` : ""}
        </p>
        <Subtitle>
          {stats.record.winRate >= 60
            ? "Dominant. Absolutely dominant."
            : stats.record.winRate >= 50
              ? "Above the line. Solid year."
              : stats.record.winRate >= 40
                ? "Room to grow. The grind continues."
                : "A year of learning. Every loss is a lesson."}
        </Subtitle>
      </Section>

      {/* ── Your Main ───────────────────────────────────────────── */}
      {stats.mostPlayedHero && (
        <Section>
          <Label>Your Main</Label>
          <HeroImage heroName={stats.mostPlayedHero.name} />
          <p className="text-3xl font-black text-fab-text mb-1">
            {stats.mostPlayedHero.name}
          </p>
          <p className="text-fab-muted">
            {stats.mostPlayedHero.matches} matches &bull;{" "}
            <span
              className={
                stats.mostPlayedHero.winRate >= 50
                  ? "text-fab-win"
                  : "text-fab-loss"
              }
            >
              {stats.mostPlayedHero.winRate.toFixed(0)}% win rate
            </span>
          </p>
          <Subtitle>The hero you kept coming back to</Subtitle>
        </Section>
      )}

      {/* ── The Ace ─────────────────────────────────────────────── */}
      {stats.bestHero &&
        stats.bestHero.name !== stats.mostPlayedHero?.name && (
          <Section accent>
            <Label>The Ace</Label>
            <HeroImage heroName={stats.bestHero.name} />
            <p className="text-3xl font-black text-fab-text mb-1">
              {stats.bestHero.name}
            </p>
            <p className="text-fab-muted">
              {stats.bestHero.winRate.toFixed(0)}% win rate &bull;{" "}
              {stats.bestHero.matches} matches
            </p>
            <Subtitle>Your highest win rate hero (5+ matches)</Subtitle>
          </Section>
        )}

      {/* ── The Nemesis ─────────────────────────────────────────── */}
      {stats.nemesis && (
        <Section>
          <Label>The Nemesis</Label>
          <BigNumber>{stats.nemesis.matches}</BigNumber>
          <p className="text-xl font-bold text-fab-text mb-1">
            matches vs {stats.nemesis.name}
          </p>
          <p className="text-fab-muted">
            <span className="text-fab-win">{stats.nemesis.wins}W</span>
            {" \u2013 "}
            <span className="text-fab-loss">{stats.nemesis.losses}L</span>
          </p>
          <Subtitle>Your most frequent opponent</Subtitle>
        </Section>
      )}

      {/* ── The Rival ───────────────────────────────────────────── */}
      {stats.rival &&
        stats.rival.name !== stats.nemesis?.name && (
          <Section accent>
            <Label>The Rival</Label>
            <BigNumber color="text-fab-loss">
              {stats.rival.winRate.toFixed(0)}%
            </BigNumber>
            <p className="text-xl font-bold text-fab-text mb-1">
              vs {stats.rival.name}
            </p>
            <p className="text-fab-muted">
              {stats.rival.wins}W &ndash; {stats.rival.losses}L in{" "}
              {stats.rival.matches} games
            </p>
            <Subtitle>Your toughest matchup (3+ games)</Subtitle>
          </Section>
        )}

      {/* ── On Fire ─────────────────────────────────────────────── */}
      <Section>
        <Label>On Fire</Label>
        <BigNumber color="text-fab-win">{stats.longestWinStreak}</BigNumber>
        <p className="text-xl font-bold text-fab-text">
          consecutive wins
        </p>
        <Subtitle>
          {stats.longestWinStreak >= 10
            ? "Unstoppable. The table was yours."
            : stats.longestWinStreak >= 5
              ? "A hot streak to remember."
              : "Every win streak starts with one."}
        </Subtitle>
      </Section>

      {/* ── Rock Bottom ─────────────────────────────────────────── */}
      {stats.longestLossStreak > 0 && (
        <Section accent>
          <Label>Rock Bottom</Label>
          <BigNumber color="text-fab-loss">
            {stats.longestLossStreak}
          </BigNumber>
          <p className="text-xl font-bold text-fab-text">
            consecutive losses
          </p>
          <Subtitle>
            {stats.longestLossStreak >= 8
              ? "Pain builds character. You came back stronger."
              : stats.longestLossStreak >= 4
                ? "Dark times. But you survived."
                : "Barely a scratch."}
          </Subtitle>
        </Section>
      )}

      {/* ── Format Breakdown ────────────────────────────────────── */}
      {stats.formatBreakdown.length > 0 && (
        <Section>
          <Label>Format Breakdown</Label>
          {stats.favoriteFormat && (
            <>
              <p className="text-2xl font-black text-fab-text mb-1">
                {stats.favoriteFormat.name}
              </p>
              <p className="text-fab-muted mb-6">
                {stats.favoriteFormat.count} matches &bull;{" "}
                <span
                  className={
                    stats.favoriteFormat.winRate >= 50
                      ? "text-fab-win"
                      : "text-fab-loss"
                  }
                >
                  {stats.favoriteFormat.winRate.toFixed(0)}% win rate
                </span>
              </p>
            </>
          )}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.formatBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="count"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {stats.formatBreakdown.map((_, i) => (
                    <Cell
                      key={i}
                      fill={FORMAT_COLORS[i % FORMAT_COLORS.length]}
                    />
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
        </Section>
      )}

      {/* ── Home Turf ───────────────────────────────────────────── */}
      {stats.homeVenue && (
        <Section accent>
          <Label>Home Turf</Label>
          <p className="text-3xl font-black text-fab-text mb-1">
            {stats.homeVenue.name}
          </p>
          <p className="text-fab-muted">
            {stats.homeVenue.matches} matches &bull;{" "}
            <span
              className={
                stats.homeVenue.winRate >= 50
                  ? "text-fab-win"
                  : "text-fab-loss"
              }
            >
              {stats.homeVenue.winRate.toFixed(0)}% win rate
            </span>
          </p>
          <Subtitle>Your most visited venue</Subtitle>
        </Section>
      )}

      {/* ── Event Grinder ───────────────────────────────────────── */}
      {stats.eventTypeBreakdown.length > 0 && (
        <Section>
          <Label>Event Grinder</Label>
          <p className="text-2xl font-black text-fab-text mb-6">
            {stats.totalEvents} events across{" "}
            {stats.eventTypeBreakdown.length} event types
          </p>
          <div className="space-y-3 text-left">
            {stats.eventTypeBreakdown.map((et) => (
              <div key={et.type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-fab-text font-semibold">
                    {et.type}
                  </span>
                  <span className="text-fab-dim">
                    {et.count} matches &bull;{" "}
                    <span
                      className={
                        et.winRate >= 50 ? "text-fab-win" : "text-fab-loss"
                      }
                    >
                      {et.winRate.toFixed(0)}%
                    </span>
                  </span>
                </div>
                <div className="h-2 bg-fab-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-fab-win rounded-full"
                    style={{ width: `${et.winRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Month by Month ──────────────────────────────────────── */}
      <Section accent>
        <Label>Month by Month</Label>
        {stats.bestMonth && (
          <p className="text-lg text-fab-text mb-4">
            Best month:{" "}
            <span className="font-bold text-fab-gold">
              {stats.bestMonth.month}
            </span>{" "}
            with{" "}
            <span className="text-fab-win">
              {stats.bestMonth.winRate.toFixed(0)}% win rate
            </span>{" "}
            across {stats.bestMonth.matches} matches
          </p>
        )}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.monthlyData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={COLORS.border}
              />
              <XAxis
                dataKey="month"
                tick={{ fill: COLORS.muted, fontSize: 11 }}
              />
              <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  color: "#e5e5e5",
                }}
                formatter={(value, name) => [
                  value,
                  name === "wins" ? "Wins" : "Total Matches",
                ]}
              />
              <Bar dataKey="wins" fill={COLORS.win} name="wins" />
              <Bar
                dataKey="matches"
                fill={COLORS.gold}
                name="matches"
                opacity={0.3}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ── Playoff Spotlight ───────────────────────────────────── */}
      {hasPlayoffs && (
        <Section>
          <Label>Playoff Spotlight</Label>
          <p className="text-2xl font-black text-fab-text mb-6">
            You made the cut
          </p>
          <div className="flex justify-center gap-8">
            {stats.playoffAppearances.top8 > 0 && (
              <div>
                <p className="text-4xl font-black text-orange-400">
                  {stats.playoffAppearances.top8}
                </p>
                <p className="text-xs text-fab-muted">Top 8s</p>
              </div>
            )}
            {stats.playoffAppearances.top4 > 0 && (
              <div>
                <p className="text-4xl font-black text-amber-400">
                  {stats.playoffAppearances.top4}
                </p>
                <p className="text-xs text-fab-muted">Top 4s</p>
              </div>
            )}
            {stats.playoffAppearances.finals > 0 && (
              <div>
                <p className="text-4xl font-black text-yellow-400">
                  {stats.playoffAppearances.finals}
                </p>
                <p className="text-xs text-fab-muted">Finals</p>
              </div>
            )}
          </div>
          <Subtitle>
            {stats.playoffAppearances.finals > 0
              ? "Championship material."
              : "Contender status unlocked."}
          </Subtitle>
        </Section>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <section className="py-12 px-4 text-center border-t border-fab-border">
        <p className="text-fab-gold text-2xl mb-2">&#9876;</p>
        <p className="text-fab-dim text-sm">
          FaB Stats &bull; {year} Season Wrapped
        </p>
      </section>
    </div>
  );
}

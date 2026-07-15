"use client";
/**
 * "The League Desk" — presentational components for the redesigned league page.
 * Every module reads the same in-memory match pool (see leagues-insights.ts), so
 * one filter bar re-casts the whole page with no extra Firestore reads.
 */
import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { HeroImg } from "@/components/heroes/HeroImg";
import {
  CalendarDays,
  Crown,
  Flame,
  MapPin,
  Store as StoreIcon,
  Swords,
  Target,
  Users,
  X,
} from "lucide-react";
import { MatchResult, type League, type LeagueStandingEntry } from "@/types";
import { type LeagueMatchupData } from "@/lib/leagues-scoring";
import {
  type PooledMatch,
  type FilterOptions,
  type LeagueFilters,
  heroMetaFromPool,
  splitByStore,
  activityTimeline,
  matchupsFromPool,
  poolSummary,
  signatureHeroByUid,
  recentFormByUid,
  longestWinStreaks,
  eventDaysByUid,
  standingsFromPool,
} from "@/lib/leagues-insights";

// ── shared helpers ────────────────────────────────────────────────────────────

const UTC = (d: string) => new Date(d + "T00:00:00Z").getTime();
const DAY = 86_400_000;

export function statusInfo(league: League, today: string) {
  if (league.status === "draft")
    return { label: "Draft", cls: "bg-fab-muted/15 text-fab-muted", live: false };
  if (league.startDate > today)
    return { label: "Upcoming", cls: "bg-sky-500/15 text-sky-200", live: false };
  if (league.endDate < today || league.status === "completed")
    return { label: "Final", cls: "bg-fab-muted/15 text-fab-muted", live: false };
  return { label: "Live", cls: "bg-emerald-500/15 text-emerald-200", live: true };
}

function seasonProgress(league: League, today: string) {
  const start = UTC(league.startDate);
  const end = UTC(league.endDate);
  const now = Math.min(Math.max(UTC(today), start), end);
  const totalDays = Math.max(1, Math.round((end - start) / DAY));
  const elapsedDays = Math.round((now - start) / DAY);
  const pct = Math.round((Math.min(Math.max(now - start, 0), end - start) / Math.max(end - start, 1)) * 100);
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const week = Math.min(totalWeeks, Math.floor(elapsedDays / 7) + 1);
  return { pct, week, totalWeeks };
}

function formatDateRange(start: string, end: string) {
  const fmt = (s: string) =>
    new Date(s + "T00:00:00Z").toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(start)} → ${fmt(end)}`;
}

function Avatar({ photoUrl, name, size = 40 }: { photoUrl?: string; name: string; size?: number }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const style = { width: size, height: size };
  return photoUrl ? (
    <img src={photoUrl} alt="" style={style} className="shrink-0 rounded-full border border-fab-border object-cover" />
  ) : (
    <span
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full border border-fab-border bg-fab-surface text-sm font-black text-fab-gold"
    >
      {initial}
    </span>
  );
}

/** A player avatar notched with their signature-hero crest. */
function CrestedAvatar({
  photoUrl,
  name,
  hero,
  size = 40,
}: {
  photoUrl?: string;
  name: string;
  hero?: string;
  size?: number;
}) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <Avatar photoUrl={photoUrl} name={name} size={size} />
      {hero && (
        <span className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-fab-bg">
          <HeroImg name={hero} size="sm" />
        </span>
      )}
    </span>
  );
}

function FormDots({ results }: { results: MatchResult[] }) {
  const color: Record<string, string> = {
    [MatchResult.Win]: "bg-emerald-400",
    [MatchResult.Loss]: "bg-rose-400",
    [MatchResult.Draw]: "bg-sky-400",
    [MatchResult.Bye]: "bg-fab-border",
  };
  if (!results.length) return <span className="text-[10px] text-fab-dim">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5" title="Most recent first">
      {results.map((r, i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${color[r] || "bg-fab-border"}`} />
      ))}
    </span>
  );
}

const winRatePct = (e: { wins: number; losses: number; draws: number }) => {
  const dec = e.wins + e.losses + e.draws;
  return dec > 0 ? Math.round((e.wins / dec) * 100) : null;
};

// ── Marquee header ────────────────────────────────────────────────────────────

export function Marquee({
  league,
  organizerName,
  memberCount,
  leader,
  leaderHero,
  actions,
}: {
  league: League;
  organizerName: string;
  memberCount: number;
  leader: LeagueStandingEntry | null;
  leaderHero?: string;
  actions: ReactNode;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const status = statusInfo(league, today);
  const prog = seasonProgress(league, today);
  const accent = league.accentColor || undefined;
  const bg = league.bannerUrl
    ? { backgroundImage: `url(${league.bannerUrl})` }
    : { backgroundImage: `linear-gradient(135deg, ${accent || "#3b3320"}40, var(--fab-bg, #0c0c0f))` };

  return (
    <div className="overflow-hidden rounded-xl border border-fab-border bg-fab-surface">
      <div className="relative h-40 bg-cover bg-center sm:h-56" style={bg}>
        <div className="absolute inset-0 bg-gradient-to-t from-fab-bg via-fab-bg/70 to-transparent" />
        <div className="absolute right-3 top-3 z-10">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${status.cls}`}>
            {status.live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />}
            {status.label}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-end justify-between gap-3 p-4 sm:p-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-tight text-fab-text sm:text-4xl">{league.name}</h1>
            <div
              className="mt-1 h-[3px] w-16 rounded-full"
              style={{ backgroundColor: accent || "var(--fab-gold, #e0b34d)" }}
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fab-dim">
              <span>
                Organized by <span className="font-bold text-fab-text">{organizerName}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> {formatDateRange(league.startDate, league.endDate)}
              </span>
              {(league.city || league.region || league.country) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {[league.city, league.region, league.country].filter(Boolean).join(", ")}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {memberCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <StoreIcon className="h-3.5 w-3.5" /> {league.storeSlugs.length}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">{actions}</div>
        </div>
      </div>

      {/* Season meter + leader chip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-fab-border/60 px-4 py-2.5">
        <div className="min-w-[180px] flex-1">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-fab-dim">
            <span>
              {status.label === "Upcoming"
                ? "Starts soon"
                : status.label === "Final"
                  ? "Season complete"
                  : `Week ${prog.week} of ${prog.totalWeeks}`}
            </span>
            <span className="tabular-nums">{prog.pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-fab-border">
            <div
              className="h-full rounded-full"
              style={{ width: `${prog.pct}%`, backgroundColor: accent || "var(--fab-gold, #e0b34d)" }}
            />
          </div>
        </div>
        {leader && (
          <Link
            href={`/player/${leader.username}`}
            className="inline-flex items-center gap-2 rounded-full border border-fab-border bg-fab-bg/60 py-1 pl-1 pr-3 text-xs hover:border-fab-gold/50"
          >
            <CrestedAvatar photoUrl={leader.photoUrl} name={leader.displayName} hero={leaderHero} size={24} />
            <span className="font-bold text-fab-text">{leader.displayName}</span>
            <span className="text-fab-dim">leads · </span>
            <span className="font-black text-fab-gold tabular-nums">{leader.points} pts</span>
          </Link>
        )}
      </div>

      {league.description && (
        <p className="border-t border-fab-border/60 px-4 py-2 text-xs text-fab-muted">{league.description}</p>
      )}
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
        active
          ? "border-fab-gold bg-fab-gold/15 text-fab-gold"
          : "border-fab-border/60 bg-fab-bg/60 text-fab-dim hover:text-fab-text"
      }`}
    >
      {children}
    </button>
  );
}

export function LeagueFilterBar({
  options,
  filters,
  setFilters,
  summary,
}: {
  options: FilterOptions;
  filters: LeagueFilters;
  setFilters: (f: LeagueFilters) => void;
  summary: { matches: number; players: number; events: number };
}) {
  const toggle = (key: "stores" | "formats" | "eventTypes", value: string) => {
    const cur = new Set(filters[key] || []);
    cur.has(value) ? cur.delete(value) : cur.add(value);
    setFilters({ ...filters, [key]: [...cur] });
  };
  const active =
    !!filters.stores?.length ||
    !!filters.formats?.length ||
    !!filters.eventTypes?.length ||
    !!filters.startDate ||
    !!filters.endDate;

  const showStores = options.stores.length > 1;
  const showFormats = options.formats.length > 1;
  const showTypes = options.eventTypes.length > 1;
  if (!showStores && !showFormats && !showTypes) {
    return (
      <div className="z-20 md:sticky md:top-0 -mx-4 border-b border-fab-border bg-fab-surface/90 px-4 py-2 text-[11px] text-fab-dim backdrop-blur sm:-mx-6 sm:px-6">
        <span className="tabular-nums">
          {summary.matches} matches · {summary.players} players · {summary.events} events
        </span>
      </div>
    );
  }

  return (
    <div className="z-20 md:sticky md:top-0 -mx-4 border-b border-fab-border bg-fab-surface/90 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {showStores && (
          <FilterGroup label="Store">
            {options.stores.map((s) => (
              <Chip key={s.slug} active={!!filters.stores?.includes(s.slug)} onClick={() => toggle("stores", s.slug)}>
                {s.name} <span className="opacity-60">{s.count}</span>
              </Chip>
            ))}
          </FilterGroup>
        )}
        {showFormats && (
          <FilterGroup label="Format">
            {options.formats.map((f) => (
              <Chip key={f.value} active={!!filters.formats?.includes(f.value)} onClick={() => toggle("formats", f.value)}>
                {f.value} <span className="opacity-60">{f.count}</span>
              </Chip>
            ))}
          </FilterGroup>
        )}
        {showTypes && (
          <FilterGroup label="Event">
            {options.eventTypes.map((t) => (
              <Chip key={t.value} active={!!filters.eventTypes?.includes(t.value)} onClick={() => toggle("eventTypes", t.value)}>
                {t.value} <span className="opacity-60">{t.count}</span>
              </Chip>
            ))}
          </FilterGroup>
        )}
        <div className="ml-auto flex items-center gap-3 text-[11px] text-fab-dim">
          <span className="tabular-nums">
            {summary.matches} matches · {summary.players} players · {summary.events} events
          </span>
          {active && (
            <button
              type="button"
              onClick={() => setFilters({})}
              className="inline-flex items-center gap-1 font-bold text-fab-muted hover:text-fab-gold"
            >
              <X className="h-3 w-3" /> Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-fab-dim">{label}</span>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

// ── Podium ────────────────────────────────────────────────────────────────────

export function Podium({
  standings,
  signatureHeroes,
}: {
  standings: LeagueStandingEntry[];
  signatureHeroes: Record<string, string>;
}) {
  const top = standings.slice(0, 3);
  if (top.length < 2) return null;
  // Render order: 2nd, 1st, 3rd (center tallest).
  const order = [top[1], top[0], top[2]].filter(Boolean) as LeagueStandingEntry[];
  const rankOf = (e: LeagueStandingEntry) => standings.indexOf(e) + 1;
  const styleFor = (rank: number) =>
    rank === 1
      ? { pad: "pt-5", ring: "ring-fab-gold", card: "border-fab-gold/60 bg-fab-gold/[0.06]", av: 64, medal: "text-fab-gold" }
      : rank === 2
        ? { pad: "pt-9", ring: "ring-slate-300/70", card: "border-slate-300/40 bg-slate-300/[0.04]", av: 48, medal: "text-slate-200" }
        : { pad: "pt-9", ring: "ring-amber-500/70", card: "border-amber-600/40 bg-amber-600/[0.05]", av: 48, medal: "text-amber-300" };

  return (
    <div className="mb-4 flex items-end justify-center gap-2 sm:gap-4">
      {order.map((e) => {
        const rank = rankOf(e);
        const s = styleFor(rank);
        const wr = winRatePct(e);
        return (
          <div key={e.uid} className={`flex-1 ${s.pad} max-w-[220px]`}>
            <div className={`relative flex flex-col items-center rounded-xl border ${s.card} px-2 py-3 text-center`}>
              <span className={`pointer-events-none absolute -top-1 right-2 text-4xl font-black opacity-10 ${s.medal}`}>
                {rank}
              </span>
              <span className={`rounded-full ring-2 ${s.ring}`}>
                <CrestedAvatar photoUrl={e.photoUrl} name={e.displayName} hero={signatureHeroes[e.uid]} size={s.av} />
              </span>
              <Link
                href={`/player/${e.username}`}
                className="mt-2 max-w-full truncate text-sm font-black text-fab-text hover:text-fab-gold"
              >
                {rank === 1 && <Crown className="mr-0.5 inline h-4 w-4 text-fab-gold" />}
                {e.displayName}
              </Link>
              <p className="text-2xl font-black tabular-nums text-fab-gold">{e.points}</p>
              <p className="text-[11px] text-fab-muted tabular-nums">
                {e.wins}-{e.losses}
                {e.draws ? `-${e.draws}` : ""} {wr !== null && `· ${wr}%`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Broadcast standings table ─────────────────────────────────────────────────

export function BroadcastStandings({
  standings,
  signatureHeroes,
  form,
}: {
  standings: LeagueStandingEntry[];
  signatureHeroes: Record<string, string>;
  form: Record<string, MatchResult[]>;
}) {
  const showByes = standings.some((e) => (e.byes || 0) > 0);
  const leaderPts = standings[0]?.points || 0;
  return (
    <div className="overflow-hidden rounded-xl border border-fab-border bg-fab-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-fab-bg/60 text-[10px] uppercase tracking-wider text-fab-dim">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Player</th>
              <th className="px-2 py-2 text-right">Pts</th>
              <th className="px-2 py-2 text-center">Form</th>
              <th className="px-2 py-2 text-right">W</th>
              <th className="px-2 py-2 text-right">L</th>
              <th className="px-2 py-2 text-right">D</th>
              {showByes && <th className="px-2 py-2 text-right">B</th>}
              <th className="px-2 py-2 text-right">Mch</th>
              <th className="hidden px-2 py-2 text-right sm:table-cell">Stores</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((e, i) => {
              const gap = leaderPts > 0 ? Math.max(0, Math.round((e.points / leaderPts) * 100)) : 0;
              return (
                <tr key={e.uid} className={`border-t border-fab-border/40 hover:bg-fab-bg/30 ${i < 3 ? "bg-fab-gold/[0.04]" : ""}`}>
                  <td className="px-3 py-2 text-left font-black tabular-nums">
                    <span className={i === 0 ? "text-fab-gold" : i < 3 ? "text-fab-text" : "text-fab-dim"}>{i + 1}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CrestedAvatar photoUrl={e.photoUrl} name={e.displayName} hero={signatureHeroes[e.uid]} size={30} />
                      <div className="min-w-0">
                        <Link href={`/player/${e.username}`} className="block truncate font-bold text-fab-text hover:text-fab-gold">
                          {e.displayName}
                        </Link>
                        <p className="truncate text-[10px] text-fab-dim">@{e.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right align-middle">
                    <div className="font-black tabular-nums text-fab-gold">{e.points}</div>
                    <div className="ml-auto mt-1 h-1 w-14 overflow-hidden rounded-full bg-fab-border">
                      <div className="h-full rounded-full bg-fab-gold/70" style={{ width: `${gap}%` }} />
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center"><FormDots results={form[e.uid] || []} /></td>
                  <td className="px-2 py-2 text-right tabular-nums text-emerald-300">{e.wins}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-rose-300">{e.losses}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-sky-300">{e.draws}</td>
                  {showByes && <td className="px-2 py-2 text-right tabular-nums text-fab-muted">{e.byes || 0}</td>}
                  <td className="px-2 py-2 text-right tabular-nums text-fab-text">{e.matches}</td>
                  <td className="hidden px-2 py-2 text-right tabular-nums text-fab-text sm:table-cell">{e.storesPlayed}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Storyline award cards ─────────────────────────────────────────────────────

function StoryCard({
  icon,
  kicker,
  photoUrl,
  name,
  hero,
  stat,
  proof,
}: {
  icon: ReactNode;
  kicker: string;
  photoUrl?: string;
  name: string;
  hero?: string;
  stat: string;
  proof: string;
}) {
  return (
    <div className="rounded-xl border border-fab-border bg-fab-surface p-3">
      <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-fab-dim">
        {icon} {kicker}
      </div>
      <div className="flex items-center gap-2.5">
        <CrestedAvatar photoUrl={photoUrl} name={name} hero={hero} size={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-fab-text">{name}</p>
          <p className="text-[11px] text-fab-muted">{proof}</p>
        </div>
        <span className="ml-auto text-xl font-black tabular-nums text-fab-gold">{stat}</span>
      </div>
    </div>
  );
}

export function StorylineCards({
  matches,
  standings,
}: {
  matches: PooledMatch[];
  standings: LeagueStandingEntry[];
}) {
  const cards = useMemo(() => {
    const out: ReactNode[] = [];
    const byUid = new Map(matches.map((m) => [m.memberUid, m]));
    const heroById = signatureHeroByUid(matches);
    const nameOf = (uid: string) => byUid.get(uid)?.memberName || "";
    const userOf = (uid: string) => byUid.get(uid)?.memberUsername || "";
    const photoOf = (uid: string) => byUid.get(uid)?.memberPhotoUrl;

    // On Fire — longest active win streak
    const streaks = longestWinStreaks(matches).filter((s) => s.streak >= 3);
    if (streaks[0]) {
      const s = streaks[0];
      out.push(
        <StoryCard
          key="fire"
          icon={<Flame className="h-3.5 w-3.5 text-orange-400" />}
          kicker="On fire"
          photoUrl={s.memberPhotoUrl}
          name={s.memberName}
          hero={heroById[s.memberUid]}
          stat={`${s.streak}W`}
          proof="Longest win streak"
        />,
      );
    }

    // Sharpest — best win rate with >= 6 matches
    const sharp = standings
      .filter((e) => e.matches - e.byes >= 6)
      .map((e) => ({ e, wr: winRatePct(e) ?? 0 }))
      .sort((a, b) => b.wr - a.wr)[0];
    if (sharp) {
      out.push(
        <StoryCard
          key="sharp"
          icon={<Target className="h-3.5 w-3.5 text-emerald-400" />}
          kicker="Sharpest"
          photoUrl={sharp.e.photoUrl}
          name={sharp.e.displayName}
          hero={heroById[sharp.e.uid]}
          stat={`${sharp.wr}%`}
          proof={`${sharp.e.wins}-${sharp.e.losses} win rate`}
        />,
      );
    }

    // Iron Player — most event-days attended
    const days = eventDaysByUid(matches);
    const iron = Object.entries(days).sort((a, b) => b[1] - a[1])[0];
    if (iron && iron[1] >= 2) {
      out.push(
        <StoryCard
          key="iron"
          icon={<Swords className="h-3.5 w-3.5 text-sky-400" />}
          kicker="Iron player"
          photoUrl={photoOf(iron[0])}
          name={nameOf(iron[0])}
          hero={heroById[iron[0]]}
          stat={`${iron[1]}`}
          proof="Events attended"
        />,
      );
      void userOf;
    }
    return out;
  }, [matches, standings]);

  if (!cards.length) return null;
  return <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{cards}</div>;
}

// ── Meta: KPI strip + hero bars + matrix + store turf + activity ───────────────

export function KpiStrip({ matches }: { matches: PooledMatch[] }) {
  const s = useMemo(() => poolSummary(matches), [matches]);
  const topHero = useMemo(() => heroMetaFromPool(matches)[0], [matches]);
  const tiles = [
    { label: "Matches", value: s.totalMatches },
    { label: "Players", value: s.players },
    { label: "Heroes", value: s.heroes },
    { label: "Top hero", value: topHero ? topHero.hero.split(",")[0] : "—", small: true },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-fab-border bg-fab-surface p-3">
          <p className={`font-black tabular-nums text-fab-text ${t.small ? "truncate text-base" : "text-2xl"}`}>{t.value}</p>
          <p className="text-[10px] uppercase tracking-wider text-fab-dim">{t.label}</p>
        </div>
      ))}
    </div>
  );
}

export function HeroMetaBars({ matches }: { matches: PooledMatch[] }) {
  const rows = useMemo(() => heroMetaFromPool(matches).slice(0, 12), [matches]);
  if (!rows.length) return <p className="text-sm text-fab-muted">No hero data in view.</p>;
  const max = rows[0].played || 1;
  const wrCls = (wr: number) => (wr >= 60 ? "text-emerald-300" : wr >= 45 ? "text-fab-text" : "text-rose-300");
  return (
    <div className="space-y-1.5">
      {rows.map((r) => {
        const wr = Math.round(r.winRate * 100);
        return (
          <div key={r.hero} className="flex items-center gap-2">
            <HeroImg name={r.hero} size="sm" />
            <span className="w-28 shrink-0 truncate text-xs font-bold text-fab-text sm:w-40" title={r.hero}>
              {r.hero.split(",")[0]}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-fab-bg">
              <div className="h-full rounded-full bg-fab-gold/70" style={{ width: `${(r.played / max) * 100}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-fab-dim">{r.played}</span>
            <span className={`w-9 shrink-0 text-right text-[11px] font-bold tabular-nums ${wrCls(wr)}`}>{wr}%</span>
          </div>
        );
      })}
    </div>
  );
}

export function StoreTurf({ matches }: { matches: PooledMatch[] }) {
  const rows = useMemo(() => splitByStore(matches), [matches]);
  if (rows.length < 2) return null;
  const max = rows[0].matches || 1;
  return (
    <div className="rounded-xl border border-fab-border bg-fab-surface p-4">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-fab-dim">Store activity</h3>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-2">
            <Link href={`/stores/${r.key}`} className="w-28 shrink-0 truncate text-xs font-bold text-fab-text hover:text-fab-gold sm:w-44" title={r.label}>
              {r.label}
            </Link>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-fab-bg">
              <div className="h-full rounded-full bg-sky-500/60" style={{ width: `${(r.matches / max) * 100}%` }} />
            </div>
            <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-fab-dim">
              {r.matches} · {r.players}p
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivityPulse({ matches }: { matches: PooledMatch[] }) {
  const pts = useMemo(() => activityTimeline(matches), [matches]);
  if (pts.length < 2) return null;
  const max = Math.max(...pts.map((p) => p.matches), 1);
  return (
    <div className="rounded-xl border border-fab-border bg-fab-surface p-4">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-fab-dim">Activity</h3>
      <div className="flex h-24 items-end gap-1 overflow-x-auto">
        {pts.map((p) => (
          <div key={p.date} className="flex min-w-[10px] flex-1 flex-col items-center gap-1" title={`${p.date}: ${p.matches} matches`}>
            <div className="w-full rounded-t bg-fab-gold/50" style={{ height: `${(p.matches / max) * 100}%` }} />
            <span className="text-[8px] text-fab-dim">{p.date.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Matchup matrix (now driven by the filtered pool) ──────────────────────────

export function MatchupGrid({ matches }: { matches: PooledMatch[] }) {
  const { data, coverage } = useMemo(() => {
    const d: LeagueMatchupData = matchupsFromPool(matches);
    const s = poolSummary(matches);
    return { data: d, coverage: s.decisiveMatches > 0 ? d.totalMatches / s.decisiveMatches : 1 };
  }, [matches]);

  const top = data.heroes.slice(0, 12);
  const names = top.map((h) => h.name);
  const shortName = (n: string) => n.split(",")[0].trim();
  const cellColor = (wr: number) =>
    wr >= 60 ? "bg-emerald-500/25 text-emerald-100" : wr >= 50 ? "bg-emerald-500/10 text-emerald-200" : wr >= 40 ? "bg-rose-500/10 text-rose-200" : "bg-rose-500/25 text-rose-100";

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-fab-dim">Hero matchups</h3>
        <span className="text-[11px] text-fab-dim">{data.totalMatches} decisive · top {top.length}</span>
      </div>
      {coverage < 0.5 && (
        <p className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/[0.06] px-2.5 py-1.5 text-[11px] text-amber-200">
          Only {Math.round(coverage * 100)}% of decisive matches have a recorded opponent hero — the matrix is directional. It fills in as players record opponents.
        </p>
      )}
      {data.totalMatches === 0 ? (
        <p className="text-sm text-fab-muted">
          No hero-vs-hero data yet — matchups appear once members log matches with both heroes recorded.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-fab-border">
          <table className="min-w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-fab-surface p-1.5 text-left font-bold text-fab-dim">hero ＼ vs</th>
                {names.map((n) => (
                  <th key={n} className="bg-fab-surface p-1.5 font-semibold text-fab-dim" title={n}>
                    <div className="mx-auto max-w-[56px] truncate">{shortName(n)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {top.map((rowHero) => (
                <tr key={rowHero.name}>
                  <th className="sticky left-0 z-10 whitespace-nowrap bg-fab-surface p-1.5 text-left font-bold text-fab-text" title={rowHero.name}>
                    <span className="block max-w-[120px] truncate">{shortName(rowHero.name)}</span>
                  </th>
                  {names.map((colName) => {
                    const cell = data.matrix[rowHero.name]?.[colName];
                    const wr = cell && cell.total > 0 ? Math.round((cell.wins / cell.total) * 100) : null;
                    const isSelf = rowHero.name === colName;
                    return (
                      <td
                        key={colName}
                        className={`border border-fab-border/40 p-1 text-center ${isSelf ? "bg-fab-bg/40" : wr !== null ? cellColor(wr) : ""}`}
                        title={cell ? `${cell.wins}-${cell.losses}${cell.draws ? `-${cell.draws}` : ""} (${cell.total} games)` : "no games"}
                      >
                        {wr === null ? (
                          <span className="text-fab-dim">·</span>
                        ) : (
                          <>
                            <div className="font-bold">{wr}%</div>
                            <div className="text-[9px] opacity-75">{cell!.wins}-{cell!.losses}</div>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Re-export for the page's filtered-standings path.
export { standingsFromPool, signatureHeroByUid, recentFormByUid };

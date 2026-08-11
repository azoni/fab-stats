"use client";
/**
 * "The League Desk" — presentational components for the redesigned league page.
 * Every module reads the same in-memory match pool (see leagues-insights.ts), so
 * one filter bar re-casts the whole page with no extra Firestore reads.
 */
import { useEffect, useMemo, useState, Fragment, type ReactNode, type CSSProperties } from "react";
import Link from "next/link";
import { HeroImg } from "@/components/heroes/HeroImg";
import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  Crown,
  Filter,
  Flame,
  MapPin,
  Medal,
  PencilRuler,
  RefreshCw,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { MatchResult, type League, type LeagueMember, type LeagueStandingEntry, type LeagueSeasonRecap } from "@/types";
import { bannerObjectPosition, LEAGUE_DESK_SCRIM } from "@/lib/league-images";
import { type LeagueMatchupData } from "@/lib/leagues-scoring";
import { PointsProgression } from "@/components/leagues/PointsProgressionChart";
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
  deriveEntryAwards,
  progressionFromEntries,
  partitionPlayedFirst,
} from "@/lib/leagues-insights";

// ── shared helpers ────────────────────────────────────────────────────────────

const UTC = (d: string) => new Date(d + "T00:00:00Z").getTime();
const DAY = 86_400_000;

// ── Shared card + label tokens ────────────────────────────────────────────────
// One surface material and one label scale across every league card, so the tab
// bodies read as a single designed system instead of separately-built boxes.
export const CARD_CLS = "rounded-xl border border-fab-border bg-fab-surface";
export const EYEBROW_CLS = "text-[10px] font-bold uppercase tracking-wider text-fab-dim";
export const CARD_TITLE_CLS = "text-xs font-bold uppercase tracking-wider text-fab-dim";

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

/** The season's closing window — gates the reminder banner + recap preview.
 *  finalWeek = the last scheduled week OR within 7 days of the end (still Live);
 *  ended = past the end date (or completed). Shared so the page and the banner
 *  agree on when to celebrate/remind. */
export function seasonClosePhase(league: League, today: string) {
  const status = statusInfo(league, today);
  const prog = seasonProgress(league, today);
  const daysToEnd = Math.round((UTC(league.endDate) - UTC(today)) / DAY);
  const finalWeek = status.live && (prog.week === prog.totalWeeks || (daysToEnd >= 0 && daysToEnd <= 7));
  const ended = status.label === "Final";
  return { finalWeek, ended };
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
export function CrestedAvatar({
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

function StatCell({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="px-4 py-2.5">
      <p className="flex items-center text-lg font-black tabular-nums leading-none text-fab-text">
        {value}
        {children}
      </p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-fab-dim">{label}</p>
    </div>
  );
}

export function Marquee({
  league,
  organizerName,
  memberCount,
  members,
  matchCount,
  leader,
  actions,
}: {
  league: League;
  organizerName: string;
  memberCount: number;
  members?: LeagueMember[];
  matchCount?: number;
  leader: LeagueStandingEntry | null;
  leaderHero?: string;
  actions: ReactNode;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const status = statusInfo(league, today);
  const prog = seasonProgress(league, today);
  // Accent: default to the theme token (so alternate themes stay coherent);
  // clamp a custom accent toward gold and never use it for text.
  const accent = league.accentColor
    ? `color-mix(in srgb, ${league.accentColor} 82%, var(--color-fab-gold, #e0b34d))`
    : "var(--color-fab-gold, #e0b34d)";
  // Up to two initials for the crest/watermark (unicode-safe).
  const initials =
    (league.name.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).slice(0, 2).map((w) => [...w][0]).join("") ||
      [...league.name.trim()].slice(0, 2).join("")).toUpperCase();
  const locationStr = [league.city, league.region, league.country].filter(Boolean).join(", ");
  const patternId = `ley-${league.id}`;
  const hasBanner = !!league.bannerUrl;

  // progress ring geometry (r=22 → C≈138.2), and the bottom meter width.
  const R = 22;
  const C = 2 * Math.PI * R;
  const dash = C * (1 - Math.min(1, Math.max(0, prog.pct / 100)));
  const seasonCaption =
    status.label === "Upcoming"
      ? "Starts soon"
      : status.label === "Final"
        ? "Season complete"
        : status.label === "Draft"
          ? "Draft season"
          : `Week ${prog.week} of ${prog.totalWeeks} · ${prog.pct}%`;

  return (
    <div
      className="relative isolate overflow-hidden rounded-2xl border bg-fab-surface"
      style={{ ["--accent" as string]: accent, borderColor: `color-mix(in srgb, ${accent} 26%, var(--color-fab-border, #2a2a30))` } as CSSProperties}
    >
      {/* ── Background: a real photo if one exists, else pure-CSS accent craft ── */}
      {hasBanner ? (
        <>
          <div
            aria-hidden
            className="absolute inset-0 -z-30 bg-cover"
            style={{ backgroundImage: `url(${league.bannerUrl})`, backgroundPosition: bannerObjectPosition(league.bannerPosition) }}
          />
          <div aria-hidden className="absolute inset-0 -z-20" style={{ background: LEAGUE_DESK_SCRIM }} />
        </>
      ) : (
        <>
          {/* A — accent mesh (never pure black; three blooms give it depth) */}
          <div aria-hidden className="absolute inset-0 -z-30" style={{ background:
            "radial-gradient(120% 140% at 6% -25%, color-mix(in srgb,var(--accent) 22%,transparent), transparent 55%)," +
            "radial-gradient(90% 120% at 100% 0%, color-mix(in srgb,var(--accent) 13%,transparent), transparent 50%)," +
            "radial-gradient(90% 130% at 92% 122%, color-mix(in srgb,var(--accent) 10%,transparent), transparent 55%)," +
            "linear-gradient(160deg, var(--color-fab-surface,#17171c), var(--color-fab-bg,#0c0c0f) 76%)" }} />
          {/* B — leyline lattice, masked to fade out under the title */}
          <svg aria-hidden className="absolute inset-0 -z-20 h-full w-full opacity-40" style={{
            color: "color-mix(in srgb,var(--accent) 45%,transparent)",
            maskImage: "linear-gradient(105deg,transparent 20%,#000 82%)",
            WebkitMaskImage: "linear-gradient(105deg,transparent 20%,#000 82%)" }}>
            <defs>
              <pattern id={patternId} width="34" height="20" patternUnits="userSpaceOnUse">
                <path d="M0 20 L17 0 L34 20" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
                <circle cx="17" cy="0" r="1" fill="currentColor" fillOpacity="0.45" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
          </svg>
          {/* C — engraved monogram watermark bleeding off the right */}
          <svg aria-hidden className="pointer-events-none absolute inset-y-0 right-0 -z-20 h-full w-2/3 select-none"
            viewBox="0 0 120 120" preserveAspectRatio="xMaxYMid meet"
            style={{ maskImage: "linear-gradient(90deg,transparent,#000 72%)", WebkitMaskImage: "linear-gradient(90deg,transparent,#000 72%)" }}>
            <text x="116" y="64" textAnchor="end" dominantBaseline="central" fontSize="92" fontWeight="900" letterSpacing="-4" strokeWidth="0.8"
              style={{ fill: "color-mix(in srgb,var(--accent) 7%,transparent)", stroke: "color-mix(in srgb,var(--accent) 14%,transparent)" }}>{initials}</text>
          </svg>
        </>
      )}
      {/* top accent sheen (pulses when Live) */}
      <div aria-hidden className={`absolute inset-x-0 top-0 z-20 h-px ${status.live ? "league-sheen" : ""}`}
        style={{ background: "linear-gradient(90deg, transparent, color-mix(in srgb,var(--accent) 85%,transparent), transparent)" }} />

      {/* ── Identity row ── */}
      <div className="relative z-10 p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* minted crest tile */}
          <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl sm:h-20 sm:w-20"
            style={{
              background:
                "radial-gradient(120% 120% at 20% 12%, color-mix(in srgb,var(--accent) 55%,transparent), transparent 58%)," +
                "radial-gradient(130% 130% at 82% 92%, color-mix(in srgb,var(--accent) 28%,#000), transparent 52%)," +
                "linear-gradient(150deg, color-mix(in srgb,var(--accent) 22%,var(--color-fab-surface,#17171c)), var(--color-fab-bg,#0c0c0f))",
              boxShadow: "inset 0 1px 0 color-mix(in srgb,var(--accent) 40%,transparent), inset 0 0 0 1px color-mix(in srgb,var(--accent) 18%,transparent)",
            }}>
            {league.iconUrl ? (
              <img src={league.iconUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-black tracking-tight text-fab-text sm:text-3xl" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{initials}</span>
            )}
          </div>

          {/* title + status pill + meta */}
          {/* Over a banner, a light shadow inherits to the meta + description too, so
              they stay legible over a bright photo (the h1 keeps its own stronger one). */}
          <div className="min-w-0 flex-1" style={hasBanner ? { textShadow: "0 1px 2px rgba(0,0,0,0.6)" } : undefined}>
            <div className="flex items-start justify-between gap-2">
              <h1
                className="min-w-0 text-xl font-black leading-tight text-fab-text sm:text-3xl"
                style={hasBanner ? { textShadow: "0 1px 3px rgba(0,0,0,0.55)" } : undefined}
              >
                {league.name}
              </h1>
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${status.cls}`}>
                {status.live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />}
                {status.label}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fab-dim">
              <span>Organized by <span className="font-bold text-fab-text">{organizerName}</span></span>
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {formatDateRange(league.startDate, league.endDate)}</span>
              {locationStr && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {locationStr}</span>}
            </div>
            {league.description && <p className="mt-2 line-clamp-2 max-w-2xl text-xs text-fab-muted">{league.description}</p>}
          </div>
        </div>

        {/* actions — a full-width row below the identity (right-aligned on desktop),
            so the join / manage buttons never overlap a wrapping title on mobile. */}
        {actions && <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4 sm:justify-end">{actions}</div>}
      </div>

      {/* ── Stat band ── */}
      <div className={`relative z-10 grid grid-cols-2 border-t border-fab-border/60 sm:flex sm:divide-x sm:divide-fab-border/40 ${hasBanner ? "bg-fab-bg/70 backdrop-blur-sm" : "bg-fab-bg/40"}`}>
        <StatCell label="Players" value={String(memberCount)}>
          {members && members.length > 0 && (
            <span className="ml-2 hidden -space-x-1.5 align-middle sm:inline-flex">
              {members.slice(0, 3).map((m) => (
                <span key={m.uid} className="rounded-full ring-1 ring-fab-bg">
                  <Avatar photoUrl={m.photoUrl} name={m.displayName} size={16} />
                </span>
              ))}
            </span>
          )}
        </StatCell>
        <StatCell label="Stores" value={String(league.storeSlugs.length)} />
        {typeof matchCount === "number" && matchCount > 0 && <StatCell label="Matches" value={String(matchCount)} />}

        {/* fused leader + season-progress jewel */}
        <div className="col-span-2 flex items-center gap-3 border-t border-fab-border/40 px-4 py-2.5 sm:flex-[1.6] sm:border-t-0">
          <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 52 52" className="h-14 w-14 -rotate-90">
              <circle cx="26" cy="26" r={R} fill="none" strokeWidth="3.5" style={{ stroke: "var(--color-fab-border,#2a2a30)" }} />
              <circle cx="26" cy="26" r={R} fill="none" strokeWidth="3.5" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={dash}
                style={{ stroke: "var(--accent)", filter: "drop-shadow(0 0 3px color-mix(in srgb,var(--accent) 60%,transparent))" }} />
            </svg>
            <span className="absolute inset-0 grid place-items-center">
              {leader ? (
                <Avatar photoUrl={leader.photoUrl} name={leader.displayName} size={36} />
              ) : (
                <Trophy className="h-5 w-5 text-fab-dim" />
              )}
            </span>
            {leader && (
              <Crown className="absolute -top-1 left-1/2 h-3.5 w-3.5 -translate-x-1/2 text-fab-gold"
                style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" }} />
            )}
          </div>
          <div className="min-w-0">
            {leader ? (
              <Link href={`/player/${leader.username}`} className="block truncate text-sm font-black text-fab-text hover:text-fab-gold">
                <span className="text-fab-dim">#1 </span>
                {leader.displayName}
              </Link>
            ) : (
              <p className="text-sm font-bold text-fab-text">Standings pending</p>
            )}
            <p className="truncate text-[11px] text-fab-muted">
              {leader && <span className="font-black text-fab-gold tabular-nums">{leader.points} pts · </span>}
              {seasonCaption}
            </p>
          </div>
        </div>
      </div>

      {/* bottom progress meter */}
      <div aria-hidden className="relative z-10 h-0.5 w-full bg-fab-border/50">
        <div className="h-full" style={{ width: `${prog.pct}%`, background: "var(--accent)", boxShadow: "0 0 6px color-mix(in srgb,var(--accent) 70%,transparent)" }} />
      </div>
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

function Chip({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-all active:scale-[0.97] ${
        active
          ? "border-fab-gold/70 bg-fab-gold/15 text-fab-gold ring-1 ring-inset ring-fab-gold/20"
          : "border-fab-border/60 bg-fab-bg/60 text-fab-dim hover:border-fab-border hover:text-fab-text"
      }`}
    >
      {children}
    </button>
  );
}

export function LeagueControlBar({
  tab,
  setTab,
  memberCount,
  options,
  filters,
  setFilters,
  summary,
  filtersActive,
  leagueActive,
  poolReady,
  seasons,
  viewingSeasonId,
  onSelectSeason,
  currentSeasonLabel,
}: {
  tab: "standings" | "meta" | "players" | "trend";
  setTab: (t: "standings" | "meta" | "players" | "trend") => void;
  memberCount: number;
  options: FilterOptions;
  filters: LeagueFilters;
  setFilters: (f: LeagueFilters) => void;
  summary: { matches: number; players: number; events: number };
  filtersActive: boolean;
  leagueActive: boolean;
  poolReady: boolean;
  /** Archived seasons for the tab-bar season picker (absent/empty → hidden). */
  seasons?: { id: string; label: string }[];
  viewingSeasonId?: string | null;
  onSelectSeason?: (id: string | null) => void;
  currentSeasonLabel?: string;
}) {
  const toggle = (key: "stores" | "formats" | "eventTypes", value: string) => {
    const cur = new Set(filters[key] || []);
    cur.has(value) ? cur.delete(value) : cur.add(value);
    setFilters({ ...filters, [key]: [...cur] });
  };
  const showStores = options.stores.length > 1;
  const showFormats = options.formats.length > 1;
  const showTypes = options.eventTypes.length > 1;
  const showFilterRow = showStores || showFormats || showTypes;

  const TABS: { id: "standings" | "meta" | "players" | "trend"; label: string; Icon: typeof Trophy; count?: number }[] = [
    { id: "standings", label: "Standings", Icon: Trophy },
    { id: "meta", label: "Meta", Icon: BarChart3 },
    { id: "trend", label: "Trending", Icon: TrendingUp },
    { id: "players", label: "Players", Icon: Users, count: memberCount },
  ];

  return (
    <nav aria-label="League views and filters" className="mt-4 overflow-hidden rounded-xl border border-fab-border bg-fab-surface">
      {/* Row 1 — segmented tabs (left) + live summary (right) */}
      <div className="flex items-center justify-between gap-2 p-2">
        <div role="tablist" aria-label="League views" className="flex items-center gap-1 overflow-x-auto rounded-lg bg-fab-bg/60 p-1 ring-1 ring-inset ring-fab-border/40">
          {TABS.map(({ id, label, Icon, count }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={label}
                onClick={() => setTab(id)}
                className={`group relative inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-bold transition-all duration-200 active:scale-[0.97] ${
                  active
                    ? "bg-fab-surface text-fab-gold shadow-sm ring-1 ring-inset ring-fab-gold/25 before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-fab-gold/70 before:to-transparent"
                    : "text-fab-dim hover:bg-fab-surface/60 hover:text-fab-text"
                }`}
              >
                <Icon className="h-4 w-4 sm:h-3.5 sm:w-3.5" strokeWidth={2.5} />
                <span className="hidden sm:inline">{label}</span>
                {typeof count === "number" && (
                  <span className={`ml-0.5 rounded px-1 text-[11px] font-black tabular-nums ${active ? "bg-fab-gold/20 text-fab-gold" : "bg-fab-border/50 text-fab-muted"}`}>{count}</span>
                )}
              </button>
            );
          })}
          {!!seasons?.length && onSelectSeason && (
            // Season picker, dressed as a tab: a transparent native <select>
            // stretched over the chip keeps the OS dropdown UX. Count = archived
            // seasons + the current one. Gold while viewing a past season.
            <span
              className={`group relative inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-bold transition-all duration-200 ${
                viewingSeasonId
                  ? "bg-fab-surface text-fab-gold shadow-sm ring-1 ring-inset ring-fab-gold/25"
                  : "text-fab-dim hover:bg-fab-surface/60 hover:text-fab-text"
              }`}
            >
              <CalendarClock className="h-4 w-4 sm:h-3.5 sm:w-3.5" strokeWidth={2.5} />
              <span className="hidden sm:inline">Seasons</span>
              <span className={`ml-0.5 rounded px-1 text-[11px] font-black tabular-nums ${viewingSeasonId ? "bg-fab-gold/20 text-fab-gold" : "bg-fab-border/50 text-fab-muted"}`}>
                {seasons.length + 1}
              </span>
              <ChevronDown className="h-3 w-3 opacity-70" />
              <select
                value={viewingSeasonId || "current"}
                onChange={(e) => onSelectSeason(e.target.value === "current" ? null : e.target.value)}
                title="View a past season's final standings"
                aria-label="Season"
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                <option value="current">{currentSeasonLabel || "Current season"}</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </span>
          )}
        </div>

        {poolReady && (
          // The header stat band already owns the season totals. Idle, this only adds
          // the live pulse + events (the one stat the header omits); filtered, it
          // becomes the "in view" subset, gold, so the number means the filter.
          <div className="hidden shrink-0 items-center gap-1.5 pr-0.5 text-xs tabular-nums text-fab-dim sm:flex">
            {leagueActive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" title="Live" />}
            {filtersActive ? (
              <>
                <span className="uppercase tracking-wide text-fab-dim">In view</span>
                <span className="font-bold text-fab-gold">{summary.matches}</span>
                <span className="text-fab-dim">matches</span>
                <span className="text-fab-border">·</span>
                <span className="font-bold text-fab-gold">{summary.players}</span>
                <span className="text-fab-dim">players</span>
              </>
            ) : (
              <>
                <span className="text-fab-text">{summary.events}</span>
                <span className="text-fab-dim">{summary.events === 1 ? "event" : "events"}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Row 2 — filters, only when a dimension has >1 option */}
      {showFilterRow && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-fab-border/60 bg-fab-bg/20 px-3 py-2">
          <Filter className="h-3.5 w-3.5 shrink-0 text-fab-dim" />
          {showStores && (
            <FilterGroup label="Store">
              {options.stores.map((s) => (
                <Chip key={s.slug} active={!!filters.stores?.includes(s.slug)} onClick={() => toggle("stores", s.slug)} title={s.name}>
                  <span className="inline-block max-w-[9rem] truncate align-bottom">{s.name}</span> <span className="tabular-nums opacity-60">{s.count}</span>
                </Chip>
              ))}
            </FilterGroup>
          )}
          {showFormats && (
            <FilterGroup label="Format">
              {options.formats.map((f) => (
                <Chip key={f.value} active={!!filters.formats?.includes(f.value)} onClick={() => toggle("formats", f.value)}>
                  {f.value} <span className="tabular-nums opacity-60">{f.count}</span>
                </Chip>
              ))}
            </FilterGroup>
          )}
          {showTypes && (
            <FilterGroup label="Event">
              {options.eventTypes.map((t) => (
                <Chip key={t.value} active={!!filters.eventTypes?.includes(t.value)} onClick={() => toggle("eventTypes", t.value)}>
                  {t.value} <span className="tabular-nums opacity-60">{t.count}</span>
                </Chip>
              ))}
            </FilterGroup>
          )}
          {filtersActive && (
            <button
              type="button"
              onClick={() => setFilters({})}
              className="group ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-fab-muted transition-colors hover:text-fab-gold"
            >
              <X className="h-3 w-3 transition-transform group-hover:rotate-90" /> Reset
            </button>
          )}
        </div>
      )}
    </nav>
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

// ── Broadcast standings table ─────────────────────────────────────────────────

/** A podium finish in an archived season — rendered as a medal by the name. */
export interface SeasonMedal {
  place: 1 | 2 | 3;
  season: string;
}

const MEDAL_STYLE: Record<SeasonMedal["place"], { cls: string; label: string }> = {
  1: { cls: "text-fab-gold", label: "1st" },
  2: { cls: "text-slate-300", label: "2nd" },
  3: { cls: "text-amber-600", label: "3rd" },
};

function SeasonMedals({ medals }: { medals?: SeasonMedal[] }) {
  if (!medals?.length) return null;
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {medals.map((m, i) => (
        <span key={i} title={`${MEDAL_STYLE[m.place].label} place — ${m.season}`} className="inline-flex">
          <Medal className={`h-3.5 w-3.5 ${MEDAL_STYLE[m.place].cls}`} aria-label={`${MEDAL_STYLE[m.place].label} place, ${m.season}`} />
        </span>
      ))}
    </span>
  );
}

export function BroadcastStandings({
  standings,
  signatureHeroes,
  form,
  medals,
}: {
  standings: LeagueStandingEntry[];
  signatureHeroes: Record<string, string>;
  form: Record<string, MatchResult[]>;
  /** Past-season podium finishes per uid (absent → no medals column). */
  medals?: Record<string, SeasonMedal[]>;
}) {
  const showByes = standings.some((e) => (e.byes || 0) > 0);
  const leaderPts = standings[0]?.points || 0;
  const [openUid, setOpenUid] = useState<string | null>(null);
  const colCount = showByes ? 11 : 10;
  // A member who hasn't played (0 gp) can outrank a winless-but-played member —
  // compareStandings breaks 0-point ties on fewest losses, and 0 gp means 0 losses —
  // so 0-gp rows aren't always a trailing run. Partition explicitly: played first
  // (keeping standings order), then the yet-to-play group. Don't split if nobody has
  // played or nobody is 0-gp.
  const played = standings.filter((e) => (e.matches || 0) > 0);
  const yetToPlay = standings.filter((e) => (e.matches || 0) === 0);
  const split = played.length > 0 && yetToPlay.length > 0;
  const ordered = split ? [...played, ...yetToPlay] : standings;
  const yetToPlayStart = split ? played.length : standings.length;
  return (
    <div className="overflow-hidden rounded-xl border border-fab-border bg-fab-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-fab-bg/60 text-[10px] uppercase tracking-wider text-fab-dim">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Player</th>
              <th className="px-2 pr-3 py-2 text-right">Pts</th>
              <th className="px-2 py-2 text-center">Form</th>
              <th className="hidden px-2 py-2 text-right sm:table-cell">W</th>
              <th className="hidden px-2 py-2 text-right sm:table-cell">L</th>
              <th className="hidden px-2 py-2 text-right sm:table-cell">D</th>
              {showByes && <th className="hidden px-2 py-2 text-right sm:table-cell">B</th>}
              <th className="hidden px-2 py-2 text-right sm:table-cell">Mch</th>
              <th className="hidden px-2 py-2 text-right sm:table-cell" title="Distinct events attended">Evt</th>
              <th className="hidden px-2 py-2 text-right sm:table-cell">Stores</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((e, i) => {
              const gap = leaderPts > 0 ? Math.max(0, Math.round((e.points / leaderPts) * 100)) : 0;
              const hasBreakdown = !!e.breakdown?.length;
              const open = openUid === e.uid;
              const isYetToPlay = i >= yetToPlayStart;
              return (
                <Fragment key={e.uid}>
                {i === yetToPlayStart && yetToPlayStart < standings.length && (
                  <tr className="border-t border-fab-border/40 bg-fab-bg/20">
                    <td colSpan={colCount} className="px-3 py-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-fab-dim">
                        <span className="h-px w-4 bg-fab-border" /> Yet to play
                        <span className="text-fab-border">·</span>
                        {standings.length - yetToPlayStart} {standings.length - yetToPlayStart === 1 ? "player" : "players"}
                      </span>
                    </td>
                  </tr>
                )}
                <tr
                  className={`border-t border-fab-border/40 hover:bg-fab-bg/30 ${i < 3 && !isYetToPlay ? "bg-fab-gold/[0.04]" : ""} ${isYetToPlay ? "opacity-55" : ""} ${hasBreakdown ? "cursor-pointer" : ""}`}
                  onClick={hasBreakdown ? () => setOpenUid(open ? null : e.uid) : undefined}
                >
                  <td className="px-3 py-2 text-left font-black tabular-nums">
                    <span className={i === 0 ? "text-fab-gold" : i < 3 ? "text-fab-text" : "text-fab-dim"}>{i + 1}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CrestedAvatar photoUrl={e.photoUrl} name={e.displayName} hero={signatureHeroes[e.uid]} size={30} />
                      {/* Cap the name on mobile so a long name can't widen the table and push Pts/Form off-screen. */}
                      <div className="min-w-0 max-w-[104px] sm:max-w-none">
                        <Link href={`/player/${e.username}`} onClick={(ev) => ev.stopPropagation()} className="block truncate font-bold text-fab-text hover:text-fab-gold">
                          {e.displayName}
                        </Link>
                        <p className="truncate text-[10px] text-fab-dim">@{e.username}</p>
                      </div>
                      <SeasonMedals medals={medals?.[e.uid]} />
                      {hasBreakdown && (
                        <ChevronDown className={`ml-auto h-3.5 w-3.5 shrink-0 text-fab-dim transition-transform ${open ? "rotate-180" : ""}`} />
                      )}
                    </div>
                  </td>
                  <td className="px-2 pr-3 py-2 text-right align-middle">
                    <div className={`font-black tabular-nums ${i < 3 && !isYetToPlay ? "text-fab-gold" : "text-fab-text"}`}>{e.points}</div>
                    {!isYetToPlay && (
                      <div className="ml-auto mt-1 h-1 w-14 overflow-hidden rounded-full bg-fab-border">
                        <div className={`h-full rounded-full ${i < 3 ? "bg-fab-gold/70" : "bg-fab-muted/40"}`} style={{ width: `${gap}%` }} />
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center"><FormDots results={form[e.uid] || []} /></td>
                  <td className="hidden px-2 py-2 text-right tabular-nums text-emerald-300 sm:table-cell">{e.wins}</td>
                  <td className="hidden px-2 py-2 text-right tabular-nums text-rose-300 sm:table-cell">{e.losses}</td>
                  <td className="hidden px-2 py-2 text-right tabular-nums text-sky-300 sm:table-cell">{e.draws}</td>
                  {showByes && <td className="hidden px-2 py-2 text-right tabular-nums text-fab-muted sm:table-cell">{e.byes || 0}</td>}
                  <td className="hidden px-2 py-2 text-right tabular-nums text-fab-text sm:table-cell">{e.matches}</td>
                  <td className="hidden px-2 py-2 text-right tabular-nums text-fab-text sm:table-cell">{e.events ?? "—"}</td>
                  <td className="hidden px-2 py-2 text-right tabular-nums text-fab-text sm:table-cell">{e.storesPlayed}</td>
                </tr>
                {open && hasBreakdown && (
                  <tr className="border-t border-fab-border/40 bg-fab-bg/40">
                    <td colSpan={colCount} className="px-3 py-2">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-fab-dim">Score breakdown — {e.points} pts</p>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {e.breakdown!.map((ev, j) => {
                          const shutout = ev.wins === 0 && ev.points > 0;
                          return (
                            <div key={j} className="flex items-center gap-2 rounded-md bg-fab-surface/70 px-2 py-1 text-xs">
                              <span className="w-10 shrink-0 tabular-nums text-fab-dim">{ev.date.slice(5)}</span>
                              <span className="min-w-0 flex-1 truncate text-fab-text" title={ev.name}>{ev.name}</span>
                              <span className="shrink-0 tabular-nums text-fab-muted">
                                {ev.wins}-{ev.losses}{ev.draws ? `-${ev.draws}` : ""}
                              </span>
                              <span className="w-10 shrink-0 text-right font-bold tabular-nums text-fab-gold">
                                +{ev.points}
                              </span>
                              {shutout && <span className="shrink-0 rounded bg-fab-gold/15 px-1 text-[9px] font-bold text-fab-gold">min</span>}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Storyline award cards ─────────────────────────────────────────────────────

export function StoryCard({
  icon,
  kicker,
  photoUrl,
  name,
  hero,
  stat,
  statCls,
  proof,
}: {
  icon: ReactNode;
  kicker: string;
  photoUrl?: string;
  name: string;
  hero?: string;
  stat: string;
  statCls?: string;
  proof: string;
}) {
  return (
    <div className={`${CARD_CLS} p-3`}>
      <div className={`mb-2 inline-flex items-center gap-1.5 ${EYEBROW_CLS}`}>
        {icon} {kicker}
      </div>
      <div className="flex items-center gap-2.5">
        <CrestedAvatar photoUrl={photoUrl} name={name} hero={hero} size={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-fab-text">{name}</p>
          <p className="text-[11px] text-fab-muted">{proof}</p>
        </div>
        {/* Tie the number to its story's colour rather than making every stat gold. */}
        <span className={`ml-auto text-xl font-black tabular-nums ${statCls || "text-fab-gold"}`}>{stat}</span>
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

    // Leader — the current #1, with their lead margin (replaces the old podium).
    const leader = standings[0];
    if (leader && leader.matches > 0) {
      const runnerUp = standings[1];
      const margin = runnerUp ? leader.points - runnerUp.points : leader.points;
      const proof = !runnerUp ? "Sole leader" : margin > 0 ? `Leads by ${margin}` : "Tied at the top";
      out.push(
        <StoryCard
          key="leader"
          icon={<Crown className="h-3.5 w-3.5 text-fab-gold" />}
          kicker="Leader"
          photoUrl={leader.photoUrl}
          name={leader.displayName}
          hero={heroById[leader.uid]}
          stat={`${leader.points}`}
          statCls="text-fab-gold"
          proof={proof}
        />,
      );
    }

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
          statCls="text-orange-300"
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
          statCls="text-emerald-300"
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
          statCls="text-sky-300"
          proof="Events attended"
        />,
      );
      void userOf;
    }
    return out;
  }, [matches, standings]);

  if (!cards.length) return null;
  return <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">{cards}</div>;
}

// ── Season reminder banner + recap ─────────────────────────────────────────────

/** A closing-window nudge above the league body: reminds members to import their
 *  events before the season is archived (final week), points to the recap once it
 *  ends, or prompts a manager to activate a draft. Silent outside those windows.
 *  Dismissible per league + season + state (localStorage), so a genuinely new
 *  message (or a new season) re-surfaces it. Only mount for the CURRENT season. */
export function SeasonReminderBanner({
  league,
  canManage,
  isMember,
  onRefresh,
  onViewRecap,
  onEdit,
}: {
  league: League;
  canManage: boolean;
  isMember: boolean;
  onRefresh: () => void;
  onViewRecap: () => void;
  onEdit: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const { finalWeek, ended } = seasonClosePhase(league, today);
  const isDraft = statusInfo(league, today).label === "Draft";
  let state: "ended" | "finalWeek" | "draft" | null =
    ended ? "ended" : finalWeek ? "finalWeek" : isDraft ? "draft" : null;
  // A plain player can't act on a draft — only managers see that one.
  if (state === "draft" && !canManage) state = null;

  const dismissKey = state ? `league-recap-banner:${league.id}:${league.seasonNumber || 1}:${state}` : "";
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // Read localStorage only after mount (static export prerenders without it) so the
  // server HTML (banner absent) and the first client render agree, then reveal.
  useEffect(() => {
    setHydrated(true);
    if (!dismissKey) return;
    try {
      setDismissed(localStorage.getItem(dismissKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [dismissKey]);

  if (!state || !hydrated || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const seasonLabel =
    league.seasonName || ((league.seasonNumber || 1) > 1 ? `Season ${league.seasonNumber}` : "this season");
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const primaryCls = "rounded-md bg-fab-gold px-3 py-1.5 text-sm font-bold text-black hover:bg-fab-gold/80";
  const secondaryCls =
    "rounded-md border border-fab-border bg-fab-bg/60 px-3 py-1.5 text-xs font-bold text-fab-dim hover:text-fab-gold";

  let Icon = CalendarClock;
  let iconCls = "text-fab-gold";
  let eyebrow = "Final week";
  let title = `Final week of ${seasonLabel}.`;
  let body =
    "Import any events you played so your record counts before the season is archived. Anything you have not logged will not count.";
  let note: string | null = null;
  let panelCls = "border-fab-gold/40 bg-fab-gold/[0.06]";
  let panelStyle: CSSProperties | undefined;
  let ctas: ReactNode;

  if (state === "finalWeek") {
    ctas = (
      <>
        <Link href="/import" className={primaryCls}>
          Import events
        </Link>
        {(isMember || canManage) && (
          <button type="button" onClick={onRefresh} className={secondaryCls}>
            Refresh standings
          </button>
        )}
      </>
    );
  } else if (state === "ended") {
    Icon = Trophy;
    eyebrow = "Season complete";
    title = `${cap(seasonLabel)} has ended.`;
    body =
      "Import any events you still have not logged, then refresh. The recap and final standings update as matches come in.";
    note = canManage ? "When everyone is caught up, start a new season to reset the standings." : null;
    panelCls = "border-fab-border";
    panelStyle = { backgroundColor: "var(--color-fab-surface)" };
    ctas = (
      <>
        <Link href="/import" className={primaryCls}>
          Import events
        </Link>
        <button type="button" onClick={onViewRecap} className={secondaryCls}>
          See recap
        </button>
      </>
    );
  } else {
    // draft (managers only)
    Icon = PencilRuler;
    iconCls = "text-fab-dim";
    eyebrow = "Draft";
    title = `${league.name} is a draft.`;
    body = "Mark it active from the edit panel so imported matches start counting.";
    panelCls = "border-fab-border";
    panelStyle = { backgroundColor: "var(--color-fab-surface)" };
    ctas = (
      <button type="button" onClick={onEdit} className={primaryCls}>
        Edit league
      </button>
    );
  }

  return (
    <div className={`relative mt-4 overflow-hidden rounded-xl border p-4 ${panelCls}`} style={panelStyle}>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss reminder"
        className="absolute right-2 top-2 rounded p-1 text-fab-dim hover:text-fab-text"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3 pr-6">
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconCls}`} />
          <div className="min-w-0">
            <p className={EYEBROW_CLS}>{eyebrow}</p>
            <p className="mt-0.5 text-sm font-black text-fab-text">{title}</p>
            <p className="mt-1 max-w-prose text-xs text-fab-muted">{body}</p>
            {note && <p className="mt-1 max-w-prose text-xs text-fab-muted">{note}</p>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{ctas}</div>
      </div>
    </div>
  );
}

/** Pure-CSS celebratory flecks behind the crowned champion (keyframes in
 *  globals.css; static + faint under prefers-reduced-motion). Deterministic
 *  layout — no Math.random at render, so SSG hydration stays stable. */
function ChampionConfetti() {
  const colors = ["var(--color-fab-gold)", "#38bdf8", "#f472b6", "#34d399", "#a78bfa", "#fb923c"];
  const pieces = Array.from({ length: 18 }, (_, i) => ({
    left: (i * 53) % 100,
    delay: (i % 6) * 0.28,
    dur: 2.2 + (i % 5) * 0.32,
    color: colors[i % colors.length],
    w: 4 + (i % 3) * 2,
  }));
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="recap-confetti-piece absolute top-0 rounded-[1px]"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.w + 3,
            background: p.color,
            ["--delay" as string]: `${p.delay}s`,
            ["--dur" as string]: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

/** The celebratory season recap: champion band, award cards, fun-stats strip,
 *  heroes of the season, and the points race. ONE render path across three cases:
 *  a LIVE current season (pass a live-built recap + inProgress), an ARCHIVED season
 *  (pass the stored recap), or a LEGACY archive (no recap — champion, entries-only
 *  awards, and the entries-based points race still render; pool-only cards drop). */
export function SeasonRecap({
  entries,
  recap,
  meta,
  viewerUid,
  inProgress,
}: {
  entries: LeagueStandingEntry[];
  recap?: LeagueSeasonRecap;
  meta: { name: string; seasonNumber?: number; startDate: string; endDate: string; players: number };
  viewerUid?: string;
  inProgress?: boolean;
}) {
  // Played members first, so the champion (first played), the points-race ranks,
  // and the frozen StandingsTable below all agree on who is #1 (see
  // partitionPlayedFirst — a 0-gp member can otherwise sort to the top).
  const ordered = useMemo(() => partitionPlayedFirst(entries), [entries]);
  const awards = useMemo(() => deriveEntryAwards(ordered), [ordered]);
  const prog = useMemo(() => progressionFromEntries(ordered), [ordered]);
  const byUid = useMemo(() => new Map(ordered.map((e) => [e.uid, e])), [ordered]);

  const heroes = recap?.heroesByUid || {};
  const champ = awards.champion;
  if (!champ) return null;

  const record = (e: LeagueStandingEntry) => `${e.wins}-${e.losses}${e.draws ? `-${e.draws}` : ""}`;
  const onFireEntry = recap?.onFire ? byUid.get(recap.onFire.uid) : undefined;
  const hasAwards = !!(onFireEntry || awards.sharpest || awards.iron || awards.biggestNight || awards.roadWarrior);
  const funStats: { label: string; value: string | number }[] = [
    { label: "Matches", value: recap?.pool?.totalMatches ?? entries.reduce((s, e) => s + e.matches, 0) },
    { label: "Players", value: meta.players },
    { label: "Events", value: recap?.pool?.events ?? "—" },
    { label: "Heroes", value: recap?.pool?.heroes ?? "—" },
  ];

  return (
    <div className="space-y-4">
      {/* 1 — Champion band (opaque surface + gold wash; confetti only once Final) */}
      <div
        className="relative overflow-hidden rounded-2xl border border-fab-gold/40"
        style={{ backgroundColor: "var(--color-fab-surface)" }}
      >
        <div
          aria-hidden
          className="absolute inset-0 z-0"
          style={{ background: "radial-gradient(120% 150% at 50% -30%, color-mix(in srgb, var(--color-fab-gold) 20%, transparent), transparent 62%)" }}
        />
        {!inProgress && <ChampionConfetti />}
        <div className="relative z-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <CrestedAvatar photoUrl={champ.photoUrl} name={champ.displayName} hero={heroes[champ.uid]} size={64} />
            <div className="min-w-0">
              <p className={`inline-flex items-center gap-1.5 ${EYEBROW_CLS}`}>
                <Crown className="h-3.5 w-3.5 text-fab-gold" /> {inProgress ? "Leading" : "Season champion"}
              </p>
              <Link
                href={`/player/${champ.username}`}
                className="mt-0.5 block truncate text-xl font-black text-fab-text hover:text-fab-gold sm:text-2xl"
              >
                {champ.displayName}
              </Link>
              <p className="mt-0.5 truncate text-[11px] text-fab-dim">
                {meta.name} · {formatDateRange(meta.startDate, meta.endDate)} · {meta.players}{" "}
                {meta.players === 1 ? "player" : "players"}
              </p>
            </div>
          </div>
          <div className="shrink-0 pl-20 text-left sm:pl-0 sm:text-right">
            <p className="text-3xl font-black tabular-nums text-fab-gold sm:text-4xl">{champ.points}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-fab-dim">points · {record(champ)}</p>
          </div>
        </div>
      </div>

      {/* 2 — Award cards (entries-derived except On fire; each self-guards) */}
      {hasAwards && (
        <div>
          <p className={`mb-2 ${EYEBROW_CLS}`}>{inProgress ? "Season so far" : "Season awards"}</p>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {onFireEntry && recap?.onFire && (
              <StoryCard
                icon={<Flame className="h-3.5 w-3.5 text-orange-400" />}
                kicker="On fire"
                photoUrl={onFireEntry.photoUrl}
                name={onFireEntry.displayName}
                hero={heroes[onFireEntry.uid]}
                stat={`${recap.onFire.streak}W`}
                statCls="text-orange-300"
                proof="Longest win streak"
              />
            )}
            {awards.sharpest && (
              <StoryCard
                icon={<Target className="h-3.5 w-3.5 text-emerald-400" />}
                kicker="Sharpest"
                photoUrl={awards.sharpest.entry.photoUrl}
                name={awards.sharpest.entry.displayName}
                hero={heroes[awards.sharpest.entry.uid]}
                stat={`${awards.sharpest.winRate}%`}
                statCls="text-emerald-300"
                proof={`${awards.sharpest.entry.wins}-${awards.sharpest.entry.losses} record`}
              />
            )}
            {awards.iron && (
              <StoryCard
                icon={<Swords className="h-3.5 w-3.5 text-sky-400" />}
                kicker="Iron player"
                photoUrl={awards.iron.entry.photoUrl}
                name={awards.iron.entry.displayName}
                hero={heroes[awards.iron.entry.uid]}
                stat={`${awards.iron.events}`}
                statCls="text-sky-300"
                proof="Events attended"
              />
            )}
            {awards.biggestNight && (
              <StoryCard
                icon={<Zap className="h-3.5 w-3.5 text-fab-gold" />}
                kicker="Biggest night"
                photoUrl={awards.biggestNight.entry.photoUrl}
                name={awards.biggestNight.entry.displayName}
                hero={heroes[awards.biggestNight.entry.uid]}
                stat={`+${awards.biggestNight.points}`}
                statCls="text-fab-gold"
                proof={`${awards.biggestNight.name}${awards.biggestNight.date ? ` · ${awards.biggestNight.date.slice(5)}` : ""}`}
              />
            )}
            {awards.roadWarrior && (
              <StoryCard
                icon={<MapPin className="h-3.5 w-3.5 text-violet-400" />}
                kicker="Road warrior"
                photoUrl={awards.roadWarrior.entry.photoUrl}
                name={awards.roadWarrior.entry.displayName}
                hero={heroes[awards.roadWarrior.entry.uid]}
                stat={`${awards.roadWarrior.stores}`}
                statCls="text-violet-300"
                proof="Stores visited"
              />
            )}
          </div>
        </div>
      )}

      {/* 3 — Fun-stats strip (pool headline with entries fallback → never blanks) */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {funStats.map((t) => (
          <div key={t.label} className={`${CARD_CLS} px-3 py-2.5`}>
            <p className="text-2xl font-black tabular-nums text-fab-text">{t.value}</p>
            <p className={EYEBROW_CLS}>{t.label}</p>
          </div>
        ))}
      </div>

      {/* 4 — Heroes of the season (pool-only; hidden on legacy archives) */}
      {recap?.topHeroes?.length ? (
        <div className={`${CARD_CLS} p-4`}>
          <h3 className={`mb-2 ${CARD_TITLE_CLS}`}>Heroes of the season</h3>
          <div className="space-y-1.5">
            {recap.topHeroes.map((h) => {
              const wr = Math.round(h.winRate * 100);
              return (
                <div key={h.hero} className="flex items-center gap-2">
                  <HeroImg name={h.hero} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-fab-text" title={h.hero}>
                    {h.hero.split(",")[0]}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-fab-dim">{h.played} played</span>
                  <span className="w-10 shrink-0 text-right text-[11px] font-bold tabular-nums text-fab-muted">{wr}%</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* 5 — Points race (entries-derived; renders with no pool) */}
      {prog.eventDates.length >= 2 && <PointsProgression data={prog} viewerUid={viewerUid ?? null} />}
    </div>
  );
}

// ── Meta: KPI strip + hero bars + matrix + store turf + activity ───────────────

export function KpiStrip({ matches }: { matches: PooledMatch[] }) {
  const s = useMemo(() => poolSummary(matches), [matches]);
  const topHero = useMemo(() => heroMetaFromPool(matches)[0], [matches]);
  // Meta-only figures the header stat band can't already show (it owns matches/players).
  // "Decisive" = matches that produced a winner, so it excludes byes AND draws
  // (poolSummary.decisiveMatches counts draws as non-bye, which would overstate it).
  const wl = matches.reduce((n, m) => n + (m.result === MatchResult.Win || m.result === MatchResult.Loss ? 1 : 0), 0);
  const decisivePct = matches.length > 0 ? Math.round((wl / matches.length) * 100) : 0;
  const avgPerPlayer = s.players > 0 ? (s.totalMatches / s.players).toFixed(1) : "0";
  const num: { label: string; value: string | number }[] = [
    { label: "Decisive", value: `${decisivePct}%` },
    { label: "Avg / player", value: avgPerPlayer },
    { label: "Heroes", value: s.heroes },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {num.map((t) => (
        <div key={t.label} className={`${CARD_CLS} px-3 py-2.5`}>
          <p className="text-3xl font-black tabular-nums text-fab-text">{t.value}</p>
          <p className={EYEBROW_CLS}>{t.label}</p>
        </div>
      ))}
      <div className={`${CARD_CLS} flex items-center gap-2 px-3 py-2.5`}>
        {topHero && <HeroImg name={topHero.hero} size="sm" />}
        <div className="min-w-0">
          <p className="truncate text-base font-black text-fab-text">{topHero ? topHero.hero.split(",")[0] : "—"}</p>
          <p className={EYEBROW_CLS}>Top hero</p>
        </div>
      </div>
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
    <div className={`${CARD_CLS} p-4`}>
      <h3 className={`mb-2 ${CARD_TITLE_CLS}`}>Store activity</h3>
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
  const total = pts.reduce((sum, p) => sum + p.matches, 0);
  const lastIdx = pts.length - 1;
  return (
    <div className={`${CARD_CLS} p-4`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className={CARD_TITLE_CLS}>Activity</h3>
        <span className="text-[11px] tabular-nums text-fab-dim">{total} matches · {pts.length} days</span>
      </div>
      {/* Each night sits in its own track so sparse/quiet days still read as structure. */}
      <div className="flex h-16 items-end gap-1">
        {pts.map((p, i) => (
          <div key={p.date} className="flex min-w-[8px] flex-1 flex-col items-center gap-1" title={`${p.date}: ${p.matches} matches`}>
            <div className="relative h-12 w-full overflow-hidden rounded bg-fab-border/40">
              <div className="absolute bottom-0 w-full rounded bg-fab-gold/80" style={{ height: `${Math.max(10, (p.matches / max) * 100)}%` }} />
            </div>
            <span className="h-3 text-[8px] text-fab-dim">{i === 0 || i === lastIdx ? p.date.slice(5) : ""}</span>
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
        <h3 className={CARD_TITLE_CLS}>Hero matchups</h3>
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
                    <div className="mx-auto max-w-[72px] truncate">{shortName(n)}</div>
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

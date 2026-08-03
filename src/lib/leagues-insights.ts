/**
 * League insights layer.
 *
 * One windowed read of every member's in-window matches (getMatchesInDateRange)
 * produces a "match pool" tagged with member + store + event metadata. Every
 * league view — filtered standings, hero meta, store/format splits, the matchup
 * matrix, streaks, activity timeline — is then derived from that pool IN MEMORY.
 * Filters (store / format / event type / sub-range) re-derive instantly with no
 * further Firestore reads. See getMatchesInDateRange for why the read is cheap.
 */
import { getLeague, getLeagueMembers } from "./leagues";
import { slugifyStoreName } from "./store-directory";
import {
  getStoreAliases,
  buildAliasIndex,
  expandSlugSet,
  resolveCanonicalSlug,
  type StoreAliasIndex,
} from "./store-aliases";
import { getMatchesInDateRange } from "./firestore-storage";
import { getEventType } from "./stats";
import {
  matchQualifiesForLeague,
  buildSessionKeys,
  pointsForMatch,
  eventScore,
  compareStandings,
  type LeagueMatchupData,
  type LeagueMatchupCell,
} from "./leagues-scoring";
import {
  MatchResult,
  type League,
  type LeagueMember,
  type LeagueStandingEntry,
  type LeagueSeasonRecap,
  type MatchRecord,
} from "@/types";

/** A qualifying league match tagged with who logged it + resolved store/event. */
export interface PooledMatch extends MatchRecord {
  memberUid: string;
  memberName: string;
  memberUsername: string;
  memberPhotoUrl?: string;
  /** Canonical (alias-merged) store slug. */
  storeSlug: string;
  storeName: string;
  eventName: string;
  eventTypeResolved: string;
}

export interface LeagueMatchPool {
  league: League;
  members: LeagueMember[];
  matches: PooledMatch[];
  /** Members whose matches we could read (public / self / admin). */
  readableMemberUids: string[];
  /** Members we couldn't read (private profile) — excluded from pool views. */
  unreadableMemberUids: string[];
  aliasIndex: StoreAliasIndex;
}

/** Read + assemble the league match pool. One windowed read per member. */
export async function getLeagueMatchPool(leagueId: string): Promise<LeagueMatchPool> {
  const league = await getLeague(leagueId);
  if (!league) throw new Error("League not found.");
  const members = await getLeagueMembers(leagueId);
  const aliasIndex = buildAliasIndex(await getStoreAliases());
  const storeSlugSet = expandSlugSet(league.storeSlugs, aliasIndex);
  // Match computeLeagueStandings: a scheduled league qualifies matches on exact
  // (store, date) session pairs, not the flat store list + window. Without this the
  // live view would include off-schedule matches the authoritative path excludes.
  const sessionKeys = league.sessions?.length ? buildSessionKeys(league.sessions, aliasIndex) : null;
  const nameFor = (slug: string) => league.storeNames?.[slug] || slug;

  const readableMemberUids: string[] = [];
  const unreadableMemberUids: string[] = [];
  const matches: PooledMatch[] = [];

  await Promise.all(
    members.map(async (member) => {
      let raw: MatchRecord[];
      try {
        raw = await getMatchesInDateRange(member.uid, league.startDate, league.endDate);
      } catch {
        unreadableMemberUids.push(member.uid);
        return;
      }
      readableMemberUids.push(member.uid);
      for (const m of raw) {
        if (!matchQualifiesForLeague(m, league, storeSlugSet, sessionKeys)) continue;
        const canonical = m.venue
          ? resolveCanonicalSlug(slugifyStoreName(m.venue), aliasIndex)
          : "";
        matches.push({
          ...m,
          memberUid: member.uid,
          memberName: member.displayName || member.username,
          memberUsername: member.username,
          memberPhotoUrl: member.photoUrl,
          storeSlug: canonical,
          storeName: nameFor(canonical),
          eventName: m.notes?.split(" | ")[0]?.trim() || "",
          eventTypeResolved: getEventType(m),
        });
      }
    }),
  );

  return { league, members, matches, readableMemberUids, unreadableMemberUids, aliasIndex };
}

// ── Filters ──────────────────────────────────────────────────────────────────

export interface LeagueFilters {
  stores?: string[]; // canonical slugs; empty = all
  formats?: string[];
  eventTypes?: string[];
  startDate?: string;
  endDate?: string;
}

export interface FilterOptions {
  stores: { slug: string; name: string; count: number }[];
  formats: { value: string; count: number }[];
  eventTypes: { value: string; count: number }[];
}

/** The distinct stores / formats / event types actually present in the pool. */
export function deriveFilterOptions(matches: PooledMatch[]): FilterOptions {
  const stores = new Map<string, { name: string; count: number }>();
  const formats = new Map<string, number>();
  const eventTypes = new Map<string, number>();
  for (const m of matches) {
    if (m.storeSlug) {
      const s = stores.get(m.storeSlug) || { name: m.storeName, count: 0 };
      s.count++;
      stores.set(m.storeSlug, s);
    }
    if (m.format) formats.set(m.format, (formats.get(m.format) || 0) + 1);
    if (m.eventTypeResolved)
      eventTypes.set(m.eventTypeResolved, (eventTypes.get(m.eventTypeResolved) || 0) + 1);
  }
  return {
    stores: [...stores.entries()]
      .map(([slug, v]) => ({ slug, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    formats: [...formats.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    eventTypes: [...eventTypes.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export function applyFilters(matches: PooledMatch[], f: LeagueFilters): PooledMatch[] {
  const hasStores = !!f.stores?.length;
  const hasFormats = !!f.formats?.length;
  const hasTypes = !!f.eventTypes?.length;
  return matches.filter((m) => {
    if (hasStores && !f.stores!.includes(m.storeSlug)) return false;
    if (hasFormats && !f.formats!.includes(m.format)) return false;
    if (hasTypes && !f.eventTypes!.includes(m.eventTypeResolved)) return false;
    const d = (m.date || "").slice(0, 10);
    if (f.startDate && d < f.startDate) return false;
    if (f.endDate && d > f.endDate) return false;
    return true;
  });
}

// ── Aggregations (all take an already-filtered PooledMatch[]) ─────────────────

const winRateDecisive = (wins: number, losses: number, draws: number) => {
  const dec = wins + losses + draws;
  return dec > 0 ? wins / dec : 0;
};

/** Standings computed from the pool (matches computeLeagueStandings semantics).
 *  Only includes members with at least one qualifying match in the filtered set. */
export function standingsFromPool(matches: PooledMatch[], league: League): LeagueStandingEntry[] {
  const byUid = new Map<string, LeagueStandingEntry>();
  const storesByUid = new Map<string, Set<string>>();
  // Per member → per event → { record + summed points }, so we can both score
  // (floor/attendance per event) and surface a breakdown. Mirrors
  // computeLeagueStandings' leagueEventKey: date | event | store.
  type Ev = { date: string; name: string; wins: number; losses: number; draws: number; earned: number };
  const eventEarned = new Map<string, Map<string, Ev>>();
  for (const m of matches) {
    let e = byUid.get(m.memberUid);
    if (!e) {
      e = {
        uid: m.memberUid,
        username: m.memberUsername,
        displayName: m.memberName,
        photoUrl: m.memberPhotoUrl,
        matches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        byes: 0,
        points: 0,
        storesPlayed: 0,
        events: 0,
      };
      byUid.set(m.memberUid, e);
    }
    e.matches++;
    if (m.result === MatchResult.Win) e.wins++;
    else if (m.result === MatchResult.Loss) e.losses++;
    else if (m.result === MatchResult.Draw) e.draws++;
    else if (m.result === MatchResult.Bye) e.byes++;
    let ev = eventEarned.get(m.memberUid);
    if (!ev) eventEarned.set(m.memberUid, (ev = new Map()));
    const date = (m.date || "").slice(0, 10);
    const eventKey = `${date}|${m.eventName || ""}|${m.storeSlug || ""}`;
    let g = ev.get(eventKey);
    if (!g) ev.set(eventKey, (g = { date, name: m.eventName || "", wins: 0, losses: 0, draws: 0, earned: 0 }));
    if (m.result === MatchResult.Win) g.wins++;
    else if (m.result === MatchResult.Loss) g.losses++;
    else if (m.result === MatchResult.Draw) g.draws++;
    g.earned += pointsForMatch(m, league);
    if (m.storeSlug) {
      let set = storesByUid.get(m.memberUid);
      if (!set) storesByUid.set(m.memberUid, (set = new Set()));
      set.add(m.storeSlug);
    }
  }
  // Mirror computeLeagueStandings/buildEventBreakdown: one breakdown row per event
  // (floor + attendance applied), and the total is their sum.
  for (const [uid, ev] of eventEarned) {
    const e = byUid.get(uid);
    if (!e) continue;
    const breakdown = [...ev.values()]
      .map((g) => ({
        date: g.date,
        name: g.name || g.date || "Event",
        wins: g.wins,
        losses: g.losses,
        draws: g.draws,
        points: eventScore(g.earned, league.scoringRules),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    e.breakdown = breakdown;
    e.points = breakdown.reduce((s, x) => s + x.points, 0);
    e.events = breakdown.length;
  }
  for (const [uid, set] of storesByUid) {
    const e = byUid.get(uid);
    if (e) e.storesPlayed = set.size;
  }
  const entries = [...byUid.values()];
  entries.sort(compareStandings);
  return entries;
}

// ── Points progression (for the league "Trending" tab) ───────────────────────

export interface ProgressionSeries {
  uid: string;
  name: string; // displayName
  username: string;
  photoUrl?: string;
  final: number; // === standings entry.points (scoring parity)
  rank: number; // 1-based final rank (standingsFromPool order)
}
/** One recharts row: the "Start" baseline, then one row per event date. Each
 *  player's uid maps to their cumulative points as of that date. */
export interface ProgressionRow {
  label: string; // "Start" or "MM-DD"
  date: string; // "" for the baseline, else YYYY-MM-DD
  [uid: string]: number | string;
}
export interface PointsProgressionResult {
  rows: ProgressionRow[];
  series: ProgressionSeries[]; // final-rank order (series[0] = leader)
  eventDates: string[]; // sorted distinct event dates
}

/** Cumulative league-points progression from an ALREADY-RANKED standings list,
 *  using each entry's per-event breakdown ({date, points}, floor + attendance
 *  already applied). Aggregated by date and carried forward, so each line ends at
 *  the entry's EXACT `points`. Needs no match pool — the same chart therefore
 *  renders for archived and legacy seasons (any entry lacking a breakdown just
 *  contributes a flat line). Entries must already be in final-rank order. */
export function progressionFromEntries(entries: LeagueStandingEntry[]): PointsProgressionResult {
  const dateSet = new Set<string>();
  for (const e of entries) for (const b of e.breakdown || []) if (b.date) dateSet.add(b.date);
  const eventDates = [...dateSet].sort((a, b) => a.localeCompare(b));

  const series: ProgressionSeries[] = entries.map((e, i) => ({
    uid: e.uid,
    name: e.displayName,
    username: e.username,
    photoUrl: e.photoUrl,
    final: e.points,
    rank: i + 1,
  }));

  // Per-uid per-date point delta (two events on one date sum into that date).
  const deltaByUid = new Map<string, Map<string, number>>();
  for (const e of entries) {
    const m = new Map<string, number>();
    for (const b of e.breakdown || []) {
      if (!b.date) continue;
      m.set(b.date, (m.get(b.date) || 0) + b.points);
    }
    deltaByUid.set(e.uid, m);
  }

  const baseline: ProgressionRow = { label: "Start", date: "" };
  for (const s of series) baseline[s.uid] = 0;
  const rows: ProgressionRow[] = [baseline];

  const running = new Map<string, number>(series.map((s) => [s.uid, 0]));
  for (const d of eventDates) {
    const row: ProgressionRow = { label: d.slice(5), date: d };
    for (const s of series) {
      // Carry-forward: unchanged when the player didn't play that night.
      const next = (running.get(s.uid) || 0) + (deltaByUid.get(s.uid)?.get(d) || 0);
      running.set(s.uid, next);
      row[s.uid] = next;
    }
    rows.push(row);
  }
  // Invariant: running.get(uid) === series[uid].final (breakdown sums to points).
  return { rows, series, eventDates };
}

/** Cumulative league-points progression per player over the sorted union of event
 *  DATES. Thin wrapper: derive scoring-parity standings from the pool, then build
 *  the progression from their per-event breakdowns (see progressionFromEntries). */
export function pointsProgression(matches: PooledMatch[], league: League): PointsProgressionResult {
  return progressionFromEntries(standingsFromPool(matches, league));
}

export interface HeroMetaRow {
  hero: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // over decisive
  pilots: number; // distinct members who played it
}

export function heroMetaFromPool(matches: PooledMatch[]): HeroMetaRow[] {
  const map = new Map<string, HeroMetaRow & { _pilots: Set<string> }>();
  for (const m of matches) {
    if (m.result === MatchResult.Bye) continue;
    const hero = m.heroPlayed;
    if (!hero || hero === "Unknown") continue;
    let r = map.get(hero);
    if (!r) {
      r = { hero, played: 0, wins: 0, losses: 0, draws: 0, winRate: 0, pilots: 0, _pilots: new Set() };
      map.set(hero, r);
    }
    r.played++;
    r._pilots.add(m.memberUid);
    if (m.result === MatchResult.Win) r.wins++;
    else if (m.result === MatchResult.Loss) r.losses++;
    else if (m.result === MatchResult.Draw) r.draws++;
  }
  const rows = [...map.values()].map((r) => {
    r.winRate = winRateDecisive(r.wins, r.losses, r.draws);
    r.pilots = r._pilots.size;
    const { _pilots, ...rest } = r;
    void _pilots;
    return rest;
  });
  return rows.sort((a, b) => b.played - a.played || b.winRate - a.winRate);
}

export interface CountRow {
  key: string;
  label: string;
  matches: number;
  players: number;
}

function splitBy(
  matches: PooledMatch[],
  keyFn: (m: PooledMatch) => { key: string; label: string } | null,
): CountRow[] {
  const map = new Map<string, { label: string; matches: number; players: Set<string> }>();
  for (const m of matches) {
    const k = keyFn(m);
    if (!k || !k.key) continue;
    let e = map.get(k.key);
    if (!e) map.set(k.key, (e = { label: k.label, matches: 0, players: new Set() }));
    e.matches++;
    e.players.add(m.memberUid);
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, label: v.label, matches: v.matches, players: v.players.size }))
    .sort((a, b) => b.matches - a.matches);
}

export const splitByStore = (m: PooledMatch[]) =>
  splitBy(m, (x) => (x.storeSlug ? { key: x.storeSlug, label: x.storeName } : null));
export const splitByFormat = (m: PooledMatch[]) =>
  splitBy(m, (x) => (x.format ? { key: x.format, label: x.format } : null));
export const splitByEventType = (m: PooledMatch[]) =>
  splitBy(m, (x) => (x.eventTypeResolved ? { key: x.eventTypeResolved, label: x.eventTypeResolved } : null));

/** Matches per calendar day, chronologically. */
export interface TimelinePoint {
  date: string;
  matches: number;
}
export function activityTimeline(matches: PooledMatch[]): TimelinePoint[] {
  const byDay = new Map<string, number>();
  for (const m of matches) {
    const d = (m.date || "").slice(0, 10);
    if (!d) continue;
    byDay.set(d, (byDay.get(d) || 0) + 1);
  }
  return [...byDay.entries()]
    .map(([date, matches]) => ({ date, matches }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Matchup matrix built from a filtered pool (same shape as computeLeagueMatchups). */
export function matchupsFromPool(matches: PooledMatch[]): LeagueMatchupData {
  const matrix: Record<string, Record<string, LeagueMatchupCell>> = {};
  const heroStat: Record<string, { played: number; wins: number }> = {};
  let totalMatches = 0;
  for (const m of matches) {
    if (m.result === MatchResult.Bye) continue;
    const hero = m.heroPlayed;
    const opp = m.opponentHero;
    if (!hero || hero === "Unknown" || !opp || opp === "Unknown") continue;
    totalMatches++;
    const win = m.result === MatchResult.Win;
    const stat = (heroStat[hero] ||= { played: 0, wins: 0 });
    stat.played++;
    if (win) stat.wins++;
    const row = (matrix[hero] ||= {});
    const cell = (row[opp] ||= { wins: 0, losses: 0, draws: 0, total: 0 });
    cell.total++;
    if (win) cell.wins++;
    else if (m.result === MatchResult.Loss) cell.losses++;
    else if (m.result === MatchResult.Draw) cell.draws++;
  }
  const heroes = Object.entries(heroStat)
    .map(([name, s]) => ({ name, played: s.played, wins: s.wins }))
    .sort((a, b) => b.played - a.played);
  return { heroes, matrix, totalMatches };
}

// ── Fun/top-performer modules ─────────────────────────────────────────────────

const roundNum = (m: PooledMatch) => {
  const r = m.notes?.split(" | ")[1] || "";
  const digits = r.match(/\d+/);
  return digits ? parseInt(digits[0], 10) : 0;
};

/** Longest consecutive-win streak per member within the filtered set (ordered by
 *  date then round). Returns the best streak league-wide. */
export interface StreakRow {
  memberUid: string;
  memberName: string;
  memberUsername: string;
  memberPhotoUrl?: string;
  streak: number;
}
export function longestWinStreaks(matches: PooledMatch[]): StreakRow[] {
  const byMember = new Map<string, PooledMatch[]>();
  for (const m of matches) {
    if (m.result === MatchResult.Bye) continue;
    let arr = byMember.get(m.memberUid);
    if (!arr) byMember.set(m.memberUid, (arr = []));
    arr.push(m);
  }
  const rows: StreakRow[] = [];
  for (const [uid, arr] of byMember) {
    arr.sort((a, b) => a.date.localeCompare(b.date) || roundNum(a) - roundNum(b));
    let best = 0;
    let cur = 0;
    for (const m of arr) {
      if (m.result === MatchResult.Win) {
        cur++;
        best = Math.max(best, cur);
      } else {
        cur = 0;
      }
    }
    const sample = arr[0];
    rows.push({
      memberUid: uid,
      memberName: sample.memberName,
      memberUsername: sample.memberUsername,
      memberPhotoUrl: sample.memberPhotoUrl,
      streak: best,
    });
  }
  return rows.sort((a, b) => b.streak - a.streak);
}

/** Each member's signature hero = the hero they've piloted most (excl. Unknown/byes). */
export function signatureHeroByUid(matches: PooledMatch[]): Record<string, string> {
  const counts = new Map<string, Map<string, number>>();
  for (const m of matches) {
    if (m.result === MatchResult.Bye) continue;
    if (!m.heroPlayed || m.heroPlayed === "Unknown") continue;
    let byHero = counts.get(m.memberUid);
    if (!byHero) counts.set(m.memberUid, (byHero = new Map()));
    byHero.set(m.heroPlayed, (byHero.get(m.heroPlayed) || 0) + 1);
  }
  const out: Record<string, string> = {};
  for (const [uid, byHero] of counts) {
    let best = "";
    let bestN = 0;
    for (const [hero, n] of byHero) if (n > bestN) ((best = hero), (bestN = n));
    if (best) out[uid] = best;
  }
  return out;
}

/** Each member's last-n results, most recent first (ordered by date then round). */
export function recentFormByUid(matches: PooledMatch[], n = 5): Record<string, MatchResult[]> {
  const byMember = new Map<string, PooledMatch[]>();
  for (const m of matches) {
    let arr = byMember.get(m.memberUid);
    if (!arr) byMember.set(m.memberUid, (arr = []));
    arr.push(m);
  }
  const out: Record<string, MatchResult[]> = {};
  for (const [uid, arr] of byMember) {
    arr.sort((a, b) => a.date.localeCompare(b.date) || roundNum(a) - roundNum(b));
    out[uid] = arr.slice(-n).reverse().map((m) => m.result as MatchResult);
  }
  return out;
}

/** Distinct event-days each member attended (for an "Iron Player" award). */
export function eventDaysByUid(matches: PooledMatch[]): Record<string, number> {
  const byMember = new Map<string, Set<string>>();
  for (const m of matches) {
    let set = byMember.get(m.memberUid);
    if (!set) byMember.set(m.memberUid, (set = new Set()));
    set.add(`${m.date}|${m.eventName}|${m.storeSlug}`);
  }
  const out: Record<string, number> = {};
  for (const [uid, set] of byMember) out[uid] = set.size;
  return out;
}

export interface PoolSummary {
  totalMatches: number;
  decisiveMatches: number;
  players: number;
  stores: number;
  heroes: number;
  events: number;
}
export function poolSummary(matches: PooledMatch[]): PoolSummary {
  const players = new Set<string>();
  const stores = new Set<string>();
  const heroes = new Set<string>();
  const events = new Set<string>();
  let decisive = 0;
  for (const m of matches) {
    players.add(m.memberUid);
    if (m.storeSlug) stores.add(m.storeSlug);
    if (m.heroPlayed && m.heroPlayed !== "Unknown") heroes.add(m.heroPlayed);
    if (m.eventName) events.add(`${m.date}|${m.eventName}|${m.storeSlug}`);
    if (m.result !== MatchResult.Bye) decisive++;
  }
  return {
    totalMatches: matches.length,
    decisiveMatches: decisive,
    players: players.size,
    stores: stores.size,
    heroes: heroes.size,
    events: events.size,
  };
}

// ── Season recap ──────────────────────────────────────────────────────────────

/** The pool-only extras a season recap needs, frozen at close (see
 *  LeagueSeasonRecap). Everything else the recap shows is derived from the frozen
 *  standings `entries`, so a legacy archive (no recap) still renders richly.
 *  Never emits `undefined` fields — Firestore rejects them, and startNewSeason
 *  writes this blob verbatim. */
export function buildSeasonRecap(matches: PooledMatch[]): LeagueSeasonRecap {
  if (!matches.length) return { version: 1 };
  const s = poolSummary(matches);
  const recap: LeagueSeasonRecap = {
    version: 1,
    heroesByUid: signatureHeroByUid(matches),
    pool: {
      totalMatches: s.totalMatches,
      decisiveMatches: s.decisiveMatches,
      players: s.players,
      stores: s.stores,
      heroes: s.heroes,
      events: s.events,
    },
  };
  const streak = longestWinStreaks(matches).find((x) => x.streak >= 3);
  if (streak) recap.onFire = { uid: streak.memberUid, streak: streak.streak };
  const top = heroMetaFromPool(matches).slice(0, 3);
  if (top.length)
    recap.topHeroes = top.map((h) => ({
      hero: h.hero,
      played: h.played,
      wins: h.wins,
      losses: h.losses,
      winRate: h.winRate,
    }));
  return recap;
}

/** Season awards derivable from the frozen standings alone (no pool), so they
 *  render on archived AND legacy seasons. Each is self-nulling under its threshold
 *  so a thin season quietly collapses to just the champion. */
export interface SeasonAwards {
  champion: LeagueStandingEntry | null;
  sharpest: { entry: LeagueStandingEntry; winRate: number } | null;
  iron: { entry: LeagueStandingEntry; events: number } | null;
  biggestNight: { entry: LeagueStandingEntry; points: number; name: string; date: string } | null;
  roadWarrior: { entry: LeagueStandingEntry; stores: number } | null;
}

/** Partition standings so members who have played rank ahead of never-played
 *  (0-gp) members, preserving each group's internal order. Mirrors the live
 *  BroadcastStandings partition, so a frozen table's #1 always matches the recap
 *  champion (deriveEntryAwards crowns the first PLAYED member). Needed because
 *  compareStandings breaks a 0-point tie on fewest losses, and a 0-gp member has
 *  0 losses — so in an all-winless season a never-played member can otherwise sort
 *  to the top. No-op when either group is empty. */
export function partitionPlayedFirst(entries: LeagueStandingEntry[]): LeagueStandingEntry[] {
  const played = entries.filter((e) => (e.matches || 0) > 0);
  const yetToPlay = entries.filter((e) => (e.matches || 0) === 0);
  return played.length > 0 && yetToPlay.length > 0 ? [...played, ...yetToPlay] : entries;
}

export function deriveEntryAwards(entries: LeagueStandingEntry[]): SeasonAwards {
  const champion = entries.find((e) => e.matches > 0) || null;

  // Sharpest — best win rate over decisive, gated to >= 6 decisive so a bye/short
  // sample can't top it (mirrors the live StorylineCards' Sharpest).
  let sharpest: SeasonAwards["sharpest"] = null;
  for (const e of entries) {
    const decisive = e.wins + e.losses + e.draws;
    if (e.matches - e.byes < 6 || decisive === 0) continue;
    const wr = Math.round((e.wins / decisive) * 100);
    if (!sharpest || wr > sharpest.winRate) sharpest = { entry: e, winRate: wr };
  }

  // Iron player — most distinct events, min 2.
  let iron: SeasonAwards["iron"] = null;
  for (const e of entries) {
    const ev = e.events ?? 0;
    if (ev < 2) continue;
    if (!iron || ev > iron.events) iron = { entry: e, events: ev };
  }

  // Biggest night — the single highest-scoring event across every player.
  let biggestNight: SeasonAwards["biggestNight"] = null;
  for (const e of entries) {
    for (const b of e.breakdown || []) {
      if (!biggestNight || b.points > biggestNight.points)
        biggestNight = { entry: e, points: b.points, name: b.name || b.date || "Event", date: b.date };
    }
  }
  if (biggestNight && biggestNight.points <= 0) biggestNight = null;

  // Road warrior — most stores visited, min 2 (self-nulls in single-store leagues).
  let roadWarrior: SeasonAwards["roadWarrior"] = null;
  for (const e of entries) {
    if ((e.storesPlayed || 0) < 2) continue;
    if (!roadWarrior || e.storesPlayed > roadWarrior.stores) roadWarrior = { entry: e, stores: e.storesPlayed };
  }

  return { champion, sharpest, iron, biggestNight, roadWarrior };
}

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getLeague, getLeagueMembers, updateLeague, leagueSeasonsCollection } from "./leagues";
import { slugifyStoreName } from "./store-directory";
import { getStoreAliases, buildAliasIndex, expandSlugSet, resolveCanonicalSlug, type StoreAliasIndex } from "./store-aliases";
import { getMatchesInDateRange } from "./firestore-storage";
import { getEventType } from "./stats";
import { MatchResult, type League, type LeagueScoringRules, type LeagueStandingEntry, type LeagueSession, type MatchRecord } from "@/types";

/** Build the set of allowed "slug|date" keys from a league's scheduled sessions,
 *  alias-expanding each session's store the same way `storeSlugSet` is expanded. */
export function buildSessionKeys(sessions: LeagueSession[], aliasIndex: StoreAliasIndex): Set<string> {
  const keys = new Set<string>();
  for (const s of sessions) {
    for (const member of expandSlugSet([s.storeSlug], aliasIndex)) {
      keys.add(`${member}|${s.date}`);
    }
  }
  return keys;
}

/** Returns true if a match qualifies for the league. With a scheduled `sessionKeys`
 *  set, the match's (store, date) must be a scheduled session; otherwise the legacy
 *  rule applies (store in the league set AND date within the global window). Event
 *  type / format / bye filters apply either way. */
export function matchQualifiesForLeague(
  match: MatchRecord,
  league: League,
  storeSlugSet: Set<string>,
  sessionKeys?: Set<string> | null,
): boolean {
  // Must have a venue that maps to a registered store
  if (!match.venue) return false;
  const slug = slugifyStoreName(match.venue);
  // MatchRecord.date is an ISO string; compare YYYY-MM-DD.
  const matchDate = (match.date || "").slice(0, 10);
  if (!matchDate) return false;

  if (sessionKeys) {
    // Scheduled sessions: the exact (store, date) pairing must be on the schedule.
    if (!sessionKeys.has(`${slug}|${matchDate}`)) return false;
  } else {
    // Legacy: store in the league set AND date within the inclusive global window.
    if (!storeSlugSet.has(slug)) return false;
    if (matchDate < league.startDate) return false;
    if (matchDate > league.endDate) return false;
  }

  // Event type filter
  const eligibleTypes = league.scoringRules.eligibleEventTypes;
  if (eligibleTypes && eligibleTypes.length > 0) {
    const type = getEventType(match);
    if (!eligibleTypes.includes(type)) return false;
  }

  // Format filter
  const eligibleFormats = league.scoringRules.eligibleFormats;
  if (eligibleFormats && eligibleFormats.length > 0) {
    if (!eligibleFormats.includes(match.format)) return false;
  }

  // Byes only count if the league opted in via pointsPerBye > 0
  if (match.result === MatchResult.Bye) {
    return (league.scoringRules.pointsPerBye || 0) > 0;
  }

  return true;
}

export function pointsForMatch(match: MatchRecord, league: League): number {
  const r = league.scoringRules;
  // Byes use their own flat value — no participation bonus or format multipliers.
  if (match.result === MatchResult.Bye) return r.pointsPerBye || 0;

  let base = 0;
  if (match.result === MatchResult.Win) base = r.pointsPerWin;
  else if (match.result === MatchResult.Loss) base = r.pointsPerLoss;
  else if (match.result === MatchResult.Draw) base = r.pointsPerDraw;
  else return 0;

  base += r.pointsPerMatch || 0;

  const mult = r.formatMultipliers?.[match.format];
  return typeof mult === "number" ? base * mult : base;
}

/** Finalize one event's score from its summed match points: floor at
 *  minPointsPerEvent (a max, NOT additive) then add pointsPerEvent (attendance).
 *  With neither set this is just the summed match points. */
export function eventScore(earnedMatchPoints: number, rules: LeagueScoringRules): number {
  return Math.max(earnedMatchPoints, rules.minPointsPerEvent || 0) + (rules.pointsPerEvent || 0);
}

/** Whether a league uses per-event scoring (a floor and/or attendance bonus). */
export function usesEventScoring(rules: LeagueScoringRules): boolean {
  return (rules.minPointsPerEvent || 0) > 0 || (rules.pointsPerEvent || 0) > 0;
}

/** Event name for grouping — the first "notes" segment, mirroring how the live
 *  pool derives it (leagues-insights.ts). Blank when there are no notes; we do NOT
 *  fall back to "date - format" so both scoring paths partition events identically. */
export function leagueEventName(m: { notes?: string }): string {
  return (m.notes || "").split(" | ")[0]?.trim() || "";
}

/** Grouping key for "one event a member attended" — date + event name + CANONICAL
 *  (alias-merged) store, so each armory/day counts as a single event for
 *  min/attendance scoring. Must match the live pool's key (leagues-insights.ts):
 *  pass the same aliasIndex so alias-merged venues collapse to one event on both
 *  paths (without it, two spellings of one store would double-count attendance). */
export function leagueEventKey(
  m: { date?: string; notes?: string; venue?: string },
  aliasIndex?: StoreAliasIndex,
): string {
  const slug = slugifyStoreName(m.venue || "");
  const store = aliasIndex ? resolveCanonicalSlug(slug, aliasIndex) : slug;
  return `${(m.date || "").slice(0, 10)}|${leagueEventName(m)}|${store}`;
}

/** Total league points for a member's qualifying matches, applying per-event
 *  min/attendance. Byes only appear here when they qualify (pointsPerBye > 0).
 *  Pass the league's aliasIndex so event grouping matches the live standings view. */
export function scoreMatches(matches: MatchRecord[], league: League, aliasIndex?: StoreAliasIndex): number {
  if (!usesEventScoring(league.scoringRules)) {
    let pts = 0;
    for (const m of matches) pts += pointsForMatch(m, league);
    return pts;
  }
  const earnedByEvent = new Map<string, number>();
  for (const m of matches) {
    const k = leagueEventKey(m, aliasIndex);
    earnedByEvent.set(k, (earnedByEvent.get(k) || 0) + pointsForMatch(m, league));
  }
  let pts = 0;
  for (const earned of earnedByEvent.values()) pts += eventScore(earned, league.scoringRules);
  return pts;
}

/** Compute the full standings for a league. Reads every member's matches.
 *  Members with private profiles return zero (silent skip). */
export async function computeLeagueStandings(leagueId: string): Promise<LeagueStandingEntry[]> {
  const league = await getLeague(leagueId);
  if (!league) throw new Error("League not found.");

  const members = await getLeagueMembers(leagueId);
  // Expand each league store slug to its admin-merge group so matches at any
  // member venue count toward the league (back-compat: unmerged slugs pass through).
  const aliasIndex = buildAliasIndex(await getStoreAliases());
  const storeSlugSet = expandSlugSet(league.storeSlugs, aliasIndex);
  // If the league has a per-store schedule, qualify on (store, date) pairs instead
  // of the flat store list + window. startDate/endDate still span min→max session
  // dates, so the windowed read below stays correct.
  const sessionKeys = league.sessions?.length ? buildSessionKeys(league.sessions, aliasIndex) : null;

  // Prior standings, keyed by uid. A member whose matches we CAN'T read (private
  // profile — only the owner can read them — or a transient error) keeps their
  // last-known score instead of being zeroed into the shared standings doc.
  // Without this, whenever a different member refreshes, private members flip to 0.
  const priorByUid = new Map<string, LeagueStandingEntry>();
  try {
    const snap = await getDoc(doc(db, "leagues", leagueId, "standings", "current"));
    if (snap.exists()) {
      for (const e of (snap.data().entries || []) as LeagueStandingEntry[]) priorByUid.set(e.uid, e);
    }
  } catch {
    /* no prior standings yet */
  }

  const rawEntries: (LeagueStandingEntry | null)[] = await Promise.all(
    members.map(async (member) => {
      const identity = {
        uid: member.uid,
        username: member.username,
        displayName: member.displayName,
        photoUrl: member.photoUrl,
      };
      let matches: MatchRecord[] = [];
      let readFailed = false;
      try {
        // Read only the league window, not the member's whole career.
        matches = await getMatchesInDateRange(member.uid, league.startDate, league.endDate);
      } catch {
        readFailed = true;
      }
      // Couldn't read this member's matches (private profile, or transient error):
      // preserve their prior standing (with refreshed identity) rather than
      // overwriting it with zeros. With NO prior, omit them entirely instead of
      // fabricating a 0 that would pin them at zero until they refresh themselves.
      if (readFailed) {
        const prior = priorByUid.get(member.uid);
        return prior ? { ...prior, ...identity } : null;
      }
      const qualifying = matches.filter((m) => matchQualifiesForLeague(m, league, storeSlugSet, sessionKeys));

      let wins = 0;
      let losses = 0;
      let draws = 0;
      let byes = 0;
      const storeSlugsPlayed = new Set<string>();

      for (const m of qualifying) {
        if (m.result === MatchResult.Win) wins++;
        else if (m.result === MatchResult.Loss) losses++;
        else if (m.result === MatchResult.Draw) draws++;
        else if (m.result === MatchResult.Bye) byes++;
        // Canonicalize so two merged venues count as one distinct store.
        if (m.venue) storeSlugsPlayed.add(resolveCanonicalSlug(slugifyStoreName(m.venue), aliasIndex));
      }
      const points = scoreMatches(qualifying, league, aliasIndex);
      // Distinct events attended — same grouping used for min/attendance scoring.
      const events = new Set(qualifying.map((m) => leagueEventKey(m, aliasIndex))).size;

      return {
        ...identity,
        matches: qualifying.length,
        wins,
        losses,
        draws,
        byes,
        points,
        storesPlayed: storeSlugsPlayed.size,
        events,
      };
    }),
  );

  // Drop omitted members (unreadable with no prior score — see above).
  const entries: LeagueStandingEntry[] = rawEntries.filter(
    (e): e is LeagueStandingEntry => e !== null,
  );

  // Sort: points desc, win rate desc, wins desc, fewer matches first.
  // Win rate uses DECISIVE matches (excl. byes) so earning a bye — which adds
  // points but no win — can never drop a player below an otherwise-equal one.
  const winRate = (e: LeagueStandingEntry) => {
    const decisive = e.matches - e.byes;
    return decisive > 0 ? e.wins / decisive : 0;
  };
  entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aWinRate = winRate(a);
    const bWinRate = winRate(b);
    if (bWinRate !== aWinRate) return bWinRate - aWinRate;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.matches - b.matches;
  });

  return entries;
}

/** Compute standings and write them to leagues/{leagueId}/standings/current.
 *  Anyone in the league can call this; the rules permit league members to
 *  write the standings doc. */
export async function recomputeAndStoreStandings(leagueId: string): Promise<LeagueStandingEntry[]> {
  const entries = await computeLeagueStandings(leagueId);
  await setDoc(doc(db, "leagues", leagueId, "standings", "current"), {
    leagueId,
    entries,
    computedAt: new Date().toISOString(),
  });
  return entries;
}

/** Close the current season and roll the league into a fresh one — SAME league,
 *  members, stores and URL. Freezes the closing standings into
 *  leagues/{id}/seasons/{seasonId}, then updates the window/schedule/scoring and
 *  recomputes a clean slate. Returns the new season number. */
export async function startNewSeason(
  leagueId: string,
  next: {
    name?: string;
    startDate: string;
    endDate: string;
    sessions?: LeagueSession[];
    storeSlugs?: string[];
    scoringRules?: LeagueScoringRules;
  },
): Promise<number> {
  const league = await getLeague(leagueId);
  if (!league) throw new Error("League not found.");
  const prevNumber = league.seasonNumber || 1;

  // 1) Freeze the closing standings and archive them with the season's config.
  const entries = await recomputeAndStoreStandings(leagueId);
  await setDoc(doc(leagueSeasonsCollection(leagueId)), {
    seasonNumber: prevNumber,
    name: league.seasonName || `Season ${prevNumber}`,
    startDate: league.startDate,
    endDate: league.endDate,
    sessions: league.sessions || [],
    scoringRules: league.scoringRules,
    entries,
    memberCountAtClose: league.memberCount,
    archivedAt: new Date().toISOString(),
  });

  // 2) Roll into the new season (updateLeague derives storeSlugs/window from
  //    `sessions` when provided; otherwise the given start/end/stores apply).
  const updates: Parameters<typeof updateLeague>[1] = {
    startDate: next.startDate,
    endDate: next.endDate,
    seasonNumber: prevNumber + 1,
    status: "active",
  };
  if (next.name !== undefined) updates.seasonName = next.name;
  if (next.sessions !== undefined) updates.sessions = next.sessions;
  if (next.storeSlugs !== undefined) updates.storeSlugs = next.storeSlugs;
  if (next.scoringRules !== undefined) updates.scoringRules = next.scoringRules;
  await updateLeague(leagueId, updates);

  // 3) Fresh standings for the new season.
  await recomputeAndStoreStandings(leagueId);
  return prevNumber + 1;
}

export interface LeagueMatchupCell {
  wins: number;
  losses: number;
  draws: number;
  total: number;
}

export interface LeagueMatchupData {
  /** Heroes seen in league matches, most-played first. */
  heroes: { name: string; played: number; wins: number }[];
  /** matrix[heroPlayed][opponentHero] = record from the row hero's perspective. */
  matrix: Record<string, Record<string, LeagueMatchupCell>>;
  totalMatches: number;
}

/** Hero-vs-hero matchup matrix across all qualifying league matches. Reads each
 *  member's matches (same visibility limits as standings — only readable matches
 *  count). Only decisive matches with both heroes known are included. */
export async function computeLeagueMatchups(leagueId: string): Promise<LeagueMatchupData> {
  const league = await getLeague(leagueId);
  if (!league) throw new Error("League not found.");
  const members = await getLeagueMembers(leagueId);
  const aliasIndex = buildAliasIndex(await getStoreAliases());
  const storeSlugSet = expandSlugSet(league.storeSlugs, aliasIndex);
  const sessionKeys = league.sessions?.length ? buildSessionKeys(league.sessions, aliasIndex) : null;

  const matrix: Record<string, Record<string, LeagueMatchupCell>> = {};
  const heroStat: Record<string, { played: number; wins: number }> = {};
  let totalMatches = 0;

  const perMember = await Promise.all(
    members.map((m) =>
      getMatchesInDateRange(m.uid, league.startDate, league.endDate).catch(
        () => [] as MatchRecord[],
      ),
    ),
  );

  for (const matches of perMember) {
    for (const m of matches) {
      if (m.result === MatchResult.Bye) continue;
      if (!matchQualifiesForLeague(m, league, storeSlugSet, sessionKeys)) continue;
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
  }

  const heroes = Object.entries(heroStat)
    .map(([name, s]) => ({ name, played: s.played, wins: s.wins }))
    .sort((a, b) => b.played - a.played);

  return { heroes, matrix, totalMatches };
}

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getLeague, getLeagueMembers } from "./leagues";
import { slugifyStoreName } from "./store-directory";
import { getStoreAliases, buildAliasIndex, expandSlugSet, resolveCanonicalSlug } from "./store-aliases";
import { getMatchesInDateRange } from "./firestore-storage";
import { getEventType } from "./stats";
import { MatchResult, type League, type LeagueStandingEntry, type MatchRecord } from "@/types";

/** Returns true if a match qualifies for the league: store match, in date window,
 *  matching event type/format filters. */
export function matchQualifiesForLeague(
  match: MatchRecord,
  league: League,
  storeSlugSet: Set<string>,
): boolean {
  // Must have a venue that maps to a registered store
  if (!match.venue) return false;
  const slug = slugifyStoreName(match.venue);
  if (!storeSlugSet.has(slug)) return false;

  // Date window (inclusive). MatchRecord.date is an ISO string; compare YYYY-MM-DD.
  const matchDate = (match.date || "").slice(0, 10);
  if (!matchDate) return false;
  if (matchDate < league.startDate) return false;
  if (matchDate > league.endDate) return false;

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
      const qualifying = matches.filter((m) => matchQualifiesForLeague(m, league, storeSlugSet));

      let wins = 0;
      let losses = 0;
      let draws = 0;
      let byes = 0;
      let points = 0;
      const storeSlugsPlayed = new Set<string>();

      for (const m of qualifying) {
        if (m.result === MatchResult.Win) wins++;
        else if (m.result === MatchResult.Loss) losses++;
        else if (m.result === MatchResult.Draw) draws++;
        else if (m.result === MatchResult.Bye) byes++;
        points += pointsForMatch(m, league);
        // Canonicalize so two merged venues count as one distinct store.
        if (m.venue) storeSlugsPlayed.add(resolveCanonicalSlug(slugifyStoreName(m.venue), aliasIndex));
      }

      return {
        ...identity,
        matches: qualifying.length,
        wins,
        losses,
        draws,
        byes,
        points,
        storesPlayed: storeSlugsPlayed.size,
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
      if (!matchQualifiesForLeague(m, league, storeSlugSet)) continue;
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

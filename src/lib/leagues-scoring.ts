import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getLeague, getLeagueMembers } from "./leagues";
import { slugifyStoreName } from "./store-directory";
import { getMatchesByUserId } from "./firestore-storage";
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

function pointsForMatch(match: MatchRecord, league: League): number {
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
  const storeSlugSet = new Set(league.storeSlugs);

  const entries: LeagueStandingEntry[] = await Promise.all(
    members.map(async (member) => {
      let matches: MatchRecord[] = [];
      try {
        matches = await getMatchesByUserId(member.uid);
      } catch {
        matches = [];
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
        if (m.venue) storeSlugsPlayed.add(slugifyStoreName(m.venue));
      }

      return {
        uid: member.uid,
        username: member.username,
        displayName: member.displayName,
        photoUrl: member.photoUrl,
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

  // Sort: points desc, win rate desc, wins desc, fewer matches first
  entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aWinRate = a.matches > 0 ? a.wins / a.matches : 0;
    const bWinRate = b.matches > 0 ? b.wins / b.matches : 0;
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

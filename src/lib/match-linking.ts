import {
  lookupGemId,
  getMatchesByUserId,
  updateOpponentHeroForUser,
} from "@/lib/firestore-storage";
import { MatchResult, type MatchRecord } from "@/types";

const OPPOSITE_RESULT: Record<string, string> = {
  [MatchResult.Win]: MatchResult.Loss,
  [MatchResult.Loss]: MatchResult.Win,
  [MatchResult.Draw]: MatchResult.Draw,
};

/**
 * Link matches across two players via opponentGemId.
 *
 * For each of the current user's matches that has an opponentGemId:
 *   1. Look up the opponent's userId from the gemIds collection
 *   2. Fetch the opponent's matches
 *   3. Find matching record: same date + same event name + same round + opposite result
 *   4. Exchange hero info: set my opponentHero from their heroPlayed, set their opponentHero from my heroPlayed
 *
 * Returns a summary of what was linked.
 */
export async function linkMatchesWithOpponents(
  userId: string,
  myMatches: MatchRecord[]
): Promise<{ linkedCount: number; heroesReceived: number; heroesShared: number }> {
  // Group matches by opponentGemId to batch lookups
  const byGemId = new Map<string, MatchRecord[]>();
  for (const m of myMatches) {
    if (!m.opponentGemId) continue;
    const list = byGemId.get(m.opponentGemId) || [];
    list.push(m);
    byGemId.set(m.opponentGemId, list);
  }

  if (byGemId.size === 0) return { linkedCount: 0, heroesReceived: 0, heroesShared: 0 };

  let linkedCount = 0;
  let heroesReceived = 0;
  let heroesShared = 0;

  // Process each unique opponent GEM ID
  for (const [gemId, matches] of byGemId) {
    // Look up opponent userId
    const opponentUserId = await lookupGemId(gemId);
    if (!opponentUserId || opponentUserId === userId) continue;

    // Fetch opponent's matches
    let opponentMatches: MatchRecord[];
    try {
      opponentMatches = await getMatchesByUserId(opponentUserId);
    } catch {
      continue;
    }

    // Index opponent matches for fast lookup: key = "date|eventName|round"
    const oppIndex = new Map<string, MatchRecord[]>();
    for (const om of opponentMatches) {
      const key = matchKey(om);
      const list = oppIndex.get(key) || [];
      list.push(om);
      oppIndex.set(key, list);
    }

    // Match each of our matches against the opponent's
    for (const myMatch of matches) {
      const key = matchKey(myMatch);
      const candidates = oppIndex.get(key) || [];

      // Find the match with opposite result
      const linked = candidates.find(
        (om) => om.result === OPPOSITE_RESULT[myMatch.result]
      );
      if (!linked) continue;

      linkedCount++;

      // Share hero info: set their opponentHero from my heroPlayed
      const myHero = myMatch.heroPlayed;
      if (myHero && myHero !== "Unknown" && (!linked.opponentHero || linked.opponentHero === "Unknown")) {
        try {
          await updateOpponentHeroForUser(opponentUserId, linked.id, myHero);
          heroesShared++;
        } catch {
          // Cross-user write may fail if rules don't allow — skip
        }
      }

      // Receive hero info: set my opponentHero from their heroPlayed
      const theirHero = linked.heroPlayed;
      if (theirHero && theirHero !== "Unknown" && (!myMatch.opponentHero || myMatch.opponentHero === "Unknown")) {
        try {
          await updateOpponentHeroForUser(userId, myMatch.id, theirHero);
          heroesReceived++;
        } catch {
          // Skip on failure
        }
      }
    }
  }

  return { linkedCount, heroesReceived, heroesShared };
}

/**
 * After a hero edit, propagate the change to the linked opponent's match.
 * Looks up the opponent via opponentGemId, finds the matching record,
 * and sets their opponentHero to the new hero value.
 */
export async function propagateHeroToOpponent(
  userId: string,
  match: MatchRecord,
  newHero: string
): Promise<void> {
  if (!match.opponentGemId) return;
  if (!newHero || newHero === "Unknown") return;

  const opponentUserId = await lookupGemId(match.opponentGemId);
  if (!opponentUserId || opponentUserId === userId) return;

  let opponentMatches: MatchRecord[];
  try {
    opponentMatches = await getMatchesByUserId(opponentUserId);
  } catch {
    return;
  }

  const key = matchKey(match);
  const linked = opponentMatches.find(
    (om) => matchKey(om) === key && om.result === OPPOSITE_RESULT[match.result]
  );
  if (!linked) return;

  try {
    await updateOpponentHeroForUser(opponentUserId, linked.id, newHero);
  } catch {
    // Cross-user write failed — skip silently
  }
}

/** Build a lookup key from a match record: "date|eventName|round" */
function matchKey(m: MatchRecord): string {
  const eventName = m.notes?.split(" | ")[0] || "";
  const round = m.notes?.split(" | ")[1] || "";
  return `${m.date}|${eventName.toLowerCase()}|${round.toLowerCase()}`;
}

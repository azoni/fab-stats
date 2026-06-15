import {
  lookupGemId,
  getMatchesByUserId,
  updateOpponentHeroForUser,
} from "@/lib/firestore-storage";
import { getHeroByName } from "@/lib/heroes";
import { MatchResult, type MatchRecord } from "@/types";

// Cap an opponent's history read during review pre-fill. Their recent matches
// (ordered by createdAt desc) include the event you just played, so a bound of
// 1500 covers virtually everyone while keeping worst-case reads in check.
const REVIEW_OPPONENT_MATCH_LIMIT = 1500;

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

/** Build a lookup key from a match's date + notes: "date|eventName|round".
 *  Accepts the minimal shape so import drafts (no id yet) can reuse it. */
function matchKey(m: { date: string; notes?: string }): string {
  const eventName = m.notes?.split(" | ")[0] || "";
  const round = m.notes?.split(" | ")[1] || "";
  return `${m.date}|${eventName.toLowerCase()}|${round.toLowerCase()}`;
}

/** Minimal per-match shape the review resolver needs. `key` is a caller-owned
 *  stable identifier (e.g. `${origIdx}-${matchIdx}`) echoed back in results. */
export interface ReviewMatchRef {
  key: string;
  date: string;
  notes?: string;
  result: MatchResult | string;
  opponentGemId?: string;
}

/**
 * READ-ONLY pre-fill: for import-review matches that are missing an opponent
 * hero, look up whether the opponent is a FaB Stats user and read the hero
 * they recorded for our shared match. Writes nothing — purely enriches the
 * review UI before import.
 *
 * Designed to never block the preview: the caller runs this in the background
 * and applies results progressively via `onResolved`. Bounded by `maxOpponents`
 * and `concurrency` so a large import can't fan out into thousands of reads.
 * Opponents with private profiles simply fail the matches read and are skipped
 * (same constraint as the post-import linker).
 */
export async function resolveOpponentHeroesForReview(
  selfUserId: string | null,
  matches: ReviewMatchRef[],
  opts?: {
    maxOpponents?: number;
    concurrency?: number;
    onResolved?: (key: string, hero: string) => void;
    signal?: { aborted: boolean };
  },
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  // Group the missing-hero matches by opponent GEM ID (one lookup per opponent).
  const byGemId = new Map<string, ReviewMatchRef[]>();
  for (const m of matches) {
    if (!m.opponentGemId) continue;
    const list = byGemId.get(m.opponentGemId) || [];
    list.push(m);
    byGemId.set(m.opponentGemId, list);
  }

  let gemIds = [...byGemId.keys()];
  const maxOpponents = opts?.maxOpponents ?? 60;
  if (gemIds.length > maxOpponents) gemIds = gemIds.slice(0, maxOpponents);
  if (gemIds.length === 0) return result;

  const concurrency = Math.max(1, Math.min(opts?.concurrency ?? 6, gemIds.length));
  // Shared cursor. JS is single-threaded so `cursor++` between awaits is atomic,
  // but a local read makes the per-worker claim explicit and bound-safe.
  let cursor = 0;

  async function worker() {
    for (;;) {
      if (opts?.signal?.aborted) return;
      const idx = cursor++;
      if (idx >= gemIds.length) return;
      const gemId = gemIds[idx];
      const myRefs = byGemId.get(gemId)!;

      let opponentUserId: string | null;
      try {
        opponentUserId = await lookupGemId(gemId);
      } catch {
        continue;
      }
      if (!opponentUserId || opponentUserId === selfUserId) continue;
      if (opts?.signal?.aborted) return;

      let oppMatches: MatchRecord[];
      try {
        oppMatches = await getMatchesByUserId(opponentUserId, REVIEW_OPPONENT_MATCH_LIMIT);
      } catch {
        continue; // private profile / permission denied — skip
      }
      if (opts?.signal?.aborted) return;

      const oppIndex = new Map<string, MatchRecord[]>();
      for (const om of oppMatches) {
        const k = matchKey(om);
        const list = oppIndex.get(k) || [];
        list.push(om);
        oppIndex.set(k, list);
      }

      for (const ref of myRefs) {
        const candidates = oppIndex.get(matchKey(ref)) || [];
        const linked = candidates.find((om) => om.result === OPPOSITE_RESULT[ref.result]);
        const hero = linked?.heroPlayed;
        // Only accept a real, known hero — never "Unknown" or a corrupted name.
        if (!hero || hero === "Unknown" || !getHeroByName(hero)) continue;
        result.set(ref.key, hero);
        if (!opts?.signal?.aborted) opts?.onResolved?.(ref.key, hero);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return result;
}

import {
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MatchResult, type MatchRecord, type HeroMatchupDoc } from "@/types";

// ── Helpers ──

function getHeroMatchupDocId(hero1: string, hero2: string, month: string): string {
  const sorted = [hero1, hero2].sort();
  return `${sorted[0]}_${sorted[1]}_${month}`;
}

function getMonth(dateStr: string): string {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

/** Convert a preset to a list of month strings. */
export function getMonthsForPreset(preset: string): string[] {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (preset === "all") return []; // empty = no filter (fetch all)

  if (preset === "30d") {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return [
      `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`,
      currentMonth,
    ];
  }

  if (preset === "90d") {
    const months: string[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return months;
  }

  // Custom: preset is "custom:YYYY-MM-DD:YYYY-MM-DD"
  if (preset.startsWith("custom:")) {
    const [, startDate, endDate] = preset.split(":");
    if (!startDate || !endDate) return [currentMonth];
    const months: string[] = [];
    const d = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    while (d <= end) {
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      d.setMonth(d.getMonth() + 1);
    }
    return months;
  }

  return [currentMonth];
}

// ── Write: Aggregate during import ──

/**
 * Update community hero matchup counters for linked matches.
 * Counts all non-mirror matches from the importer's side.
 * Mirror matches (same hero) use userId dedup to prevent double-counting.
 */
export async function updateCommunityHeroMatchups(
  userId: string,
  matches: MatchRecord[],
): Promise<void> {
  // Filter to linked matches only
  const linked = matches.filter(
    (m) =>
      m.opponentHero &&
      m.opponentHero !== "Unknown" &&
      m.result !== MatchResult.Bye,
  );

  if (linked.length === 0) return;

  // Group by (hero pair, month) — count from all sides
  const groups = new Map<
    string,
    { hero1: string; hero2: string; month: string; hero1Wins: number; hero2Wins: number; draws: number; total: number; byFormat: Map<string, { hero1Wins: number; hero2Wins: number; draws: number; total: number }> }
  >();

  for (const m of linked) {
    const sorted = [m.heroPlayed, m.opponentHero].sort();
    const isHero1 = m.heroPlayed === sorted[0];

    // Mirror matches (same hero): only count if we have an opponentGemId
    // and our userId is lexicographically smaller, to prevent double-counting.
    if (m.heroPlayed === m.opponentHero) {
      if (!m.opponentGemId || userId >= m.opponentGemId) continue;
    }

    const month = getMonth(m.date);
    const key = `${sorted[0]}_${sorted[1]}_${month}`;

    let group = groups.get(key);
    if (!group) {
      group = {
        hero1: sorted[0],
        hero2: sorted[1],
        month,
        hero1Wins: 0,
        hero2Wins: 0,
        draws: 0,
        total: 0,
        byFormat: new Map(),
      };
      groups.set(key, group);
    }

    // Tally: attribute win/loss based on whether this user's hero is hero1 or hero2
    if (m.result === MatchResult.Win) {
      if (isHero1) group.hero1Wins++;
      else group.hero2Wins++;
    } else if (m.result === MatchResult.Loss) {
      if (isHero1) group.hero2Wins++;
      else group.hero1Wins++;
    } else if (m.result === MatchResult.Draw) {
      group.draws++;
    }
    group.total++;

    // Format breakdown
    const fmt = m.format || "Unknown";
    let fmtGroup = group.byFormat.get(fmt);
    if (!fmtGroup) {
      fmtGroup = { hero1Wins: 0, hero2Wins: 0, draws: 0, total: 0 };
      group.byFormat.set(fmt, fmtGroup);
    }
    if (m.result === MatchResult.Win) {
      if (isHero1) fmtGroup.hero1Wins++;
      else fmtGroup.hero2Wins++;
    } else if (m.result === MatchResult.Loss) {
      if (isHero1) fmtGroup.hero2Wins++;
      else fmtGroup.hero1Wins++;
    } else if (m.result === MatchResult.Draw) fmtGroup.draws++;
    fmtGroup.total++;
  }

  if (groups.size === 0) return;

  // Phase 1: Batch set main fields (set + merge creates docs if needed)
  const setBatch = writeBatch(db);
  const formatUpdates: { ref: ReturnType<typeof doc>; data: Record<string, unknown> }[] = [];
  let count = 0;

  for (const [, g] of groups) {
    const docId = getHeroMatchupDocId(g.hero1, g.hero2, g.month);
    const ref = doc(db, "heroMatchups", docId);

    setBatch.set(ref, {
      hero1: g.hero1,
      hero2: g.hero2,
      month: g.month,
      hero1Wins: increment(g.hero1Wins),
      hero2Wins: increment(g.hero2Wins),
      draws: increment(g.draws),
      total: increment(g.total),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Collect byFormat data for phase 2 (updateDoc handles dot-notation as field paths)
    if (g.byFormat.size > 0) {
      const fmtData: Record<string, unknown> = {};
      for (const [fmt, fData] of g.byFormat) {
        const prefix = `byFormat.${fmt}`;
        fmtData[`${prefix}.hero1Wins`] = increment(fData.hero1Wins);
        fmtData[`${prefix}.hero2Wins`] = increment(fData.hero2Wins);
        fmtData[`${prefix}.draws`] = increment(fData.draws);
        fmtData[`${prefix}.total`] = increment(fData.total);
      }
      formatUpdates.push({ ref, data: fmtData });
    }

    count++;
    if (count >= 400) break; // Firestore batch limit safety
  }

  if (count > 0) {
    await setBatch.commit();
  }

  // Phase 2: Update byFormat fields (update interprets dot-notation as nested field paths)
  if (formatUpdates.length > 0) {
    const updateBatch = writeBatch(db);
    for (const { ref, data } of formatUpdates) {
      updateBatch.update(ref, data);
    }
    await updateBatch.commit();
  }
}

// ── Decrement: When matches are deleted ──

/**
 * Decrement community hero matchup counters for deleted matches.
 * Mirrors the logic of updateCommunityHeroMatchups but with negative increments.
 */
export async function decrementCommunityHeroMatchups(
  userId: string,
  matches: MatchRecord[],
): Promise<void> {
  const linked = matches.filter(
    (m) =>
      m.opponentHero &&
      m.opponentHero !== "Unknown" &&
      m.result !== MatchResult.Bye,
  );

  if (linked.length === 0) return;

  // Group by (hero pair, month) — same grouping logic as update
  const groups = new Map<
    string,
    { hero1: string; hero2: string; month: string; hero1Wins: number; hero2Wins: number; draws: number; total: number; byFormat: Map<string, { hero1Wins: number; hero2Wins: number; draws: number; total: number }> }
  >();

  for (const m of linked) {
    const sorted = [m.heroPlayed, m.opponentHero].sort();
    const isHero1 = m.heroPlayed === sorted[0];

    if (m.heroPlayed === m.opponentHero) {
      if (!m.opponentGemId || userId >= m.opponentGemId) continue;
    }

    const month = getMonth(m.date);
    const key = `${sorted[0]}_${sorted[1]}_${month}`;

    let group = groups.get(key);
    if (!group) {
      group = { hero1: sorted[0], hero2: sorted[1], month, hero1Wins: 0, hero2Wins: 0, draws: 0, total: 0, byFormat: new Map() };
      groups.set(key, group);
    }

    if (m.result === MatchResult.Win) {
      if (isHero1) group.hero1Wins++;
      else group.hero2Wins++;
    } else if (m.result === MatchResult.Loss) {
      if (isHero1) group.hero2Wins++;
      else group.hero1Wins++;
    } else if (m.result === MatchResult.Draw) {
      group.draws++;
    }
    group.total++;

    const fmt = m.format || "Unknown";
    let fmtGroup = group.byFormat.get(fmt);
    if (!fmtGroup) {
      fmtGroup = { hero1Wins: 0, hero2Wins: 0, draws: 0, total: 0 };
      group.byFormat.set(fmt, fmtGroup);
    }
    if (m.result === MatchResult.Win) {
      if (isHero1) fmtGroup.hero1Wins++;
      else fmtGroup.hero2Wins++;
    } else if (m.result === MatchResult.Loss) {
      if (isHero1) fmtGroup.hero2Wins++;
      else fmtGroup.hero1Wins++;
    } else if (m.result === MatchResult.Draw) fmtGroup.draws++;
    fmtGroup.total++;
  }

  if (groups.size === 0) return;

  // Batch decrement (negative increments)
  const batch = writeBatch(db);
  let count = 0;

  for (const [, g] of groups) {
    const docId = getHeroMatchupDocId(g.hero1, g.hero2, g.month);
    const ref = doc(db, "heroMatchups", docId);

    const data: Record<string, unknown> = {
      hero1Wins: increment(-g.hero1Wins),
      hero2Wins: increment(-g.hero2Wins),
      draws: increment(-g.draws),
      total: increment(-g.total),
      updatedAt: new Date().toISOString(),
    };

    for (const [fmt, fData] of g.byFormat) {
      const prefix = `byFormat.${fmt}`;
      data[`${prefix}.hero1Wins`] = increment(-fData.hero1Wins);
      data[`${prefix}.hero2Wins`] = increment(-fData.hero2Wins);
      data[`${prefix}.draws`] = increment(-fData.draws);
      data[`${prefix}.total`] = increment(-fData.total);
    }

    batch.update(ref, data);
    count++;
    if (count >= 400) break;
  }

  if (count > 0) {
    await batch.commit().catch(() => {});
  }

  cachedData = null;
}

// ── Adjust: Hero edit on a single match ──

/**
 * When a user edits their heroPlayed, adjust the community hero matchup
 * counters: decrement the old pairing and increment the new one.
 */
export async function adjustHeroMatchupOnEdit(
  userId: string,
  match: MatchRecord,
  oldHero: string,
  newHero: string,
): Promise<void> {
  if (!match.opponentHero || match.opponentHero === "Unknown") return;
  if (match.result === MatchResult.Bye) return;
  if (oldHero === newHero) return;

  const opponentHero = match.opponentHero!;
  const month = getMonth(match.date);
  const fmt = match.format || "Unknown";

  // Skip mirror match adjustments when no opponentGemId or userId is not the counting side
  const oldIsMirror = oldHero === opponentHero;
  const newIsMirror = newHero === opponentHero;
  const shouldCountOld = oldIsMirror ? (!!match.opponentGemId && userId < match.opponentGemId) : true;
  const shouldCountNew = newIsMirror ? (!!match.opponentGemId && userId < match.opponentGemId) : true;

  // Decrement old pairing
  if (shouldCountOld) {
    const oldSorted = [oldHero, opponentHero].sort();
    const oldIsHero1 = oldHero === oldSorted[0];
    const ref = doc(db, "heroMatchups", getHeroMatchupDocId(oldHero, opponentHero, month));
    const [h1Win, h2Win, draw] = resultDeltas(match.result, -1, oldIsHero1);
    await updateDoc(ref, {
      hero1Wins: increment(h1Win), hero2Wins: increment(h2Win),
      draws: increment(draw), total: increment(-1),
      updatedAt: new Date().toISOString(),
      [`byFormat.${fmt}.hero1Wins`]: increment(h1Win),
      [`byFormat.${fmt}.hero2Wins`]: increment(h2Win),
      [`byFormat.${fmt}.draws`]: increment(draw),
      [`byFormat.${fmt}.total`]: increment(-1),
    }).catch(() => {}); // doc might not exist if data was never aggregated
  }

  // Increment new pairing
  if (shouldCountNew) {
    const newSorted = [newHero, opponentHero].sort();
    const newIsHero1 = newHero === newSorted[0];
    const ref = doc(db, "heroMatchups", getHeroMatchupDocId(newHero, opponentHero, month));
    const [h1Win, h2Win, draw] = resultDeltas(match.result, 1, newIsHero1);
    await setDoc(ref, {
      hero1: newSorted[0], hero2: newSorted[1], month,
      hero1Wins: increment(h1Win), hero2Wins: increment(h2Win),
      draws: increment(draw), total: increment(1),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    await updateDoc(ref, {
      [`byFormat.${fmt}.hero1Wins`]: increment(h1Win),
      [`byFormat.${fmt}.hero2Wins`]: increment(h2Win),
      [`byFormat.${fmt}.draws`]: increment(draw),
      [`byFormat.${fmt}.total`]: increment(1),
    }).catch(() => {});
  }

  // Invalidate cache so next read picks up the change
  cachedData = null;
}

/**
 * When a user edits opponentHero on a match, adjust the community hero matchup
 * counters: decrement the old pairing and increment the new one.
 */
export async function adjustOpponentHeroMatchupOnEdit(
  userId: string,
  match: MatchRecord,
  oldOpponentHero: string,
  newOpponentHero: string,
): Promise<void> {
  if (!match.heroPlayed || match.heroPlayed === "Unknown") return;
  if (match.result === MatchResult.Bye) return;
  if (oldOpponentHero === newOpponentHero) return;

  const heroPlayed = match.heroPlayed;
  const month = getMonth(match.date);
  const fmt = match.format || "Unknown";

  // Decrement old pairing (only if old opponent was a real hero)
  if (oldOpponentHero && oldOpponentHero !== "Unknown") {
    const oldIsMirror = heroPlayed === oldOpponentHero;
    const shouldCountOld = oldIsMirror ? (!!match.opponentGemId && userId < match.opponentGemId) : true;
    if (shouldCountOld) {
      const oldSorted = [heroPlayed, oldOpponentHero].sort();
      const oldIsHero1 = heroPlayed === oldSorted[0];
      const ref = doc(db, "heroMatchups", getHeroMatchupDocId(heroPlayed, oldOpponentHero, month));
      const [h1Win, h2Win, draw] = resultDeltas(match.result, -1, oldIsHero1);
      await updateDoc(ref, {
        hero1Wins: increment(h1Win), hero2Wins: increment(h2Win),
        draws: increment(draw), total: increment(-1),
        updatedAt: new Date().toISOString(),
        [`byFormat.${fmt}.hero1Wins`]: increment(h1Win),
        [`byFormat.${fmt}.hero2Wins`]: increment(h2Win),
        [`byFormat.${fmt}.draws`]: increment(draw),
        [`byFormat.${fmt}.total`]: increment(-1),
      }).catch(() => {});
    }
  }

  // Increment new pairing (only if new opponent is a real hero)
  if (newOpponentHero && newOpponentHero !== "Unknown") {
    const newIsMirror = heroPlayed === newOpponentHero;
    const shouldCountNew = newIsMirror ? (!!match.opponentGemId && userId < match.opponentGemId) : true;
    if (shouldCountNew) {
      const newSorted = [heroPlayed, newOpponentHero].sort();
      const newIsHero1 = heroPlayed === newSorted[0];
      const ref = doc(db, "heroMatchups", getHeroMatchupDocId(heroPlayed, newOpponentHero, month));
      const [h1Win, h2Win, draw] = resultDeltas(match.result, 1, newIsHero1);
      await setDoc(ref, {
        hero1: newSorted[0], hero2: newSorted[1], month,
        hero1Wins: increment(h1Win), hero2Wins: increment(h2Win),
        draws: increment(draw), total: increment(1),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      await updateDoc(ref, {
        [`byFormat.${fmt}.hero1Wins`]: increment(h1Win),
        [`byFormat.${fmt}.hero2Wins`]: increment(h2Win),
        [`byFormat.${fmt}.draws`]: increment(draw),
        [`byFormat.${fmt}.total`]: increment(1),
      }).catch(() => {});
    }
  }

  cachedData = null;
}

/** Map a match result to [hero1WinsDelta, hero2WinsDelta, drawsDelta].
 *  isHero1 = whether the current user's hero is hero1 (alphabetically first) in the doc. */
function resultDeltas(result: string, sign: 1 | -1, isHero1: boolean): [number, number, number] {
  if (result === MatchResult.Win) return isHero1 ? [sign, 0, 0] : [0, sign, 0];
  if (result === MatchResult.Loss) return isHero1 ? [0, sign, 0] : [sign, 0, 0];
  if (result === MatchResult.Draw) return [0, 0, sign];
  return [0, 0, 0];
}

// ── Read: Fetch community matchup data ──

export interface CommunityMatchupCell {
  hero1: string;
  hero2: string;
  hero1Wins: number;
  hero2Wins: number;
  draws: number;
  total: number;
}

// Simple in-memory cache
let cachedData: { key: string; data: CommunityMatchupCell[]; ts: number } | null = null;
const CACHE_TTL = 15 * 60_000; // 15 minutes

/**
 * Fetch aggregated community hero matchup data.
 * @param months — list of months to include (empty = all time)
 * @param format — optional format filter
 */
export async function getCommunityHeroMatchups(
  months: string[],
  format?: string,
): Promise<CommunityMatchupCell[]> {
  const cacheKey = `${months.join(",")}_${format || ""}`;
  if (cachedData && cachedData.key === cacheKey && Date.now() - cachedData.ts < CACHE_TTL) {
    return cachedData.data;
  }

  const col = collection(db, "heroMatchups");
  let docs: HeroMatchupDoc[] = [];

  if (months.length === 0) {
    // All time — fetch all docs
    const snap = await getDocs(col);
    docs = snap.docs.map((d) => d.data() as HeroMatchupDoc);
  } else if (months.length <= 30) {
    // Firestore `in` supports up to 30 values
    const q = query(col, where("month", "in", months));
    const snap = await getDocs(q);
    docs = snap.docs.map((d) => d.data() as HeroMatchupDoc);
  } else {
    // Fallback: fetch all and filter client-side
    const monthSet = new Set(months);
    const snap = await getDocs(col);
    docs = snap.docs.map((d) => d.data() as HeroMatchupDoc).filter((d) => monthSet.has(d.month));
  }

  // Aggregate across months per hero pair
  const pairMap = new Map<string, CommunityMatchupCell>();

  for (const d of docs) {
    const key = `${d.hero1}_${d.hero2}`;
    let cell = pairMap.get(key);
    if (!cell) {
      cell = { hero1: d.hero1, hero2: d.hero2, hero1Wins: 0, hero2Wins: 0, draws: 0, total: 0 };
      pairMap.set(key, cell);
    }

    if (format && d.byFormat?.[format]) {
      const f = d.byFormat[format];
      cell.hero1Wins += f.hero1Wins;
      cell.hero2Wins += f.hero2Wins;
      cell.draws += f.draws;
      cell.total += f.total;
    } else if (!format) {
      cell.hero1Wins += d.hero1Wins;
      cell.hero2Wins += d.hero2Wins;
      cell.draws += d.draws;
      cell.total += d.total;
    }
  }

  const result = [...pairMap.values()].filter((c) => c.total > 0);

  cachedData = { key: cacheKey, data: result, ts: Date.now() };
  return result;
}

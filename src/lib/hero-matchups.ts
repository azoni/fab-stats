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
 * Only counts matches where heroPlayed < opponentHero alphabetically
 * (or equal hero names, userId < opponentUserId via match.opponentGemId)
 * to prevent double-counting when both players import.
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

  // Group by (hero pair, month) — only aggregate from the "owner" side
  const groups = new Map<
    string,
    { hero1: string; hero2: string; month: string; hero1Wins: number; hero2Wins: number; draws: number; total: number; byFormat: Map<string, { hero1Wins: number; hero2Wins: number; draws: number; total: number }> }
  >();

  for (const m of linked) {
    const sorted = [m.heroPlayed, m.opponentHero].sort();
    const isHero1 = m.heroPlayed === sorted[0];

    // Dedup: only count from the side where heroPlayed is alphabetically first.
    // For mirror matches (same hero), only count if we have an opponentGemId
    // and our userId is lexicographically smaller.
    if (m.heroPlayed === m.opponentHero) {
      if (!m.opponentGemId || userId >= m.opponentGemId) continue;
    } else if (!isHero1) {
      continue;
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

    // Tally from hero1's perspective
    if (m.result === MatchResult.Win) {
      // Current user is hero1 (alphabetically first) and won
      group.hero1Wins++;
    } else if (m.result === MatchResult.Loss) {
      group.hero2Wins++;
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
    if (m.result === MatchResult.Win) fmtGroup.hero1Wins++;
    else if (m.result === MatchResult.Loss) fmtGroup.hero2Wins++;
    else if (m.result === MatchResult.Draw) fmtGroup.draws++;
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

// ── Adjust: Hero edit on a single match ──

/**
 * When a user edits their heroPlayed, adjust the community hero matchup
 * counters: decrement the old pairing and increment the new one.
 * Applies the same dedup rules as updateCommunityHeroMatchups.
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

  // Check if old pairing was counted from this user's side
  const oldCountedFromThisSide = shouldCountFromThisSide(userId, oldHero, opponentHero, match.opponentGemId);
  // Check if new pairing should be counted from this user's side
  const newCountedFromThisSide = shouldCountFromThisSide(userId, newHero, opponentHero, match.opponentGemId);

  if (!oldCountedFromThisSide && !newCountedFromThisSide) return;

  // Decrement old pairing (doc should exist since it was previously counted)
  if (oldCountedFromThisSide) {
    const ref = doc(db, "heroMatchups", getHeroMatchupDocId(oldHero, opponentHero, month));
    const [h1Win, h2Win, draw] = resultDeltas(match.result, -1);
    // updateDoc handles dot-notation as nested field paths
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

  // Increment new pairing (doc might not exist yet — create via set, then update byFormat)
  if (newCountedFromThisSide) {
    const sorted = [newHero, opponentHero].sort();
    const ref = doc(db, "heroMatchups", getHeroMatchupDocId(newHero, opponentHero, month));
    const [h1Win, h2Win, draw] = resultDeltas(match.result, 1);
    await setDoc(ref, {
      hero1: sorted[0], hero2: sorted[1], month,
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

/** Should this match be counted from the current user's side? */
function shouldCountFromThisSide(userId: string, heroPlayed: string, opponentHero: string, opponentGemId?: string): boolean {
  if (heroPlayed === opponentHero) {
    return !!opponentGemId && userId < opponentGemId;
  }
  return heroPlayed < opponentHero;
}

/** Map a match result to [hero1WinsDelta, hero2WinsDelta, drawsDelta] scaled by sign (+1 or -1). */
function resultDeltas(result: string, sign: 1 | -1): [number, number, number] {
  if (result === MatchResult.Win) return [sign, 0, 0];
  if (result === MatchResult.Loss) return [0, sign, 0];
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

import {
  doc,
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

  // Batch write with increment() for atomic updates
  const batch = writeBatch(db);
  let count = 0;

  for (const [, g] of groups) {
    const docId = getHeroMatchupDocId(g.hero1, g.hero2, g.month);
    const ref = doc(db, "heroMatchups", docId);

    const data: Record<string, unknown> = {
      hero1: g.hero1,
      hero2: g.hero2,
      month: g.month,
      hero1Wins: increment(g.hero1Wins),
      hero2Wins: increment(g.hero2Wins),
      draws: increment(g.draws),
      total: increment(g.total),
      updatedAt: new Date().toISOString(),
    };

    // Format breakdown increments
    for (const [fmt, fData] of g.byFormat) {
      const prefix = `byFormat.${fmt}`;
      data[`${prefix}.hero1Wins`] = increment(fData.hero1Wins);
      data[`${prefix}.hero2Wins`] = increment(fData.hero2Wins);
      data[`${prefix}.draws`] = increment(fData.draws);
      data[`${prefix}.total`] = increment(fData.total);
    }

    batch.set(ref, data, { merge: true });
    count++;
    if (count >= 400) break; // Firestore batch limit safety
  }

  if (count > 0) {
    await batch.commit();
  }
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

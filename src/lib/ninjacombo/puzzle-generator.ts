import { mulberry32, dateToSeed, seededShuffle } from "@/lib/games/seeded-random";
import type { ComboCard, ChainSlot } from "./types";
import { getKatsuTaunt, type NinjaTauntEvent } from "./taunts";

const SEED_OFFSET = 4_000_001;
const HAND_SIZE = 8;
const CHAIN_SIZE = 5;

// ── Card Pool ──

const KICKS: ComboCard[] = [
  { id: "kick_snap", name: "Snap Kick", type: "kick", baseDamage: 2, comboCondition: "after_punch" },
  { id: "kick_low", name: "Low Kick", type: "kick", baseDamage: 2, comboCondition: "after_punch" },
  { id: "kick_rising", name: "Rising Kick", type: "kick", baseDamage: 3, comboCondition: "after_punch" },
  { id: "kick_spinning", name: "Spinning Heel", type: "kick", baseDamage: 3, comboCondition: "after_punch" },
  { id: "kick_head", name: "Head Kick", type: "kick", baseDamage: 4, comboCondition: "after_punch" },
];

const PUNCHES: ComboCard[] = [
  { id: "punch_jab", name: "Jab", type: "punch", baseDamage: 2, comboCondition: "after_kick" },
  { id: "punch_body", name: "Body Blow", type: "punch", baseDamage: 2, comboCondition: "after_kick" },
  { id: "punch_cross", name: "Cross", type: "punch", baseDamage: 3, comboCondition: "after_kick" },
  { id: "punch_liver", name: "Liver Shot", type: "punch", baseDamage: 3, comboCondition: "after_kick" },
  { id: "punch_upper", name: "Uppercut", type: "punch", baseDamage: 4, comboCondition: "after_kick" },
];

const KUNAI: ComboCard[] = [
  { id: "kunai_nimble", name: "Nimble Kunai", type: "kunai", baseDamage: 1, comboCondition: "after_any" },
  { id: "kunai_quick", name: "Quick Toss", type: "kunai", baseDamage: 1, comboCondition: "after_any" },
  { id: "kunai_twin", name: "Twin Kunai", type: "kunai", baseDamage: 2, comboCondition: "after_any" },
  { id: "kunai_shadow", name: "Shadow Dart", type: "kunai", baseDamage: 2, comboCondition: "after_any" },
];

const SPECIALS: ComboCard[] = [
  { id: "special_surging", name: "Surging Strike", type: "special", baseDamage: 4, comboCondition: "after_2_chain" },
  { id: "special_torrent", name: "Torrent of Tempo", type: "special", baseDamage: 4, comboCondition: "after_2_chain" },
  { id: "special_whelming", name: "Whelming Gustwave", type: "special", baseDamage: 5, comboCondition: "after_2_chain" },
  { id: "special_hundred", name: "Hundred Winds", type: "special", baseDamage: 5, comboCondition: "after_2_chain" },
  { id: "special_wildfire", name: "Aether Wildfire", type: "special", baseDamage: 6, comboCondition: "after_2_chain" },
];

// ── Chain Scoring ──

function checkCombo(card: ComboCard, prev: ComboCard | null, consecutiveCount: number): boolean {
  if (!prev) return false;
  switch (card.comboCondition) {
    case "after_kick": return prev.type === "kick";
    case "after_punch": return prev.type === "punch";
    case "after_any": return true;
    case "after_2_chain": return consecutiveCount >= 2;
  }
}

export function scoreChain(cards: ComboCard[]): { slots: ChainSlot[]; total: number } {
  let consecutiveCount = 0;
  let total = 0;
  const slots: ChainSlot[] = [];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const prev = i > 0 ? cards[i - 1] : null;
    const comboed = checkCombo(card, prev, consecutiveCount);

    let bonusDamage = 0;
    if (comboed) {
      consecutiveCount++;
      bonusDamage = 1 + consecutiveCount; // 1st combo = +2, 2nd = +3, 3rd = +4, etc.
    } else {
      consecutiveCount = 0;
    }

    const totalDamage = card.baseDamage + bonusDamage;
    total += totalDamage;
    slots.push({ card, comboed, bonusDamage, totalDamage, consecutiveCombo: consecutiveCount });
  }

  return { slots, total };
}

// ── Optimal Score (brute-force C(8,5) × 5! = 6720 permutations) ──

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const result: T[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of combinations(arr.slice(i + 1), k - 1)) {
      result.push([arr[i], ...rest]);
    }
  }
  return result;
}

function computeOptimalScore(hand: ComboCard[], chainSize: number): number {
  let best = 0;
  for (const subset of combinations(hand, chainSize)) {
    for (const perm of permutations(subset)) {
      const { total } = scoreChain(perm);
      if (total > best) best = total;
    }
  }
  return best;
}

// ── Daily Puzzle Generation ──

export interface DailyCombo {
  hand: ComboCard[];
  chainSize: number;
  targetDamage: number;
  optimalScore: number;
  taunts: Record<NinjaTauntEvent, string>;
}

export function generateDailyCombo(dateStr: string): DailyCombo {
  const seed = dateToSeed(dateStr) + SEED_OFFSET;
  const rng = mulberry32(seed);

  // Build hand with guaranteed composition
  const kicks = seededShuffle(KICKS, rng).slice(0, 2 + Math.floor(rng() * 2)); // 2-3
  const punches = seededShuffle(PUNCHES, rng).slice(0, 2 + Math.floor(rng() * 2)); // 2-3
  const kunaiCount = 1 + Math.floor(rng() * 2); // 1-2
  const kunai = seededShuffle(KUNAI, rng).slice(0, kunaiCount);

  const remaining = HAND_SIZE - kicks.length - punches.length - kunai.length;
  const specials = remaining > 0 ? seededShuffle(SPECIALS, rng).slice(0, remaining) : [];

  const hand = seededShuffle([...kicks, ...punches, ...kunai, ...specials], rng);

  const optimalScore = computeOptimalScore(hand, CHAIN_SIZE);

  // Target: 60-80% of optimal, rounded, minimum 15
  const targetRatio = 0.6 + rng() * 0.2;
  const targetDamage = Math.max(15, Math.round(optimalScore * targetRatio));

  const taunts = {} as Record<NinjaTauntEvent, string>;
  for (const event of ["start", "combo", "broken", "special", "victory", "defeat"] as NinjaTauntEvent[]) {
    taunts[event] = getKatsuTaunt(event, rng);
  }

  return { hand, chainSize: CHAIN_SIZE, targetDamage, optimalScore, taunts };
}

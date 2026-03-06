import { mulberry32, dateToSeed } from "@/lib/games/seeded-random";
import { TAUNTS, type TauntEvent } from "./taunts";

const SEED_OFFSET = 3_000_002;

export interface DailyKnockout {
  targetHP: number;
  maxRounds: number;
  maxRerolls: number;
  diceSequence: number[];
  taunts: Record<TauntEvent, string>;
}

export interface ComboResult {
  name: string;
  damage: number;
}

/** Evaluate dice combo — checks in order and returns the best match. */
export function detectCombo(dice: number[]): ComboResult {
  const sorted = [...dice].sort((a, b) => a - b);
  const sum = dice.reduce((a, b) => a + b, 0);

  // Count occurrences
  const counts: Record<number, number> = {};
  for (const d of dice) counts[d] = (counts[d] || 0) + 1;
  const freqs = Object.values(counts).sort((a, b) => b - a);

  // Five of a kind — "Pulping" → 30 damage
  if (freqs[0] === 5) {
    return { name: "Pulping", damage: 30 };
  }

  // Straight (1-2-3-4-5 or 2-3-4-5-6) — "Savage Feast" → 25 damage
  const isLowStraight = sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3 && sorted[3] === 4 && sorted[4] === 5;
  const isHighStraight = sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 4 && sorted[3] === 5 && sorted[4] === 6;
  if (isLowStraight || isHighStraight) {
    return { name: "Savage Feast", damage: 25 };
  }

  // Four of a kind — "Crippling Crush" → sum + 12
  if (freqs[0] === 4) {
    return { name: "Crippling Crush", damage: sum + 12 };
  }

  // Full house (3+2) — "Wild Ride" → sum + 8
  if (freqs[0] === 3 && freqs[1] === 2) {
    return { name: "Wild Ride", damage: sum + 8 };
  }

  // Three of a kind — "Pack Hunt" → sum + 5
  if (freqs[0] === 3) {
    return { name: "Pack Hunt", damage: sum + 5 };
  }

  // Two pair
  if (freqs[0] === 2 && freqs[1] === 2) {
    return { name: "Two Pair", damage: sum + 3 };
  }

  // One pair
  if (freqs[0] === 2) {
    return { name: "One Pair", damage: sum + 1 };
  }

  // Nothing — just sum
  return { name: "", damage: sum };
}

export function generateDailyKnockout(dateStr: string): DailyKnockout {
  const rng = mulberry32(dateToSeed(dateStr) + SEED_OFFSET);

  // Daily target HP: 40–65
  const targetHP = 40 + Math.floor(rng() * 26);

  // Pre-roll 80 dice values
  const diceSequence: number[] = [];
  for (let i = 0; i < 80; i++) {
    diceSequence.push(1 + Math.floor(rng() * 6));
  }

  // Pick one taunt per event type for today
  const taunts: Record<string, string> = {};
  for (const [event, pool] of Object.entries(TAUNTS)) {
    const idx = Math.floor(rng() * pool.length);
    taunts[event] = pool[idx];
  }

  return {
    targetHP,
    maxRounds: 3,
    maxRerolls: 2,
    diceSequence,
    taunts: taunts as Record<TauntEvent, string>,
  };
}

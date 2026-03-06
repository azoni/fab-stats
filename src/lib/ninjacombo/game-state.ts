import type { NinjaComboGameState } from "./types";
import { scoreChain, type DailyCombo } from "./puzzle-generator";

const PREFIX = "ninjacombo-";

export function createFreshGameState(dateStr: string, puzzle: DailyCombo): NinjaComboGameState {
  return {
    date: dateStr,
    hand: puzzle.hand,
    chain: [],
    chainSize: puzzle.chainSize,
    totalDamage: 0,
    targetDamage: puzzle.targetDamage,
    completed: false,
    won: false,
  };
}

export function playCard(state: NinjaComboGameState, cardId: string): NinjaComboGameState {
  const cardIndex = state.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1 || state.chain.length >= state.chainSize || state.completed) return state;

  const card = state.hand[cardIndex];
  const newHand = state.hand.filter((_, i) => i !== cardIndex);
  const chainCards = [...state.chain.map((s) => s.card), card];
  const { slots, total } = scoreChain(chainCards);

  const completed = slots.length >= state.chainSize;
  return {
    ...state,
    hand: newHand,
    chain: slots,
    totalDamage: total,
    completed,
    won: completed && total >= state.targetDamage,
  };
}

export function undoLastCard(state: NinjaComboGameState): NinjaComboGameState {
  if (state.chain.length === 0 || state.completed) return state;

  const lastSlot = state.chain[state.chain.length - 1];
  const newHand = [...state.hand, lastSlot.card];
  const chainCards = state.chain.slice(0, -1).map((s) => s.card);

  if (chainCards.length === 0) {
    return { ...state, hand: newHand, chain: [], totalDamage: 0 };
  }

  const { slots, total } = scoreChain(chainCards);
  return { ...state, hand: newHand, chain: slots, totalDamage: total };
}

export function loadGameState(dateStr: string): NinjaComboGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + dateStr);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGameState(state: NinjaComboGameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + state.date, JSON.stringify(state));
  } catch {}
}

export function cleanupOldStates(): void {
  if (typeof window === "undefined") return;
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const dateStr = key.slice(PREFIX.length);
      const d = new Date(dateStr + "T12:00:00");
      if (d.getTime() < cutoff) localStorage.removeItem(key);
    }
  } catch {}
}

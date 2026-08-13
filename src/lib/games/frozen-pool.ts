import type { HeroInfo, CardInfo } from "@/types";
import { allHeroes } from "@/lib/heroes";
import { allCards } from "@/lib/cards";
import { FROZEN_HEROES, FROZEN_CARD_IDS } from "./frozen-pool-data";
import { FROZEN_HEROES_V4, FROZEN_CARD_IDS_V4 } from "./frozen-pool-data-v4";

// The four seeded daily games (FaBdoku hero + card, HeroGuesser, BruteBrawl) choose their
// answer by indexing into a pool built from the card list. That makes the pool's SIZE and
// ORDER hidden inputs to the daily seed: whenever the @flesh-and-blood/cards package adds a
// set, every historical answer silently remaps — the exact stability invariant guarded for
// the FaBdoku seeded hash. So those games read their pool from HERE instead of the live
// `allHeroes` / `allCards`, and the pool is chosen BY DATE:
//
//   dates <  POOL_V4_CUTOVER → the v3 snapshot (package 3.6.232 era)
//   dates >= POOL_V4_CUTOVER → the v4 snapshot (package 4.0.62 era, new sets included)
//
// Snapshots pin membership + order (and hero `legalFormats`, the only puzzle-category field
// observed to shift across bumps) while all other fields (images, new sets for search/import)
// stay live. Refreshing pools = generate a NEW snapshot with scripts/gen-frozen-pool-v4.ts,
// add an era here with a FUTURE cutover date, and prove pre-cutover stability with
// scripts/verify-frozen-pool.ts. Never edit an existing snapshot.

/** First UTC date whose daily puzzles draw from the v4 (4.0.62) pool. */
export const POOL_V4_CUTOVER = "2026-08-15";

const heroByName = new Map(allHeroes.map((h) => [h.name, h]));
const cardById = new Map(allCards.map((c) => [c.cardIdentifier, c]));

function buildHeroes(list: { name: string; legalFormats: string[] }[]): HeroInfo[] {
  return list
    .map((f) => {
      const live = heroByName.get(f.name);
      return live ? { ...live, legalFormats: f.legalFormats } : null;
    })
    .filter((h): h is HeroInfo => h !== null);
}

function buildCards(ids: string[]): CardInfo[] {
  return ids.map((id) => cardById.get(id)).filter((c): c is CardInfo => c !== undefined);
}

/** v3-era pools (kept under their original names — pre-cutover history). */
export const frozenHeroes: HeroInfo[] = buildHeroes(FROZEN_HEROES);
export const frozenCards: CardInfo[] = buildCards(FROZEN_CARD_IDS);

const frozenHeroesV4: HeroInfo[] = buildHeroes(FROZEN_HEROES_V4);
const frozenCardsV4: CardInfo[] = buildCards(FROZEN_CARD_IDS_V4);

/** The hero pool for a given puzzle date (ISO YYYY-MM-DD, UTC). */
export function frozenHeroesFor(dateStr: string): HeroInfo[] {
  return dateStr >= POOL_V4_CUTOVER ? frozenHeroesV4 : frozenHeroes;
}

/** The card pool for a given puzzle date (ISO YYYY-MM-DD, UTC). */
export function frozenCardsFor(dateStr: string): CardInfo[] {
  return dateStr >= POOL_V4_CUTOVER ? frozenCardsV4 : frozenCards;
}

// Silent-drop guard: a snapshot entry that no longer resolves against the live
// package shrinks the pool and remaps every answer in its era. Loud in dev;
// scripts/verify-frozen-pool.ts enforces it hard in CI-style runs.
if (process.env.NODE_ENV !== "production") {
  if (frozenHeroes.length !== FROZEN_HEROES.length || frozenCards.length !== FROZEN_CARD_IDS.length) {
    console.error(
      `[frozen-pool] v3 pool rebuilt short: heroes ${frozenHeroes.length}/${FROZEN_HEROES.length}, cards ${frozenCards.length}/${FROZEN_CARD_IDS.length} — historical puzzles are remapping!`,
    );
  }
  if (frozenHeroesV4.length !== FROZEN_HEROES_V4.length || frozenCardsV4.length !== FROZEN_CARD_IDS_V4.length) {
    console.error(
      `[frozen-pool] v4 pool rebuilt short: heroes ${frozenHeroesV4.length}/${FROZEN_HEROES_V4.length}, cards ${frozenCardsV4.length}/${FROZEN_CARD_IDS_V4.length}`,
    );
  }
}

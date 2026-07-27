import type { HeroInfo, CardInfo } from "@/types";
import { allHeroes } from "@/lib/heroes";
import { allCards } from "@/lib/cards";
import { FROZEN_HEROES, FROZEN_CARD_IDS } from "./frozen-pool-data";

// The four seeded daily games (FaBdoku hero + card, HeroGuesser, BruteBrawl) choose their
// answer by indexing into a pool built from the card list. That makes the pool's SIZE and
// ORDER hidden inputs to the daily seed: whenever the @flesh-and-blood/cards package adds a
// set, every historical answer silently remaps — the exact stability invariant guarded for
// the FaBdoku seeded hash. So those games read their pool from HERE instead of the live
// `allHeroes` / `allCards`: the frozen snapshot pins membership + order (and hero
// `legalFormats`, the only puzzle-category field that shifted across the 3.x→4.x bump) while
// all other fields (images, new sets for search/import) stay live. New cards only enter a
// daily puzzle when frozen-pool-data.ts is deliberately regenerated (a reviewed break).

const heroByName = new Map(allHeroes.map((h) => [h.name, h]));

/** v3-era hero pool, in frozen order, with `legalFormats` pinned to the snapshot. */
export const frozenHeroes: HeroInfo[] = FROZEN_HEROES.map((f) => {
  const live = heroByName.get(f.name);
  return live ? { ...live, legalFormats: f.legalFormats } : null;
}).filter((h): h is HeroInfo => h !== null);

const cardById = new Map(allCards.map((c) => [c.cardIdentifier, c]));

/** v3-era card pool, in frozen order. No card field feeding a FaBdoku category changed
 *  across the bump, so live objects are safe to reuse — only membership/order is pinned. */
export const frozenCards: CardInfo[] = FROZEN_CARD_IDS.map((id) => cardById.get(id)).filter(
  (c): c is CardInfo => c !== undefined,
);

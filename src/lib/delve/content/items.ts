/**
 * Item bases + affixes. Id prefix encodes the slot (w_/h_/a_/c_/r_ — see
 * balance.slotOf). 10 bases x 4 rarities x affix rolls = the v0.1 loot space.
 */
import type { ItemBaseDef, AffixDef } from "../types";

export const ITEM_BASES: ItemBaseDef[] = [
  // Weapons
  { id: "w_shelfhook", name: "Shelfhook", slot: "weapon", slotWeight: 1.0, primary: "atk", zoneMin: 1, sprite: "hook", flavor: "Standard-issue for pulling relics off high stacks. Also for hitting things." },
  { id: "w_pagecleaver", name: "Pagecleaver", slot: "weapon", slotWeight: 1.0, primary: "atk", zoneMin: 1, sprite: "cleaver", flavor: "Cuts arguments short." },
  { id: "w_indexblade", name: "Index Blade", slot: "weapon", slotWeight: 1.0, primary: "atk", zoneMin: 6, sprite: "blade", flavor: "Alphabetized violence." },
  // Helms
  { id: "h_archivists_cowl", name: "Archivist's Cowl", slot: "helm", slotWeight: 0.7, primary: "hp", zoneMin: 1, sprite: "cowl", flavor: "Keeps the dust out and the doubts in." },
  { id: "h_lamplit_casque", name: "Lamplit Casque", slot: "helm", slotWeight: 0.7, primary: "hp", zoneMin: 6, sprite: "casque", flavor: "The candle never goes out. Nobody knows why." },
  // Armor
  { id: "a_binder_jack", name: "Binder Jack", slot: "armor", slotWeight: 1.0, primary: "hp", zoneMin: 1, sprite: "jack", flavor: "Nine pockets. All of them full of something that clinks." },
  { id: "a_ledger_plate", name: "Ledger Plate", slot: "armor", slotWeight: 1.0, primary: "def", zoneMin: 6, sprite: "plate", flavor: "Debts bounce off it." },
  // Charms
  { id: "c_lucky_topdeck", name: "Lucky Topdeck", slot: "charm", slotWeight: 0.5, primary: "hp", zoneMin: 1, sprite: "card", flavor: "You don't look at it. That would ruin it." },
  { id: "c_curled_receipt", name: "Curled Receipt", slot: "charm", slotWeight: 0.5, primary: "hp", zoneMin: 1, sprite: "scroll", flavor: "Proof of a trade someone regrets." },
  // Relics
  { id: "r_waystone_chip", name: "Waystone Chip", slot: "relic", slotWeight: 0.5, primary: "atk", zoneMin: 1, sprite: "stone", flavor: "Hums when you're near the exit. Or danger. It won't say which." },
];

export const ITEM_BASE_BY_ID = new Map(ITEM_BASES.map((b) => [b.id, b]));

export const AFFIXES: AffixDef[] = [
  { id: "keen", name: "Keen", stat: "crit", roll: [3, 8], slots: ["weapon", "charm"], pct: true },
  { id: "brutal", name: "Brutal", stat: "atk", roll: [4, 12], slots: ["weapon", "relic"], pct: true },
  { id: "stalwart", name: "Stalwart", stat: "hp", roll: [5, 15], slots: ["armor", "helm"], pct: true },
  { id: "warded", name: "Warded", stat: "def", roll: [2, 8], slots: ["armor", "helm"], pct: false },
  { id: "fleet", name: "Fleet", stat: "spd", roll: [1, 4], slots: ["charm", "relic"], pct: false },
  { id: "leeching", name: "Leeching", stat: "lifesteal", roll: [3, 8], slots: ["weapon"], pct: true },
  { id: "gilded", name: "Gilded", stat: "marksFind", roll: [10, 25], slots: ["charm", "relic"], pct: true },
  { id: "scholarly", name: "Scholarly", stat: "xpFind", roll: [5, 12], slots: ["helm", "charm"], pct: true },
];

export const AFFIX_BY_ID = new Map(AFFIXES.map((a) => [a.id, a]));

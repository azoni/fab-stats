/**
 * Classes + ability kits. Pure data — the engine interprets `special` hooks
 * from a closed enum, so new abilities are rows, not code.
 */
import type { ClassDef, AbilityDef } from "../types";

export const CLASSES: ClassDef[] = [
  {
    id: "sentinel",
    name: "Sentinel",
    identity: "The wall that hits back. Absorb the big hit, then make them regret it.",
    resourceName: "Resolve",
    resourceMax: 5,
    base: { hp: 64, atk: 9, def: 6, spd: 5 },
    growth: { hp: 8, atk: 1.4, def: 0.7, spd: 0.3 },
    abilityIds: ["crack", "bulwark", "sunder", "retribution"],
  },
  {
    id: "stalker",
    name: "Stalker",
    identity: "Stack it, then spend it. Build Combo and cash out on the perfect Draw.",
    resourceName: "Combo",
    resourceMax: 3,
    base: { hp: 52, atk: 11, def: 3, spd: 9 },
    growth: { hp: 6, atk: 1.7, def: 0.4, spd: 0.5 },
    abilityIds: ["quickcut", "serrate", "vanish", "executioner"],
  },
  {
    id: "arcanist",
    name: "Arcanist",
    identity: "Charge the big one. Stack Attunement while surviving, then wipe the room.",
    resourceName: "Attunement",
    resourceMax: 3,
    base: { hp: 48, atk: 12, def: 2, spd: 6 },
    growth: { hp: 5, atk: 1.9, def: 0.3, spd: 0.4 },
    abilityIds: ["emberbolt", "frostbind", "ward", "cataclysm"],
  },
];

export const ABILITIES: AbilityDef[] = [
  // ── Sentinel ──
  {
    id: "crack", classId: "sentinel", name: "Crack", unlockLevel: 1, cooldown: 0, mult: 1.0,
    resource: { gain: 0 }, special: "crackKill",
    description: "Strike for 100% ATK. On kill, gain 1 Resolve.",
  },
  {
    id: "bulwark", classId: "sentinel", name: "Bulwark", unlockLevel: 1, cooldown: 1, mult: 0,
    block: { base: 8, perLevel: 2 }, special: "bulwark",
    description: "Gain Block. If it absorbs any damage, your next Crack deals +50%.",
  },
  {
    id: "sunder", classId: "sentinel", name: "Sunder", unlockLevel: 4, cooldown: 2, mult: 1.3,
    applies: { status: "expose", turns: 2 },
    description: "Strike for 130% ATK and Expose the target (+25% damage taken, 2 turns).",
  },
  {
    id: "retribution", classId: "sentinel", name: "Retribution", unlockLevel: 8, cooldown: 0, mult: 2.4,
    resource: { spend: "all" }, special: "retribution", applies: { status: "stun", turns: 1 },
    description: "Costs 5 Resolve: strike for 240% ATK and Stun.",
  },
  // ── Stalker ──
  {
    id: "quickcut", classId: "stalker", name: "Quickcut", unlockLevel: 1, cooldown: 0, mult: 0.8,
    resource: { gain: 1 },
    description: "Strike for 80% ATK. +1 Combo.",
  },
  {
    id: "serrate", classId: "stalker", name: "Serrate", unlockLevel: 1, cooldown: 1, mult: 0.6,
    resource: { gain: 1 }, applies: { status: "bleed", turns: 3 },
    description: "Strike for 60% ATK and Bleed (stacks). +1 Combo.",
  },
  {
    id: "vanish", classId: "stalker", name: "Vanish", unlockLevel: 4, cooldown: 3, mult: 0,
    resource: { gain: 1 }, special: "vanish",
    description: "Slip between the shelves — the next blow aimed at you misses. +1 Combo.",
  },
  {
    id: "executioner", classId: "stalker", name: "Executioner's Draw", unlockLevel: 8, cooldown: 0, mult: 0,
    resource: { spend: "all" }, special: "executioner",
    description: "Spend all Combo: 90%/160%/260% ATK at 1/2/3. At 3 Combo, always crits.",
  },
  // ── Arcanist ──
  {
    id: "emberbolt", classId: "arcanist", name: "Emberbolt", unlockLevel: 1, cooldown: 0, mult: 1.0,
    resource: { gain: 1 }, applies: { status: "burn", turns: 2 },
    description: "Blast for 100% ATK and Burn. +1 Attunement.",
  },
  {
    id: "frostbind", classId: "arcanist", name: "Frostbind", unlockLevel: 1, cooldown: 2, mult: 0.7,
    resource: { gain: 1 }, applies: { status: "chill", turns: 2 },
    description: "Strike for 70% ATK and Chill (-25% damage dealt, 2 turns). +1 Attunement.",
  },
  {
    id: "ward", classId: "arcanist", name: "Ward", unlockLevel: 4, cooldown: 2, mult: 0,
    block: { base: 6, perLevel: 1.5 }, resource: { gain: 1 },
    description: "Gain Block. +1 Attunement.",
  },
  {
    id: "cataclysm", classId: "arcanist", name: "Cataclysm", unlockLevel: 8, cooldown: 1, mult: 1.4,
    hitsAll: true, resource: { spend: "all" }, special: "cataclysm",
    description: "Consume Attunement: 140% ATK x (1 + 25% per stack), hits ALL enemies.",
  },
];

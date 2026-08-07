/**
 * The Understack — every tunable number in one place.
 * Pure functions + named constants only; the engine imports from here so
 * rebalancing never touches logic.
 */
import type { Rarity, Slot, MaterialId, ItemRoll, EffectiveStats, DelveCharacter, ClassDef, AffixDef } from "./types";

// ── Keys (owner decision: banked) ─────────────────────────────────────────────
export const KEYS_PER_DAY = 3;
export const KEYS_BANK_CAP = 9;

// ── Runs ──────────────────────────────────────────────────────────────────────
export const FLOORS_PER_RUN = 3;
export const NODES_PER_FLOOR = 3;
export const FLASK_CHARGES = 3;
export const FLASK_HEAL_PCT = 30;
export const FLOOR_LANDING_HEAL_PCT = 15;
export const REST_HEAL_PCT = 30;
export const ANTECHAMBER_HEAL_PCT = 40;
export const REST_BUFF_ATK_PCT = 15;
export const MIMIC_CHANCE_PCT = 20;
/** Marks kept on death (satchel gear is lost, XP/materials kept). */
export const DEATH_MARKS_KEPT_PCT = 60;
export const SATCHEL_CAP = 40;
/** Stash shelf size — MUST match validDelveInventory in firestore.rules
 *  (items.size() <= 400); a bigger stash would be silently rejected on sync. */
export const STASH_CAP = 400;

// ── Enemy scaling ─────────────────────────────────────────────────────────────
/** Enemy stat growth per player level above 1 (clamped to the zone range). */
export const ENEMY_HP_PER_LEVEL = 0.1;
export const ENEMY_ATK_PER_LEVEL = 0.08;
/** Extra toughness per floor beyond the first (bosses are exempt — their
 *  stat line already IS the finale). */
export const ENEMY_FLOOR_MULT = 0.1;
/** Max simultaneous enemies (mobile layout constraint; boss + 2 adds). */
export const MAX_ENEMIES = 3;
/** Chance a combat node spawns a pair instead of a single. */
export const PAIR_CHANCE_PCT = 35;

// ── Combat ────────────────────────────────────────────────────────────────────
export const BASE_CRIT_PCT = 10;
export const CRIT_MULT = 1.5;
export const DODGE_BASE_PCT = 3;
export const DODGE_MIN_PCT = 3;
export const DODGE_MAX_PCT = 25;
export const CHILL_DMG_REDUCTION = 0.25;
export const WEAK_ATK_REDUCTION = 0.25;
export const EXPOSE_DMG_BONUS = 0.25;
export const DRAIN_HEAL_PCT = 50;

export function mitigate(raw: number, def: number): number {
  return Math.max(1, Math.round((raw * 100) / (100 + def)));
}

export function dodgeChance(defenderSpd: number, attackerSpd: number): number {
  const pct = DODGE_BASE_PCT + (defenderSpd - attackerSpd);
  return Math.min(DODGE_MAX_PCT, Math.max(DODGE_MIN_PCT, pct));
}

// ── XP / levels ───────────────────────────────────────────────────────────────
export const LEVEL_CAP_V01 = 12;

export function xpToNext(level: number): number {
  return Math.round(40 * Math.pow(level, 1.55));
}

/** Enemy XP scaled by the level gap (fighting grays pays less). */
export function scaledXp(baseXp: number, enemyLevel: number, playerLevel: number): number {
  const gap = playerLevel - enemyLevel;
  if (gap <= 2) return baseXp;
  return Math.max(1, Math.round(baseXp * Math.max(0.2, 1 - 0.2 * (gap - 2))));
}

// ── Gear ──────────────────────────────────────────────────────────────────────
export const SLOT_WEIGHT: Record<Slot, number> = {
  weapon: 1.0,
  armor: 1.0,
  helm: 0.7,
  charm: 0.5,
  relic: 0.5,
};

export const RARITY_AFFIXES: Record<Rarity, number> = {
  worn: 1,
  tempered: 2,
  ordained: 3,
  mythic: 3,
};

/** Drop weights by source tier. */
export const RARITY_WEIGHTS: Record<"normal" | "elite" | "boss", Record<Rarity, number>> = {
  normal: { worn: 70, tempered: 25, ordained: 4.5, mythic: 0.5 },
  elite: { worn: 45, tempered: 40, ordained: 13, mythic: 2 },
  boss: { worn: 20, tempered: 45, ordained: 30, mythic: 5 },
};

export function statBudget(slot: Slot, ilvl: number): number {
  return Math.round(SLOT_WEIGHT[slot] * (8 + ilvl * 1.6));
}

export const ENHANCE_CAP_V01 = 3;
export const ENHANCE_PCT_PER_TIER = 4;

export function enhanceMarksCost(toTier: number): number {
  return 25 * toTier * toTier;
}

export const ENHANCE_MATERIALS: Record<number, Partial<Record<MaterialId, number>>> = {
  1: { cinder: 3 },
  2: { cinder: 6 },
  3: { gloam: 4 },
  4: { aurum: 3 },
  5: { aether: 1 },
};

export const SALVAGE_YIELD: Record<Rarity, Partial<Record<MaterialId, number>>> = {
  worn: { cinder: 2 },
  tempered: { cinder: 2, gloam: 1 },
  ordained: { gloam: 2, aurum: 1 },
  mythic: { aurum: 2, aether: 1 },
};

// ── Daily Delve score ─────────────────────────────────────────────────────────
export function dailyScore(input: { floorsCleared: number; kills: number; marks: number; hpRemaining: number; turns: number }): number {
  return Math.max(
    0,
    input.floorsCleared * 1000 + input.kills * 25 + input.marks + input.hpRemaining * 5 - input.turns * 5,
  );
}

// ── Effective stats ───────────────────────────────────────────────────────────
export function effectiveStats(
  character: DelveCharacter,
  classDef: ClassDef,
  affixById: Map<string, AffixDef>,
): EffectiveStats {
  const L = character.level;
  const g = classDef.growth;
  let maxHp = classDef.base.hp + Math.floor(g.hp * (L - 1));
  let atk = classDef.base.atk + Math.floor(g.atk * (L - 1));
  let def = classDef.base.def + Math.floor(g.def * (L - 1));
  let spd = classDef.base.spd + Math.floor(g.spd * (L - 1));
  let critPct = BASE_CRIT_PCT;
  let lifestealPct = 0;
  let marksFindPct = 0;
  let xpFindPct = 0;
  let hpPct = 0;
  let atkPct = 0;

  for (const item of Object.values(character.equipped)) {
    if (!item) continue;
    const enhanceMult = 1 + (ENHANCE_PCT_PER_TIER * item.enhance) / 100;
    const budget = Math.round(statBudget(slotOf(item), item.ilvl) * enhanceMult);
    // Base budget lands on the item's primary stat (resolved by the caller via
    // content; here we approximate with slot identity, kept in sync with content).
    const slot = slotOf(item);
    if (slot === "weapon") atk += budget;
    else if (slot === "armor") {
      maxHp += Math.round(budget * 1.5);
      def += Math.round(budget * 0.4);
    } else if (slot === "helm") {
      maxHp += budget;
      def += Math.round(budget * 0.3);
    } else if (slot === "charm") maxHp += budget;
    else if (slot === "relic") atk += Math.round(budget * 0.5);

    for (const a of item.affixes) {
      const d = affixById.get(a.id);
      if (!d) continue;
      switch (d.stat) {
        case "crit": critPct += a.roll; break;
        case "atk": atkPct += a.roll; break;
        case "hp": hpPct += a.roll; break;
        case "def": def += a.roll; break;
        case "spd": spd += a.roll; break;
        case "lifesteal": lifestealPct += a.roll; break;
        case "marksFind": marksFindPct += a.roll; break;
        case "xpFind": xpFindPct += a.roll; break;
      }
    }
  }

  maxHp = Math.round(maxHp * (1 + hpPct / 100));
  atk = Math.round(atk * (1 + atkPct / 100));
  return { maxHp, atk, def, spd, critPct, lifestealPct, marksFindPct, xpFindPct };
}

/** ItemRoll doesn't carry its slot — resolve from the base id prefix convention
 *  ("w_", "h_", "a_", "c_", "r_"), kept in sync with content/items.ts. */
export function slotOf(item: ItemRoll): Slot {
  switch (item.id[0]) {
    case "w": return "weapon";
    case "h": return "helm";
    case "a": return "armor";
    case "c": return "charm";
    default: return "relic";
  }
}

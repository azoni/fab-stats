/**
 * Run/encounter/loot generation. Everything draws from the run's cursor-tracked
 * RNG so a run is fully reproducible from {seed, action log}.
 *
 * Node composition uses a BAG: each run holds exactly 5 combat, 1 elite,
 * 1 treasure, 1 event, 1 rest. Doors offer up to 3 distinct types drawn from
 * the bag; the chosen door consumes one instance, unpicked doors return. This
 * keeps the advertised mix exact while preserving real choice.
 */
import type {
  RunState,
  DelveCharacter,
  EffectiveStats,
  NodeType,
  EnemyInstance,
  EnemyDef,
  ItemRoll,
  Rarity,
  ZoneDef,
} from "./types";
import type { Rng } from "./rng";
import { makeRng } from "./rng";
import {
  FLASK_CHARGES,
  RARITY_WEIGHTS,
  RARITY_AFFIXES,
  ENEMY_HP_PER_LEVEL,
  ENEMY_ATK_PER_LEVEL,
  ENEMY_FLOOR_MULT,
  PAIR_CHANCE_PCT,
} from "./balance";
import { ITEM_BASES, AFFIXES, ENEMY_BY_ID, ZONE_BY_ID } from "./content";

const RUN_BAG: NodeType[] = ["combat", "combat", "combat", "combat", "combat", "elite", "treasure", "event", "rest"];

export function newRun(
  character: DelveCharacter,
  eff: EffectiveStats,
  zoneId: string,
  seed: number,
  isDaily: boolean,
): RunState {
  const rng = makeRng(seed, 0);
  const run: RunState = {
    v: 1,
    seed,
    cursor: 0,
    zoneId,
    isDaily,
    classId: character.classId,
    level: character.level,
    eff,
    floor: 1,
    node: 0,
    phase: "doors",
    doors: [],
    bag: [...RUN_BAG],
    usedEvents: [],
    nodeResolved: false,
    lastOutcome: null,
    hp: eff.maxHp,
    maxHp: eff.maxHp,
    resource: 0,
    flasks: FLASK_CHARGES,
    runAtkPct: 0,
    combat: null,
    eventId: null,
    satchel: [],
    marksFound: 0,
    materialsFound: { cinder: 0, gloam: 0, aurum: 0, aether: 0 },
    xpEarned: 0,
    kills: 0,
    turnsTaken: 0,
    lostSatchel: null,
    startedAt: new Date().toISOString(),
  };
  run.doors = drawDoors(run, rng);
  run.cursor = rng.cursor();
  return run;
}

/** Up to 3 distinct node types from the bag, honoring floor constraints. */
export function drawDoors(run: RunState, rng: Rng): NodeType[] {
  // Elites lurk on floors 2-3 only.
  const eligible = run.bag.filter((t) => !(t === "elite" && run.floor === 1));
  const distinct = [...new Set(eligible)];
  if (distinct.length <= 1) return distinct;
  // Shuffle distinct types via the rng, take up to 3.
  const shuffled: NodeType[] = [];
  const pool = [...distinct];
  while (pool.length > 0) {
    const i = rng.int(0, pool.length - 1);
    shuffled.push(pool.splice(i, 1)[0]);
  }
  return shuffled.slice(0, 3);
}

/** Remove one instance of a node type from the bag. */
export function consumeFromBag(bag: NodeType[], type: NodeType): NodeType[] {
  const i = bag.indexOf(type);
  if (i === -1) return bag;
  const next = [...bag];
  next.splice(i, 1);
  return next;
}

// ── Enemies ───────────────────────────────────────────────────────────────────

export function scaleEnemy(def: EnemyDef, playerLevel: number, floor: number, zone: ZoneDef): EnemyInstance {
  const level = Math.min(Math.max(playerLevel, zone.levelRange[0]), zone.levelRange[1]);
  const levelMult = 1 + ENEMY_HP_PER_LEVEL * (level - 1);
  const atkMult = 1 + ENEMY_ATK_PER_LEVEL * (level - 1);
  // Bosses skip the floor ramp — their base line is already the finale.
  const floorMult = def.tier === "boss" ? 1 : 1 + ENEMY_FLOOR_MULT * (floor - 1);
  const hp = Math.round(def.stats.hp * levelMult * floorMult);
  return {
    defId: def.id,
    name: def.name,
    hp,
    maxHp: hp,
    atk: Math.round(def.stats.atk * atkMult * floorMult),
    def: def.stats.def,
    spd: def.stats.spd,
    block: 0,
    scriptIndex: 0,
    windup: false,
    statuses: [],
    stunnedOnce: false,
    phaseIndex: 0,
  };
}

export function spawnCombat(run: RunState, rng: Rng, kind: "combat" | "elite" | "mimic" | "boss"): EnemyInstance[] {
  const zone = ZONE_BY_ID.get(run.zoneId)!;
  const floorDef = zone.floors[Math.min(run.floor, zone.floors.length) - 1];

  if (kind === "boss") {
    const def = ENEMY_BY_ID.get(zone.bossId)!;
    return [scaleEnemy(def, run.level, run.floor, zone)];
  }
  if (kind === "elite") {
    const pool = floorDef.elitePool.length ? floorDef.elitePool : zone.floors[2].elitePool;
    const id = pool[rng.int(0, pool.length - 1)];
    return [scaleEnemy(ENEMY_BY_ID.get(id)!, run.level, run.floor, zone)];
  }
  // Normal combat (mimic = a single tougher pick).
  const pool = floorDef.enemyPool;
  const first = pool[rng.int(0, pool.length - 1)];
  const enemies = [scaleEnemy(ENEMY_BY_ID.get(first)!, run.level, run.floor, zone)];
  if (kind === "combat" && rng.chance(PAIR_CHANCE_PCT)) {
    const second = pool[rng.int(0, pool.length - 1)];
    enemies.push(scaleEnemy(ENEMY_BY_ID.get(second)!, run.level, run.floor, zone));
  }
  if (kind === "mimic") {
    enemies[0].hp = Math.round(enemies[0].hp * 1.3);
    enemies[0].maxHp = enemies[0].hp;
    enemies[0].name = `Mimic ${enemies[0].name}`;
  }
  return enemies;
}

// ── Loot ──────────────────────────────────────────────────────────────────────

export function rollRarity(rng: Rng, tier: "normal" | "elite" | "boss"): Rarity {
  const w = RARITY_WEIGHTS[tier];
  return rng.weighted<Rarity>([
    { value: "worn", weight: w.worn },
    { value: "tempered", weight: w.tempered },
    { value: "ordained", weight: w.ordained },
    { value: "mythic", weight: w.mythic },
  ]);
}

export function rollItem(rng: Rng, tier: "normal" | "elite" | "boss", playerLevel: number, zone: ZoneDef): ItemRoll {
  const ilvl = Math.min(Math.max(playerLevel, zone.levelRange[0]), zone.levelRange[1]);
  const bases = ITEM_BASES.filter((b) => b.zoneMin <= ilvl);
  const base = bases[rng.int(0, bases.length - 1)];
  const rarity = rollRarity(rng, tier);
  const affixCount = RARITY_AFFIXES[rarity];
  const eligible = AFFIXES.filter((a) => a.slots.includes(base.slot));
  const chosen: { id: string; roll: number }[] = [];
  const pool = [...eligible];
  for (let i = 0; i < affixCount && pool.length > 0; i++) {
    const idx = rng.int(0, pool.length - 1);
    const affix = pool.splice(idx, 1)[0];
    chosen.push({ id: affix.id, roll: rng.int(affix.roll[0], affix.roll[1]) });
  }
  return { id: base.id, rarity, ilvl, enhance: 0, affixes: chosen };
}

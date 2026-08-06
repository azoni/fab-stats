/**
 * The Understack run engine — a pure deterministic reducer.
 *
 *   applyAction(run, action) → new RunState
 *
 * No I/O, no DOM, no Date/Math.random: all randomness flows from the run's
 * (seed, cursor) via mulberry32, so a run is fully replayable from
 * {seed, action log} — the future server-validation hook. The UI dispatches
 * actions and animates from combat.log; persistence lives in the hook layer.
 */
import type {
  RunState,
  DelveAction,
  CombatState,
  CombatLogLine,
  EnemyInstance,
  StatusInstance,
  StatusId,
  NodeType,
  IntentStep,
  AbilityDef,
} from "./types";
import { makeRng, type Rng } from "./rng";
import {
  mitigate,
  dodgeChance,
  CRIT_MULT,
  CHILL_DMG_REDUCTION,
  WEAK_ATK_REDUCTION,
  EXPOSE_DMG_BONUS,
  DRAIN_HEAL_PCT,
  FLASK_HEAL_PCT,
  FLOOR_LANDING_HEAL_PCT,
  REST_HEAL_PCT,
  ANTECHAMBER_HEAL_PCT,
  REST_BUFF_ATK_PCT,
  MIMIC_CHANCE_PCT,
  NODES_PER_FLOOR,
  FLOORS_PER_RUN,
  SATCHEL_CAP,
  MAX_ENEMIES,
  scaledXp,
} from "./balance";
import { drawDoors, consumeFromBag, spawnCombat, rollItem, scaleEnemy } from "./generate";
import { ABILITY_BY_ID, CLASS_BY_ID, ENEMY_BY_ID, EVENT_BY_ID, ZONE_BY_ID } from "./content";

// ── Helpers ───────────────────────────────────────────────────────────────────

function clone(run: RunState): RunState {
  // Structured clone via JSON is fine here: state is plain serializable data.
  return JSON.parse(JSON.stringify(run)) as RunState;
}

function hasStatus(statuses: StatusInstance[], id: StatusId): boolean {
  return statuses.some((s) => s.id === id);
}

function addStatus(statuses: StatusInstance[], id: StatusId, turns: number, power: number) {
  const existing = statuses.find((s) => s.id === id);
  if (!existing) {
    statuses.push({ id, turns, power });
    return;
  }
  if (id === "bleed") {
    // Bleed stacks power and refreshes duration.
    existing.power += power;
    existing.turns = Math.max(existing.turns, turns);
  } else {
    // Everything else refreshes.
    existing.turns = Math.max(existing.turns, turns);
    existing.power = Math.max(existing.power, power);
  }
}

function tickStatuses(target: { statuses: StatusInstance[] }): number {
  // Returns DoT damage dealt this tick; decrements durations.
  let dot = 0;
  for (const s of target.statuses) {
    if (s.id === "bleed" || s.id === "burn") dot += s.power;
    s.turns -= 1;
  }
  target.statuses = target.statuses.filter((s) => s.turns > 0);
  return dot;
}

/** The intent an enemy will take on ITS next action (for UI + engine). */
export function currentIntent(enemy: EnemyInstance): IntentStep {
  const def = ENEMY_BY_ID.get(enemy.defId)!;
  const script = enemy.phaseIndex > 0 && def.phases ? def.phases[enemy.phaseIndex - 1].script : def.script;
  return script[enemy.scriptIndex % script.length];
}

export function playerAtk(run: RunState): number {
  const weak = run.combat && hasStatus(run.combat.statuses, "weak") ? 1 - WEAK_ATK_REDUCTION : 1;
  return Math.max(1, Math.round(run.eff.atk * (1 + run.runAtkPct / 100) * weak));
}

/** Abilities available to this run's class at its level, in kit order. */
export function kitFor(run: RunState): AbilityDef[] {
  const cls = CLASS_BY_ID.get(run.classId)!;
  return cls.abilityIds.map((id) => ABILITY_BY_ID.get(id)!).filter((a) => a.unlockLevel <= run.level);
}

export function abilityUsable(run: RunState, ability: AbilityDef): boolean {
  if (!run.combat) return false;
  if ((run.combat.cooldowns[ability.id] || 0) > 0) return false;
  if (ability.special === "retribution") return run.resource >= 5;
  if (ability.special === "executioner") return run.resource >= 1;
  return true;
}

function gainResource(run: RunState, n: number) {
  const cls = CLASS_BY_ID.get(run.classId)!;
  run.resource = Math.min(cls.resourceMax, run.resource + n);
}

function log(c: CombatState, line: CombatLogLine) {
  c.log.push(line);
}

// ── Node entry ────────────────────────────────────────────────────────────────

function enterNode(run: RunState, rng: Rng, type: NodeType) {
  run.nodeResolved = false;
  run.lastOutcome = null;
  run.eventId = null;
  switch (type) {
    case "combat":
    case "elite": {
      run.phase = "combat";
      startCombat(run, rng, type === "elite" ? "elite" : "combat", false);
      break;
    }
    case "treasure":
      run.phase = "treasure";
      break;
    case "event": {
      run.phase = "event";
      const zone = ZONE_BY_ID.get(run.zoneId)!;
      const fresh = zone.eventPool.filter((e) => !run.usedEvents.includes(e));
      const pool = fresh.length > 0 ? fresh : zone.eventPool;
      run.eventId = pool[rng.int(0, pool.length - 1)];
      run.usedEvents.push(run.eventId);
      break;
    }
    case "rest":
      run.phase = "rest";
      break;
  }
}

function startCombat(run: RunState, rng: Rng, kind: "combat" | "elite" | "mimic" | "boss", isBoss: boolean) {
  const enemies = spawnCombat(run, rng, kind);
  const combat: CombatState = {
    enemies,
    block: 0,
    statuses: [],
    cooldowns: {},
    crackPrimed: false,
    vanishActive: false,
    turn: 1,
    isBoss,
    log: [],
  };
  run.combat = combat;
  // Swift enemies land a free opening strike as you step in.
  for (const e of enemies) {
    const def = ENEMY_BY_ID.get(e.defId)!;
    if (def.traits?.includes("swift")) {
      log(combat, { kind: "info", text: `${e.name} moves before you can react!` });
      resolveEnemyStep(run, rng, e);
    }
  }
}

// ── Advancement ───────────────────────────────────────────────────────────────

function advanceAfterNode(run: RunState, rng: Rng) {
  run.combat = null;
  run.eventId = null;
  run.nodeResolved = false;
  run.node += 1;
  if (run.node >= NODES_PER_FLOOR) {
    // Floor cleared.
    if (run.floor >= FLOORS_PER_RUN) {
      // All floors done → boss antechamber.
      run.phase = "antechamber";
      run.doors = [];
      return;
    }
    run.floor += 1;
    run.node = 0;
    const heal = Math.round((run.maxHp * FLOOR_LANDING_HEAL_PCT) / 100);
    run.hp = Math.min(run.maxHp, run.hp + heal);
    run.lastOutcome = `Floor ${run.floor} — the landing's warmth restores ${heal} HP.`;
  }
  run.phase = "doors";
  run.doors = drawDoors(run, rng);
}

function bankableEnded(run: RunState, phase: "victory" | "withdrawn") {
  run.phase = phase;
  run.combat = null;
}

function die(run: RunState) {
  run.lostSatchel = run.satchel;
  run.satchel = [];
  run.phase = "dead";
  run.combat = null;
}

// ── Loot on combat clear ──────────────────────────────────────────────────────

function grantCombatLoot(run: RunState, rng: Rng, defeated: EnemyInstance[], wasElite: boolean, wasBoss: boolean) {
  const zone = ZONE_BY_ID.get(run.zoneId)!;
  let marks = 0;
  let xp = 0;
  for (const e of defeated) {
    const def = ENEMY_BY_ID.get(e.defId)!;
    marks += rng.int(def.marks[0], def.marks[1]);
    xp += scaledXp(def.xp, zone.levelRange[0] + run.floor - 1, run.level);
  }
  marks = Math.round(marks * (1 + run.eff.marksFindPct / 100));
  xp = Math.round(xp * (1 + run.eff.xpFindPct / 100));
  run.marksFound += marks;
  run.xpEarned += xp;
  run.kills += defeated.length;
  const satchelBefore = run.satchel.length;

  if (wasBoss) {
    run.materialsFound.gloam += 2;
    addToSatchel(run, rollItem(rng, "boss", run.level, zone));
  } else if (wasElite) {
    run.materialsFound.cinder += rng.int(2, 3);
    if (rng.chance(40)) run.materialsFound.gloam += 1;
    addToSatchel(run, rollItem(rng, "elite", run.level, zone));
  } else {
    if (rng.chance(30)) run.materialsFound.cinder += rng.int(1, 2);
    if (rng.chance(18)) addToSatchel(run, rollItem(rng, "normal", run.level, zone));
  }

  const gotGear = run.satchel.length > satchelBefore;
  run.lastOutcome = `Cleared — +${marks} Marks, +${xp} XP${gotGear ? ", and something for the satchel" : ""}.`;
}

function addToSatchel(run: RunState, item: ReturnType<typeof rollItem>) {
  if (run.satchel.length >= SATCHEL_CAP) {
    run.marksFound += 10; // overflow melts to Marks
    return;
  }
  run.satchel.push(item);
}

// ── Player action resolution ──────────────────────────────────────────────────

function resolvePlayerAbility(run: RunState, rng: Rng, ability: AbilityDef, targetIndex: number) {
  const c = run.combat!;
  c.log = [];
  run.turnsTaken += 1;

  // Stunned player skips the action (statuses still tick).
  if (hasStatus(c.statuses, "stun")) {
    log(c, { kind: "info", text: "You're stunned — the moment slips past." });
  } else {
    executeAbility(run, rng, ability, targetIndex);
  }

  if (checkCombatEnd(run, rng)) return;

  // Enemies act.
  for (const enemy of c.enemies) {
    if (enemy.hp <= 0) continue;
    resolveEnemyStep(run, rng, enemy);
    if (run.hp <= 0) {
      die(run);
      return;
    }
  }

  // End of round: DoTs tick on both sides, block expires, turn advances.
  for (const enemy of c.enemies) {
    if (enemy.hp <= 0) continue;
    const dot = tickStatuses(enemy);
    if (dot > 0) {
      enemy.hp -= dot;
      log(c, { kind: "statusTick", text: `${enemy.name} suffers ${dot} from wounds.`, amount: dot, targetIndex: c.enemies.indexOf(enemy) });
      if (enemy.hp <= 0) log(c, { kind: "kill", text: `${enemy.name} succumbs.`, targetIndex: c.enemies.indexOf(enemy) });
    }
  }
  const playerDot = tickStatuses(c);
  if (playerDot > 0) {
    run.hp -= playerDot;
    log(c, { kind: "statusTick", text: `Your wounds cost ${playerDot} HP.`, amount: playerDot });
    if (run.hp <= 0) {
      die(run);
      return;
    }
  }
  c.block = 0;
  c.turn += 1;
  // Cooldowns tick at end of round, so the stored value always reads as
  // "turns until usable" (cd 1 = one full turn off).
  for (const id of Object.keys(c.cooldowns)) {
    if (c.cooldowns[id] > 0) c.cooldowns[id] -= 1;
  }

  checkCombatEnd(run, rng);
}

function executeAbility(run: RunState, rng: Rng, ability: AbilityDef, targetIndex: number) {
  const c = run.combat!;
  const cls = CLASS_BY_ID.get(run.classId)!;

  // Resource spend/gain bookkeeping.
  let spentStacks = 0;
  if (ability.resource?.spend === "all") {
    spentStacks = run.resource;
    run.resource = 0;
  }

  // Block-granting abilities.
  if (ability.block) {
    const amount = Math.round(ability.block.base + ability.block.perLevel * run.level);
    c.block += amount;
    log(c, { kind: "playerBlock", text: `You brace — ${amount} Block.`, amount });
  }
  if (ability.special === "vanish") {
    c.vanishActive = true;
    log(c, { kind: "info", text: "You melt into the stacks. The next blow finds nothing." });
  }

  // Damage.
  if (ability.mult > 0 || ability.special === "executioner") {
    let mult = ability.mult;
    let forceCrit = false;
    if (ability.special === "executioner") {
      mult = spentStacks >= 3 ? 2.6 : spentStacks === 2 ? 1.6 : 0.9;
      if (spentStacks >= 3) forceCrit = true;
    }
    if (ability.special === "cataclysm") {
      mult = ability.mult * (1 + 0.25 * spentStacks);
    }
    if (ability.special === "crackKill" && c.crackPrimed) {
      mult *= 1.5;
      c.crackPrimed = false;
    }

    const targets = ability.hitsAll ? c.enemies.filter((e) => e.hp > 0) : [c.enemies[targetIndex]].filter((e) => e && e.hp > 0);
    for (const target of targets) {
      const idx = c.enemies.indexOf(target);
      const isCrit = forceCrit || rng.chance(run.eff.critPct);
      let raw = playerAtk(run) * mult * (isCrit ? CRIT_MULT : 1);
      if (hasStatus(target.statuses, "expose")) raw *= 1 + EXPOSE_DMG_BONUS;
      let dmg = mitigate(raw, target.def);
      if (target.block > 0) {
        const absorbed = Math.min(target.block, dmg);
        target.block -= absorbed;
        dmg -= absorbed;
      }
      target.hp -= dmg;
      log(c, {
        kind: isCrit ? "playerCrit" : "playerHit",
        text: isCrit ? `CRIT — ${dmg} to ${target.name}!` : `${dmg} to ${target.name}.`,
        amount: dmg,
        targetIndex: idx,
      });
      if (run.eff.lifestealPct > 0 && dmg > 0) {
        const heal = Math.max(1, Math.round((dmg * run.eff.lifestealPct) / 100));
        run.hp = Math.min(run.maxHp, run.hp + heal);
      }
      if (ability.applies && target.hp > 0) {
        applyStatusToEnemy(run, target, ability.applies, c, idx);
      }
      if (target.hp <= 0) {
        log(c, { kind: "kill", text: `${target.name} falls.`, targetIndex: idx });
        if (ability.special === "crackKill") gainResource(run, 1);
      }
    }
  } else if (ability.applies) {
    // Pure-status ability aimed at a target.
    const target = c.enemies[targetIndex];
    if (target && target.hp > 0) applyStatusToEnemy(run, target, ability.applies, c, targetIndex);
  }

  // Resource gain after the action resolves.
  if (ability.resource?.gain) gainResource(run, ability.resource.gain);
  void cls;

  // Cooldown (+1 because the end-of-round tick fires this same turn).
  if (ability.cooldown > 0) c.cooldowns[ability.id] = ability.cooldown + 1;
}

function applyStatusToEnemy(
  run: RunState,
  target: EnemyInstance,
  spec: NonNullable<AbilityDef["applies"]>,
  c: CombatState,
  idx: number,
) {
  const def = ENEMY_BY_ID.get(target.defId)!;
  if (spec.status === "stun") {
    if (def.traits?.includes("stunImmune") || (def.tier === "boss" && target.stunnedOnce)) {
      log(c, { kind: "info", text: `${target.name} shrugs off the stun.`, targetIndex: idx });
      return;
    }
    if (def.tier === "boss") target.stunnedOnce = true;
  }
  const power =
    spec.status === "bleed" || spec.status === "burn"
      ? spec.power ?? Math.max(2, Math.round(4 + run.level / 2))
      : 0;
  addStatus(target.statuses, spec.status, spec.turns, power);
  log(c, { kind: "playerStatus", text: `${target.name} is ${statusLabel(spec.status)}.`, targetIndex: idx });
}

export function statusLabel(id: StatusId): string {
  switch (id) {
    case "bleed": return "Bleeding";
    case "burn": return "Burning";
    case "chill": return "Chilled";
    case "stun": return "Stunned";
    case "weak": return "Weakened";
    case "expose": return "Exposed";
  }
}

// ── Enemy action resolution ───────────────────────────────────────────────────

function resolveEnemyStep(run: RunState, rng: Rng, enemy: EnemyInstance) {
  const c = run.combat!;
  const idx = c.enemies.indexOf(enemy);

  // Stunned enemies lose the action.
  if (hasStatus(enemy.statuses, "stun")) {
    enemy.statuses = enemy.statuses.filter((s) => s.id !== "stun");
    log(c, { kind: "info", text: `${enemy.name} is stunned and reels.`, targetIndex: idx });
    return;
  }

  const step = currentIntent(enemy);
  const chillMult = hasStatus(enemy.statuses, "chill") ? 1 - CHILL_DMG_REDUCTION : 1;

  const dealToPlayer = (mult: number): number => {
    // Vanish eats the whole action; regular dodge is SPD-based.
    if (c.vanishActive) {
      c.vanishActive = false;
      log(c, { kind: "enemyDodged", text: `${enemy.name} strikes at empty air.`, targetIndex: idx });
      return 0;
    }
    if (rng.chance(dodgeChance(run.eff.spd, enemy.spd))) {
      log(c, { kind: "enemyDodged", text: `You sidestep ${enemy.name}.`, targetIndex: idx });
      return 0;
    }
    let raw = enemy.atk * mult * chillMult;
    if (hasStatus(c.statuses, "expose")) raw *= 1 + EXPOSE_DMG_BONUS;
    let dmg = mitigate(raw, run.eff.def);
    if (c.block > 0) {
      const absorbed = Math.min(c.block, dmg);
      c.block -= absorbed;
      dmg -= absorbed;
      if (absorbed > 0 && run.classId === "sentinel") {
        // Bulwark rewards absorption; a Heavy absorbed pays double Resolve.
        c.crackPrimed = true;
        gainResource(run, step.verb === "heavy" ? 2 : 1);
      }
    }
    if (dmg > 0) {
      run.hp -= dmg;
      if (run.classId === "sentinel") gainResource(run, 1);
      log(c, { kind: "enemyHit", text: `${enemy.name} hits you for ${dmg}.`, amount: dmg, targetIndex: idx });
    }
    return dmg;
  };

  switch (step.verb) {
    case "strike":
      dealToPlayer(step.mult ?? 1);
      enemy.scriptIndex += 1;
      break;
    case "heavy":
      if (!enemy.windup) {
        enemy.windup = true;
        log(c, { kind: "enemyWindup", text: `${enemy.name} rears back — something HEAVY is coming.`, targetIndex: idx });
        // windup does not advance the script; the hit lands next action
      } else {
        enemy.windup = false;
        dealToPlayer(step.mult ?? 2);
        enemy.scriptIndex += 1;
      }
      break;
    case "guard":
      enemy.block += step.block ?? 5;
      log(c, { kind: "enemyGuard", text: `${enemy.name} guards (+${step.block ?? 5} Block).`, targetIndex: idx });
      enemy.scriptIndex += 1;
      break;
    case "hex":
      if (step.status) {
        addStatus(c.statuses, step.status, 2, 0);
        log(c, { kind: "enemyHex", text: `${enemy.name} hexes you — ${statusLabel(step.status)}.`, targetIndex: idx });
      }
      enemy.scriptIndex += 1;
      break;
    case "rally": {
      const pct = step.rallyAtkPct ?? 20;
      for (const ally of c.enemies) {
        if (ally.hp > 0) ally.atk = Math.round(ally.atk * (1 + pct / 100));
      }
      log(c, { kind: "enemyRally", text: `${enemy.name} rallies the pack (+${pct}% ATK).`, targetIndex: idx });
      enemy.scriptIndex += 1;
      break;
    }
    case "drain": {
      const dealt = dealToPlayer(step.mult ?? 1);
      if (dealt > 0) {
        const heal = Math.round((dealt * DRAIN_HEAL_PCT) / 100);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
        log(c, { kind: "info", text: `${enemy.name} drinks deep (+${heal} HP).`, targetIndex: idx });
      }
      enemy.scriptIndex += 1;
      break;
    }
  }
}

/** Boss phase transitions + combat-clear detection. Returns true if combat ended. */
function checkCombatEnd(run: RunState, rng: Rng): boolean {
  const c = run.combat;
  if (!c) return true;

  // Boss phase checks.
  for (const enemy of c.enemies) {
    if (enemy.hp <= 0) continue;
    const def = ENEMY_BY_ID.get(enemy.defId)!;
    if (!def.phases) continue;
    const hpPct = (enemy.hp / enemy.maxHp) * 100;
    const nextPhase = def.phases[enemy.phaseIndex];
    if (nextPhase && hpPct <= nextPhase.hpPct) {
      enemy.phaseIndex += 1;
      enemy.scriptIndex = 0;
      enemy.windup = false;
      log(c, { kind: "info", text: `${enemy.name} shifts stance!` });
      if (nextPhase.summon) {
        const zone = ZONE_BY_ID.get(run.zoneId)!;
        for (const summonId of nextPhase.summon) {
          if (c.enemies.filter((e) => e.hp > 0).length >= MAX_ENEMIES) break;
          const summonDef = ENEMY_BY_ID.get(summonId);
          if (summonDef) {
            c.enemies.push(scaleEnemy(summonDef, run.level, run.floor, zone));
            log(c, { kind: "enemyRally", text: `${summonDef.name} scurries in!` });
          }
        }
      }
    }
  }

  const alive = c.enemies.filter((e) => e.hp > 0);
  if (alive.length > 0) return false;

  // Combat cleared.
  const defeated = c.enemies;
  const wasBoss = c.isBoss;
  const wasElite = defeated.some((e) => ENEMY_BY_ID.get(e.defId)!.tier === "elite");
  grantCombatLoot(run, rng, defeated, wasElite, wasBoss);

  if (wasBoss) {
    bankableEnded(run, "victory");
  } else {
    advanceAfterNode(run, rng);
  }
  return true;
}

// ── Reducer ───────────────────────────────────────────────────────────────────

export function applyAction(prev: RunState, action: DelveAction): RunState {
  const run = clone(prev);
  const rng = makeRng(run.seed, run.cursor);

  switch (action.type) {
    case "chooseDoor": {
      if (run.phase !== "doors") break;
      const type = run.doors[action.index];
      if (!type) break;
      run.bag = consumeFromBag(run.bag, type);
      run.doors = [];
      enterNode(run, rng, type);
      break;
    }

    case "ability": {
      if (run.phase !== "combat" && run.phase !== "boss") break;
      if (!run.combat) break;
      const ability = ABILITY_BY_ID.get(action.abilityId);
      if (!ability || ability.classId !== run.classId) break;
      if (!abilityUsable(run, ability)) break;
      resolvePlayerAbility(run, rng, ability, action.target);
      break;
    }

    case "flask": {
      if (!run.combat || run.flasks <= 0 || run.hp >= run.maxHp) break;
      run.flasks -= 1;
      const heal = Math.round((run.maxHp * FLASK_HEAL_PCT) / 100);
      run.hp = Math.min(run.maxHp, run.hp + heal);
      run.combat.log = [{ kind: "flask", text: `You drink deep — +${heal} HP.`, amount: heal }];
      break;
    }

    case "openChest": {
      if (run.phase !== "treasure" || run.nodeResolved) break;
      if (rng.chance(MIMIC_CHANCE_PCT)) {
        run.phase = "combat";
        startCombat(run, rng, "mimic", false);
        run.combat!.log.unshift({ kind: "info", text: "The chest grows teeth. Of course it does." });
      } else {
        const zone = ZONE_BY_ID.get(run.zoneId)!;
        if (rng.chance(60)) {
          const item = rollItem(rng, "normal", run.level, zone);
          addToSatchel(run, item);
          run.lastOutcome = "Inside: something worth carrying. It goes in the satchel.";
        } else {
          const cinder = rng.int(3, 5);
          run.materialsFound.cinder += cinder;
          run.lastOutcome = `Inside: ${cinder} Cinder, still warm.`;
        }
        run.nodeResolved = true;
      }
      break;
    }

    case "eventChoice": {
      if ((run.phase !== "event" && run.phase !== "antechamber") || run.nodeResolved) break;
      const eventId = run.phase === "antechamber" ? pickAntechamberShrine(run, rng) : run.eventId;
      const event = eventId ? EVENT_BY_ID.get(eventId) : null;
      if (!event) break;
      const option = event.options[action.option];
      if (!option) break;
      const outcome = rng.weighted(option.outcomes.map((o) => ({ value: o, weight: o.weight })));
      applyEventOutcome(run, rng, outcome);
      run.lastOutcome = outcome.text;
      run.nodeResolved = true;
      break;
    }

    case "restChoice": {
      if ((run.phase !== "rest" && run.phase !== "antechamber") || run.nodeResolved) break;
      const healPct = run.phase === "antechamber" ? ANTECHAMBER_HEAL_PCT : REST_HEAL_PCT;
      if (action.choice === "heal") {
        const heal = Math.round((run.maxHp * healPct) / 100);
        run.hp = Math.min(run.maxHp, run.hp + heal);
        run.lastOutcome = `You rest by the embers. +${heal} HP.`;
      } else if (action.choice === "flask") {
        run.flasks += 1;
        run.lastOutcome = "You refill your flask from the condenser. +1 charge.";
      } else {
        run.runAtkPct += REST_BUFF_ATK_PCT;
        run.lastOutcome = `You sharpen your edge on the whetstone. +${REST_BUFF_ATK_PCT}% ATK this run.`;
      }
      run.nodeResolved = true;
      break;
    }

    case "withdraw": {
      // Allowed at a rest node (resolved or not) — bank the satchel, end early.
      if (run.phase !== "rest") break;
      bankableEnded(run, "withdrawn");
      break;
    }

    case "proceed": {
      if (run.phase === "treasure" || run.phase === "event" || run.phase === "rest") {
        if (!run.nodeResolved) break;
        advanceAfterNode(run, rng);
      } else if (run.phase === "antechamber") {
        if (!run.nodeResolved) break;
        run.phase = "boss";
        run.nodeResolved = false;
        run.lastOutcome = null;
        startCombat(run, rng, "boss", true);
      } else if (run.phase === "doors" && run.lastOutcome) {
        // Clear the floor-landing banner.
        run.lastOutcome = null;
      }
      break;
    }
  }

  run.cursor = rng.cursor();
  return run;
}

/** The antechamber shrine is a fixed gamble drawn from the zone pool. */
function pickAntechamberShrine(run: RunState, rng: Rng): string {
  const zone = ZONE_BY_ID.get(run.zoneId)!;
  const fresh = zone.eventPool.filter((e) => !run.usedEvents.includes(e));
  const pool = fresh.length > 0 ? fresh : zone.eventPool;
  const id = pool[rng.int(0, pool.length - 1)];
  run.usedEvents.push(id);
  run.eventId = id;
  return id;
}

function applyEventOutcome(
  run: RunState,
  rng: Rng,
  outcome: { kind: string; amount?: number; materialId?: "cinder" | "gloam" | "aurum" | "aether" },
) {
  switch (outcome.kind) {
    case "heal": {
      const heal = Math.round((run.maxHp * (outcome.amount ?? 20)) / 100);
      run.hp = Math.min(run.maxHp, run.hp + heal);
      break;
    }
    case "damage": {
      const dmg = Math.round((run.maxHp * (outcome.amount ?? 10)) / 100);
      run.hp = Math.max(1, run.hp - dmg); // events never kill outright
      break;
    }
    case "marks":
      run.marksFound = Math.max(0, run.marksFound + (outcome.amount ?? 0));
      break;
    case "material":
      if (outcome.materialId) run.materialsFound[outcome.materialId] += outcome.amount ?? 1;
      break;
    case "item": {
      const zone = ZONE_BY_ID.get(run.zoneId)!;
      addToSatchel(run, rollItem(rng, "elite", run.level, zone));
      break;
    }
    case "flask":
      run.flasks += outcome.amount ?? 1;
      break;
    case "buffAtk":
      run.runAtkPct += outcome.amount ?? 10;
      break;
  }
}

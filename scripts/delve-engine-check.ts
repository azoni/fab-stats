/**
 * Engine sanity harness: plays bot runs through the pure reducer and checks
 *   1. determinism — same seed + same action log => byte-identical terminal state
 *   2. liveness — every run reaches a terminal phase within an action budget
 *   3. invariants — hp/keys/satchel bounds hold at every step
 * Run: npx tsx scripts/delve-engine-check.ts
 */
import { applyAction, kitFor, abilityUsable } from "../src/lib/delve/engine";
import { newRun } from "../src/lib/delve/generate";
import { createCharacter } from "../src/lib/delve/save";
import { effectiveStats } from "../src/lib/delve/balance";
import { CLASS_BY_ID, AFFIX_BY_ID, DEFAULT_ZONE_ID } from "../src/lib/delve/content";
import { mulberry32 } from "../src/lib/games/seeded-random";
import type { DelveAction, RunState, ClassId } from "../src/lib/delve/types";

const AFFIX_MAP = AFFIX_BY_ID;

function botAction(run: RunState, pick: () => number): DelveAction | null {
  switch (run.phase) {
    case "doors":
      if (run.lastOutcome) return { type: "proceed" };
      return { type: "chooseDoor", index: Math.floor(pick() * run.doors.length) };
    case "combat":
    case "boss": {
      if (!run.combat) return null;
      if (run.hp < run.maxHp * 0.4 && run.flasks > 0) return { type: "flask" };
      const usable = kitFor(run).filter((a) => abilityUsable(run, a));
      if (usable.length === 0) return null;
      // Greedy basic-player heuristic: spend finishers when charged, block when a
      // heavy is telegraphed (sentinel), otherwise biggest damage multiplier.
      const heavyIncoming = run.combat.enemies.some((e) => e.hp > 0 && e.windup);
      let ability = usable
        .filter((a) => a.mult > 0 || a.special === "executioner")
        .sort((a, b) => b.mult - a.mult)[0];
      const finisher = usable.find((a) => a.special === "executioner" || a.special === "retribution" || a.special === "cataclysm");
      if (finisher && run.resource >= 3) ability = finisher;
      const bulwark = usable.find((a) => a.special === "bulwark" || (a.block && a.mult === 0));
      if (heavyIncoming && bulwark) ability = bulwark;
      if (!ability) ability = usable[0];
      const alive = run.combat.enemies.map((e, i) => ({ e, i })).filter((x) => x.e.hp > 0);
      // Focus the lowest-HP target.
      alive.sort((a, b) => a.e.hp - b.e.hp);
      const target = alive[0]?.i ?? 0;
      return { type: "ability", abilityId: ability.id, target };
    }
    case "treasure":
      return run.nodeResolved ? { type: "proceed" } : { type: "openChest" };
    case "event":
      return run.nodeResolved ? { type: "proceed" } : { type: "eventChoice", option: Math.floor(pick() * 3) };
    case "rest":
      if (run.nodeResolved) return { type: "proceed" };
      if (pick() < 0.15) return { type: "withdraw" };
      return { type: "restChoice", choice: pick() < 0.5 ? "heal" : pick() < 0.5 ? "flask" : "buff" };
    case "antechamber":
      if (run.nodeResolved) return { type: "proceed" };
      return pick() < 0.5 ? { type: "restChoice", choice: "heal" } : { type: "eventChoice", option: Math.floor(pick() * 3) };
    default:
      return null; // terminal
  }
}

function playRun(seed: number, botSeed: number, classId: ClassId): { finalState: RunState; log: DelveAction[]; steps: number } {
  const character = createCharacter("Bot", classId);
  character.level = 3; // mid-early kit
  const cls = CLASS_BY_ID.get(classId)!;
  const eff = effectiveStats(character, cls, AFFIX_MAP);
  let run = newRun(character, eff, DEFAULT_ZONE_ID, seed, false);
  const pick = mulberry32(botSeed);
  const log: DelveAction[] = [];
  let steps = 0;
  while (!["victory", "dead", "withdrawn"].includes(run.phase) && steps < 2000) {
    const action = botAction(run, pick);
    if (!action) throw new Error(`Bot stuck at phase=${run.phase} step=${steps}`);
    run = applyAction(run, action);
    log.push(action);
    steps++;
    // Invariants
    if (run.hp > run.maxHp) throw new Error(`hp>maxHp at step ${steps}`);
    if (run.satchel.length > 40) throw new Error(`satchel overflow at step ${steps}`);
    if (run.marksFound < 0) throw new Error(`negative marks at step ${steps}`);
  }
  if (steps >= 2000) throw new Error(`Run did not terminate (phase=${run.phase})`);
  return { finalState: run, log, steps };
}

function replay(seed: number, log: DelveAction[], classId: ClassId): RunState {
  const character = createCharacter("Bot", classId);
  character.level = 3;
  const cls = CLASS_BY_ID.get(classId)!;
  const eff = effectiveStats(character, cls, AFFIX_MAP);
  let run = newRun(character, eff, DEFAULT_ZONE_ID, seed, false);
  for (const action of log) run = applyAction(run, action);
  return run;
}

const CLASSES: ClassId[] = ["sentinel", "stalker", "arcanist"];
let victories = 0, deaths = 0, withdrawals = 0, totalSteps = 0;
const RUNS = 60;

for (let i = 0; i < RUNS; i++) {
  const classId = CLASSES[i % 3];
  const seed = 1000 + i * 7919;
  const { finalState, log, steps } = playRun(seed, 555 + i, classId);
  totalSteps += steps;

  // Determinism: replay the exact action log; strip the wall-clock field.
  const replayed = replay(seed, log, classId);
  const a = JSON.stringify({ ...finalState, startedAt: 0 });
  const b = JSON.stringify({ ...replayed, startedAt: 0 });
  if (a !== b) {
    console.error(`DETERMINISM FAIL seed=${seed} class=${classId}`);
    process.exit(1);
  }

  if (finalState.phase === "victory") victories++;
  else if (finalState.phase === "dead") deaths++;
  else withdrawals++;
}

console.log(`OK: ${RUNS} runs deterministic.`);
console.log(`outcomes: ${victories} victories, ${deaths} deaths, ${withdrawals} withdrawals`);
console.log(`avg actions/run: ${(totalSteps / RUNS).toFixed(1)}`);
if (victories === 0) {
  console.error("BALANCE FAIL: bot never wins — too hard");
  process.exit(1);
}
if (deaths === 0 && withdrawals === 0) {
  console.error("BALANCE WARN: bot never dies — might be too easy (random bot, so soft signal)");
}

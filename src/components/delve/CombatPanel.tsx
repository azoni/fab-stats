"use client";
/**
 * Turn-based combat: enemy intents up top, four ability tiles below.
 * Animates from combat.log using the shared FX layer (its invariants: one
 * animation class per element, reload-still via log keying, win/lose sounds
 * owned by the run-end screens).
 */
import { useMemo } from "react";
import type { RunState, DelveAction, EnemyInstance, IntentStep } from "@/lib/delve/types";
import { kitFor, abilityUsable, currentIntent, statusLabel, playerAtk } from "@/lib/delve/engine";
import { mitigate, FLASK_HEAL_PCT } from "@/lib/delve/balance";
import { CLASS_BY_ID, ENEMY_BY_ID } from "@/lib/delve/content";
import { useGameFx } from "@/components/games/fx";
import { EnemySprite } from "./sprites";
import { Sword, Shield, Eye, Flag, Droplets, Zap, FlaskConical, Swords } from "lucide-react";

function IntentBadge({ enemy, playerDef }: { enemy: EnemyInstance; playerDef: number }) {
  const step: IntentStep = currentIntent(enemy);
  const dmg = (mult: number) => mitigate(enemy.atk * mult, playerDef);
  if (enemy.windup) {
    return (
      <span className="game-pop inline-flex items-center gap-1 rounded-full border border-rose-500/60 bg-rose-500/20 px-2 py-0.5 text-[11px] font-black text-rose-200">
        <Swords className="h-3 w-3" /> HEAVY {dmg(step.mult ?? 2)}
      </span>
    );
  }
  const badge = (icon: React.ReactNode, text: string, cls: string) => (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${cls}`}>
      {icon} {text}
    </span>
  );
  switch (step.verb) {
    case "strike":
      return badge(<Sword className="h-3 w-3" />, `${dmg(step.mult ?? 1)}`, "border-fab-border bg-fab-bg/70 text-fab-text");
    case "heavy":
      return badge(<Swords className="h-3 w-3" />, "winding up…", "border-rose-500/40 bg-rose-500/10 text-rose-200");
    case "guard":
      return badge(<Shield className="h-3 w-3" />, `+${step.block ?? 5}`, "border-sky-500/40 bg-sky-500/10 text-sky-200");
    case "hex":
      return badge(<Eye className="h-3 w-3" />, step.status ? statusLabel(step.status) : "Hex", "border-purple-500/40 bg-purple-500/10 text-purple-200");
    case "rally":
      return badge(<Flag className="h-3 w-3" />, "Rally", "border-amber-500/40 bg-amber-500/10 text-amber-200");
    case "drain":
      return badge(<Droplets className="h-3 w-3" />, `${dmg(step.mult ?? 1)} drain`, "border-emerald-500/40 bg-emerald-500/10 text-emerald-200");
  }
}

function HpBar({ hp, maxHp, color = "bg-emerald-500" }: { hp: number; maxHp: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-fab-border/60">
      <div className={`h-full rounded-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function CombatPanel({
  run,
  target,
  setTarget,
  dispatch,
}: {
  run: RunState;
  target: number;
  setTarget: (i: number) => void;
  dispatch: (a: DelveAction) => void;
}) {
  const { play, haptic } = useGameFx();
  const c = run.combat!;
  const cls = CLASS_BY_ID.get(run.classId)!;
  const kit = kitFor(run);
  const zone = "bronze" as const;

  // Animation re-key per resolution step, derived purely from engine state
  // (turn advances each round; turnsTaken each player action) — no refs in render.
  const logSeq = c.turn * 1000 + run.turnsTaken;

  const aliveTargets = c.enemies.map((e, i) => ({ e, i })).filter((x) => x.e.hp > 0);
  const safeTarget = aliveTargets.some((t) => t.i === target) ? target : aliveTargets[0]?.i ?? 0;

  const lastHits = useMemo(() => {
    const hits = new Map<number, { amount: number; crit: boolean }>();
    for (const line of c.log) {
      if ((line.kind === "playerHit" || line.kind === "playerCrit") && line.targetIndex !== undefined) {
        hits.set(line.targetIndex, { amount: line.amount ?? 0, crit: line.kind === "playerCrit" });
      }
    }
    return hits;
  }, [c.log]);
  const playerWasHit = c.log.some((l) => l.kind === "enemyHit");

  return (
    <div className="space-y-4">
      {/* Enemies */}
      <div className={`flex items-end justify-center gap-4 ${c.enemies.length > 2 ? "gap-2" : ""}`}>
        {c.enemies.map((enemy, i) => {
          const def = ENEMY_BY_ID.get(enemy.defId)!;
          const dead = enemy.hp <= 0;
          const hit = lastHits.get(i);
          return (
            <button
              key={`${i}-${enemy.defId}`}
              type="button"
              disabled={dead}
              onClick={() => {
                setTarget(i);
                play("click");
              }}
              className={`relative flex flex-col items-center gap-1 rounded-xl border p-2 transition-all ${
                dead
                  ? "border-fab-border/40 opacity-40"
                  : i === safeTarget
                    ? "border-fab-gold/70 bg-fab-gold/[0.06] ring-1 ring-inset ring-fab-gold/30"
                    : "border-fab-border/60 bg-fab-surface/50 hover:border-fab-gold/40"
              }`}
            >
              {!dead && <IntentBadge enemy={enemy} playerDef={run.eff.def} />}
              <span key={hit ? `${logSeq}-${i}` : `s-${i}`} className={hit ? (hit.crit ? "game-shake" : "") : ""}>
                <EnemySprite sprite={def.sprite} palette={zone} size={c.enemies.length > 2 ? 72 : 92} defeated={dead} />
              </span>
              {hit && !dead && (
                <span
                  key={`dmg-${logSeq}-${i}`}
                  className={`game-pop pointer-events-none absolute top-8 text-lg font-black ${hit.crit ? "text-fab-gold" : "text-rose-300"}`}
                >
                  -{hit.amount}
                </span>
              )}
              <p className="max-w-[110px] truncate text-[11px] font-bold text-fab-text">{enemy.name}</p>
              <div className="w-24">
                <HpBar hp={enemy.hp} maxHp={enemy.maxHp} color={def.tier === "boss" ? "bg-rose-500" : "bg-emerald-500"} />
              </div>
              <p className="text-[10px] tabular-nums text-fab-dim">
                {Math.max(0, enemy.hp)}/{enemy.maxHp}
                {enemy.block > 0 && <span className="ml-1 text-sky-300">🛡{enemy.block}</span>}
              </p>
              {enemy.statuses.length > 0 && (
                <p className="text-[9px] text-fab-muted">
                  {enemy.statuses.map((s) => `${statusLabel(s.id)}${s.id === "bleed" ? ` ${s.power}` : ""}`).join(" · ")}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Combat log ticker */}
      <div className="mx-auto max-w-md space-y-0.5 text-center" aria-live="polite">
        {c.log.slice(-3).map((line, i) => (
          <p key={`${logSeq}-${i}`} className="game-rise text-[11px] text-fab-muted" style={{ animationDelay: `${i * 90}ms` }}>
            {line.text}
          </p>
        ))}
      </div>

      {/* Player bar */}
      <div
        key={playerWasHit ? `p-${logSeq}` : "p"}
        className={`rounded-xl border border-fab-border bg-fab-surface p-3 ${playerWasHit ? "game-shake" : ""}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-fab-text">
                HP {Math.max(0, run.hp)}/{run.maxHp}
                {c.block > 0 && <span className="ml-1.5 text-sky-300">🛡 {c.block}</span>}
              </span>
              <span className="text-fab-dim">
                ATK {playerAtk(run)} · Turn {c.turn}
              </span>
            </div>
            <div className="mt-1">
              <HpBar hp={run.hp} maxHp={run.maxHp} color={run.hp / run.maxHp < 0.3 ? "bg-rose-500" : "bg-emerald-500"} />
            </div>
            {c.statuses.length > 0 && (
              <p className="mt-1 text-[10px] text-rose-300">{c.statuses.map((s) => statusLabel(s.id)).join(" · ")}</p>
            )}
          </div>
          {/* Resource pips */}
          <div className="shrink-0 text-center">
            <div className="flex items-center gap-1">
              {Array.from({ length: cls.resourceMax }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${i < run.resource ? "bg-fab-gold" : "bg-fab-border"}`}
                />
              ))}
            </div>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-fab-dim">{cls.resourceName}</p>
          </div>
        </div>
      </div>

      {/* Ability tiles + flask */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {kit.map((ability) => {
          const usable = abilityUsable(run, ability);
          const cd = c.cooldowns[ability.id] || 0;
          return (
            <button
              key={ability.id}
              type="button"
              disabled={!usable}
              onClick={() => {
                play("click");
                haptic("light");
                dispatch({ type: "ability", abilityId: ability.id, target: safeTarget });
              }}
              title={ability.description}
              className={`relative rounded-xl border p-2.5 text-left transition-all active:scale-[0.97] ${
                usable
                  ? "border-fab-gold/40 bg-fab-gold/[0.07] hover:bg-fab-gold/15 cursor-pointer"
                  : "border-fab-border/50 bg-fab-surface/40 opacity-50"
              }`}
            >
              <p className="flex items-center gap-1 text-xs font-black text-fab-text">
                <Zap className="h-3 w-3 text-fab-gold" /> {ability.name}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-fab-muted">{ability.description}</p>
              {cd > 0 && (
                <span className="absolute right-1.5 top-1.5 rounded bg-fab-bg/90 px-1 text-[10px] font-black tabular-nums text-fab-dim">
                  {cd}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex justify-center">
        <button
          type="button"
          disabled={run.flasks <= 0 || run.hp >= run.maxHp}
          onClick={() => {
            play("reveal");
            haptic("light");
            dispatch({ type: "flask" });
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200 transition-all hover:bg-emerald-500/20 active:scale-[0.97] disabled:opacity-40"
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Flask ×{run.flasks} (heal {FLASK_HEAL_PCT}%, free action)
        </button>
      </div>
    </div>
  );
}

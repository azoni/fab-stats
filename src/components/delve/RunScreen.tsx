"use client";
/**
 * The in-run view: door choices, node resolutions, combat, and the boss
 * antechamber. Terminal states (victory/dead/withdrawn) render in DelveApp's
 * summary view.
 */
import { useState } from "react";
import type { RunState, DelveAction, NodeType } from "@/lib/delve/types";
import { EVENT_BY_ID, ZONE_BY_ID } from "@/lib/delve/content";
import { FLOORS_PER_RUN, NODES_PER_FLOOR, ANTECHAMBER_HEAL_PCT, REST_HEAL_PCT, REST_BUFF_ATK_PCT } from "@/lib/delve/balance";
import { useGameFx } from "@/components/games/fx";
import { CombatPanel } from "./CombatPanel";
import { Swords, Skull, Gift, Sparkles, Flame, DoorOpen, ArrowUp, Backpack } from "lucide-react";

const DOOR_META: Record<NodeType, { label: string; hint: string; icon: React.ReactNode; cls: string }> = {
  combat: { label: "Skirmish", hint: "Something scuttles behind this one.", icon: <Swords className="h-6 w-6" />, cls: "border-fab-border text-fab-text" },
  elite: { label: "Elite", hint: "Heavy breathing. Heavier footsteps. Better loot.", icon: <Skull className="h-6 w-6" />, cls: "border-rose-500/50 text-rose-200" },
  treasure: { label: "Treasure", hint: "A chest. Probably a chest.", icon: <Gift className="h-6 w-6" />, cls: "border-fab-gold/50 text-fab-gold" },
  event: { label: "Curiosity", hint: "Candlelight and bad decisions.", icon: <Sparkles className="h-6 w-6" />, cls: "border-purple-500/50 text-purple-200" },
  rest: { label: "Rest", hint: "An ember-warm alcove. You could withdraw from here.", icon: <Flame className="h-6 w-6" />, cls: "border-emerald-500/50 text-emerald-200" },
};

export function RunScreen({ run, dispatch }: { run: RunState; dispatch: (a: DelveAction) => void }) {
  const { play, haptic } = useGameFx();
  const [target, setTarget] = useState(0);
  const zone = ZONE_BY_ID.get(run.zoneId)!;

  const progress = (
    <div className="mb-4 flex items-center justify-between text-[11px] text-fab-dim">
      <span className="font-bold text-fab-text">
        {zone.name}
        {run.isDaily && <span className="ml-1.5 rounded bg-fab-gold/15 px-1.5 py-0.5 text-[10px] font-black text-fab-gold">DAILY</span>}
      </span>
      <span className="tabular-nums">
        Floor {run.floor}/{FLOORS_PER_RUN} · Node {Math.min(run.node + 1, NODES_PER_FLOOR)}/{NODES_PER_FLOOR} ·{" "}
        <Backpack className="inline h-3 w-3" /> {run.satchel.length} · {run.marksFound} Marks
      </span>
    </div>
  );

  // ── Doors ──
  if (run.phase === "doors") {
    return (
      <div>
        {progress}
        {run.lastOutcome && (
          <div className="game-rise mb-4 rounded-lg border border-fab-border bg-fab-surface p-3 text-center text-sm text-fab-text">
            {run.lastOutcome}
            <div>
              <button
                type="button"
                onClick={() => dispatch({ type: "proceed" })}
                className="mt-2 rounded-md border border-fab-border px-3 py-1 text-xs font-bold text-fab-dim hover:text-fab-gold"
              >
                Onward
              </button>
            </div>
          </div>
        )}
        <p className="mb-3 text-center text-sm font-bold text-fab-text">The stacks open onto {run.doors.length} passages.</p>
        <div className={`grid gap-3 ${run.doors.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {run.doors.map((door, i) => {
            const meta = DOOR_META[door];
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  play("flip");
                  haptic("light");
                  dispatch({ type: "chooseDoor", index: i });
                }}
                className={`game-rise flex flex-col items-center gap-2 rounded-xl border-2 bg-fab-surface/60 p-4 transition-all hover:bg-fab-gold/[0.06] hover:-translate-y-0.5 active:scale-[0.97] ${meta.cls}`}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <DoorOpen className="h-8 w-8 opacity-60" />
                {meta.icon}
                <p className="text-sm font-black">{meta.label}</p>
                <p className="text-center text-[10px] leading-tight text-fab-muted">{meta.hint}</p>
              </button>
            );
          })}
        </div>
        <RunVitals run={run} />
      </div>
    );
  }

  // ── Combat / boss ──
  if ((run.phase === "combat" || run.phase === "boss") && run.combat) {
    return (
      <div>
        {progress}
        {run.combat.isBoss && (
          <p className="game-pop mb-3 text-center text-lg font-black text-rose-300">The Foreman looks up from his ledger.</p>
        )}
        <CombatPanel run={run} target={target} setTarget={setTarget} dispatch={dispatch} />
      </div>
    );
  }

  // ── Treasure ──
  if (run.phase === "treasure") {
    return (
      <div>
        {progress}
        <NodeShell title="A chest, mostly unguarded" outcome={run.nodeResolved ? run.lastOutcome : null} onProceed={() => dispatch({ type: "proceed" })}>
          {!run.nodeResolved && (
            <button
              type="button"
              onClick={() => {
                play("reveal");
                haptic("medium");
                dispatch({ type: "openChest" });
              }}
              className="rounded-xl border-2 border-fab-gold/50 bg-fab-gold/10 px-6 py-3 text-sm font-black text-fab-gold transition-all hover:bg-fab-gold/20 active:scale-[0.97]"
            >
              Open it
            </button>
          )}
        </NodeShell>
        <RunVitals run={run} />
      </div>
    );
  }

  // ── Event / antechamber shrine ──
  if (run.phase === "event" || run.phase === "antechamber") {
    const isAnte = run.phase === "antechamber";
    const event = run.eventId ? EVENT_BY_ID.get(run.eventId) : null;
    return (
      <div>
        {progress}
        {isAnte && !run.nodeResolved && (
          <div className="mb-4 text-center">
            <p className="game-pop text-lg font-black text-fab-text">The Boss Antechamber</p>
            <p className="text-xs text-fab-muted">Beyond the next door: the Foreman. Catch your breath, or gamble at the shrine.</p>
          </div>
        )}
        {run.nodeResolved ? (
          <NodeShell title={event?.name ?? "…"} outcome={run.lastOutcome} onProceed={() => dispatch({ type: "proceed" })} proceedLabel={isAnte ? "Face the Foreman" : "Onward"} />
        ) : isAnte && !run.eventId ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                play("correct");
                dispatch({ type: "restChoice", choice: "heal" });
              }}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-emerald-500/50 bg-fab-surface/60 p-5 text-emerald-200 transition-all hover:bg-emerald-500/10 active:scale-[0.97]"
            >
              <Flame className="h-7 w-7" />
              <p className="text-sm font-black">Rest</p>
              <p className="text-[10px] text-fab-muted">Heal {ANTECHAMBER_HEAL_PCT}% before the fight</p>
            </button>
            <button
              type="button"
              onClick={() => {
                play("flip");
                dispatch({ type: "eventChoice", option: 0 });
              }}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-purple-500/50 bg-fab-surface/60 p-5 text-purple-200 transition-all hover:bg-purple-500/10 active:scale-[0.97]"
            >
              <Sparkles className="h-7 w-7" />
              <p className="text-sm font-black">The Shrine</p>
              <p className="text-[10px] text-fab-muted">Gamble on the first offering</p>
            </button>
          </div>
        ) : event ? (
          <div className="mx-auto max-w-md">
            <div className="rounded-xl border border-purple-500/40 bg-fab-surface p-4">
              <p className="text-sm font-black text-purple-200">{event.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-fab-muted">{event.prompt}</p>
            </div>
            <div className="mt-3 space-y-2">
              {event.options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    play("flip");
                    haptic("light");
                    dispatch({ type: "eventChoice", option: i });
                  }}
                  className="game-rise w-full rounded-lg border border-fab-border bg-fab-surface/70 px-4 py-2.5 text-left text-sm font-bold text-fab-text transition-all hover:border-purple-400/50 hover:bg-purple-500/[0.06] active:scale-[0.99]"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <RunVitals run={run} />
      </div>
    );
  }

  // ── Rest ──
  if (run.phase === "rest") {
    return (
      <div>
        {progress}
        {run.nodeResolved ? (
          <div className="mx-auto max-w-md">
            <NodeShell title="Ember alcove" outcome={run.lastOutcome} onProceed={() => dispatch({ type: "proceed" })} />
            {/* The engine allows withdrawing from a rest node resolved or not. */}
            <button
              type="button"
              onClick={() => {
                play("correct");
                haptic("success");
                dispatch({ type: "withdraw" });
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-fab-gold/40 px-4 py-2 text-xs font-bold text-fab-gold transition-all hover:bg-fab-gold/10 active:scale-[0.98]"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              Withdraw instead — bank {run.satchel.length} item{run.satchel.length === 1 ? "" : "s"} and {run.marksFound} Marks
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-md">
            <p className="mb-3 text-center text-sm font-bold text-fab-text">An ember-warm alcove. The shelves hum quietly here.</p>
            <div className="grid grid-cols-3 gap-2">
              <RestButton label="Rest" sub={`Heal ${REST_HEAL_PCT}%`} onClick={() => { play("correct"); dispatch({ type: "restChoice", choice: "heal" }); }} />
              <RestButton label="Refill" sub="+1 flask" onClick={() => { play("reveal"); dispatch({ type: "restChoice", choice: "flask" }); }} />
              <RestButton label="Whet" sub={`+${REST_BUFF_ATK_PCT}% ATK`} onClick={() => { play("correct"); dispatch({ type: "restChoice", choice: "buff" }); }} />
            </div>
            <button
              type="button"
              onClick={() => {
                play("correct");
                haptic("success");
                dispatch({ type: "withdraw" });
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-fab-gold/50 bg-fab-gold/10 px-4 py-3 text-sm font-black text-fab-gold transition-all hover:bg-fab-gold/20 active:scale-[0.98]"
            >
              <ArrowUp className="h-4 w-4" />
              Withdraw — bank the satchel ({run.satchel.length} items, {run.marksFound} Marks) and end the run
            </button>
          </div>
        )}
        <RunVitals run={run} />
      </div>
    );
  }

  return null;
}

function NodeShell({
  title,
  outcome,
  onProceed,
  proceedLabel = "Onward",
  children,
}: {
  title: string;
  outcome: string | null;
  onProceed: () => void;
  proceedLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
      <p className="text-sm font-black text-fab-text">{title}</p>
      {children}
      {outcome && (
        <>
          <p className="game-pop rounded-lg border border-fab-border bg-fab-surface px-4 py-3 text-sm text-fab-text">{outcome}</p>
          <button
            type="button"
            onClick={onProceed}
            className="rounded-lg border border-fab-gold/50 bg-fab-gold/10 px-5 py-2 text-sm font-black text-fab-gold transition-all hover:bg-fab-gold/20 active:scale-[0.97]"
          >
            {proceedLabel}
          </button>
        </>
      )}
    </div>
  );
}

function RestButton({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl border border-emerald-500/40 bg-fab-surface/60 p-3 transition-all hover:bg-emerald-500/[0.08] active:scale-[0.97]"
    >
      <p className="text-sm font-black text-emerald-200">{label}</p>
      <p className="text-[10px] text-fab-muted">{sub}</p>
    </button>
  );
}

function RunVitals({ run }: { run: RunState }) {
  return (
    <div className="mt-5 flex items-center justify-center gap-4 text-[11px] text-fab-dim">
      <span className="font-bold text-fab-text">HP {Math.max(0, run.hp)}/{run.maxHp}</span>
      <span>Flasks ×{run.flasks}</span>
      {run.runAtkPct > 0 && <span className="text-fab-gold">+{run.runAtkPct}% ATK</span>}
      <span>{run.kills} kills</span>
    </div>
  );
}

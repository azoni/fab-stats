"use client";
/**
 * Camp — the persistent hub: delver panel, gear + stash, the Forge
 * (salvage/enhance), and the Door (keys + Daily Delve).
 */
import { useState } from "react";
import type { DelveCharacter, DelveStats, EffectiveStats, ItemRoll, Slot, MaterialId } from "@/lib/delve/types";
import { CLASS_BY_ID } from "@/lib/delve/content";
import {
  xpToNext,
  LEVEL_CAP_V01,
  KEYS_BANK_CAP,
  ENHANCE_CAP_V01,
  enhanceMarksCost,
  ENHANCE_MATERIALS,
  SALVAGE_YIELD,
  slotOf,
} from "@/lib/delve/balance";
import { useGameFx, CountUp } from "@/components/games/fx";
import { DelverSprite } from "./sprites";
import { ItemCard } from "./ItemCard";
import { KeyRound, DoorOpen, Hammer, Recycle, Swords, Calendar } from "lucide-react";

const SLOT_ORDER: Slot[] = ["weapon", "helm", "armor", "charm", "relic"];
const MATERIAL_LABEL: Record<MaterialId, string> = { cinder: "Cinder", gloam: "Gloam", aurum: "Aurum", aether: "Aether" };

type Selection = { kind: "equipped"; slot: Slot } | { kind: "stash"; index: number } | null;

export function CampHub({
  character,
  eff,
  stash,
  stats,
  dailyOpen,
  onStartRun,
  onEquip,
  onUnequip,
  onSalvage,
  onEnhance,
}: {
  character: DelveCharacter;
  eff: EffectiveStats;
  stash: ItemRoll[];
  stats: DelveStats;
  dailyOpen: boolean;
  onStartRun: (opts: { daily: boolean }) => void;
  onEquip: (stashIndex: number) => void;
  onUnequip: (slot: Slot) => void;
  onSalvage: (stashIndex: number) => void;
  onEnhance: (target: { kind: "equipped"; slot: Slot } | { kind: "stash"; index: number }) => void;
}) {
  const { play, haptic } = useGameFx();
  const cls = CLASS_BY_ID.get(character.classId)!;
  const [selected, setSelected] = useState<Selection>(null);

  const selectedItem: ItemRoll | null =
    selected?.kind === "equipped"
      ? character.equipped[selected.slot] ?? null
      : selected?.kind === "stash"
        ? stash[selected.index] ?? null
        : null;

  const atCap = character.level >= LEVEL_CAP_V01;
  const xpNeed = xpToNext(character.level);
  const xpPct = atCap ? 100 : Math.min(100, Math.round((character.xp / xpNeed) * 100));

  const canEnhance = (item: ItemRoll): { ok: boolean; why: string } => {
    if (item.enhance >= ENHANCE_CAP_V01) return { ok: false, why: `+${ENHANCE_CAP_V01} cap (for now)` };
    const toTier = item.enhance + 1;
    const marks = enhanceMarksCost(toTier);
    const mats = ENHANCE_MATERIALS[toTier] || {};
    if (character.marks < marks) return { ok: false, why: `needs ${marks} Marks` };
    for (const m of Object.keys(mats) as MaterialId[]) {
      if (character.materials[m] < (mats[m] ?? 0)) return { ok: false, why: `needs ${mats[m]} ${MATERIAL_LABEL[m]}` };
    }
    const cost = [`${marks} Marks`, ...(Object.keys(mats) as MaterialId[]).map((m) => `${mats[m]} ${MATERIAL_LABEL[m]}`)];
    return { ok: true, why: cost.join(" + ") };
  };

  return (
    <div className="space-y-5">
      {/* Delver panel */}
      <div className="rounded-xl border border-fab-border bg-fab-surface p-4">
        <div className="flex items-center gap-4">
          <DelverSprite classId={character.classId} size={64} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black text-fab-text">{character.name}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-fab-dim">
              Level {character.level} {cls.name}
            </p>
            <div className="mt-1.5 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-fab-border/60">
              <div className="h-full rounded-full bg-fab-gold/80 transition-all" style={{ width: `${xpPct}%` }} />
            </div>
            <p className="mt-0.5 text-[10px] tabular-nums text-fab-dim">
              {atCap ? "Level cap (this wing of the Understack)" : `${character.xp}/${xpNeed} XP`}
            </p>
          </div>
          <div className="shrink-0 text-right text-[11px] text-fab-muted">
            <p className="text-lg font-black tabular-nums text-fab-gold"><CountUp value={character.marks} /></p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-fab-dim">Marks</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center sm:grid-cols-8">
          {[
            ["HP", eff.maxHp],
            ["ATK", eff.atk],
            ["DEF", eff.def],
            ["SPD", eff.spd],
            ["Crit", `${eff.critPct}%`],
            ["Runs", stats.totalRuns],
            ["Bosses", stats.bossKills],
            ["Deaths", stats.deaths],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-lg bg-fab-bg/50 px-1 py-1.5">
              <p className="text-sm font-black tabular-nums text-fab-text">{value}</p>
              <p className="text-[8px] font-bold uppercase tracking-wider text-fab-dim">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* The Door */}
      <div className="rounded-xl border border-fab-gold/30 bg-fab-gold/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-black text-fab-text">
              <DoorOpen className="h-4 w-4 text-fab-gold" /> The Door
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-fab-muted">
              <KeyRound className="h-3 w-3 text-fab-gold" />
              {character.keys.n}/{KEYS_BANK_CAP} keys · 3 arrive at UTC midnight, they bank
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={character.keys.n <= 0}
              onClick={() => {
                play("flip");
                haptic("medium");
                onStartRun({ daily: false });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-fab-gold px-4 py-2 text-sm font-black text-black transition-all hover:bg-fab-gold/85 active:scale-[0.97] disabled:opacity-40"
            >
              <Swords className="h-4 w-4" /> Delve (1 key)
            </button>
            <button
              type="button"
              disabled={!dailyOpen}
              title={dailyOpen ? "Everyone runs the same dungeon today — score posts to camp" : "Done for today — new Daily at UTC midnight"}
              onClick={() => {
                play("flip");
                haptic("medium");
                onStartRun({ daily: true });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-fab-gold/50 bg-fab-gold/10 px-4 py-2 text-sm font-black text-fab-gold transition-all hover:bg-fab-gold/20 active:scale-[0.97] disabled:opacity-40"
            >
              <Calendar className="h-4 w-4" /> {dailyOpen ? "Daily Delve (free)" : `Daily done · ${character.daily.score}`}
            </button>
          </div>
        </div>
      </div>

      {/* Gear + stash */}
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-fab-border bg-fab-surface p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-fab-dim">Equipped</p>
            <div className="grid grid-cols-5 gap-2">
              {SLOT_ORDER.map((slot) => {
                const item = character.equipped[slot];
                return item ? (
                  <ItemCard
                    key={slot}
                    item={item}
                    compact
                    selected={selected?.kind === "equipped" && selected.slot === slot}
                    onClick={() => setSelected({ kind: "equipped", slot })}
                  />
                ) : (
                  <div
                    key={slot}
                    className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-fab-border/60 text-[9px] font-bold uppercase tracking-wider text-fab-dim"
                  >
                    {slot}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-fab-border bg-fab-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-fab-dim">Stash · {stash.length}</p>
              <p className="text-[10px] text-fab-dim">
                {(Object.keys(character.materials) as MaterialId[])
                  .filter((m) => character.materials[m] > 0)
                  .map((m) => `${character.materials[m]} ${MATERIAL_LABEL[m]}`)
                  .join(" · ") || "No materials yet — salvage gear at the Forge"}
              </p>
            </div>
            {stash.length === 0 ? (
              <p className="py-4 text-center text-xs text-fab-muted">
                Empty. The Understack is full of things worth carrying — go get some.
              </p>
            ) : (
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {stash.map((item, i) => (
                  <ItemCard
                    key={`${item.id}-${i}`}
                    item={item}
                    compact
                    selected={selected?.kind === "stash" && selected.index === i}
                    onClick={() => setSelected({ kind: "stash", index: i })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail / Forge panel */}
        <div className="rounded-xl border border-fab-border bg-fab-surface p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-fab-dim">
            <Hammer className="h-3.5 w-3.5" /> The Forge
          </p>
          {selectedItem ? (
            <div className="space-y-3">
              <ItemCard item={selectedItem} />
              <div className="space-y-2">
                {selected?.kind === "stash" && (
                  <button
                    type="button"
                    onClick={() => {
                      play("correct");
                      haptic("light");
                      onEquip(selected.index);
                      setSelected(null);
                    }}
                    className="w-full rounded-lg bg-fab-gold px-3 py-2 text-xs font-black text-black transition-all hover:bg-fab-gold/85 active:scale-[0.98]"
                  >
                    Equip ({slotOf(selectedItem)})
                  </button>
                )}
                {selected?.kind === "equipped" && (
                  <button
                    type="button"
                    onClick={() => {
                      play("click");
                      onUnequip(selected.slot);
                      setSelected(null);
                    }}
                    className="w-full rounded-lg border border-fab-border px-3 py-2 text-xs font-bold text-fab-text transition-all hover:border-fab-gold/50 active:scale-[0.98]"
                  >
                    Unequip to stash
                  </button>
                )}
                {(() => {
                  const e = canEnhance(selectedItem);
                  return (
                    <button
                      type="button"
                      disabled={!e.ok}
                      onClick={() => {
                        if (!selected) return;
                        play("win");
                        haptic("success");
                        onEnhance(selected);
                      }}
                      className="w-full rounded-lg border border-fab-gold/40 bg-fab-gold/10 px-3 py-2 text-xs font-black text-fab-gold transition-all hover:bg-fab-gold/20 active:scale-[0.98] disabled:opacity-40"
                    >
                      Enhance to +{Math.min(ENHANCE_CAP_V01, selectedItem.enhance + 1)} — {e.why}
                    </button>
                  );
                })()}
                {selected?.kind === "stash" && (
                  <button
                    type="button"
                    onClick={() => {
                      play("wrong");
                      haptic("light");
                      onSalvage(selected.index);
                      setSelected(null);
                    }}
                    className="flex w-full items-center justify-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/[0.06] px-3 py-2 text-xs font-bold text-rose-300 transition-all hover:bg-rose-500/[0.12] active:scale-[0.98]"
                  >
                    <Recycle className="h-3.5 w-3.5" />
                    Salvage →{" "}
                    {(Object.entries(SALVAGE_YIELD[selectedItem.rarity]) as [MaterialId, number][])
                      .map(([m, n]) => `${n} ${MATERIAL_LABEL[m]}`)
                      .join(" + ")}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-fab-muted">
              Select a piece of gear to inspect, equip, enhance, or salvage it.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

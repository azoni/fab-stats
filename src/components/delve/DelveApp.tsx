"use client";
/**
 * The Understack — root component. Flag-gated; loads only on /delve via
 * next/dynamic. Views: create → camp ↔ run → summary.
 */
import { useState } from "react";
import Link from "next/link";
import { DELVE_ENABLED } from "@/lib/delve/flags";
import { CLASSES, ITEM_BASE_BY_ID } from "@/lib/delve/content";
import type { ClassId } from "@/lib/delve/types";
import { useGameFx, WinBurst, CountUp, SoundToggle } from "@/components/games/fx";
import { useDelveGame } from "./useDelveGame";
import { CampHub } from "./CampHub";
import { RunScreen } from "./RunScreen";
import { ItemCard, RARITY_LABEL } from "./ItemCard";
import { DelverSprite } from "./sprites";
import { ArrowLeft, KeyRound } from "lucide-react";

export default function DelveApp() {
  if (!DELVE_ENABLED) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-2xl font-black text-fab-text">The Understack</p>
        <p className="mt-2 text-sm text-fab-muted">
          The archivists are still shelving. Come back soon.
        </p>
        <Link href="/games" className="mt-4 inline-block text-xs font-bold text-fab-gold hover:underline">
          ← Daily Games
        </Link>
      </div>
    );
  }
  return <DelveGame />;
}

function DelveGame() {
  const game = useDelveGame();

  return (
    <div className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/games" className="rounded-lg px-2 py-1.5 text-sm font-medium text-fab-dim transition-colors hover:bg-fab-surface hover:text-fab-text">
            <ArrowLeft className="inline h-3.5 w-3.5" />
          </Link>
          <div>
            <h1 className="text-lg font-black text-fab-text">The Understack</h1>
            <p className="text-[10px] text-fab-dim">Beneath the Ledgerhall, every game ever played settles as sediment.</p>
          </div>
        </div>
        <SoundToggle />
      </div>

      {game.keysGainedToast > 0 && (
        <button
          type="button"
          onClick={game.clearKeysToast}
          className="game-rise mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-fab-gold/40 bg-fab-gold/10 px-3 py-2 text-xs font-bold text-fab-gold"
        >
          <KeyRound className="h-3.5 w-3.5" /> +{game.keysGainedToast} key{game.keysGainedToast > 1 ? "s" : ""} arrived while you were away
        </button>
      )}

      {game.view === "loading" && (
        <div className="h-72 animate-pulse rounded-xl border border-fab-border bg-fab-surface" />
      )}

      {game.view === "unreachable" && (
        <div className="mx-auto max-w-md rounded-xl border border-fab-border bg-fab-surface p-6 text-center">
          <p className="text-lg font-black text-fab-text">The archive is unreachable</p>
          <p className="mt-2 text-sm text-fab-muted">
            We couldn&apos;t load your delver. Check your connection and try again — nothing was lost.
          </p>
          <button
            type="button"
            onClick={game.retry}
            className="mt-4 rounded-lg bg-fab-gold px-5 py-2 text-sm font-black text-black transition-all hover:bg-fab-gold/85 active:scale-[0.98]"
          >
            Retry
          </button>
        </div>
      )}

      {game.view === "create" && <CreateDelver onCreate={game.create} />}

      {game.view === "camp" && game.character && game.eff && (
        <CampHub
          character={game.character}
          eff={game.eff}
          stash={game.stash}
          stats={game.stats}
          dailyOpen={game.dailyOpen}
          onStartRun={game.startRun}
          onEquip={game.equip}
          onUnequip={game.unequip}
          onSalvage={game.salvage}
          onEnhance={game.enhance}
        />
      )}

      {game.view === "run" && game.run && <RunScreen run={game.run} dispatch={game.dispatch} />}

      {game.view === "summary" && game.summary && <SummaryScreen summary={game.summary} onContinue={game.backToCamp} />}
    </div>
  );
}

// ── Character creation ────────────────────────────────────────────────────────

function CreateDelver({ onCreate }: { onCreate: (name: string, classId: ClassId) => void }) {
  const { play, haptic } = useGameFx();
  const [name, setName] = useState("");
  const [classId, setClassId] = useState<ClassId | null>(null);

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-xl border border-fab-border bg-fab-surface p-5">
        <p className="text-sm font-black text-fab-text">The Ledgerhall is hiring.</p>
        <p className="mt-1 text-xs leading-relaxed text-fab-muted">
          Dead strategies calcify into monsters down there. Abandoned decks rust into golems. The pay is in
          Marks, the contract is short, and the shelves shift when you&apos;re not looking. Sign here.
        </p>

        <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-fab-dim">Name your delver</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="Delver"
          className="mt-1 w-full rounded-lg border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text focus:border-fab-gold focus:outline-none"
        />

        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-fab-dim">Choose a trade</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {CLASSES.map((cls) => (
            <button
              key={cls.id}
              type="button"
              onClick={() => {
                play("click");
                setClassId(cls.id);
              }}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all active:scale-[0.97] ${
                classId === cls.id
                  ? "border-fab-gold bg-fab-gold/[0.08] ring-1 ring-inset ring-fab-gold/30"
                  : "border-fab-border bg-fab-bg/50 hover:border-fab-gold/40"
              }`}
            >
              <DelverSprite classId={cls.id} size={56} />
              <p className="text-sm font-black text-fab-text">{cls.name}</p>
              <p className="text-[10px] leading-tight text-fab-muted">{cls.identity}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-fab-dim">
                {cls.base.hp} HP · {cls.base.atk} ATK · {cls.resourceName}
              </p>
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!classId}
          onClick={() => {
            if (!classId) return;
            play("win");
            haptic("success");
            onCreate(name, classId);
          }}
          className="mt-5 w-full rounded-lg bg-fab-gold px-4 py-2.5 text-sm font-black text-black transition-all hover:bg-fab-gold/85 active:scale-[0.98] disabled:opacity-40"
        >
          Sign the contract
        </button>
        <p className="mt-2 text-center text-[10px] text-fab-dim">
          Guests play locally — sign in to keep your delver across devices.
        </p>
      </div>
    </div>
  );
}

// ── Run summary ───────────────────────────────────────────────────────────────

function SummaryScreen({
  summary,
  onContinue,
}: {
  summary: NonNullable<ReturnType<typeof useDelveGame>["summary"]>;
  onContinue: () => void;
}) {
  const won = summary.outcome === "victory";
  const withdrew = summary.outcome === "withdrawn";
  return (
    <div className="relative mx-auto max-w-md overflow-hidden rounded-xl border border-fab-border bg-fab-surface p-5 text-center">
      {won && <WinBurst count={34} />}
      <p
        className={`relative game-pop text-2xl font-black ${
          won ? "text-fab-win" : withdrew ? "text-fab-gold" : "text-fab-loss"
        }`}
      >
        {won ? "Waystone reached!" : withdrew ? "Withdrawn — loot banked" : "The stacks claim another"}
      </p>
      <p className="mt-1 text-xs text-fab-muted">
        {won
          ? "The Foreman is scrap. The Ledgerhall notes your descent with grudging approval."
          : withdrew
            ? "No shame in a planned exit. The satchel made it out — that's what counts."
            : "You kept your experience and your materials. The satchel... stayed down there."}
      </p>

      <div className="relative mt-4 grid grid-cols-3 gap-2">
        <SummaryStat label="Marks" value={<CountUp value={summary.marks} />} gold />
        <SummaryStat label="XP" value={<CountUp value={summary.xp} />} />
        <SummaryStat label="Kills" value={<CountUp value={summary.kills} />} />
      </div>

      {summary.levelsGained > 0 && (
        <p className="game-match-pop relative mx-auto mt-3 inline-block rounded-lg border border-fab-gold/50 bg-fab-gold/10 px-4 py-1.5 text-sm font-black text-fab-gold">
          LEVEL UP{summary.levelsGained > 1 ? ` ×${summary.levelsGained}` : ""}!
        </p>
      )}

      {summary.dailyScore !== null && (
        <p className="relative mt-3 text-sm font-bold text-fab-text">
          Daily Delve score: <span className="font-black text-fab-gold tabular-nums">{summary.dailyScore}</span>
        </p>
      )}

      {summary.bankedItems.length > 0 && (
        <div className="relative mt-4 space-y-2 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-fab-dim">Banked to stash</p>
          {summary.bankedItems.map((item, i) => (
            <div key={i} className="game-rise" style={{ animationDelay: `${i * 110}ms` }}>
              <ItemCard item={item} />
            </div>
          ))}
        </div>
      )}

      {summary.lostItems.length > 0 && (
        <div className="relative mt-4 rounded-lg border border-rose-500/30 bg-rose-500/[0.05] p-3 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Lost with you</p>
          <ul className="mt-1 space-y-0.5">
            {summary.lostItems.map((item, i) => (
              <li key={i} className="text-[11px] text-fab-muted line-through">
                {ITEM_BASE_BY_ID.get(item.id)?.name ?? item.id} ({RARITY_LABEL[item.rarity]})
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[10px] italic text-fab-dim">Bank at the Waystone or Withdraw at a rest stop next time.</p>
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="relative mt-5 w-full rounded-lg bg-fab-gold px-4 py-2.5 text-sm font-black text-black transition-all hover:bg-fab-gold/85 active:scale-[0.98]"
      >
        Back to camp
      </button>
    </div>
  );
}

function SummaryStat({ label, value, gold = false }: { label: string; value: React.ReactNode; gold?: boolean }) {
  return (
    <div className="rounded-lg bg-fab-bg/50 px-2 py-2">
      <p className={`text-lg font-black tabular-nums ${gold ? "text-fab-gold" : "text-fab-text"}`}>{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-fab-dim">{label}</p>
    </div>
  );
}

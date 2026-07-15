"use client";
/**
 * The gacha (Reliquary pulls). Two pools; the server draws + grants, the client
 * only shows odds, pity progress, and the reveal. Every pool SKU is also directly
 * buyable in the shop — pulls are opt-in excitement, never the only path.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  gachaPull,
  GACHA_PULL_COST,
  GACHA_PITY_THRESHOLD,
  GACHA_DUPE_REFUND_PCT,
  type GachaOutcome,
  type Wallet,
} from "@/lib/cosmetics/wallet-client";
import { CoinIcon } from "@/components/cosmetics/CoinBalance";
import { RARITY_LABELS, RARITY_ORDER, type CosmeticItem, type CosmeticRarity } from "@/lib/cosmetics/catalog";
import { RARITY_VISUALS } from "@/lib/badge-tiers";
import { GachaReveal } from "./GachaReveal";

const POOLS = [
  { id: "standard", name: "Standard Reliquary", blurb: "Common through rare relics." },
  { id: "premium", name: "Premium Reliquary", blurb: "Epic & legendary relics only." },
];

function poolOdds(catalog: CosmeticItem[], poolId: string): { rarity: CosmeticRarity; pct: number }[] {
  const entries = catalog.filter((c) => c.gachaPool === poolId && (c.gachaWeight ?? 0) > 0 && c.isActive !== false);
  const total = entries.reduce((s, c) => s + (c.gachaWeight ?? 0), 0);
  if (total === 0) return [];
  const byRarity = new Map<CosmeticRarity, number>();
  for (const c of entries) byRarity.set(c.rarity, (byRarity.get(c.rarity) ?? 0) + (c.gachaWeight ?? 0));
  return [...byRarity.entries()]
    .map(([rarity, w]) => ({ rarity, pct: (w / total) * 100 }))
    .sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]);
}

export function GachaReliquary({ catalog, wallet }: { catalog: CosmeticItem[]; wallet: Wallet | null }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [reveal, setReveal] = useState<GachaOutcome | null>(null);

  const coins = wallet?.coins ?? 0;
  const sinceRare = wallet?.pullsSinceRarePlus ?? 0;
  const oddsByPool = useMemo(
    () => Object.fromEntries(POOLS.map((p) => [p.id, poolOdds(catalog, p.id)])),
    [catalog],
  );

  async function pull(poolId: string) {
    if (coins < GACHA_PULL_COST) {
      toast.error("Not enough coins for a pull.");
      return;
    }
    setBusy(poolId);
    try {
      const r = await gachaPull(poolId);
      if (r.ok) setReveal(r);
      else if (r.error === "insufficient") toast.error("Not enough coins.");
      else if (r.error === "empty_pool") toast.error("This pool has no relics yet.");
      else toast.error("Pull failed. Try again.");
    } catch {
      toast.error("Pull failed. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-fab-muted">
          {GACHA_PULL_COST} coins per pull · duplicates refund {Math.round(GACHA_DUPE_REFUND_PCT * 100)}% · a rare+ is
          guaranteed at least every {GACHA_PITY_THRESHOLD} pulls.
        </p>
      </div>

      {/* Pity meter */}
      <div className="mb-4 rounded-lg border border-fab-border bg-fab-surface p-3">
        <div className="flex items-center justify-between text-[11px] text-fab-muted">
          <span>Pity — pulls since a rare+</span>
          <span className="tabular-nums">
            {Math.min(sinceRare, GACHA_PITY_THRESHOLD)} / {GACHA_PITY_THRESHOLD}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-fab-bg">
          <div
            className="h-full rounded-full bg-fab-gold transition-all"
            style={{ width: `${Math.min(100, (sinceRare / GACHA_PITY_THRESHOLD) * 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {POOLS.map((p) => {
          const odds = oddsByPool[p.id] ?? [];
          const affordable = coins >= GACHA_PULL_COST;
          return (
            <div key={p.id} className="flex flex-col rounded-xl border border-fab-border bg-fab-surface p-4">
              <p className="font-semibold text-fab-text">{p.name}</p>
              <p className="mt-0.5 text-xs text-fab-muted">{p.blurb}</p>

              <div className="mt-3 space-y-1">
                {odds.map((o) => (
                  <div key={o.rarity} className="flex items-center gap-2 text-[11px]">
                    <span className="h-2 w-2 rounded-full" style={{ background: RARITY_VISUALS[o.rarity]?.ringColor }} />
                    <span className="text-fab-muted">{RARITY_LABELS[o.rarity]}</span>
                    <span className="ml-auto tabular-nums text-fab-dim">{o.pct.toFixed(1)}%</span>
                  </div>
                ))}
                {odds.length === 0 && <p className="text-[11px] text-fab-dim">No relics in this pool.</p>}
              </div>

              <button
                type="button"
                disabled={!affordable || busy !== null || odds.length === 0}
                onClick={() => pull(p.id)}
                className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-fab-gold/40 bg-fab-gold/20 px-3 py-2 text-sm font-semibold text-fab-gold hover:bg-fab-gold/25 disabled:opacity-50"
              >
                {busy === p.id ? (
                  "Drawing…"
                ) : (
                  <>
                    Pull <CoinIcon size={14} /> {GACHA_PULL_COST}
                  </>
                )}
              </button>
              {!affordable && <p className="mt-1 text-center text-[10px] text-fab-dim">Need {(GACHA_PULL_COST - coins).toLocaleString()} more</p>}
            </div>
          );
        })}
      </div>

      {reveal && <GachaReveal outcome={reveal} onClose={() => setReveal(null)} />}
    </div>
  );
}

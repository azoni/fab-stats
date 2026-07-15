"use client";
/**
 * Admin manager for the cosmetics catalog (cosmeticCatalog/*). Seed the default
 * "Heraldic Reliquary" set, then toggle isActive/shopVisible, tune price/sortOrder,
 * and save per row. Writes go straight to Firestore (gated by firestore.rules
 * isAdmin() + the validCosmeticCatalogDoc validator).
 */
import { useCallback, useEffect, useState } from "react";
import { CosmeticPreview } from "@/components/cosmetics/CosmeticPreview";
import { RARITY_LABELS, type CosmeticItem } from "@/lib/cosmetics/catalog";
import {
  loadCosmeticCatalogForAdmin,
  saveCosmeticCatalogEntry,
  seedCosmeticCatalog,
} from "@/lib/cosmetics/catalog";
import { SEED_COSMETICS } from "@/lib/cosmetics/seed-cosmetics";

interface Draft {
  isActive: boolean;
  shopVisible: boolean;
  price: number;
  sortOrder: number;
}

const toDraft = (i: CosmeticItem): Draft => ({
  isActive: i.isActive !== false,
  shopVisible: i.shopVisible !== false,
  price: i.price,
  sortOrder: i.sortOrder ?? 0,
});

const isDirty = (i: CosmeticItem, d: Draft) =>
  toDraft(i).isActive !== d.isActive ||
  toDraft(i).shopVisible !== d.shopVisible ||
  i.price !== d.price ||
  (i.sortOrder ?? 0) !== d.sortOrder;

export function CosmeticCatalogManager() {
  const [entries, setEntries] = useState<CosmeticItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const loaded = await loadCosmeticCatalogForAdmin();
      setEntries(loaded);
      setDrafts(Object.fromEntries(loaded.map((i) => [i.id, toDraft(i)])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cosmetic catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function seed() {
    setSeeding(true);
    setError("");
    try {
      const n = await seedCosmeticCatalog(SEED_COSMETICS);
      await load();
      setError(`Seeded ${n} cosmetics.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seed failed.");
    } finally {
      setSeeding(false);
    }
  }

  async function saveRow(entry: CosmeticItem) {
    const d = drafts[entry.id];
    if (!d || !isDirty(entry, d)) return;
    setSavingId(entry.id);
    setError("");
    try {
      await saveCosmeticCatalogEntry({ ...entry, ...d });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSavingId(null);
    }
  }

  const activeCount = entries.filter((e) => e.isActive !== false).length;

  return (
    <div className="mt-4 rounded-lg border border-fab-border bg-fab-bg/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fab-border px-3 py-2">
        <div>
          <p className="text-sm font-semibold text-fab-text">Cosmetic Catalog</p>
          <p className="mt-0.5 text-[11px] text-fab-dim">
            Total {entries.length} · Active {activeCount} · Seed has {SEED_COSMETICS.length}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={seed}
            disabled={seeding || loading}
            className="rounded border border-fab-gold/40 bg-fab-gold/15 px-2 py-1 text-xs font-semibold text-fab-gold disabled:opacity-50"
          >
            {seeding ? "Seeding…" : "Seed defaults"}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading || Boolean(savingId)}
            className="rounded border border-fab-border px-2 py-1 text-xs text-fab-muted hover:text-fab-text disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="p-3">
        {error && <p className="mb-2 text-xs text-amber-300">{error}</p>}
        {loading && <p className="text-xs text-fab-dim">Loading…</p>}
        {!loading && entries.length === 0 && (
          <p className="text-xs text-fab-dim">Catalog is empty. Click “Seed defaults” to populate it.</p>
        )}
        {!loading && entries.length > 0 && (
          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {entries.map((entry) => {
              const d = drafts[entry.id] || toDraft(entry);
              const dirty = isDirty(entry, d);
              const saving = savingId === entry.id;
              return (
                <div key={entry.id} className="rounded-lg border border-fab-border bg-fab-surface p-2">
                  <div className="flex items-start gap-2">
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded bg-fab-bg/40">
                      <CosmeticPreview item={entry} size={40} context="swatch" name="Aa" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-fab-text">{entry.name}</p>
                      <p className="truncate text-[10px] text-fab-dim">{entry.id}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span className="rounded bg-fab-bg px-1.5 py-0.5 text-[10px] text-fab-muted">{entry.category}</span>
                        <span className="rounded bg-fab-bg px-1.5 py-0.5 text-[10px] text-fab-muted">
                          {RARITY_LABELS[entry.rarity]}
                        </span>
                        {!d.isActive && (
                          <span className="rounded border border-red-500/30 bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-300">
                            inactive
                          </span>
                        )}
                        {!d.shopVisible && (
                          <span className="rounded border border-cyan-500/30 bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-300">
                            hidden
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <label className="flex items-center gap-1.5 text-xs text-fab-muted">
                      <input
                        type="checkbox"
                        checked={d.isActive}
                        onChange={(e) => setDrafts((p) => ({ ...p, [entry.id]: { ...d, isActive: e.target.checked } }))}
                      />
                      Active
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-fab-muted">
                      <input
                        type="checkbox"
                        checked={d.shopVisible}
                        onChange={(e) => setDrafts((p) => ({ ...p, [entry.id]: { ...d, shopVisible: e.target.checked } }))}
                      />
                      Shop-visible
                    </label>
                    <label className="flex items-center gap-1 text-xs text-fab-muted">
                      Price
                      <input
                        type="number"
                        value={d.price}
                        min={0}
                        onChange={(e) => setDrafts((p) => ({ ...p, [entry.id]: { ...d, price: parseInt(e.target.value, 10) || 0 } }))}
                        className="w-20 rounded border border-fab-border bg-fab-bg px-1.5 py-1 text-xs text-fab-text focus:border-fab-gold focus:outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs text-fab-muted">
                      Order
                      <input
                        type="number"
                        value={d.sortOrder}
                        onChange={(e) => setDrafts((p) => ({ ...p, [entry.id]: { ...d, sortOrder: parseInt(e.target.value, 10) || 0 } }))}
                        className="w-16 rounded border border-fab-border bg-fab-bg px-1.5 py-1 text-xs text-fab-text focus:border-fab-gold focus:outline-none"
                      />
                    </label>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!dirty || saving}
                      onClick={() => saveRow(entry)}
                      className="rounded border border-fab-gold/40 bg-fab-gold/20 px-2 py-1 text-xs font-semibold text-fab-gold disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    {dirty && <span className="text-[10px] text-amber-300">Unsaved changes</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

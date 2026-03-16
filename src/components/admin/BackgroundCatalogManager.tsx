"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildOptimizedImageUrl,
  type ProfileBackgroundOption,
  type ProfileBackgroundUnlockType,
} from "@/lib/profile-backgrounds";
import {
  loadProfileBackgroundCatalogForAdmin,
  updateProfileBackgroundCatalogEntry,
} from "@/lib/profile-background-catalog";

type VisibilityFilter = "all" | "public" | "admin";
type ActiveFilter = "all" | "active" | "inactive";
type UnlockFilter = "all" | "open" | "gated";

interface BackgroundDraft {
  adminOnly: boolean;
  isActive: boolean;
  unlockType: ProfileBackgroundUnlockType | "none";
  unlockKey: string;
  unlockLabel: string;
}

function buildDraft(option: ProfileBackgroundOption): BackgroundDraft {
  return {
    adminOnly: option.adminOnly === true,
    isActive: option.isActive !== false,
    unlockType: option.unlockType || "none",
    unlockKey: option.unlockKey || "",
    unlockLabel: option.unlockLabel || "",
  };
}

function normalizeValue(value?: string): string {
  return (value || "").trim();
}

function isDraftDirty(option: ProfileBackgroundOption, draft: BackgroundDraft): boolean {
  const baseline = buildDraft(option);
  return (
    baseline.adminOnly !== draft.adminOnly
    || baseline.isActive !== draft.isActive
    || baseline.unlockType !== draft.unlockType
    || normalizeValue(baseline.unlockKey) !== normalizeValue(draft.unlockKey)
    || normalizeValue(baseline.unlockLabel) !== normalizeValue(draft.unlockLabel)
  );
}

export function BackgroundCatalogManager() {
  const [entries, setEntries] = useState<ProfileBackgroundOption[]>([]);
  const [drafts, setDrafts] = useState<Record<string, BackgroundDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [unlockFilter, setUnlockFilter] = useState<UnlockFilter>("all");

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const loaded = await loadProfileBackgroundCatalogForAdmin({ includeInactive: true });
      setEntries(loaded);
      setDrafts(() => {
        const next: Record<string, BackgroundDraft> = {};
        for (const option of loaded) {
          next[option.id] = buildDraft(option);
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load background catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      const isAdmin = entry.adminOnly === true;
      const isActive = entry.isActive !== false;
      const isGated = Boolean(entry.unlockType);

      if (visibilityFilter === "public" && isAdmin) return false;
      if (visibilityFilter === "admin" && !isAdmin) return false;
      if (activeFilter === "active" && !isActive) return false;
      if (activeFilter === "inactive" && isActive) return false;
      if (unlockFilter === "open" && isGated) return false;
      if (unlockFilter === "gated" && !isGated) return false;

      if (!q) return true;
      return (
        entry.id.toLowerCase().includes(q)
        || entry.label.toLowerCase().includes(q)
        || entry.kind.toLowerCase().includes(q)
        || (entry.unlockType || "").toLowerCase().includes(q)
        || (entry.unlockKey || "").toLowerCase().includes(q)
      );
    });
  }, [entries, search, visibilityFilter, activeFilter, unlockFilter]);

  const counts = useMemo(() => {
    const total = entries.length;
    const active = entries.filter((e) => e.isActive !== false).length;
    const adminOnly = entries.filter((e) => e.adminOnly === true).length;
    const gated = entries.filter((e) => Boolean(e.unlockType)).length;
    return { total, active, adminOnly, gated };
  }, [entries]);

  async function saveRow(entry: ProfileBackgroundOption) {
    const draft = drafts[entry.id];
    if (!draft || !isDraftDirty(entry, draft)) return;
    if (draft.unlockType !== "none" && !draft.unlockKey.trim()) {
      setError(`Unlock key is required for "${entry.label}" when unlock type is set.`);
      return;
    }

    setSavingId(entry.id);
    setError("");
    try {
      await updateProfileBackgroundCatalogEntry(entry.id, {
        adminOnly: draft.adminOnly,
        isActive: draft.isActive,
        unlockType: draft.unlockType === "none" ? null : draft.unlockType,
        unlockKey: draft.unlockType === "none" ? null : draft.unlockKey.trim() || null,
        unlockLabel: draft.unlockType === "none" ? null : draft.unlockLabel.trim() || null,
      });
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save background settings.");
    } finally {
      setSavingId(null);
    }
  }

  function resetRow(entry: ProfileBackgroundOption) {
    setDrafts((prev) => ({
      ...prev,
      [entry.id]: buildDraft(entry),
    }));
  }

  return (
    <div className="mt-4 rounded-lg border border-fab-border bg-fab-bg/40">
      <div className="border-b border-fab-border px-3 py-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold text-fab-text">Background Visibility Manager</p>
          <button
            type="button"
            onClick={loadEntries}
            disabled={loading || Boolean(savingId)}
            className="px-2 py-1 rounded text-xs border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-fab-dim">
          Total {counts.total} | Active {counts.active} | Admin-only {counts.adminOnly} | Gated {counts.gated}
        </p>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="text"
            placeholder="Search backgrounds..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-fab-surface border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
          />
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
            className="bg-fab-surface border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
          >
            <option value="all">Visibility: All</option>
            <option value="public">Visibility: Public</option>
            <option value="admin">Visibility: Admin-only</option>
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
            className="bg-fab-surface border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
          >
            <option value="all">Status: All</option>
            <option value="active">Status: Active</option>
            <option value="inactive">Status: Inactive</option>
          </select>
          <select
            value={unlockFilter}
            onChange={(e) => setUnlockFilter(e.target.value as UnlockFilter)}
            className="bg-fab-surface border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
          >
            <option value="all">Unlock: All</option>
            <option value="open">Unlock: Open</option>
            <option value="gated">Unlock: Gated</option>
          </select>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {loading && <p className="text-xs text-fab-dim">Loading background catalog...</p>}

        {!loading && (
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredEntries.map((entry) => {
              const draft = drafts[entry.id] || buildDraft(entry);
              const dirty = isDraftDirty(entry, draft);
              const rowSaving = savingId === entry.id;
              const gated = draft.unlockType !== "none";

              return (
                <div key={entry.id} className="rounded-lg border border-fab-border bg-fab-surface p-2">
                  <div className="flex items-start gap-2">
                    <img
                      src={buildOptimizedImageUrl(entry.thumbnailUrl || entry.imageUrl, 320, 50)}
                      alt=""
                      className="w-24 h-12 rounded border border-white/10 object-cover shrink-0"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-fab-text truncate">{entry.label}</p>
                      <p className="text-[10px] text-fab-dim truncate">{entry.id}</p>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-fab-bg border border-fab-border text-fab-muted">{entry.kind}</span>
                        {draft.adminOnly && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">admin-only</span>}
                        {!draft.adminOnly && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 border border-green-500/30 text-green-300">public</span>}
                        {!draft.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-300">inactive</span>}
                        {gated && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">gated</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-1 md:grid-cols-5 gap-2">
                    <label className="flex items-center gap-2 text-xs text-fab-muted">
                      <input
                        type="checkbox"
                        checked={draft.isActive}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [entry.id]: { ...draft, isActive: e.target.checked } }))}
                      />
                      Active
                    </label>
                    <label className="flex items-center gap-2 text-xs text-fab-muted">
                      <input
                        type="checkbox"
                        checked={draft.adminOnly}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [entry.id]: { ...draft, adminOnly: e.target.checked } }))}
                      />
                      Admin-only
                    </label>
                    <select
                      value={draft.unlockType}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [entry.id]: { ...draft, unlockType: e.target.value as BackgroundDraft["unlockType"] } }))}
                      className="bg-fab-bg border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                    >
                      <option value="none">Unlock: None</option>
                      <option value="achievement">Unlock: Achievement</option>
                      <option value="supporter">Unlock: Supporter</option>
                      <option value="manual">Unlock: Manual</option>
                    </select>
                    <input
                      type="text"
                      value={draft.unlockKey}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [entry.id]: { ...draft, unlockKey: e.target.value } }))}
                      placeholder={gated ? "unlock key (required)" : "unlock key"}
                      disabled={!gated}
                      className="bg-fab-bg border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={draft.unlockLabel}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [entry.id]: { ...draft, unlockLabel: e.target.value } }))}
                      placeholder="unlock label (optional)"
                      disabled={!gated}
                      className="bg-fab-bg border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold disabled:opacity-50"
                    />
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!dirty || rowSaving}
                      onClick={() => saveRow(entry)}
                      className="px-2 py-1 rounded text-xs bg-fab-gold/20 border border-fab-gold/40 text-fab-gold hover:bg-fab-gold/25 disabled:opacity-50"
                    >
                      {rowSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      disabled={!dirty || rowSaving}
                      onClick={() => resetRow(entry)}
                      className="px-2 py-1 rounded text-xs border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-50"
                    >
                      Reset
                    </button>
                    {dirty && <span className="text-[10px] text-amber-300">Unsaved changes</span>}
                  </div>
                </div>
              );
            })}
            {filteredEntries.length === 0 && (
              <p className="text-xs text-fab-dim">No backgrounds match current filters.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getStoreDirectory,
  invalidateStoreDirectoryCache,
  type StoreDirectoryEntry,
} from "@/lib/store-directory";
import {
  getStoreAliases,
  saveStoreAliases,
  invalidateStoreAliasCache,
  type StoreAliasGroup,
} from "@/lib/store-aliases";

// One editable merge group. Holds its own store-search state.
function GroupEditor({
  group,
  directory,
  nameFor,
  onChange,
  onDelete,
}: {
  group: StoreAliasGroup;
  directory: StoreDirectoryEntry[];
  nameFor: (slug: string) => string;
  onChange: (next: StoreAliasGroup) => void;
  onDelete: () => void;
}) {
  const [search, setSearch] = useState("");

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return directory
      .filter((d) => d.name.toLowerCase().includes(q) && !group.memberSlugs.includes(d.slug))
      .slice(0, 8);
  }, [search, directory, group.memberSlugs]);

  function addMember(slug: string) {
    if (group.memberSlugs.includes(slug)) return;
    const memberSlugs = [...group.memberSlugs, slug];
    onChange({
      ...group,
      memberSlugs,
      canonicalSlug: group.canonicalSlug || slug,
      // Seed the display name from the first store added.
      displayName: group.displayName || nameFor(slug),
    });
    setSearch("");
  }

  function removeMember(slug: string) {
    const memberSlugs = group.memberSlugs.filter((s) => s !== slug);
    const canonicalSlug = group.canonicalSlug === slug ? memberSlugs[0] || "" : group.canonicalSlug;
    onChange({ ...group, memberSlugs, canonicalSlug });
  }

  return (
    <div className="rounded-lg border border-fab-border bg-fab-bg/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          className="flex-1 rounded-md border border-fab-border bg-fab-bg px-3 py-1.5 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none"
          placeholder="Merged store display name"
          value={group.displayName}
          onChange={(e) => onChange({ ...group, displayName: e.target.value })}
        />
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md border border-fab-border px-2 py-1.5 text-xs text-fab-loss hover:bg-fab-loss/10"
        >
          Delete
        </button>
      </div>

      {/* Members */}
      {group.memberSlugs.length > 0 ? (
        <ul className="mb-2 space-y-1">
          {group.memberSlugs.map((slug) => (
            <li
              key={slug}
              className="flex items-center gap-2 rounded-md border border-fab-border/60 bg-fab-bg/60 px-2 py-1.5 text-sm"
            >
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-fab-dim">
                <input
                  type="radio"
                  name={`canon-${slug}-${group.memberSlugs.join("_")}`}
                  checked={group.canonicalSlug === slug}
                  onChange={() => onChange({ ...group, canonicalSlug: slug })}
                  className="accent-fab-gold"
                />
                canonical
              </label>
              <span className="min-w-0 flex-1 truncate text-fab-text">{nameFor(slug)}</span>
              <span className="truncate text-[11px] text-fab-dim">{slug}</span>
              <button
                type="button"
                onClick={() => removeMember(slug)}
                className="text-fab-dim hover:text-fab-loss"
                title="Remove from merge"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-xs text-fab-dim">Add at least two stores to merge.</p>
      )}

      {/* Add a member */}
      <input
        className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-1.5 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none"
        placeholder="Search stores to add…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {matches.length > 0 && (
        <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-fab-border/60 bg-fab-bg/60 p-1">
          {matches.map((d) => (
            <li key={d.slug}>
              <button
                type="button"
                onClick={() => addMember(d.slug)}
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm text-fab-text hover:bg-fab-gold/10"
              >
                <span className="truncate">{d.name}</span>
                <span className="shrink-0 text-[11px] text-fab-dim">
                  {d.totalMatches} matches
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StoreAliasManager() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StoreAliasGroup[]>([]);
  const [directory, setDirectory] = useState<StoreDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [g, d] = await Promise.all([
        getStoreAliases().catch(() => [] as StoreAliasGroup[]),
        getStoreDirectory().catch(() => [] as StoreDirectoryEntry[]),
      ]);
      if (cancelled) return;
      setGroups(g);
      setDirectory(d);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nameFor = useMemo(() => {
    const bySlug = new Map(directory.map((d) => [d.slug, d.name]));
    return (slug: string) => bySlug.get(slug) || slug;
  }, [directory]);

  function updateGroup(i: number, next: StoreAliasGroup) {
    setGroups((gs) => gs.map((g, idx) => (idx === i ? next : g)));
  }

  function addGroup() {
    setGroups((gs) => [
      ...gs,
      { canonicalSlug: "", displayName: "", memberSlugs: [], updatedAt: "", updatedBy: "" },
    ]);
  }

  async function handleSave() {
    if (!user) {
      toast.error("Sign in as an admin.");
      return;
    }
    // Drop empty groups before validating.
    const nonEmpty = groups.filter((g) => g.memberSlugs.length > 0);
    setSaving(true);
    try {
      await saveStoreAliases(nonEmpty, user.uid);
      invalidateStoreAliasCache();
      invalidateStoreDirectoryCache();
      toast.success("Store merges saved. Live now; the /stores directory bakes within 30 min.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save merges.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-fab-border bg-fab-surface">
      <div className="flex items-center justify-between border-b border-fab-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-fab-text">Store Merges</h2>
          <p className="mt-0.5 text-[11px] text-fab-muted">
            Combine multiple store entries that are really one store. Applies to /stores, league
            pickers, and league scoring. Different stores must stay in separate merges.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="rounded-md bg-fab-gold px-3 py-1.5 text-sm font-semibold text-fab-bg hover:bg-fab-gold-light disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save merges"}
        </button>
      </div>

      <div className="space-y-3 p-4">
        {loading ? (
          <p className="text-sm text-fab-muted">Loading…</p>
        ) : (
          <>
            {groups.length === 0 && (
              <p className="text-sm text-fab-muted">No merges yet.</p>
            )}
            {groups.map((g, i) => (
              <GroupEditor
                key={i}
                group={g}
                directory={directory}
                nameFor={nameFor}
                onChange={(next) => updateGroup(i, next)}
                onDelete={() => setGroups((gs) => gs.filter((_, idx) => idx !== i))}
              />
            ))}
            <button
              type="button"
              onClick={addGroup}
              className="rounded-md border border-dashed border-fab-border px-3 py-2 text-sm text-fab-muted hover:border-fab-gold/50 hover:text-fab-gold"
            >
              + New merge
            </button>
          </>
        )}
      </div>
    </div>
  );
}

"use client";
import { useCallback, useMemo, useState } from "react";
import type { ProfileBackgroundOption } from "@/lib/profile-backgrounds";
import { buildOptimizedImageUrl, NONE_BACKGROUND_ID, DEFAULT_BACKGROUND_ID } from "@/lib/profile-backgrounds";
import { useProfileBackgroundCatalog } from "@/hooks/useProfileBackgroundCatalog";
import { deleteProfileBackgroundFromStorage, updateProfileBackgroundCatalogEntry } from "@/lib/profile-background-catalog";

interface BackgroundChooserProps {
  selectedId?: string;
  isAdmin: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

const PAGE_SIZE = 12;

function toVisualKey(opt: ProfileBackgroundOption): string {
  return (opt.thumbnailUrl || opt.imageUrl || "").trim().toLowerCase();
}

export function BackgroundChooser({ selectedId, isAdmin, onSelect, disabled }: BackgroundChooserProps) {
  const selected = selectedId || DEFAULT_BACKGROUND_ID;
  const { options, loading, refreshCatalog } = useProfileBackgroundCatalog(isAdmin);
  const [previewMode, setPreviewMode] = useState<"fit" | "fill">("fit");
  const [searchQuery, setSearchQuery] = useState("");
  const [hideDuplicateVisuals, setHideDuplicateVisuals] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [brokenPreviewIds, setBrokenPreviewIds] = useState<Record<string, true>>({});
  const [failedThumbIds, setFailedThumbIds] = useState<Record<string, true>>({});
  const [adminActionById, setAdminActionById] = useState<Record<string, "saving" | "deleting">>({});
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [adminVisibilityFilter, setAdminVisibilityFilter] = useState<"all" | "public" | "admin">("all");
  const [adminUnlockFilter, setAdminUnlockFilter] = useState<"all" | "open" | "gated">("all");
  const [adminKindFilter, setAdminKindFilter] = useState<"all" | "key-art" | "playmat" | "hero-art">("all");

  const markPreviewBroken = useCallback((previewKey: string) => {
    setBrokenPreviewIds((prev) => (prev[previewKey] ? prev : { ...prev, [previewKey]: true }));
  }, []);

  const runAdminAction = useCallback(async (id: string, action: "saving" | "deleting", fn: () => Promise<void>) => {
    setAdminActionError(null);
    setAdminActionById((prev) => ({ ...prev, [id]: action }));
    try {
      await fn();
      await refreshCatalog();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Background action failed.";
      setAdminActionError(message);
    } finally {
      setAdminActionById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [refreshCatalog]);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return options.filter((opt) => {
      const adminOnly = opt.adminOnly === true;
      const gated = Boolean(opt.unlockType);

      if (!isAdmin && gated) return false;
      if (isAdmin) {
        if (adminVisibilityFilter === "public" && adminOnly) return false;
        if (adminVisibilityFilter === "admin" && !adminOnly) return false;
        if (adminUnlockFilter === "open" && gated) return false;
        if (adminUnlockFilter === "gated" && !gated) return false;
        if (adminKindFilter !== "all" && opt.kind !== adminKindFilter) return false;
      }

      if (!query) return true;
      return (
        opt.label.toLowerCase().includes(query)
        || opt.id.toLowerCase().includes(query)
        || opt.kind.toLowerCase().includes(query)
      );
    });
  }, [options, isAdmin, searchQuery, adminVisibilityFilter, adminUnlockFilter, adminKindFilter]);

  const dedupedOptions = useMemo(() => {
    if (!hideDuplicateVisuals) return filteredOptions;
    const seen = new Set<string>();
    return filteredOptions.filter((opt) => {
      const key = toVisualKey(opt);
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [filteredOptions, hideDuplicateVisuals]);

  const totalPages = Math.max(1, Math.ceil(dedupedOptions.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pageStart = (page - 1) * PAGE_SIZE;
  const displayedOptions = dedupedOptions.slice(pageStart, pageStart + PAGE_SIZE);
  const hiddenDuplicateCount = filteredOptions.length - dedupedOptions.length;

  return (
    <div className="space-y-2">
      <div className="mb-2 space-y-2">
        <div className={`grid gap-2 ${isAdmin ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5" : "grid-cols-1 sm:grid-cols-2"}`}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search backgrounds..."
            className={`bg-fab-surface border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold ${isAdmin ? "lg:col-span-2" : ""}`}
          />
          {isAdmin && (
            <>
              <select
                value={adminVisibilityFilter}
                onChange={(e) => {
                  setAdminVisibilityFilter(e.target.value as "all" | "public" | "admin");
                  setCurrentPage(1);
                }}
                className="bg-fab-surface border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
              >
                <option value="all">Visibility: All</option>
                <option value="public">Visibility: Public</option>
                <option value="admin">Visibility: Admin-only</option>
              </select>
              <select
                value={adminKindFilter}
                onChange={(e) => {
                  setAdminKindFilter(e.target.value as "all" | "key-art" | "playmat" | "hero-art");
                  setCurrentPage(1);
                }}
                className="bg-fab-surface border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
              >
                <option value="all">Kind: All</option>
                <option value="key-art">Kind: Key Art</option>
                <option value="playmat">Kind: Playmat</option>
                <option value="hero-art">Kind: Hero Art</option>
              </select>
              <select
                value={adminUnlockFilter}
                onChange={(e) => {
                  setAdminUnlockFilter(e.target.value as "all" | "open" | "gated");
                  setCurrentPage(1);
                }}
                className="bg-fab-surface border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
              >
                <option value="all">Unlock: All</option>
                <option value="open">Unlock: Open</option>
                <option value="gated">Unlock: Gated</option>
              </select>
            </>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[10px] text-fab-dim">
            Page {page}/{totalPages} - showing {displayedOptions.length} of {dedupedOptions.length} backgrounds
            {hiddenDuplicateCount > 0 ? ` (${hiddenDuplicateCount} duplicates hidden)` : ""}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[10px] text-fab-muted inline-flex items-center gap-1">
              <input
                type="checkbox"
                className="accent-fab-gold"
                checked={hideDuplicateVisuals}
                onChange={(e) => {
                  setHideDuplicateVisuals(e.target.checked);
                  setCurrentPage(1);
                }}
              />
              Hide duplicate visuals
            </label>
            <div className="inline-flex items-center rounded-md border border-fab-border overflow-hidden">
              <button
                type="button"
                onClick={() => setPreviewMode("fit")}
                className={`px-2 py-1 text-[10px] ${previewMode === "fit" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"}`}
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("fill")}
                className={`px-2 py-1 text-[10px] border-l border-fab-border ${previewMode === "fill" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"}`}
              >
                Fill
              </button>
            </div>
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="px-2 py-1 rounded border border-fab-border text-fab-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-fab-text"
          >
            Prev
          </button>
          <span className="text-fab-dim">Page {page} of {totalPages}</span>
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="px-2 py-1 rounded border border-fab-border text-fab-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-fab-text"
          >
            Next
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onSelect(NONE_BACKGROUND_ID)}
          disabled={disabled}
          className={`rounded-lg p-2 text-left transition-all border ${
            selected === NONE_BACKGROUND_ID
              ? "border-fab-gold ring-1 ring-fab-gold/30"
              : "border-fab-border hover:border-fab-muted"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <div className="h-20 rounded-md overflow-hidden border border-white/10 mb-1.5 relative bg-fab-bg">
            <div className="absolute inset-0 bg-gradient-to-br from-fab-bg via-fab-surface to-fab-bg" />
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-fab-gold/70" />
          </div>
          <p className="text-[10px] text-fab-muted leading-tight">No Background</p>
        </button>

        {displayedOptions.map((opt) => {
          const previewKey = `${opt.id}:${opt.thumbnailUrl || ""}:${opt.imageUrl}`;
          const isActing = Boolean(adminActionById[opt.id]);
          return (
            <div
              key={opt.id}
              className={`rounded-lg p-2 text-left transition-all border ${
                selected === opt.id
                  ? "border-fab-gold ring-1 ring-fab-gold/30"
                  : "border-fab-border hover:border-fab-muted"
              } ${disabled ? "opacity-60" : ""}`}
              title={opt.label}
            >
              <button
                type="button"
                onClick={() => onSelect(opt.id)}
                disabled={disabled || isActing}
                className={`w-full text-left ${disabled || isActing ? "cursor-not-allowed" : ""}`}
              >
                <div className="h-20 rounded-md overflow-hidden border border-white/10 mb-1.5 relative bg-fab-bg/70">
                  {!brokenPreviewIds[previewKey] && (
                    <img
                      src={buildOptimizedImageUrl(
                        failedThumbIds[previewKey]
                          ? opt.imageUrl
                          : (opt.thumbnailUrl || opt.imageUrl),
                        520,
                        52,
                      )}
                      alt=""
                      className={`absolute inset-0 w-full h-full ${previewMode === "fit" ? "object-contain" : "object-cover"}`}
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                      style={{ objectPosition: previewMode === "fit" ? "center center" : (opt.focusPosition || "center center") }}
                      onError={() => {
                        if (!failedThumbIds[previewKey] && opt.thumbnailUrl && opt.thumbnailUrl !== opt.imageUrl) {
                          setFailedThumbIds((prev) => (prev[previewKey] ? prev : { ...prev, [previewKey]: true }));
                          return;
                        }
                        markPreviewBroken(previewKey);
                      }}
                    />
                  )}
                  <div className={`absolute inset-0 ${brokenPreviewIds[previewKey] ? "bg-gradient-to-br from-fab-bg via-fab-surface to-fab-bg" : "bg-black/25"}`} />
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-fab-gold/70" />
                  {brokenPreviewIds[previewKey] && (
                    <span className="absolute bottom-1 left-1 text-[9px] text-fab-dim">Preview unavailable</span>
                  )}
                </div>
                <p className="text-[10px] text-fab-muted leading-tight">{opt.label}</p>
              </button>

              {isAdmin && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={`text-[9px] px-1 rounded border ${opt.adminOnly ? "border-amber-500/40 text-amber-300" : "border-green-500/40 text-green-300"}`}>
                      {opt.adminOnly ? "admin" : "public"}
                    </span>
                    {opt.unlockType && (
                      <span className="text-[9px] px-1 rounded border border-cyan-500/40 text-cyan-300">
                        {opt.unlockType}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      disabled={isActing || disabled}
                      onClick={() => {
                        void runAdminAction(opt.id, "saving", async () => {
                          await updateProfileBackgroundCatalogEntry(opt.id, { adminOnly: !opt.adminOnly });
                        });
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {adminActionById[opt.id] === "saving" ? "Saving..." : (opt.adminOnly ? "Make Public" : "Admin Only")}
                    </button>
                    <button
                      type="button"
                      disabled={isActing || disabled}
                      onClick={() => {
                        if (!window.confirm(`Delete \"${opt.label}\" from Firebase Storage and hide it from chooser?`)) return;
                        void runAdminAction(opt.id, "deleting", async () => {
                          await deleteProfileBackgroundFromStorage(opt);
                          if (selected === opt.id) {
                            onSelect(NONE_BACKGROUND_ID);
                          }
                        });
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-rose-500/40 text-rose-300 hover:text-rose-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {adminActionById[opt.id] === "deleting" ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="pt-1 flex items-center justify-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            disabled={page <= 1}
            className="px-2 py-1 rounded border border-fab-border text-fab-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-fab-text"
          >
            First
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="px-2 py-1 rounded border border-fab-border text-fab-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-fab-text"
          >
            Prev
          </button>
          <span className="text-fab-dim px-1">Page {page}/{totalPages}</span>
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="px-2 py-1 rounded border border-fab-border text-fab-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-fab-text"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(totalPages)}
            disabled={page >= totalPages}
            className="px-2 py-1 rounded border border-fab-border text-fab-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-fab-text"
          >
            Last
          </button>
        </div>
      )}

      {isAdmin && dedupedOptions.length === 0 && (
        <p className="mt-2 text-[10px] text-fab-dim">No backgrounds match current filters.</p>
      )}
      {isAdmin && adminActionError && (
        <p className="mt-1 text-[11px] text-rose-300">{adminActionError}</p>
      )}
      {loading && <p className="mt-2 text-[10px] text-fab-dim">Loading background catalog...</p>}
    </div>
  );
}

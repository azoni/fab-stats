"use client";
import { useCallback, useMemo, useState } from "react";
import { useProfileBackgroundCatalog } from "@/hooks/useProfileBackgroundCatalog";
import { buildOptimizedImageUrl, NONE_BACKGROUND_ID, DEFAULT_BACKGROUND_ID } from "@/lib/profile-backgrounds";

interface BackgroundChooserProps {
  selectedId?: string;
  isAdmin: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

const COLLAPSED_VISIBLE_COUNT = 6;
const EXPANDED_PAGE_SIZE = 12;

export function BackgroundChooser({ selectedId, isAdmin, onSelect, disabled }: BackgroundChooserProps) {
  const selected = selectedId || DEFAULT_BACKGROUND_ID;
  const { options, loading } = useProfileBackgroundCatalog(isAdmin);
  const [expanded, setExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(EXPANDED_PAGE_SIZE);
  const [previewMode, setPreviewMode] = useState<"fit" | "fill">("fit");
  const [searchQuery, setSearchQuery] = useState("");
  const [brokenPreviewIds, setBrokenPreviewIds] = useState<Record<string, true>>({});
  const [adminVisibilityFilter, setAdminVisibilityFilter] = useState<"all" | "public" | "admin">("all");
  const [adminUnlockFilter, setAdminUnlockFilter] = useState<"all" | "open" | "gated">("all");
  const [adminKindFilter, setAdminKindFilter] = useState<"all" | "key-art" | "playmat" | "hero-art">("all");

  const markPreviewBroken = useCallback((id: string) => {
    setBrokenPreviewIds((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }, []);

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

  const displayedOptions = useMemo(() => {
    if (!expanded) return filteredOptions.slice(0, COLLAPSED_VISIBLE_COUNT);
    return filteredOptions.slice(0, visibleCount);
  }, [filteredOptions, expanded, visibleCount]);

  const canLoadMore = expanded && visibleCount < filteredOptions.length;

  return (
    <div>
      <div className="mb-2 space-y-2">
        <div className={`grid gap-2 ${isAdmin ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5" : "grid-cols-1 sm:grid-cols-2"}`}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(EXPANDED_PAGE_SIZE);
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
                  setVisibleCount(EXPANDED_PAGE_SIZE);
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
                  setVisibleCount(EXPANDED_PAGE_SIZE);
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
                  setVisibleCount(EXPANDED_PAGE_SIZE);
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
            Showing {displayedOptions.length} of {filteredOptions.length} backgrounds
          </p>
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

        {displayedOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            disabled={disabled}
            className={`rounded-lg p-2 text-left transition-all border ${
              selected === opt.id
                ? "border-fab-gold ring-1 ring-fab-gold/30"
                : "border-fab-border hover:border-fab-muted"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            title={opt.label}
          >
            <div className="h-20 rounded-md overflow-hidden border border-white/10 mb-1.5 relative bg-fab-bg/70">
              {!brokenPreviewIds[opt.id] && (
                <img
                  src={buildOptimizedImageUrl(opt.thumbnailUrl || opt.imageUrl, 520, 52)}
                  alt=""
                  className={`absolute inset-0 w-full h-full ${previewMode === "fit" ? "object-contain" : "object-cover"}`}
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                  style={previewMode === "fit" ? { objectPosition: "center center" } : undefined}
                  onError={() => markPreviewBroken(opt.id)}
                />
              )}
              <div className={`absolute inset-0 ${brokenPreviewIds[opt.id] ? "bg-gradient-to-br from-fab-bg via-fab-surface to-fab-bg" : "bg-black/25"}`} />
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-fab-gold/70" />
              {brokenPreviewIds[opt.id] && (
                <span className="absolute bottom-1 left-1 text-[9px] text-fab-dim">Preview unavailable</span>
              )}
            </div>
            <p className="text-[10px] text-fab-muted leading-tight">{opt.label}</p>
            {isAdmin && (
              <div className="mt-1 flex items-center gap-1 flex-wrap">
                <span className={`text-[9px] px-1 rounded border ${opt.adminOnly ? "border-amber-500/40 text-amber-300" : "border-green-500/40 text-green-300"}`}>
                  {opt.adminOnly ? "admin" : "public"}
                </span>
                {opt.unlockType && (
                  <span className="text-[9px] px-1 rounded border border-cyan-500/40 text-cyan-300">
                    {opt.unlockType}
                  </span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-3 flex-wrap">
        {!expanded && filteredOptions.length > COLLAPSED_VISIBLE_COUNT && (
          <button
            type="button"
            onClick={() => {
              setExpanded(true);
              setVisibleCount(EXPANDED_PAGE_SIZE);
            }}
            className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors font-medium"
          >
            Show all {filteredOptions.length + 1} backgrounds
          </button>
        )}
        {canLoadMore && (
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + EXPANDED_PAGE_SIZE)}
            className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors font-medium"
          >
            Load more ({Math.min(EXPANDED_PAGE_SIZE, filteredOptions.length - visibleCount)})
          </button>
        )}
        {expanded && (
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              setVisibleCount(EXPANDED_PAGE_SIZE);
            }}
            className="text-xs text-fab-muted hover:text-fab-text transition-colors font-medium"
          >
            Show less
          </button>
        )}
      </div>

      {isAdmin && filteredOptions.length === 0 && (
        <p className="mt-2 text-[10px] text-fab-dim">No backgrounds match current filters.</p>
      )}
      {loading && <p className="mt-2 text-[10px] text-fab-dim">Loading background catalog...</p>}
    </div>
  );
}

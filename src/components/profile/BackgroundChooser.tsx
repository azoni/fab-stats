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

export function BackgroundChooser({ selectedId, isAdmin, onSelect, disabled }: BackgroundChooserProps) {
  const selected = selectedId || DEFAULT_BACKGROUND_ID;
  const { options, loading } = useProfileBackgroundCatalog(isAdmin);
  const [expanded, setExpanded] = useState(false);
  const [brokenPreviewIds, setBrokenPreviewIds] = useState<Record<string, true>>({});
  const [adminVisibilityFilter, setAdminVisibilityFilter] = useState<"all" | "public" | "admin">("all");
  const [adminUnlockFilter, setAdminUnlockFilter] = useState<"all" | "open" | "gated">("all");
  const [adminKindFilter, setAdminKindFilter] = useState<"all" | "key-art" | "playmat" | "hero-art">("all");

  const markPreviewBroken = useCallback((id: string) => {
    setBrokenPreviewIds((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }, []);

  const filteredOptions = useMemo(() => {
    if (!isAdmin) return options;
    return options.filter((opt) => {
      const adminOnly = opt.adminOnly === true;
      const gated = Boolean(opt.unlockType);
      if (adminVisibilityFilter === "public" && adminOnly) return false;
      if (adminVisibilityFilter === "admin" && !adminOnly) return false;
      if (adminUnlockFilter === "open" && gated) return false;
      if (adminUnlockFilter === "gated" && !gated) return false;
      if (adminKindFilter !== "all" && opt.kind !== adminKindFilter) return false;
      return true;
    });
  }, [options, isAdmin, adminVisibilityFilter, adminUnlockFilter, adminKindFilter]);

  return (
    <div>
      {isAdmin && (
        <div className="mb-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            value={adminVisibilityFilter}
            onChange={(e) => setAdminVisibilityFilter(e.target.value as "all" | "public" | "admin")}
            className="bg-fab-surface border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
          >
            <option value="all">Visibility: All</option>
            <option value="public">Visibility: Public</option>
            <option value="admin">Visibility: Admin-only</option>
          </select>
          <select
            value={adminKindFilter}
            onChange={(e) => setAdminKindFilter(e.target.value as "all" | "key-art" | "playmat" | "hero-art")}
            className="bg-fab-surface border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
          >
            <option value="all">Kind: All</option>
            <option value="key-art">Kind: Key Art</option>
            <option value="playmat">Kind: Playmat</option>
            <option value="hero-art">Kind: Hero Art</option>
          </select>
          <select
            value={adminUnlockFilter}
            onChange={(e) => setAdminUnlockFilter(e.target.value as "all" | "open" | "gated")}
            className="bg-fab-surface border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
          >
            <option value="all">Unlock: All</option>
            <option value="open">Unlock: Open</option>
            <option value="gated">Unlock: Gated</option>
          </select>
        </div>
      )}
      <div className={`${expanded ? "" : "max-h-[240px]"} overflow-y-auto`}>
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
            <div className="h-14 rounded-md overflow-hidden border border-white/10 mb-1.5 relative bg-fab-bg">
              <div className="absolute inset-0 bg-gradient-to-br from-fab-bg via-fab-surface to-fab-bg" />
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-fab-gold/70" />
            </div>
            <p className="text-[10px] text-fab-muted leading-tight">No Background</p>
          </button>

          {filteredOptions.map((opt) => (
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
              <div className="h-14 rounded-md overflow-hidden border border-white/10 mb-1.5 relative">
                {!brokenPreviewIds[opt.id] && (
                  <img
                    src={buildOptimizedImageUrl(opt.thumbnailUrl || opt.imageUrl, 320, 46)}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    crossOrigin="anonymous"
                    onError={() => markPreviewBroken(opt.id)}
                  />
                )}
                <div className={`absolute inset-0 ${brokenPreviewIds[opt.id] ? "bg-gradient-to-br from-fab-bg via-fab-surface to-fab-bg" : "bg-black/35"}`} />
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
      </div>
      {filteredOptions.length > 4 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors font-medium mt-2"
        >
          {expanded ? "Show less" : `Show all ${filteredOptions.length + 1} backgrounds`}
        </button>
      )}
      {isAdmin && filteredOptions.length === 0 && (
        <p className="mt-2 text-[10px] text-fab-dim">No backgrounds match current admin filters.</p>
      )}
      {loading && <p className="mt-2 text-[10px] text-fab-dim">Loading background catalog...</p>}
    </div>
  );
}

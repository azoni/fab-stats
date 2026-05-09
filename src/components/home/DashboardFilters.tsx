"use client";

import { TIER_LABELS } from "@/lib/events";

interface DashboardFiltersProps {
  formats: string[];
  eventTypes: string[];
  heroes: string[];
  filterFormat: string;
  filterEventType: string;
  filterTier: string;
  filterHero: string;
  onFormatChange: (v: string) => void;
  onEventTypeChange: (v: string) => void;
  onTierChange: (v: string) => void;
  onHeroChange: (v: string) => void;
  onReset?: () => void;
  showHeader?: boolean;
}

const selectClass = "bg-fab-bg/70 border border-fab-border rounded-lg px-3 py-2.5 text-sm text-fab-text outline-none focus:border-fab-gold/50 transition-colors w-full";

export function DashboardFilters({
  formats,
  eventTypes,
  heroes,
  filterFormat,
  filterEventType,
  filterTier,
  filterHero,
  onFormatChange,
  onEventTypeChange,
  onTierChange,
  onHeroChange,
  onReset,
  showHeader = false,
}: DashboardFiltersProps) {
  const activeCount = [filterFormat, filterEventType, filterTier, filterHero].filter((value) => value !== "all").length;

  if (!showHeader) {
    return (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <select
          value={filterTier}
          onChange={(e) => onTierChange(e.target.value)}
          className={selectClass}
        >
          <option value="all">All Tiers</option>
          {[4, 3, 2, 1].map((t) => (
            <option key={t} value={String(t)}>{TIER_LABELS[t]}</option>
          ))}
          <option disabled>------</option>
          <option value="rated">Rated Only</option>
          <option value="unrated">Unrated Only</option>
        </select>

        <select
          value={filterFormat}
          onChange={(e) => onFormatChange(e.target.value)}
          className={selectClass}
        >
          <option value="all">All Formats</option>
          {formats.map((f) => (
            <option key={f} value={f}>{f === "Classic Constructed" ? "CC" : f}</option>
          ))}
        </select>

        <select
          value={filterEventType}
          onChange={(e) => onEventTypeChange(e.target.value)}
          className={selectClass}
        >
          <option value="all">All Events</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={filterHero}
          onChange={(e) => onHeroChange(e.target.value)}
          className={selectClass}
        >
          <option value="all">All Heroes</option>
          {heroes.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-fab-border/80 bg-fab-surface/85 p-3 shadow-[0_14px_38px_rgba(0,0,0,0.16)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-fab-gold">View controls</p>
          <p className="mt-0.5 text-xs text-fab-muted">
            {activeCount > 0 ? `${activeCount} filter${activeCount === 1 ? "" : "s"} active across the overview below.` : "Showing your full record."}
          </p>
        </div>
        {activeCount > 0 && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center rounded-lg border border-fab-border bg-fab-bg/70 px-3 py-2 text-xs font-bold text-fab-muted transition-colors hover:border-fab-gold/40 hover:text-fab-gold"
          >
            Reset filters
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">Tier</span>
          <select
            value={filterTier}
            onChange={(e) => onTierChange(e.target.value)}
            className={selectClass}
          >
            <option value="all">All Tiers</option>
            {[4, 3, 2, 1].map((t) => (
              <option key={t} value={String(t)}>{TIER_LABELS[t]}</option>
            ))}
            <option disabled>------</option>
            <option value="rated">Rated Only</option>
            <option value="unrated">Unrated Only</option>
          </select>
        </label>

        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">Format</span>
          <select
            value={filterFormat}
            onChange={(e) => onFormatChange(e.target.value)}
            className={selectClass}
          >
            <option value="all">All Formats</option>
            {formats.map((f) => (
              <option key={f} value={f}>{f === "Classic Constructed" ? "CC" : f}</option>
            ))}
          </select>
        </label>

        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">Event</span>
          <select
            value={filterEventType}
            onChange={(e) => onEventTypeChange(e.target.value)}
            className={selectClass}
          >
            <option value="all">All Events</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">Hero</span>
          <select
            value={filterHero}
            onChange={(e) => onHeroChange(e.target.value)}
            className={selectClass}
          >
            <option value="all">All Heroes</option>
            {heroes.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

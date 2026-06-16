"use client";

import { TIER_LABELS } from "@/lib/events";

interface DashboardFiltersProps {
  formats: string[];
  eventTypes: string[];
  heroes: string[];
  /** Optional venue list. When provided (and non-empty), a Venue select is shown. */
  venues?: string[];
  filterFormat: string;
  filterEventType: string;
  filterTier: string;
  filterHero: string;
  filterVenue?: string;
  onFormatChange: (v: string) => void;
  onEventTypeChange: (v: string) => void;
  onTierChange: (v: string) => void;
  onHeroChange: (v: string) => void;
  onVenueChange?: (v: string) => void;
  onReset?: () => void;
  showHeader?: boolean;
}

const selectClass = "bg-fab-bg/70 border border-fab-border rounded-lg px-3 py-2.5 text-sm text-fab-text outline-none focus:border-fab-gold/50 transition-colors w-full";

export function DashboardFilters({
  formats,
  eventTypes,
  heroes,
  venues,
  filterFormat,
  filterEventType,
  filterTier,
  filterHero,
  filterVenue = "all",
  onFormatChange,
  onEventTypeChange,
  onTierChange,
  onHeroChange,
  onVenueChange,
  onReset,
  showHeader = false,
}: DashboardFiltersProps) {
  const hasVenue = !!venues && venues.length > 0 && !!onVenueChange;
  const activeCount = [filterFormat, filterEventType, filterTier, filterHero, ...(hasVenue ? [filterVenue] : [])].filter((value) => value !== "all").length;
  // Grid grows to 5 columns when the venue select is present.
  const compactCols = hasVenue ? "md:grid-cols-5" : "md:grid-cols-4";
  const headerCols = activeCount > 0 && onReset
    ? (hasVenue ? "md:grid-cols-[repeat(5,minmax(0,1fr))_auto]" : "md:grid-cols-[repeat(4,minmax(0,1fr))_auto]")
    : (hasVenue ? "md:grid-cols-5" : "md:grid-cols-4");

  const venueSelect = (withLabel: boolean) => {
    if (!hasVenue) return null;
    const select = (
      <select value={filterVenue} onChange={(e) => onVenueChange!(e.target.value)} className={selectClass}>
        <option value="all">All Venues</option>
        {venues!.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
    );
    if (!withLabel) return select;
    return (
      <label className="min-w-0">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">Venue</span>
        {select}
      </label>
    );
  };

  if (!showHeader) {
    return (
      <div className={`grid grid-cols-2 gap-2 ${compactCols}`}>
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

        {venueSelect(false)}
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-fab-border/80 bg-fab-surface/80 p-3 shadow-[0_14px_38px_rgba(0,0,0,0.14)]">
      <div className={`grid grid-cols-2 gap-2 ${headerCols}`}>
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

        {venueSelect(true)}

        {activeCount > 0 && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="col-span-2 inline-flex min-h-[42px] items-center justify-center self-end rounded-lg border border-fab-border bg-fab-bg/70 px-3 py-2 text-xs font-bold text-fab-muted transition-colors hover:border-fab-gold/40 hover:text-fab-gold md:col-span-1"
          >
            Reset filters
          </button>
        )}
      </div>
    </section>
  );
}

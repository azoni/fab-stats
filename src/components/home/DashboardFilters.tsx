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
}

const selectClass = "bg-fab-surface border border-fab-border rounded-lg px-3 py-2.5 text-sm text-fab-text outline-none focus:border-fab-gold/40 transition-colors w-full";

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
}: DashboardFiltersProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {/* Tier */}
      <select
        value={filterTier}
        onChange={(e) => onTierChange(e.target.value)}
        className={selectClass}
      >
        <option value="all">All Tiers</option>
        {[4, 3, 2, 1].map((t) => (
          <option key={t} value={String(t)}>{TIER_LABELS[t]}</option>
        ))}
      </select>

      {/* Format */}
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

      {/* Event Type */}
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

      {/* Hero */}
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

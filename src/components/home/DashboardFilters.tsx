"use client";

interface DashboardFiltersProps {
  formats: string[];
  eventTypes: string[];
  heroes: string[];
  filterFormat: string;
  filterEventType: string;
  filterHero: string;
  filterRated: string;
  onFormatChange: (v: string) => void;
  onEventTypeChange: (v: string) => void;
  onHeroChange: (v: string) => void;
  onRatedChange: (v: string) => void;
}

const selectClass = "bg-fab-surface border border-fab-border rounded-md px-3 py-2 text-sm text-fab-text outline-none focus:border-fab-gold/40 transition-colors min-w-0";

export function DashboardFilters({
  formats,
  eventTypes,
  heroes,
  filterFormat,
  filterEventType,
  filterHero,
  filterRated,
  onFormatChange,
  onEventTypeChange,
  onHeroChange,
  onRatedChange,
}: DashboardFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Format */}
      {formats.length > 1 && (
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
      )}

      {/* Event Type */}
      {eventTypes.length > 1 && (
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
      )}

      {/* Hero */}
      {heroes.length > 1 && (
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
      )}

      {/* Rated */}
      <select
        value={filterRated}
        onChange={(e) => onRatedChange(e.target.value)}
        className={selectClass}
      >
        <option value="all">All Matches</option>
        <option value="rated">Rated</option>
        <option value="unrated">Unrated</option>
      </select>
    </div>
  );
}

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

function PillGroup({
  options,
  value,
  onChange,
  allLabel = "All",
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  allLabel?: string;
}) {
  return (
    <div className="flex gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border overflow-x-auto scrollbar-hide">
      <button
        onClick={() => onChange("all")}
        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
          value === "all" ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
        }`}
      >
        {allLabel}
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
            value === opt.value ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

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
  const hasAnyOptions = formats.length > 1 || eventTypes.length > 1 || heroes.length > 1;
  if (!hasAnyOptions) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Format pills */}
      {formats.length > 1 && (
        <PillGroup
          options={formats.map((f) => ({
            value: f,
            label: f === "Classic Constructed" ? "CC" : f,
          }))}
          value={filterFormat}
          onChange={onFormatChange}
        />
      )}

      {/* Event type pills */}
      {eventTypes.length > 1 && (
        <PillGroup
          options={eventTypes.map((t) => ({ value: t, label: t }))}
          value={filterEventType}
          onChange={onEventTypeChange}
        />
      )}

      {/* Hero dropdown */}
      {heroes.length > 1 && (
        <select
          value={filterHero}
          onChange={(e) => onHeroChange(e.target.value)}
          className="bg-fab-surface border border-fab-border rounded-md px-2.5 py-1 text-[11px] text-fab-text outline-none"
        >
          <option value="all">All Heroes</option>
          {heroes.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      )}

      {/* Rated toggle */}
      <PillGroup
        options={[
          { value: "rated", label: "Rated" },
          { value: "unrated", label: "Unrated" },
        ]}
        value={filterRated}
        onChange={onRatedChange}
      />
    </div>
  );
}

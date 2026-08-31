"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Archive, ExternalLink, Search } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { useHistoricalEvents } from "@/hooks/useHistoricalEvents";
import { getHeroPortraitUrl } from "@/lib/heroes";
import type { HistoricalEvent, HistoricalPlacement } from "@/types";

function HeroThumb({ hero }: { hero: string }) {
  const url = getHeroPortraitUrl(hero);
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={hero}
      className="h-7 w-7 shrink-0 rounded-full border border-fab-border object-cover"
      loading="lazy"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

function PlacementRow({ p }: { p: HistoricalPlacement }) {
  const name = p.fabstatsUsername ? (
    <Link href={`/player/${p.fabstatsUsername}`} className="truncate font-medium text-fab-gold hover:underline">
      {p.name}
    </Link>
  ) : (
    <span className="truncate font-medium text-fab-text">{p.name}</span>
  );
  return (
    <div className="flex items-center gap-2.5 rounded-md bg-white/[0.03] px-2.5 py-1.5">
      <span className="w-8 shrink-0 text-xs font-bold text-fab-dim">{p.placement}</span>
      <HeroThumb hero={p.hero} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm">{name}</div>
        <p className="truncate text-xs text-fab-muted">{p.hero}</p>
      </div>
      {p.decklistUrl && (
        <a
          href={p.decklistUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md border border-fab-border px-2 py-1 text-[11px] font-semibold text-fab-muted transition-colors hover:border-fab-gold/50 hover:text-fab-gold"
          title="Official decklist"
        >
          Decklist <ExternalLink className="ml-0.5 inline h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function EventCard({ ev }: { ev: HistoricalEvent }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? ev.top8 : ev.top8.slice(0, 4);
  return (
    <div className="rounded-lg border border-fab-border bg-fab-surface/95 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-bold text-fab-text">{ev.name}</h2>
        <div className="flex items-center gap-2 text-[11px] text-fab-dim">
          <span>{ev.date}</span>
          {ev.format && <span className="rounded bg-fab-bg px-1.5 py-0.5">{ev.format}</span>}
          {ev.eventType && <span className="rounded bg-fab-bg px-1.5 py-0.5">{ev.eventType}</span>}
        </div>
      </div>
      <div className="space-y-1.5">
        {shown.map((p, i) => (
          <PlacementRow key={`${p.placement}-${p.name}-${i}`} p={p} />
        ))}
      </div>
      {ev.top8.length > 4 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs font-semibold text-fab-muted transition-colors hover:text-fab-gold"
        >
          {expanded ? "Show less" : `Show all ${ev.top8.length} placements`}
        </button>
      )}
    </div>
  );
}

const PAGE_SIZE = 20;

export default function ArchivePage() {
  const { events, loading } = useHistoricalEvents();
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("all");
  const [format, setFormat] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const eventTypes = useMemo(
    () => [...new Set(events.map((e) => e.eventType).filter(Boolean))].sort(),
    [events],
  );
  const formats = useMemo(
    () => [...new Set(events.map((e) => e.format).filter(Boolean))].sort(),
    [events],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (eventType !== "all" && e.eventType !== eventType) return false;
      if (format !== "all" && e.format !== format) return false;
      if (
        q &&
        !e.name.toLowerCase().includes(q) &&
        !e.top8.some((p) => p.name.toLowerCase().includes(q) || p.hero.toLowerCase().includes(q))
      )
        return false;
      return true;
    });
  }, [events, search, eventType, format]);

  const visible = filtered.slice(0, limit);

  const selectClass =
    "rounded-md border border-fab-border bg-fab-surface px-2.5 py-1.5 text-xs text-fab-text [color-scheme:dark]";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHero
        eyebrow="Coverage"
        title="Event Archive"
        description="Top 8 results compiled from official major-event coverage — players, heroes, and decklists."
        icon={<Archive className="h-4 w-4" />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fab-dim" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, players, heroes…"
            className="w-full rounded-md border border-fab-border bg-fab-surface py-1.5 pl-8 pr-3 text-xs text-fab-text placeholder:text-fab-dim focus:border-fab-gold/50 focus:outline-none"
          />
        </div>
        <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={selectClass}>
          <option value="all" className="bg-fab-surface text-fab-text">All event types</option>
          {eventTypes.map((t) => (
            <option key={t} value={t} className="bg-fab-surface text-fab-text">{t}</option>
          ))}
        </select>
        <select value={format} onChange={(e) => setFormat(e.target.value)} className={selectClass}>
          <option value="all" className="bg-fab-surface text-fab-text">All formats</option>
          {formats.map((f) => (
            <option key={f} value={f} className="bg-fab-surface text-fab-text">{f}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-fab-dim">Loading archive…</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-fab-dim">
          {events.length === 0
            ? "No archived events yet — coverage is compiled from fabtcg.com as majors happen."
            : "No events match those filters."}
        </p>
      ) : (
        <>
          <p className="text-xs text-fab-dim">
            {filtered.length} event{filtered.length === 1 ? "" : "s"}
          </p>
          <div className="space-y-3">
            {visible.map((ev) => (
              <EventCard key={`${ev.name}-${ev.date}`} ev={ev} />
            ))}
          </div>
          {filtered.length > limit && (
            <div className="text-center">
              <button
                onClick={() => setLimit((v) => v + PAGE_SIZE)}
                className="rounded-md border border-fab-border bg-fab-surface px-4 py-2 text-xs font-semibold text-fab-muted transition-colors hover:border-fab-gold/50 hover:text-fab-gold"
              >
                Show more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

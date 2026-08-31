"use client";

/**
 * Month grid of played days for the games hub. Dates come from the union of
 * the server gameActivity doc and this browser's localStorage, so the calendar
 * survives device switches once the user is signed in.
 */
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTodayDateStr } from "@/lib/games/streak";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function StreakCalendar({ playedDates }: { playedDates: Set<string> }) {
  const today = getTodayDateStr();
  const [ty, tm] = today.split("-").map(Number);
  const [view, setView] = useState<{ year: number; month: number }>({ year: ty, month: tm - 1 });

  const first = new Date(Date.UTC(view.year, view.month, 1));
  const firstWeekday = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
  const isCurrentMonth = view.year === ty && view.month === tm - 1;

  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }),
  ];

  const playedThisMonth = cells.filter((c) => c && playedDates.has(c)).length;

  return (
    <div className="rounded-xl border border-fab-border/80 bg-fab-surface/85 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-fab-text">Play calendar</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }))}
            className="rounded p-1 text-fab-muted transition-colors hover:text-fab-gold"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[8.5rem] text-center text-xs font-semibold text-fab-muted">
            {monthLabel(view.year, view.month)}
          </span>
          <button
            onClick={() => setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }))}
            disabled={isCurrentMonth}
            className="rounded p-1 text-fab-muted transition-colors hover:text-fab-gold disabled:opacity-30"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-[10px] font-bold text-fab-dim">
            {w}
          </span>
        ))}
        {cells.map((date, i) =>
          date === null ? (
            <span key={`pad-${i}`} />
          ) : (
            <span
              key={date}
              title={date}
              className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] ${
                playedDates.has(date)
                  ? "bg-fab-gold/20 font-bold text-fab-gold"
                  : date === today
                    ? "border border-fab-gold/40 text-fab-text"
                    : date > today
                      ? "text-fab-dim/40"
                      : "text-fab-dim"
              }`}
            >
              {Number(date.slice(8))}
            </span>
          ),
        )}
      </div>
      <p className="mt-2 text-right text-[10px] text-fab-dim">
        {playedThisMonth} day{playedThisMonth === 1 ? "" : "s"} played this month
      </p>
    </div>
  );
}

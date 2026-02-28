"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import { MatchResult, type MatchRecord } from "@/types";
import { localDate } from "@/lib/constants";
import { CARD_THEMES } from "@/components/opponents/RivalryCard";
import { OnThisDayCard, type OnThisDayData } from "./OnThisDayCard";


interface OnThisDayProps {
  matches: MatchRecord[];
}

interface YearMemory {
  year: number;
  matches: MatchRecord[];
  wins: number;
  losses: number;
  draws: number;
  heroes: string[];
  events: string[];
}

export function OnThisDay({ matches }: OnThisDayProps) {
  const [overrideDate, setOverrideDate] = useState<string | undefined>();
  const [overrideYear, setOverrideYear] = useState<number | undefined>();
  const [showShareModal, setShowShareModal] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const otd = params.get("otd");
    const otdYear = params.get("otdYear");
    if (otd) setOverrideDate(otd);
    if (otdYear) setOverrideYear(Number(otdYear));
  }, []);

  const memories = useMemo(() => {
    const today = new Date();
    let todayMonth = today.getMonth();
    let todayDate = today.getDate();
    const thisYear = overrideYear || today.getFullYear();

    if (overrideDate) {
      const [mm, dd] = overrideDate.split("-").map(Number);
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        todayMonth = mm - 1;
        todayDate = dd;
      }
    }

    const onThisDay = matches.filter((m) => {
      const d = localDate(m.date);
      return d.getMonth() === todayMonth && d.getDate() === todayDate && d.getFullYear() < thisYear;
    });

    if (onThisDay.length === 0) return [];

    const byYear = new Map<number, MatchRecord[]>();
    for (const m of onThisDay) {
      const year = localDate(m.date).getFullYear();
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year)!.push(m);
    }

    const result: YearMemory[] = [];
    for (const [year, yearMatches] of byYear) {
      const wins = yearMatches.filter((m) => m.result === MatchResult.Win).length;
      const losses = yearMatches.filter((m) => m.result === MatchResult.Loss).length;
      const draws = yearMatches.filter((m) => m.result === MatchResult.Draw).length;
      const heroes = [...new Set(yearMatches.map((m) => m.heroPlayed).filter((h) => h && h !== "Unknown"))];
      const events = [...new Set(yearMatches.map((m) => m.notes?.split(" | ")[0]).filter(Boolean))] as string[];

      result.push({ year, matches: yearMatches, wins, losses, draws, heroes, events });
    }

    return result.sort((a, b) => b.year - a.year);
  }, [matches, overrideDate, overrideYear]);

  if (memories.length === 0) return null;

  const today = new Date();
  const displayDate = overrideDate
    ? new Date(today.getFullYear(), ...overrideDate.split("-").map(Number).map((n, i) => i === 0 ? n - 1 : n) as [number, number])
    : today;
  const dateLabel = displayDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const thisYear = overrideYear || today.getFullYear();

  const totalMatches = memories.reduce((s, m) => s + m.matches.length, 0);

  const cardData: OnThisDayData = {
    dateLabel,
    memories: memories.map((mem) => ({
      year: mem.year,
      yearsAgo: thisYear - mem.year,
      wins: mem.wins,
      losses: mem.losses,
      draws: mem.draws,
      heroes: mem.heroes,
      events: mem.events,
      matches: mem.matches.map((m) => ({
        opponentName: m.opponentName,
        opponentHero: m.opponentHero,
        result: m.result,
        format: m.format,
        notes: m.notes,
      })),
    })),
  };

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
      {/* Header — clickable to collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2"
      >
        <svg className="w-5 h-5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <h3 className="text-sm font-semibold text-fab-text">On This Day</h3>
        <span className="text-xs text-fab-dim">{dateLabel}</span>
        {collapsed && (
          <span className="text-[10px] text-fab-muted">{memories.length} {memories.length === 1 ? "year" : "years"}, {totalMatches} {totalMatches === 1 ? "match" : "matches"}</span>
        )}
        <svg className={`w-4 h-4 text-fab-dim ml-auto shrink-0 transition-transform ${collapsed ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {!collapsed && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {memories.map((mem) => {
              const yearsAgo = thisYear - mem.year;
              const record = `${mem.wins}W-${mem.losses}L${mem.draws > 0 ? `-${mem.draws}D` : ""}`;
              const wasGoodDay = mem.wins > mem.losses;
              const wasUndefeated = mem.losses === 0 && mem.wins > 0;

              return (
                <div key={mem.year} className="bg-fab-bg border border-fab-border rounded-lg p-3">
                  {/* Year badge + record */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-fab-gold bg-fab-gold/10 px-2 py-0.5 rounded-full">
                      {yearsAgo}y ago
                    </span>
                    <span className={`text-sm font-bold ${wasUndefeated ? "text-fab-gold" : wasGoodDay ? "text-fab-win" : "text-fab-loss"}`}>
                      {record}
                    </span>
                    {wasUndefeated && mem.wins >= 3 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-fab-gold/15 text-fab-gold font-semibold">
                        Undefeated
                      </span>
                    )}
                  </div>

                  {/* Event name */}
                  {mem.events.length > 0 && (
                    <p className="text-[11px] text-fab-muted mb-1.5 truncate">
                      {mem.events.join(" / ")}
                    </p>
                  )}

                  {/* Match details */}
                  <div className="space-y-0.5">
                    {mem.matches.map((m, i) => {
                      const resultBg = m.result === MatchResult.Win
                        ? "bg-fab-win"
                        : m.result === MatchResult.Loss
                          ? "bg-fab-loss"
                          : "bg-fab-draw";
                      const resultLabel = m.result === MatchResult.Win ? "W" : m.result === MatchResult.Loss ? "L" : "D";
                      const round = m.notes?.match(/Round (\d+)/)?.[1];

                      return (
                        <div key={m.id || i} className="flex items-center gap-1.5 text-[11px]">
                          <span className={`w-3.5 h-3.5 rounded-full ${resultBg} flex items-center justify-center text-[8px] font-bold text-white shrink-0`}>
                            {resultLabel}
                          </span>
                          <span className="text-fab-text font-medium truncate">
                            vs {m.opponentName || "Unknown"}
                          </span>
                          {m.opponentHero && m.opponentHero !== "Unknown" && (
                            <span className="text-fab-dim truncate hidden sm:inline">
                              ({m.opponentHero})
                            </span>
                          )}
                          <span className="ml-auto shrink-0 text-fab-dim">
                            {round ? `R${round}` : m.format}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Share button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share This Memory
          </button>
        </>
      )}

      {showShareModal && (
        <OnThisDayShareModal
          data={cardData}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

function OnThisDayShareModal({
  data,
  onClose,
}: {
  data: OnThisDayData;
  onClose: () => void;
}) {
  const [selectedTheme, setSelectedTheme] = useState(CARD_THEMES[0]);
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "copied">("idle");
  const cardRef = useRef<HTMLDivElement>(null);

  async function handleCopy() {
    setShareStatus("sharing");
    try {
      const { toBlob } = await import("html-to-image");
      const blob = cardRef.current
        ? await toBlob(cardRef.current, { pixelRatio: 2, backgroundColor: selectedTheme.bg })
        : null;

      const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

      if (isMobile && blob && navigator.share && navigator.canShare?.({ files: [new File([blob], "onthisday.png", { type: "image/png" })] })) {
        const file = new File([blob], "onthisday.png", { type: "image/png" });
        await navigator.share({ title: "FaB Stats — On This Day", files: [file] });
      } else if (blob && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setShareStatus("copied");
        setTimeout(() => { setShareStatus("idle"); onClose(); }, 1500);
        return;
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareStatus("copied");
        setTimeout(() => { setShareStatus("idle"); onClose(); }, 1500);
        return;
      }
    } catch {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch { /* ignore */ }
    }
    setShareStatus("idle");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl max-w-lg w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
          <h3 className="text-sm font-semibold text-fab-text">Share On This Day</h3>
          <button onClick={onClose} className="text-fab-muted hover:text-fab-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card preview */}
        <div className="p-4 flex justify-center overflow-x-auto">
          <div ref={cardRef}>
            <OnThisDayCard data={data} theme={selectedTheme} />
          </div>
        </div>

        {/* Theme picker */}
        <div className="px-4 pb-3">
          <p className="text-[10px] text-fab-muted uppercase tracking-wider font-medium mb-2">Theme</p>
          <div className="flex gap-2">
            {CARD_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className={`flex-1 rounded-lg p-2 text-center transition-all border ${
                  selectedTheme.id === theme.id
                    ? "border-fab-gold ring-1 ring-fab-gold/30"
                    : "border-fab-border hover:border-fab-muted"
                }`}
              >
                <div className="flex gap-0.5 justify-center mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.bg }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.accent }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.win }} />
                </div>
                <p className="text-[10px] text-fab-muted">{theme.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Copy button */}
        <div className="px-4 pb-4">
          <button
            onClick={handleCopy}
            disabled={shareStatus === "sharing"}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
          >
            {shareStatus === "sharing" ? "Capturing..." : shareStatus === "copied" ? "Copied!" : "Copy Image"}
          </button>
        </div>
      </div>
    </div>
  );
}

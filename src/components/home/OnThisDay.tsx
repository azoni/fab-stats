"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import { MatchResult, type MatchRecord } from "@/types";
import { localDate } from "@/lib/constants";
import { getRoundNumber } from "@/lib/stats";
import { CARD_THEMES } from "@/components/opponents/RivalryCard";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";
import { OnThisDayCard, type OnThisDayData } from "./OnThisDayCard";


interface OnThisDayProps {
  matches: MatchRecord[];
}

interface RoundInfo {
  label: string;
  isPlayoff: boolean;
}

interface YearMemory {
  year: number;
  matches: MatchRecord[];
  wins: number;
  losses: number;
  draws: number;
  heroes: string[];
  events: string[];
  /** Best playoff placement detected from match round numbers */
  placement: string | null;
  /** Pre-computed round label and playoff flag for each match (parallel to matches array) */
  roundInfo: RoundInfo[];
}

/**
 * Compute effective round numbers for all matches in a year.
 * Detects unnumbered playoff matches alongside numbered swiss rounds:
 * if an event has 3+ swiss rounds and a few unnumbered matches (no explicit
 * playoff labels), those unnumbered matches are inferred as playoff rounds.
 */
function computeEffectiveRounds(yearMatches: MatchRecord[]): Map<MatchRecord, number> {
  const effective = new Map<MatchRecord, number>();
  for (const m of yearMatches) effective.set(m, getRoundNumber(m));

  // Group by event to find unnumbered matches alongside swiss rounds
  const byEvent = new Map<string, MatchRecord[]>();
  for (const m of yearMatches) {
    const event = m.notes?.split(" | ")[0]?.trim() || "";
    if (!byEvent.has(event)) byEvent.set(event, []);
    byEvent.get(event)!.push(m);
  }

  for (const eventMatches of byEvent.values()) {
    const swissCount = eventMatches.filter((m) => {
      const rn = getRoundNumber(m);
      return rn > 0 && rn < 1000;
    }).length;
    const unnumbered = eventMatches.filter((m) => getRoundNumber(m) === 0);
    const hasExplicitPlayoffs = eventMatches.some((m) => getRoundNumber(m) >= 1000);

    // Heuristic: 3+ swiss rounds, no explicit playoffs, 1-3 unnumbered → inferred playoffs
    if (swissCount >= 3 && !hasExplicitPlayoffs && unnumbered.length > 0 && unnumbered.length <= 3) {
      // Order wins first (rounds you advanced through), then non-wins (elimination round)
      const ordered = [
        ...unnumbered.filter((m) => m.result === MatchResult.Win),
        ...unnumbered.filter((m) => m.result !== MatchResult.Win),
      ];
      ordered.forEach((m, i) => effective.set(m, 1001 + i));
    }
  }

  return effective;
}

/** Derive placement from the highest effective playoff round and its result. */
function detectPlacement(effective: Map<MatchRecord, number>, ms: MatchRecord[]): string | null {
  let best = 0;
  let wonBest = false;
  for (const m of ms) {
    const rn = effective.get(m) ?? 0;
    if (rn >= 1000 && rn > best) {
      best = rn;
      wonBest = m.result === MatchResult.Win;
    }
  }
  if (best === 0) return null;
  if (best >= 1003) return wonBest ? "Champion" : "Finalist";
  if (best >= 1002) return wonBest ? "Finalist" : "Top 4";
  if (best >= 1001) return wonBest ? "Top 4" : "Top 8";
  return "Top 8";
}

/** Get a short label for the round (handles playoff descriptive names). */
function getRoundLabel(m: MatchRecord): string {
  const numMatch = m.notes?.match(/Round (\d+)/)?.[1];
  if (numMatch) return `R${numMatch}`;
  const roundInfo = m.notes?.split(" | ")[1]?.trim() || "";
  if (/Quarter|Top\s*8/i.test(roundInfo)) return "QF";
  if (/Semi|Top\s*4/i.test(roundInfo)) return "SF";
  if (/Finals?$/i.test(roundInfo)) return "F";
  // Playoff P-numbered rounds
  const pMatch = m.notes?.match(/Round\s+P(\d+)/i);
  if (pMatch) return `P${pMatch[1]}`;
  // Fallback: if getRoundNumber says it's a playoff match, label it
  const rn = getRoundNumber(m);
  if (rn >= 1003) return "F";
  if (rn >= 1002) return "SF";
  if (rn >= 1001) return "QF";
  return m.format || "";
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
      const effective = computeEffectiveRounds(yearMatches);

      // Sort: numbered rounds first, inferred playoffs after swiss, unknown (0) last
      yearMatches.sort((a, b) => {
        const rnA = effective.get(a) ?? 0;
        const rnB = effective.get(b) ?? 0;
        if (rnA === 0 && rnB === 0) return 0;
        if (rnA === 0) return 1;
        if (rnB === 0) return -1;
        return rnA - rnB;
      });

      const wins = yearMatches.filter((m) => m.result === MatchResult.Win).length;
      const losses = yearMatches.filter((m) => m.result === MatchResult.Loss).length;
      const draws = yearMatches.filter((m) => m.result === MatchResult.Draw).length;
      const heroes = [...new Set(yearMatches.map((m) => m.heroPlayed).filter((h) => h && h !== "Unknown"))];
      const events = [...new Set(yearMatches.map((m) => m.notes?.split(" | ")[0]).filter(Boolean))] as string[];

      const placement = detectPlacement(effective, yearMatches);
      const roundInfo: RoundInfo[] = yearMatches.map((m) => {
        const eff = effective.get(m) ?? 0;
        if (eff >= 1003) return { label: "F", isPlayoff: true };
        if (eff >= 1002) return { label: "SF", isPlayoff: true };
        if (eff >= 1001) return { label: "QF", isPlayoff: true };
        if (eff > 0) return { label: `R${eff}`, isPlayoff: false };
        return { label: getRoundLabel(m), isPlayoff: getRoundNumber(m) >= 1000 };
      });

      result.push({ year, matches: yearMatches, wins, losses, draws, heroes, events, placement, roundInfo });
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
  const bestPlacement = memories.map((m) => m.placement).find(Boolean);

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
      placement: mem.placement,
      matches: mem.matches.map((m, i) => ({
        opponentName: m.opponentName,
        opponentHero: m.opponentHero,
        result: m.result,
        format: m.format,
        notes: m.notes,
        roundLabel: mem.roundInfo[i].label,
        isPlayoff: mem.roundInfo[i].isPlayoff,
      })),
    })),
  };

  return (
    <div className="relative bg-fab-surface border border-fab-border rounded-lg p-4 overflow-hidden">
      {/* Pitch strip accent */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
      {/* Header — clickable to collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2"
      >
        <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center ring-1 ring-inset ring-amber-500/20 shrink-0">
          <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-fab-text">On This Day</h3>
        <span className="text-xs text-fab-dim">{dateLabel}</span>
        {collapsed && (
          <>
            <span className="text-[10px] text-fab-muted">{memories.length} {memories.length === 1 ? "year" : "years"}, {totalMatches} {totalMatches === 1 ? "match" : "matches"}</span>
            {bestPlacement && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-fab-gold/15 text-fab-gold shrink-0">
                {bestPlacement}
              </span>
            )}
          </>
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
                    {mem.placement && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-semibold">
                        {mem.placement}
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
                      const { label: roundLabel, isPlayoff } = mem.roundInfo[i];

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
                          <span className={`ml-auto shrink-0 ${isPlayoff ? "text-purple-400 font-semibold" : "text-fab-dim"}`}>
                            {roundLabel}
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
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "copied" | "text-copied">("idle");
  const cardRef = useRef<HTMLDivElement>(null);

  async function handleCopy() {
    setShareStatus("sharing");
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: selectedTheme.bg, fileName: "onthisday.png",
      shareTitle: "FaB Stats — On This Day", shareText: "", fallbackText: window.location.href,
    });
    if (result === "image" || result === "shared") {
      setShareStatus("copied");
      setTimeout(() => { setShareStatus("idle"); onClose(); }, 1500);
    } else if (result === "text") {
      setShareStatus("text-copied");
      setTimeout(() => { setShareStatus("idle"); onClose(); }, 2000);
    } else {
      setShareStatus("idle");
    }
  }

  async function handleDownload() {
    setShareStatus("sharing");
    await downloadCardImage(cardRef.current, { backgroundColor: selectedTheme.bg, fileName: "onthisday.png" });
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

        {/* Copy + Download buttons */}
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={handleCopy} disabled={shareStatus === "sharing"} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50">
            {shareStatus === "sharing" ? "Capturing..." : shareStatus === "copied" ? "Image Copied!" : shareStatus === "text-copied" ? "Link Copied" : "Copy Image"}
          </button>
          <button onClick={handleDownload} disabled={shareStatus === "sharing"} className="px-4 py-2.5 rounded-lg text-sm font-medium border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-muted transition-colors disabled:opacity-50" title="Save Image">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

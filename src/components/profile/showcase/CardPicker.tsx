"use client";
import { useState } from "react";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import { AchievementIcon } from "@/components/gamification/AchievementIcons";
import { localDate } from "@/lib/constants";
import type { ShowcaseCard, MatchRecord, HeroStats, EventStats, OpponentStats, Achievement } from "@/types";
import { MatchResult } from "@/types";
import { getCardSize } from "../ShowcaseSection";

interface PlayoffFinishData {
  type: "champion" | "finalist" | "top4" | "top8";
  eventName: string;
  eventDate: string;
  format: string;
  eventType: string;
  hero?: string;
}

interface CardPickerProps {
  onAdd: (card: ShowcaseCard) => void;
  onCancel: () => void;
  matches: MatchRecord[];
  heroStats: HeroStats[];
  eventStats: EventStats[];
  opponentStats: OpponentStats[];
  playoffFinishes: PlayoffFinishData[];
  achievements: Achievement[];
  existingCards: ShowcaseCard[];
  pointsLeft: number;
}

type CardType = ShowcaseCard["type"];

const CARD_TYPES: { type: CardType; label: string; icon: string; desc: string }[] = [
  { type: "featuredMatch", label: "Featured Match", icon: "swords", desc: "Pin a memorable match" },
  { type: "heroSpotlight", label: "Hero Spotlight", icon: "shield", desc: "Showcase your main hero" },
  { type: "bestFinish", label: "Best Finish", icon: "trophy", desc: "Highlight a tournament placement" },
  { type: "rivalry", label: "Rivalry", icon: "versus", desc: "Head-to-head vs an opponent" },
  { type: "eventRecap", label: "Event Recap", icon: "scroll", desc: "Recap a tournament result" },
  { type: "achievements", label: "Achievements", icon: "star", desc: "Pin favorite achievements" },
  { type: "statHighlight", label: "Stat Highlight", icon: "chart", desc: "A bold stat with context" },
  { type: "formatMastery", label: "Format Mastery", icon: "trending", desc: "Format performance breakdown" },
];

const STAT_OPTIONS: { key: string; label: string }[] = [
  { key: "winRate", label: "Win Rate" },
  { key: "totalMatches", label: "Total Matches" },
  { key: "longestWinStreak", label: "Best Win Streak" },
  { key: "uniqueHeroes", label: "Unique Heroes" },
  { key: "uniqueOpponents", label: "Unique Opponents" },
  { key: "eventsPlayed", label: "Events Played" },
];

export function CardPicker({ onAdd, onCancel, matches, heroStats, eventStats, opponentStats, playoffFinishes, achievements, existingCards, pointsLeft }: CardPickerProps) {
  const [step, setStep] = useState<"type" | "config">("type");
  const [selectedType, setSelectedType] = useState<CardType | null>(null);
  const [search, setSearch] = useState("");
  const [selectedAchievements, setSelectedAchievements] = useState<Set<string>>(new Set());

  const hasFormatMastery = existingCards.some((c) => c.type === "formatMastery");

  function selectType(type: CardType) {
    if (type === "formatMastery") {
      onAdd({ type: "formatMastery" });
      return;
    }
    setSelectedType(type);
    setStep("config");
    setSearch("");
    setSelectedAchievements(new Set());
  }

  function toggleAchievement(id: string) {
    setSelectedAchievements((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  }

  if (step === "type") {
    return (
      <div className="bg-fab-surface border border-fab-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-fab-text">Add Card</p>
          <button onClick={onCancel} className="text-fab-dim hover:text-fab-text text-xs transition-colors">Cancel</button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {CARD_TYPES.map((ct) => {
            const size = getCardSize(ct.type);
            const tooExpensive = size > pointsLeft;
            const disabled = tooExpensive || (ct.type === "formatMastery" && hasFormatMastery);
            return (
              <button
                key={ct.type}
                onClick={() => !disabled && selectType(ct.type)}
                disabled={disabled}
                className={`text-left p-2 rounded-lg border transition-colors ${
                  disabled ? "border-fab-border/50 opacity-30 cursor-not-allowed" : "border-fab-border hover:border-fab-muted hover:bg-fab-surface-hover"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <AchievementIcon icon={ct.icon} className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] font-medium text-fab-text flex-1">{ct.label}</span>
                  <span className="text-[8px] text-fab-dim">{size}pt</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Config step
  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep("type")} className="text-fab-dim hover:text-fab-text transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="text-xs font-semibold text-fab-text">{CARD_TYPES.find((ct) => ct.type === selectedType)?.label}</p>
        </div>
        <button onClick={onCancel} className="text-fab-dim hover:text-fab-text text-xs transition-colors">Cancel</button>
      </div>

      {(selectedType === "featuredMatch" || selectedType === "rivalry" || selectedType === "eventRecap") && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={selectedType === "featuredMatch" ? "Search matches..." : selectedType === "rivalry" ? "Search opponents..." : "Search events..."}
          className="w-full bg-fab-bg border border-fab-border text-fab-text text-xs rounded-lg px-3 py-1.5 mb-2 focus:outline-none focus:border-fab-gold"
        />
      )}

      <div className="max-h-48 overflow-y-auto space-y-0.5">
        {selectedType === "featuredMatch" && <MatchPicker matches={matches} search={search} onSelect={(matchId) => onAdd({ type: "featuredMatch", matchId })} />}
        {selectedType === "heroSpotlight" && <HeroPicker heroStats={heroStats} onSelect={(heroName) => onAdd({ type: "heroSpotlight", heroName })} />}
        {selectedType === "bestFinish" && <FinishPicker finishes={playoffFinishes} onSelect={(eventDate, eventName) => onAdd({ type: "bestFinish", eventDate, eventName })} />}
        {selectedType === "rivalry" && <OpponentPicker opponents={opponentStats} search={search} onSelect={(opponentName) => onAdd({ type: "rivalry", opponentName })} />}
        {selectedType === "eventRecap" && <EventPicker events={eventStats} search={search} onSelect={(eventDate, eventName) => onAdd({ type: "eventRecap", eventDate, eventName })} />}
        {selectedType === "achievements" && <AchievementList achievements={achievements} selected={selectedAchievements} onToggle={toggleAchievement} />}
        {selectedType === "statHighlight" && <StatPicker onSelect={(stat, filter) => onAdd({ type: "statHighlight", stat, filter })} />}
      </div>

      {/* Achievement confirm button — always visible outside scroll */}
      {selectedType === "achievements" && selectedAchievements.size > 0 && (
        <button
          onClick={() => onAdd({ type: "achievements", achievementIds: [...selectedAchievements] })}
          className="w-full mt-2 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 text-xs font-medium rounded-lg hover:bg-emerald-500/25 transition-colors"
        >
          Add {selectedAchievements.size} Achievement{selectedAchievements.size > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}

// ── Sub-pickers ──

function MatchPicker({ matches, search, onSelect }: { matches: MatchRecord[]; search: string; onSelect: (id: string) => void }) {
  const q = search.toLowerCase();
  const sorted = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const filtered = q ? sorted.filter((m) =>
    m.opponentName?.toLowerCase().includes(q) || m.opponentHero.toLowerCase().includes(q) || m.heroPlayed.toLowerCase().includes(q) || m.notes?.toLowerCase().includes(q)
  ) : sorted;

  return (
    <>
      {filtered.slice(0, 20).map((m) => (
        <button key={m.id} onClick={() => onSelect(m.id)} className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-fab-surface-hover text-left transition-colors">
          <span className={`text-[10px] font-bold w-3 ${m.result === MatchResult.Win ? "text-fab-win" : m.result === MatchResult.Loss ? "text-fab-loss" : "text-fab-draw"}`}>
            {m.result === MatchResult.Win ? "W" : m.result === MatchResult.Loss ? "L" : "D"}
          </span>
          <span className="text-[10px] text-fab-text truncate flex-1">vs {m.opponentName || m.opponentHero}</span>
          <span className="text-[9px] text-fab-dim shrink-0">{localDate(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </button>
      ))}
      {filtered.length === 0 && <p className="text-[10px] text-fab-dim text-center py-3">No matches found</p>}
    </>
  );
}

function HeroPicker({ heroStats, onSelect }: { heroStats: HeroStats[]; onSelect: (name: string) => void }) {
  return (
    <>
      {heroStats.map((h) => {
        const info = getHeroByName(h.heroName);
        return (
          <button key={h.heroName} onClick={() => onSelect(h.heroName)} className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-fab-surface-hover text-left transition-colors">
            <HeroClassIcon heroClass={info?.classes[0]} size="sm" />
            <span className="text-[10px] text-fab-text truncate flex-1">{h.heroName}</span>
            <span className="text-[9px] text-fab-muted">{h.totalMatches}m</span>
            <span className={`text-[9px] font-medium ${h.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>{h.winRate.toFixed(0)}%</span>
          </button>
        );
      })}
      {heroStats.length === 0 && <p className="text-[10px] text-fab-dim text-center py-3">No heroes played</p>}
    </>
  );
}

function FinishPicker({ finishes, onSelect }: { finishes: PlayoffFinishData[]; onSelect: (date: string, name: string) => void }) {
  const BADGE: Record<string, string> = { champion: "trophy", finalist: "medal", top4: "badge", top8: "star-badge" };
  return (
    <>
      {finishes.map((f) => (
        <button key={`${f.eventName}|${f.eventDate}`} onClick={() => onSelect(f.eventDate, f.eventName)} className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-fab-surface-hover text-left transition-colors">
          <AchievementIcon icon={BADGE[f.type] || "star-badge"} className="w-4 h-4 shrink-0" />
          <span className="text-[10px] text-fab-text truncate flex-1">{f.eventName}</span>
          <span className="text-[9px] text-fab-dim capitalize">{f.type}</span>
          <span className="text-[9px] text-fab-dim shrink-0">{localDate(f.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </button>
      ))}
      {finishes.length === 0 && <p className="text-[10px] text-fab-dim text-center py-3">No playoff finishes</p>}
    </>
  );
}

function OpponentPicker({ opponents, search, onSelect }: { opponents: OpponentStats[]; search: string; onSelect: (name: string) => void }) {
  const q = search.toLowerCase();
  const sorted = [...opponents].sort((a, b) => b.totalMatches - a.totalMatches);
  const filtered = q ? sorted.filter((o) => o.opponentName.toLowerCase().includes(q)) : sorted;

  return (
    <>
      {filtered.slice(0, 20).map((o) => (
        <button key={o.opponentName} onClick={() => onSelect(o.opponentName)} className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-fab-surface-hover text-left transition-colors">
          <span className="text-[10px] text-fab-text truncate flex-1">{o.opponentName}</span>
          <span className="text-[9px] text-fab-muted">{o.wins}W-{o.losses}L</span>
          <span className={`text-[9px] font-medium ${o.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>{o.winRate.toFixed(0)}%</span>
        </button>
      ))}
      {filtered.length === 0 && <p className="text-[10px] text-fab-dim text-center py-3">No opponents found</p>}
    </>
  );
}

function EventPicker({ events, search, onSelect }: { events: EventStats[]; search: string; onSelect: (date: string, name: string) => void }) {
  const q = search.toLowerCase();
  const filtered = q ? events.filter((e) => e.eventName.toLowerCase().includes(q)) : events;

  return (
    <>
      {filtered.slice(0, 20).map((e) => (
        <button key={`${e.eventName}|${e.eventDate}`} onClick={() => onSelect(e.eventDate, e.eventName)} className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-fab-surface-hover text-left transition-colors">
          <span className="text-[10px] text-fab-text truncate flex-1">{e.eventName}</span>
          <span className="text-[9px] text-fab-muted">{e.wins}W-{e.losses}L</span>
          <span className="text-[9px] text-fab-dim shrink-0">{localDate(e.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </button>
      ))}
      {filtered.length === 0 && <p className="text-[10px] text-fab-dim text-center py-3">No events found</p>}
    </>
  );
}

function AchievementList({ achievements, selected, onToggle }: { achievements: Achievement[]; selected: Set<string>; onToggle: (id: string) => void }) {
  return (
    <>
      {achievements.map((a) => {
        const isSelected = selected.has(a.id);
        return (
          <button
            key={a.id}
            onClick={() => onToggle(a.id)}
            className={`w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors ${
              isSelected ? "bg-emerald-500/15 ring-1 ring-emerald-500/30" : "hover:bg-fab-surface-hover"
            }`}
          >
            {isSelected ? (
              <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <div className="w-3.5 h-3.5 rounded border border-fab-border shrink-0" />
            )}
            <AchievementIcon icon={a.icon} className="w-4 h-4 shrink-0" />
            <span className="text-[10px] text-fab-text truncate flex-1">{a.name}</span>
            <span className="text-[8px] text-fab-dim capitalize">{a.rarity}</span>
          </button>
        );
      })}
      {achievements.length === 0 && <p className="text-[10px] text-fab-dim text-center py-3">No achievements earned</p>}
    </>
  );
}

function StatPicker({ onSelect }: { onSelect: (stat: string, filter?: string) => void }) {
  return (
    <>
      {STAT_OPTIONS.map((opt) => (
        <button key={opt.key} onClick={() => onSelect(opt.key)} className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-fab-surface-hover text-left transition-colors">
          <span className="text-[10px] text-fab-text">{opt.label}</span>
        </button>
      ))}
    </>
  );
}

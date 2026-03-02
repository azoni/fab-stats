"use client";
import { useState, useCallback, useMemo } from "react";
import { updateProfile } from "@/lib/firestore-storage";
import { logActivity } from "@/lib/activity-log";
import { FeaturedMatchCard } from "./showcase/FeaturedMatchCard";
import { HeroSpotlightCard } from "./showcase/HeroSpotlightCard";
import { BestFinishShowcase } from "./showcase/BestFinishShowcase";
import { RivalryShowcase } from "./showcase/RivalryShowcase";
import { EventRecapCard } from "./showcase/EventRecapCard";
import { AchievementShowcaseCard } from "./showcase/AchievementShowcaseCard";
import { StatHighlightCard, type StatType } from "./showcase/StatHighlightCard";
import { FormatMasteryCard } from "./showcase/FormatMasteryCard";
import { EventTypeMasteryCard } from "./showcase/EventTypeMasteryCard";
import { StreakShowcaseCard } from "./showcase/StreakShowcaseCard";
import { RecentFormCard } from "./showcase/RecentFormCard";
import {
  CardPicker,
  MatchPicker,
  HeroPicker,
  FinishPicker,
  OpponentPicker,
  EventPicker,
  AchievementList,
  StatPicker,
} from "./showcase/CardPicker";
import type { ShowcaseCard, UserProfile, MatchRecord, HeroStats, EventStats, OpponentStats, OverallStats, Achievement } from "@/types";
import { MatchResult } from "@/types";
import type { HeroMastery } from "@/types";

interface PlayoffFinishData {
  type: "champion" | "finalist" | "top4" | "top8";
  eventName: string;
  eventDate: string;
  format: string;
  eventType: string;
  hero?: string;
}

interface ShowcaseSectionProps {
  profile: UserProfile;
  isOwner: boolean;
  matches: MatchRecord[];
  heroStats: HeroStats[];
  masteries: HeroMastery[];
  eventStats: EventStats[];
  playoffFinishes: PlayoffFinishData[];
  opponentStats: OpponentStats[];
  overall: OverallStats;
  achievements: Achievement[];
  maxPoints?: number;
  storageField?: "showcase" | "showcaseSecondary";
  label?: string;
}

// Point system: small=1 (half-width), medium=2 (full-width). Budget = 12.
// Only achievements stays full-width; everything else is half-width.
const MEDIUM_TYPES = new Set(["achievements"]);
const MAX_POINTS = 12;

// Card types that have editable selections
const EDITABLE_TYPES = new Set<ShowcaseCard["type"]>([
  "featuredMatch", "heroSpotlight", "bestFinish", "rivalry", "eventRecap", "achievements", "statHighlight",
  "formatMastery", "eventTypeMastery",
]);

const CARD_TYPE_LABELS: Record<string, string> = {
  featuredMatch: "Match",
  heroSpotlight: "Hero",
  bestFinish: "Finish",
  rivalry: "Rivalry",
  eventRecap: "Event",
  achievements: "Achievements",
  statHighlight: "Stat",
  formatMastery: "Formats",
  eventTypeMastery: "Event Types",
  streakShowcase: "Streaks",
  recentForm: "Form",
};

export function getCardSize(type: ShowcaseCard["type"], card?: ShowcaseCard): 1 | 2 {
  if (MEDIUM_TYPES.has(type)) return 2;
  if (type === "statHighlight" && card?.stats && card.stats.length > 2) return 2;
  return 1;
}

export function ShowcaseSection({
  profile,
  isOwner,
  matches,
  heroStats,
  masteries,
  eventStats,
  playoffFinishes,
  opponentStats,
  overall,
  achievements,
  maxPoints = 12,
  storageField = "showcase",
  label = "Showcase",
}: ShowcaseSectionProps) {
  const savedCards = profile[storageField];
  const defaultShowcase = useMemo<ShowcaseCard[]>(() => {
    if (savedCards && savedCards.length > 0) return savedCards;
    if (storageField !== "showcase") return [];
    return [{ type: "statHighlight", stats: ["eventsPlayed", "uniqueOpponents", "winRate", "totalMatches", "longestWinStreak"], stat: "winRate" }];
  }, [savedCards, storageField]);

  const [cards, setCards] = useState<ShowcaseCard[]>(defaultShowcase);
  const [isEditing, setIsEditing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const usedPoints = useMemo(() => cards.reduce((sum, c) => sum + getCardSize(c.type, c), 0), [cards]);
  const pointsLeft = maxPoints - usedPoints;

  const saveCards = useCallback(async (updated: ShowcaseCard[]) => {
    setCards(updated);
    setSaving(true);
    try {
      const cleaned = updated.map((card) => {
        const clean: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(card)) {
          if (v !== undefined) clean[k] = v;
        }
        return clean as unknown as ShowcaseCard;
      });
      await updateProfile(profile.uid, { [storageField]: cleaned });
      logActivity("showcase_edit", String(cleaned.length));
    } catch (err) {
      console.error("Failed to save showcase:", err);
    } finally {
      setSaving(false);
    }
  }, [profile.uid, storageField]);

  const addCard = useCallback((card: ShowcaseCard) => {
    const updated = [...cards, card];
    saveCards(updated);
    setShowPicker(false);
  }, [cards, saveCards]);

  const removeCard = useCallback((index: number) => {
    const updated = cards.filter((_, i) => i !== index);
    saveCards(updated);
    setEditingIndex(null);
  }, [cards, saveCards]);

  const moveCard = useCallback((index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= cards.length) return;
    const updated = [...cards];
    [updated[index], updated[newIdx]] = [updated[newIdx], updated[index]];
    saveCards(updated);
    // Follow the card being edited if it moved
    if (editingIndex === index) setEditingIndex(newIdx);
    else if (editingIndex === newIdx) setEditingIndex(index);
  }, [cards, saveCards, editingIndex]);

  const replaceCard = useCallback((index: number, card: ShowcaseCard) => {
    const updated = [...cards];
    updated[index] = card;
    saveCards(updated);
    setEditingIndex(null);
  }, [cards, saveCards]);

  if (cards.length === 0 && !isOwner) return null;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Edit toggle */}
      {isOwner && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-fab-muted uppercase tracking-wider font-medium">{label}</p>
          <div className="flex items-center gap-2">
            {saving && <span className="text-[10px] text-fab-dim">Saving...</span>}
            <button
              onClick={() => { setIsEditing(!isEditing); setShowPicker(false); setEditingIndex(null); }}
              className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                isEditing ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
              }`}
            >
              {isEditing ? "Done" : "Edit"}
            </button>
          </div>
        </div>
      )}

      {/* 2-column grid */}
      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {cards.map((card, i) => {
            const size = getCardSize(card.type, card);
            const isEditableCard = EDITABLE_TYPES.has(card.type);
            const isBeingEdited = editingIndex === i;

            return (
              <div key={`${card.type}-${i}`} className={`relative group ${size === 2 ? "col-span-2" : "col-span-1"}`}>
                {/* Edit controls — always visible in edit mode */}
                {isEditing && !isBeingEdited && (
                  <div className="absolute -top-1 -right-1 z-10 flex items-center gap-0.5">
                    {isEditableCard && (
                      <button
                        onClick={() => setEditingIndex(i)}
                        className="w-4 h-4 rounded bg-fab-gold/20 border border-fab-gold/30 text-fab-gold hover:bg-fab-gold/30 flex items-center justify-center"
                        title="Edit"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                    <button onClick={() => moveCard(i, "up")} disabled={i === 0} className="w-4 h-4 rounded bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 flex items-center justify-center" title="Move up">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button onClick={() => moveCard(i, "down")} disabled={i === cards.length - 1} className="w-4 h-4 rounded bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 flex items-center justify-center" title="Move down">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <button onClick={() => removeCard(i)} className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 flex items-center justify-center" title="Remove">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}

                {/* Card type label in edit mode */}
                {isEditing && !isBeingEdited && (
                  <div className="absolute -top-1 -left-1 z-10">
                    <span className="text-[7px] font-medium uppercase tracking-wider bg-fab-bg/90 border border-fab-border text-fab-dim px-1 py-0.5 rounded">
                      {CARD_TYPE_LABELS[card.type] || card.type}
                    </span>
                  </div>
                )}

                {/* Inline editor or card content */}
                {isBeingEdited ? (
                  <InlineCardEditor
                    card={card}
                    index={i}
                    onReplace={replaceCard}
                    onCancel={() => setEditingIndex(null)}
                    matches={matches}
                    heroStats={heroStats}
                    eventStats={eventStats}
                    opponentStats={opponentStats}
                    playoffFinishes={playoffFinishes}
                    achievements={achievements}
                  />
                ) : (
                  <ShowcaseCardRenderer card={card} matches={matches} heroStats={heroStats} masteries={masteries} eventStats={eventStats} playoffFinishes={playoffFinishes} opponentStats={opponentStats} overall={overall} achievements={achievements} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state — onboarding for owners (main showcase only) */}
      {cards.length === 0 && isOwner && !showPicker && storageField === "showcase" && (
        <div className="relative bg-fab-surface/50 border border-dashed border-fab-gold/25 rounded-lg p-6 text-center overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-fab-gold/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-fab-gold/5 rounded-full blur-xl pointer-events-none" />
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-fab-gold/15 flex items-center justify-center mx-auto mb-3 ring-1 ring-fab-gold/20">
              <svg className="w-5 h-5 text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-fab-text mb-1">Customize Your Profile</h3>
            <p className="text-xs text-fab-muted mb-1 max-w-xs mx-auto">
              Choose what to show on your profile — stats, achievements, event results, rivalries, and more.
            </p>
            <p className="text-[10px] text-fab-dim mb-4 max-w-xs mx-auto">
              Your match data stays private. Only what you add here is visible to others.
            </p>
            <button
              onClick={() => { setIsEditing(true); setShowPicker(true); }}
              className="px-4 py-2 bg-fab-gold/15 text-fab-gold text-xs font-semibold rounded-lg hover:bg-fab-gold/25 transition-colors ring-1 ring-fab-gold/20"
            >
              Set Up Showcase
            </button>
          </div>
        </div>
      )}

      {/* Add card button */}
      {isEditing && !showPicker && pointsLeft > 0 && (
        <button onClick={() => setShowPicker(true)} className="w-full py-1.5 border border-dashed border-fab-border rounded-lg text-xs text-fab-muted hover:text-fab-text hover:border-fab-muted transition-colors">
          + Add Card ({usedPoints}/{maxPoints} pts)
        </button>
      )}

      {isEditing && pointsLeft <= 0 && cards.length > 0 && !showPicker && (
        <p className="text-[10px] text-fab-dim text-center">Showcase full</p>
      )}

      {showPicker && (
        <CardPicker
          onAdd={addCard}
          onCancel={() => setShowPicker(false)}
          matches={matches}
          heroStats={heroStats}
          eventStats={eventStats}
          opponentStats={opponentStats}
          playoffFinishes={playoffFinishes}
          achievements={achievements}
          existingCards={cards}
          pointsLeft={pointsLeft}
        />
      )}
    </div>
  );
}

// ── Inline Card Editor ──

function InlineCardEditor({ card, index, onReplace, onCancel, matches, heroStats, eventStats, opponentStats, playoffFinishes, achievements }: {
  card: ShowcaseCard;
  index: number;
  onReplace: (index: number, card: ShowcaseCard) => void;
  onCancel: () => void;
  matches: MatchRecord[];
  heroStats: HeroStats[];
  eventStats: EventStats[];
  opponentStats: OpponentStats[];
  playoffFinishes: PlayoffFinishData[];
  achievements: Achievement[];
}) {
  const [search, setSearch] = useState("");
  const [selectedAchievements, setSelectedAchievements] = useState<Set<string>>(
    () => new Set(card.type === "achievements" ? card.achievementIds || [] : [])
  );

  const hasSearch = card.type === "featuredMatch" || card.type === "rivalry" || card.type === "eventRecap";

  function toggleAchievement(id: string) {
    setSelectedAchievements((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      return next;
    });
  }

  return (
    <div className="bg-fab-surface border border-fab-gold/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-fab-gold">
          Edit {CARD_TYPE_LABELS[card.type] || card.type}
        </p>
        <button onClick={onCancel} className="text-fab-dim hover:text-fab-text text-xs transition-colors">Cancel</button>
      </div>

      {hasSearch && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={card.type === "featuredMatch" ? "Search matches..." : card.type === "rivalry" ? "Search opponents..." : "Search events..."}
          className="w-full bg-fab-bg border border-fab-border text-fab-text text-xs rounded-lg px-3 py-1.5 mb-2 focus:outline-none focus:border-fab-gold"
        />
      )}

      <div className="max-h-48 overflow-y-auto space-y-0.5">
        {card.type === "featuredMatch" && (
          <MatchPicker matches={matches} search={search} onSelect={(matchId) => onReplace(index, { type: "featuredMatch", matchId })} />
        )}
        {card.type === "heroSpotlight" && (
          <HeroPicker heroStats={heroStats} onSelect={(heroName) => onReplace(index, { type: "heroSpotlight", heroName })} />
        )}
        {card.type === "bestFinish" && (
          <FinishPicker finishes={playoffFinishes} onSelect={(eventDate, eventName) => onReplace(index, { type: "bestFinish", eventDate, eventName })} />
        )}
        {card.type === "rivalry" && (
          <OpponentPicker opponents={opponentStats} search={search} onSelect={(opponentName) => onReplace(index, { type: "rivalry", opponentName })} />
        )}
        {card.type === "eventRecap" && (
          <EventPicker events={eventStats} search={search} onSelect={(eventDate, eventName) => onReplace(index, { type: "eventRecap", eventDate, eventName })} />
        )}
        {card.type === "achievements" && (
          <AchievementList achievements={achievements} selected={selectedAchievements} onToggle={toggleAchievement} />
        )}
        {card.type === "statHighlight" && (
          <StatPicker initialStats={card.stats || (card.stat ? [card.stat] : [])} onSelect={(stats) => onReplace(index, { type: "statHighlight", stats, stat: stats[0] })} />
        )}
        {(card.type === "formatMastery" || card.type === "eventTypeMastery") && (
          <MasteryEditor
            card={card}
            matches={matches}
            onSave={(sortBy, selectedItems) => onReplace(index, { type: card.type, sortBy, selectedItems: selectedItems.length > 0 ? selectedItems : undefined })}
          />
        )}
      </div>

      {card.type === "achievements" && selectedAchievements.size > 0 && (
        <button
          onClick={() => onReplace(index, { type: "achievements", achievementIds: [...selectedAchievements] })}
          className="w-full mt-2 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 text-xs font-medium rounded-lg hover:bg-emerald-500/25 transition-colors"
        >
          Save {selectedAchievements.size} Achievement{selectedAchievements.size > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}

// ── Mastery Editor (format/event type item selection + sort) ──

function MasteryEditor({ card, matches, onSave }: {
  card: ShowcaseCard;
  matches: MatchRecord[];
  onSave: (sortBy: "mostPlayed" | "bestWinRate", selectedItems: string[]) => void;
}) {
  const [sortBy, setSortBy] = useState<"mostPlayed" | "bestWinRate">(card.sortBy || "mostPlayed");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(card.selectedItems || []));

  // Compute all available items from match data
  const allItems = useMemo(() => {
    const map = new Map<string, { matches: number; wins: number }>();
    for (const m of matches) {
      if (m.result === MatchResult.Bye) continue;
      const key = card.type === "formatMastery" ? m.format : getEditorEventType(m);
      const cur = map.get(key) || { matches: 0, wins: 0 };
      cur.matches++;
      if (m.result === MatchResult.Win) cur.wins++;
      map.set(key, cur);
    }
    return [...map.entries()]
      .map(([name, data]) => ({
        name,
        matches: data.matches,
        winRate: data.matches > 0 ? (data.wins / data.matches) * 100 : 0,
      }))
      .sort((a, b) => b.matches - a.matches);
  }, [matches, card.type]);

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else if (next.size < 8) next.add(name);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {/* Sort toggle */}
      <div className="flex gap-1">
        {(["mostPlayed", "bestWinRate"] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setSortBy(opt)}
            className={`flex-1 text-[9px] font-medium py-1 rounded transition-colors ${
              sortBy === opt ? "bg-fab-gold/15 text-fab-gold ring-1 ring-fab-gold/30" : "text-fab-dim hover:text-fab-muted"
            }`}
          >
            {opt === "mostPlayed" ? "Most Played" : "Best Win Rate"}
          </button>
        ))}
      </div>

      {/* Item checkboxes */}
      <p className="text-[8px] text-fab-dim">Select which to show (leave empty for top 8):</p>
      {allItems.map((item) => {
        const isSelected = selected.has(item.name);
        return (
          <button
            key={item.name}
            onClick={() => toggle(item.name)}
            className={`w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors ${
              isSelected ? "bg-fab-gold/10 ring-1 ring-fab-gold/20" : "hover:bg-fab-surface-hover"
            }`}
          >
            {isSelected ? (
              <svg className="w-3.5 h-3.5 text-fab-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <div className="w-3.5 h-3.5 rounded border border-fab-border shrink-0" />
            )}
            <span className="text-[10px] text-fab-text truncate flex-1">{item.name}</span>
            <span className="text-[9px] text-fab-dim">{item.matches}m</span>
            <span className={`text-[9px] font-medium ${item.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>{item.winRate.toFixed(0)}%</span>
          </button>
        );
      })}

      {/* Save button */}
      <button
        onClick={() => onSave(sortBy, [...selected])}
        className="w-full mt-1 px-3 py-1.5 bg-fab-gold/15 text-fab-gold text-xs font-medium rounded-lg hover:bg-fab-gold/25 transition-colors"
      >
        Save{selected.size > 0 ? ` (${selected.size} selected)` : ""}
      </button>
    </div>
  );
}

// Helper to get event type for editor (mirrors EventTypeMasteryCard logic)
function getEditorEventType(match: MatchRecord): string {
  if (match.eventType) return match.eventType;
  const notes = match.notes?.split("|")[0]?.trim().toLowerCase() || "";
  if (notes.includes("armory")) return "Armory";
  if (notes.includes("skirmish")) return "Skirmish";
  if (notes.includes("proquest")) return "ProQuest";
  if (notes.includes("battle hardened")) return "Battle Hardened";
  if (notes.includes("calling")) return "The Calling";
  if (notes.includes("national")) return "Nationals";
  if (notes.includes("pro tour")) return "Pro Tour";
  if (notes.includes("rtn") || notes.includes("road to nationals")) return "RTN";
  return "Other";
}

// ── Card Renderer ──

function ShowcaseCardRenderer({ card, matches, heroStats, masteries, eventStats, playoffFinishes, opponentStats, overall, achievements }: {
  card: ShowcaseCard; matches: MatchRecord[]; heroStats: HeroStats[]; masteries: HeroMastery[]; eventStats: EventStats[]; playoffFinishes: PlayoffFinishData[]; opponentStats: OpponentStats[]; overall: OverallStats; achievements: Achievement[];
}) {
  switch (card.type) {
    case "featuredMatch": {
      const match = matches.find((m) => m.id === card.matchId);
      if (!match) return <MissingCard label="Match not found" />;
      return <FeaturedMatchCard match={match} />;
    }
    case "heroSpotlight": {
      const hs = heroStats.find((h) => h.heroName === card.heroName);
      if (!hs) return <MissingCard label="Hero not found" />;
      const mastery = masteries.find((m) => m.heroName === card.heroName);
      return <HeroSpotlightCard heroStats={hs} mastery={mastery} />;
    }
    case "bestFinish": {
      const finish = playoffFinishes.find((f) => f.eventDate === card.eventDate && f.eventName === card.eventName);
      if (!finish) return <MissingCard label="Finish not found" />;
      return <BestFinishShowcase finish={finish} />;
    }
    case "rivalry": {
      const opp = opponentStats.find((o) => o.opponentName === card.opponentName);
      if (!opp) return <MissingCard label="Opponent not found" />;
      return <RivalryShowcase opponent={opp} />;
    }
    case "eventRecap": {
      const ev = eventStats.find((e) => e.eventDate === card.eventDate && e.eventName === card.eventName);
      if (!ev) return <MissingCard label="Event not found" />;
      const placement = playoffFinishes.find((f) => f.eventDate === card.eventDate && f.eventName === card.eventName);
      return <EventRecapCard event={ev} placementType={placement?.type} />;
    }
    case "achievements": {
      const achs = (card.achievementIds || []).map((id) => achievements.find((a) => a.id === id)).filter(Boolean) as Achievement[];
      if (achs.length === 0) return <MissingCard label="Achievements not found" />;
      return <AchievementShowcaseCard achievements={achs} />;
    }
    case "statHighlight":
      return <StatHighlightCard stat={(card.stat || "winRate") as StatType} stats={card.stats as StatType[] | undefined} filter={card.filter} overall={overall} heroStats={heroStats} eventStats={eventStats} opponentCount={opponentStats.length} />;
    case "formatMastery":
      return <FormatMasteryCard matches={matches} sortBy={card.sortBy} selectedItems={card.selectedItems} />;
    case "eventTypeMastery":
      return <EventTypeMasteryCard matches={matches} sortBy={card.sortBy} selectedItems={card.selectedItems} />;
    case "streakShowcase":
      return <StreakShowcaseCard overall={overall} matches={matches} />;
    case "recentForm":
      return <RecentFormCard matches={matches} />;
    default:
      return <MissingCard label="Unknown card type" />;
  }
}

function MissingCard({ label }: { label: string }) {
  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg px-3 py-2">
      <p className="text-[10px] text-fab-dim italic">{label}</p>
    </div>
  );
}

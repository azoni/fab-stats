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
import { StatHighlightCard } from "./showcase/StatHighlightCard";
import { FormatMasteryCard } from "./showcase/FormatMasteryCard";
import { EventTypeMasteryCard } from "./showcase/EventTypeMasteryCard";
import { StreakShowcaseCard } from "./showcase/StreakShowcaseCard";
import { RecentFormCard } from "./showcase/RecentFormCard";
import { CardPicker } from "./showcase/CardPicker";
import type { ShowcaseCard, UserProfile, MatchRecord, HeroStats, EventStats, OpponentStats, OverallStats, Achievement } from "@/types";
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
}

// Point system: small=1 (half-width), medium=2 (full-width). Budget = 8.
// Only achievements stays full-width; everything else is half-width.
const MEDIUM_TYPES = new Set(["achievements"]);
const MAX_POINTS = 8;

export function getCardSize(type: ShowcaseCard["type"]): 1 | 2 {
  return MEDIUM_TYPES.has(type) ? 2 : 1;
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
}: ShowcaseSectionProps) {
  // Default showcase: achievements card with 5 rarest if user has no saved showcase
  const defaultShowcase = useMemo<ShowcaseCard[]>(() => {
    if (profile.showcase && profile.showcase.length > 0) return profile.showcase;
    if (achievements.length === 0) return [];
    const RARITY_ORDER: Record<string, number> = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    const top5 = [...achievements]
      .sort((a, b) => (RARITY_ORDER[a.rarity] ?? 5) - (RARITY_ORDER[b.rarity] ?? 5))
      .slice(0, 5)
      .map((a) => a.id);
    return [{ type: "achievements", achievementIds: top5 }];
  }, [profile.showcase, achievements]);

  const [cards, setCards] = useState<ShowcaseCard[]>(defaultShowcase);
  const [isEditing, setIsEditing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const usedPoints = useMemo(() => cards.reduce((sum, c) => sum + getCardSize(c.type), 0), [cards]);
  const pointsLeft = MAX_POINTS - usedPoints;

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
      await updateProfile(profile.uid, { showcase: cleaned });
      logActivity("showcase_edit", String(cleaned.length));
    } catch (err) {
      console.error("Failed to save showcase:", err);
    } finally {
      setSaving(false);
    }
  }, [profile.uid]);

  const addCard = useCallback((card: ShowcaseCard) => {
    const updated = [...cards, card];
    saveCards(updated);
    setShowPicker(false);
  }, [cards, saveCards]);

  const removeCard = useCallback((index: number) => {
    const updated = cards.filter((_, i) => i !== index);
    saveCards(updated);
  }, [cards, saveCards]);

  const moveCard = useCallback((index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= cards.length) return;
    const updated = [...cards];
    [updated[index], updated[newIdx]] = [updated[newIdx], updated[index]];
    saveCards(updated);
  }, [cards, saveCards]);

  if (cards.length === 0 && !isOwner) return null;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Edit toggle */}
      {isOwner && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-fab-muted uppercase tracking-wider font-medium">Showcase</p>
          <div className="flex items-center gap-2">
            {saving && <span className="text-[10px] text-fab-dim">Saving...</span>}
            <button
              onClick={() => { setIsEditing(!isEditing); setShowPicker(false); }}
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
            const size = getCardSize(card.type);
            return (
              <div key={`${card.type}-${i}`} className={`relative group ${size === 2 ? "col-span-2" : "col-span-1"}`}>
                {isEditing && (
                  <div className="absolute -top-1 -right-1 z-10 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <ShowcaseCardRenderer card={card} matches={matches} heroStats={heroStats} masteries={masteries} eventStats={eventStats} playoffFinishes={playoffFinishes} opponentStats={opponentStats} overall={overall} achievements={achievements} />
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {cards.length === 0 && isOwner && !showPicker && (
        <div className="bg-fab-surface/50 border border-dashed border-fab-border rounded-lg p-5 text-center">
          <p className="text-sm text-fab-muted mb-1">Customize your showcase</p>
          <p className="text-[10px] text-fab-dim mb-3">Pin your best stats, matches, and achievements</p>
          <button onClick={() => { setIsEditing(true); setShowPicker(true); }} className="px-3 py-1.5 bg-fab-gold/15 text-fab-gold text-xs font-medium rounded-lg hover:bg-fab-gold/25 transition-colors">
            + Add Card
          </button>
        </div>
      )}

      {/* Add card button */}
      {isEditing && cards.length > 0 && !showPicker && pointsLeft > 0 && (
        <button onClick={() => setShowPicker(true)} className="w-full py-1.5 border border-dashed border-fab-border rounded-lg text-xs text-fab-muted hover:text-fab-text hover:border-fab-muted transition-colors">
          + Add Card ({usedPoints}/{MAX_POINTS} pts)
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
      return <StatHighlightCard stat={(card.stat || "winRate") as "winRate" | "totalMatches" | "longestWinStreak" | "uniqueHeroes" | "uniqueOpponents" | "eventsPlayed"} filter={card.filter} overall={overall} heroStats={heroStats} eventStats={eventStats} opponentCount={opponentStats.length} />;
    case "formatMastery":
      return <FormatMasteryCard matches={matches} />;
    case "eventTypeMastery":
      return <EventTypeMasteryCard matches={matches} />;
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

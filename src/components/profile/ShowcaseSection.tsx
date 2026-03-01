"use client";
import { useState, useCallback } from "react";
import { updateProfile } from "@/lib/firestore-storage";
import { FeaturedMatchCard } from "./showcase/FeaturedMatchCard";
import { HeroSpotlightCard } from "./showcase/HeroSpotlightCard";
import { BestFinishShowcase } from "./showcase/BestFinishShowcase";
import { RivalryShowcase } from "./showcase/RivalryShowcase";
import { EventRecapCard } from "./showcase/EventRecapCard";
import { AchievementShowcaseCard } from "./showcase/AchievementShowcaseCard";
import { StatHighlightCard } from "./showcase/StatHighlightCard";
import { FormatMasteryCard } from "./showcase/FormatMasteryCard";
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

const MAX_CARDS = 5;

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
  const [cards, setCards] = useState<ShowcaseCard[]>(profile.showcase || []);
  const [isEditing, setIsEditing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveCards = useCallback(async (updated: ShowcaseCard[]) => {
    setCards(updated);
    setSaving(true);
    try {
      await updateProfile(profile.uid, { showcase: updated });
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

  // Empty state for visitors
  if (cards.length === 0 && !isOwner) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Edit toggle */}
      {isOwner && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-fab-muted uppercase tracking-wider font-medium">Showcase</p>
          <div className="flex items-center gap-2">
            {saving && <span className="text-[10px] text-fab-dim">Saving...</span>}
            <button
              onClick={() => { setIsEditing(!isEditing); setShowPicker(false); }}
              className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                isEditing
                  ? "bg-fab-gold/15 text-fab-gold"
                  : "text-fab-muted hover:text-fab-text"
              }`}
            >
              {isEditing ? "Done" : "Edit"}
            </button>
          </div>
        </div>
      )}

      {/* Cards */}
      {cards.map((card, i) => (
        <div key={`${card.type}-${i}`} className="relative group">
          {/* Edit overlay */}
          {isEditing && (
            <div className="absolute -top-1 -right-1 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => moveCard(i, "up")}
                disabled={i === 0}
                className="w-5 h-5 rounded bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 flex items-center justify-center"
                title="Move up"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => moveCard(i, "down")}
                disabled={i === cards.length - 1}
                className="w-5 h-5 rounded bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 flex items-center justify-center"
                title="Move down"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={() => removeCard(i)}
                className="w-5 h-5 rounded bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 flex items-center justify-center"
                title="Remove"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Card render */}
          <ShowcaseCardRenderer
            card={card}
            matches={matches}
            heroStats={heroStats}
            masteries={masteries}
            eventStats={eventStats}
            playoffFinishes={playoffFinishes}
            opponentStats={opponentStats}
            overall={overall}
            achievements={achievements}
          />
        </div>
      ))}

      {/* Empty state for owner */}
      {cards.length === 0 && isOwner && !showPicker && (
        <div className="bg-fab-surface/50 border border-dashed border-fab-border rounded-lg p-6 text-center">
          <p className="text-sm text-fab-muted mb-1">Customize your showcase</p>
          <p className="text-[10px] text-fab-dim mb-3">Pin your best stats, matches, and achievements</p>
          <button
            onClick={() => { setIsEditing(true); setShowPicker(true); }}
            className="px-3 py-1.5 bg-fab-gold/15 text-fab-gold text-xs font-medium rounded-lg hover:bg-fab-gold/25 transition-colors"
          >
            + Add Card
          </button>
        </div>
      )}

      {/* Add card button */}
      {isEditing && cards.length > 0 && !showPicker && cards.length < MAX_CARDS && (
        <button
          onClick={() => setShowPicker(true)}
          className="w-full py-2 border border-dashed border-fab-border rounded-lg text-xs text-fab-muted hover:text-fab-text hover:border-fab-muted transition-colors"
        >
          + Add Card ({cards.length}/{MAX_CARDS})
        </button>
      )}

      {/* Card limit reached */}
      {isEditing && cards.length >= MAX_CARDS && !showPicker && (
        <p className="text-[10px] text-fab-dim text-center">Maximum {MAX_CARDS} cards</p>
      )}

      {/* Card picker */}
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
        />
      )}
    </div>
  );
}

// ── Card Renderer ──

function ShowcaseCardRenderer({
  card,
  matches,
  heroStats,
  masteries,
  eventStats,
  playoffFinishes,
  opponentStats,
  overall,
  achievements,
}: {
  card: ShowcaseCard;
  matches: MatchRecord[];
  heroStats: HeroStats[];
  masteries: HeroMastery[];
  eventStats: EventStats[];
  playoffFinishes: PlayoffFinishData[];
  opponentStats: OpponentStats[];
  overall: OverallStats;
  achievements: Achievement[];
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
    case "statHighlight": {
      return (
        <StatHighlightCard
          stat={(card.stat || "winRate") as "winRate" | "totalMatches" | "longestWinStreak" | "uniqueHeroes" | "uniqueOpponents" | "eventsPlayed"}
          filter={card.filter}
          overall={overall}
          heroStats={heroStats}
          eventStats={eventStats}
          opponentCount={opponentStats.length}
        />
      );
    }
    case "formatMastery":
      return <FormatMasteryCard matches={matches} />;
    default:
      return <MissingCard label="Unknown card type" />;
  }
}

function MissingCard({ label }: { label: string }) {
  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg px-4 py-3">
      <p className="text-xs text-fab-dim italic">{label}</p>
    </div>
  );
}

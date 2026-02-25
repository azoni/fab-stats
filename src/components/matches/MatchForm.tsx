"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeroSelect } from "@/components/heroes/HeroSelect";
import { useMatches } from "@/hooks/useMatches";
import { MatchResult, GameFormat } from "@/types";

const EVENT_TYPES = [
  "Armory",
  "Skirmish",
  "ProQuest",
  "Road to Nationals",
  "Battle Hardened",
  "The Calling",
  "Nationals",
  "Pro Tour",
  "Worlds",
  "Pre-Release",
  "On Demand",
  "Other",
] as const;

export function MatchForm() {
  const router = useRouter();
  const { addMatch } = useMatches();
  const [heroPlayed, setHeroPlayed] = useState("");
  const [opponentHero, setOpponentHero] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [result, setResult] = useState<MatchResult>(MatchResult.Win);
  const [format, setFormat] = useState<GameFormat>(GameFormat.Blitz);
  const [eventType, setEventType] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!heroPlayed) {
      setError("Please select your hero.");
      return;
    }
    if (!opponentHero) {
      setError("Please select opponent's hero.");
      return;
    }

    addMatch({
      date,
      heroPlayed,
      opponentHero,
      opponentName: opponentName.trim() || undefined,
      result,
      format,
      eventType: eventType || undefined,
      notes: notes.trim() || undefined,
    });

    router.push("/matches");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {error && (
        <div className="bg-fab-loss/10 border border-fab-loss/30 text-fab-loss rounded-md px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-fab-muted mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-fab-surface border border-fab-border rounded-md px-3 py-2 text-fab-text text-sm outline-none focus:border-fab-gold/50"
        />
      </div>

      <HeroSelect
        label="Your Hero"
        value={heroPlayed}
        onChange={setHeroPlayed}
      />

      <HeroSelect
        label="Opponent's Hero"
        value={opponentHero}
        onChange={setOpponentHero}
      />

      <div>
        <label className="block text-sm font-medium text-fab-muted mb-1">
          Opponent Name (optional)
        </label>
        <input
          type="text"
          value={opponentName}
          onChange={(e) => setOpponentName(e.target.value)}
          placeholder="e.g. John, Player123"
          className="w-full bg-fab-surface border border-fab-border rounded-md px-3 py-2 text-fab-text text-sm outline-none focus:border-fab-gold/50 placeholder:text-fab-dim"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-fab-muted mb-2">Result</label>
        <div className="flex gap-2">
          {[
            { value: MatchResult.Win, label: "Win", color: "bg-fab-win" },
            { value: MatchResult.Loss, label: "Loss", color: "bg-fab-loss" },
            { value: MatchResult.Draw, label: "Draw", color: "bg-fab-draw" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setResult(opt.value)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all border ${
                result === opt.value
                  ? `${opt.color} text-white border-transparent`
                  : "bg-fab-surface text-fab-muted border-fab-border hover:border-fab-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-fab-muted mb-1">Format</label>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as GameFormat)}
          className="w-full bg-fab-surface border border-fab-border rounded-md px-3 py-2 text-fab-text text-sm outline-none focus:border-fab-gold/50"
        >
          {Object.values(GameFormat).map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-fab-muted mb-1">Event Type (optional)</label>
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="w-full bg-fab-surface border border-fab-border rounded-md px-3 py-2 text-fab-text text-sm outline-none focus:border-fab-gold/50"
        >
          <option value="">None</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-fab-muted mb-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did the match go?"
          rows={3}
          className="w-full bg-fab-surface border border-fab-border rounded-md px-3 py-2 text-fab-text text-sm outline-none focus:border-fab-gold/50 placeholder:text-fab-dim resize-none"
        />
      </div>

      <button
        type="submit"
        className="w-full py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
      >
        Log Match
      </button>
    </form>
  );
}

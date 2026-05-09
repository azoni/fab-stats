"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { HeroSelect } from "@/components/heroes/HeroSelect";
import { useMatches } from "@/hooks/useMatches";
import { normalizeOpponentName } from "@/lib/stats";
import { MatchResult, GameFormat } from "@/types";
import { EVENT_TYPES } from "@/lib/event-types";

export function MatchForm() {
  const router = useRouter();
  const { addMatch, matches } = useMatches();
  const [heroPlayed, setHeroPlayed] = useState("");
  const [opponentHero, setOpponentHero] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [heroAutoFilled, setHeroAutoFilled] = useState(false);
  const [result, setResult] = useState<MatchResult>(MatchResult.Win);
  const [format, setFormat] = useState<GameFormat>(GameFormat.Blitz);
  const [eventType, setEventType] = useState("Practice");
  const [goingFirst, setGoingFirst] = useState<boolean | undefined>(undefined);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [matchNotes, setMatchNotes] = useState("");
  const [error, setError] = useState("");

  // Map normalized opponent names to their most recently played hero
  const opponentHeroMap = useMemo(() => {
    const map = new Map<string, string>();
    const sorted = [...matches].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    for (const m of sorted) {
      const name = m.opponentName ? normalizeOpponentName(m.opponentName) : "";
      if (name && !map.has(name) && m.opponentHero && m.opponentHero !== "Unknown") {
        map.set(name, m.opponentHero);
      }
    }
    return map;
  }, [matches]);

  // Track whether the user has manually picked a hero
  const userPickedHero = useRef(false);

  // Auto-fill opponent hero when name matches a previous opponent
  useEffect(() => {
    if (userPickedHero.current) return;
    const name = opponentName.trim() ? normalizeOpponentName(opponentName) : "";
    if (!name) return;
    const previousHero = opponentHeroMap.get(name);
    if (previousHero) {
      setOpponentHero(previousHero);
      setHeroAutoFilled(true);
    }
  }, [opponentName, opponentHeroMap]);

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
      eventType: eventType || "Practice",
      goingFirst,
      matchNotes: matchNotes.trim() || undefined,
      source: "manual",
    });

    router.push("/matches");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
      {error && (
        <div className="bg-fab-loss/10 border border-fab-loss/30 text-fab-loss rounded-md px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-fab-border bg-fab-surface/85 p-4">
        <div className="flex flex-col gap-1 border-b border-fab-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-fab-text">Practice Match</p>
            <p className="mt-1 text-xs text-fab-muted">Manual logs default to Practice so casual testing stays separate from imported events.</p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-fab-border bg-fab-bg/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-fab-gold">
            Manual Entry
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-fab-muted mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-fab-bg border border-fab-border rounded-md px-3 py-2 text-fab-text text-sm outline-none focus:border-fab-gold/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fab-muted mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as GameFormat)}
              className="w-full bg-fab-bg border border-fab-border rounded-md px-3 py-2 text-fab-text text-sm outline-none focus:border-fab-gold/50"
            >
              {Object.values(GameFormat).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-fab-border bg-fab-surface/85 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <HeroSelect
            label="Your Hero"
            value={heroPlayed}
            onChange={setHeroPlayed}
            format={format}
          />

          <HeroSelect
            label="Opponent's Hero"
            value={opponentHero}
            onChange={(hero) => {
              setOpponentHero(hero);
              userPickedHero.current = true;
              setHeroAutoFilled(false);
            }}
            format={format}
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-fab-muted mb-1">
            Opponent Name (optional)
          </label>
          <input
            type="text"
            value={opponentName}
            onChange={(e) => setOpponentName(e.target.value)}
            placeholder="e.g. John, Player123"
            className="w-full bg-fab-bg border border-fab-border rounded-md px-3 py-2 text-fab-text text-sm outline-none focus:border-fab-gold/50 placeholder:text-fab-dim"
          />
          {heroAutoFilled && opponentHero && (
            <p className="text-xs text-fab-dim mt-1">
              Auto-filled hero: {opponentHero}
              <button
                type="button"
                onClick={() => { setOpponentHero(""); setHeroAutoFilled(false); userPickedHero.current = false; }}
                className="ml-2 text-fab-gold hover:underline"
              >
                Clear
              </button>
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-fab-border bg-fab-surface/85 p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
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
                      : "bg-fab-bg text-fab-muted border-fab-border hover:border-fab-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fab-muted mb-2">Turn Order</label>
            <div className="flex gap-2">
              {([
                { value: true, label: "First", active: "bg-blue-500/20 text-blue-300 border-blue-400/50" },
                { value: false, label: "Second", active: "bg-purple-500/20 text-purple-300 border-purple-400/50" },
                { value: undefined, label: "Not Sure", active: "bg-fab-bg text-fab-text border-fab-border" },
              ] as const).map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setGoingFirst(opt.value)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold transition-all border ${
                    goingFirst === opt.value
                      ? opt.active
                      : "bg-fab-bg text-fab-muted border-fab-border hover:border-fab-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-fab-muted mb-1">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full bg-fab-bg border border-fab-border rounded-md px-3 py-2 text-fab-text text-sm outline-none focus:border-fab-gold/50"
            >
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
              value={matchNotes}
              onChange={(e) => setMatchNotes(e.target.value)}
              placeholder="Sideboard notes, matchup takeaways, etc."
              rows={3}
              className="w-full bg-fab-bg border border-fab-border rounded-md px-3 py-2 text-fab-text text-sm outline-none focus:border-fab-gold/50 placeholder:text-fab-dim resize-none"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-3 rounded-lg font-black bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
      >
        Log Match
      </button>
    </form>
  );
}

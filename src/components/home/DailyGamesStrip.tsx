"use client";

/**
 * Slim daily-games bar for the logged-in home. The logged-OUT home advertises
 * the games; the logged-in home never mentioned them, so the daily loop only
 * existed for people who found the Extras tab. localStorage-only — no reads.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Gamepad2 } from "lucide-react";
import { VISIBLE_GAMES } from "@/lib/games";
import { completedOn, computeOverallStreak, getTodayDateStr } from "@/lib/games/streak";

export function DailyGamesStrip() {
  const [state, setState] = useState<{ done: number; streak: number } | null>(null);

  useEffect(() => {
    try {
      const today = getTodayDateStr();
      const done = VISIBLE_GAMES.filter((g) => completedOn(g.slug, today)).length;
      setState({ done, streak: computeOverallStreak() });
    } catch {
      setState({ done: 0, streak: 0 });
    }
  }, []);

  if (!state) return null;
  const total = VISIBLE_GAMES.length;
  const allDone = state.done >= total;

  return (
    <Link
      href="/games"
      className="flex items-center gap-3 rounded-lg border border-fab-border bg-fab-surface px-4 py-2.5 transition-colors hover:border-fab-gold/40"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-fab-gold/25 bg-fab-gold/10 text-fab-gold">
        <Gamepad2 className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-sm text-fab-text">
        <span className="font-semibold">Daily games</span>{" "}
        <span className="text-fab-muted">
          {allDone
            ? `— all ${total} done today`
            : state.done > 0
              ? `— ${state.done} of ${total} played, ${total - state.done} left`
              : "— today's puzzles are up"}
        </span>
        {state.streak > 1 && <span className="ml-1.5 text-fab-gold">🔥 {state.streak}-day streak</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-fab-dim" />
    </Link>
  );
}

/**
 * One place to tell the player a daily-game result failed to save. Every game
 * used to swallow save errors into console.error / empty catches — a flaky
 * connection at the moment of victory silently dropped the streak, leaderboard
 * entry, and achievements while the win screen celebrated. Deduped per page
 * load so a cascade of failures doesn't stack toasts.
 */
import { toast } from "sonner";

// Time-window dedupe, NOT a one-shot: the module survives client-side
// navigation for the whole SPA session, so a boolean would warn once and then
// silently swallow every later game's failure (the exact bug being fixed).
let lastToastAt = 0;
const DEDUPE_MS = 60_000;

export function notifyGameSaveFailure(err?: unknown): void {
  if (err) console.error("[game-save]", err);
  const now = Date.now();
  if (now - lastToastAt < DEDUPE_MS) return;
  lastToastAt = now;
  toast.error("Couldn't save your result — check your connection and reload to retry.", {
    duration: 8000,
  });
}

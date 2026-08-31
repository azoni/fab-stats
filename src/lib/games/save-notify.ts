/**
 * One place to tell the player a daily-game result failed to save. Every game
 * used to swallow save errors into console.error / empty catches — a flaky
 * connection at the moment of victory silently dropped the streak, leaderboard
 * entry, and achievements while the win screen celebrated. Deduped per page
 * load so a cascade of failures doesn't stack toasts.
 */
import { toast } from "sonner";

let notified = false;

export function notifyGameSaveFailure(err?: unknown): void {
  if (err) console.error("[game-save]", err);
  if (notified) return;
  notified = true;
  toast.error("Couldn't save your result — check your connection and reload to retry.", {
    duration: 8000,
  });
}

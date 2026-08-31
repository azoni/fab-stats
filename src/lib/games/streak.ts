/**
 * Overall daily-play streak helpers, shared by the games hub and the daily
 * share card. localStorage-based: consecutive days on which at least one
 * visible game was completed. Free + client-side — no Firestore reads.
 */
import { VISIBLE_GAMES } from "@/lib/games";

export function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

export function dateOffsetStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function completedOn(slug: string, dateStr: string): boolean {
  try {
    const raw = localStorage.getItem(`${slug}-${dateStr}`);
    // Games persist state on the first move, so key-existence over-counts
    // abandoned games as "done". Require an explicit completion flag.
    return raw ? JSON.parse(raw).completed === true : false;
  } catch {
    return false;
  }
}

export function playedAnyOn(dateStr: string): boolean {
  return VISIBLE_GAMES.some((g) => completedOn(g.slug, dateStr));
}

/**
 * Consecutive days with at least one game completed. Counts today if done,
 * and doesn't break until a full day is actually missed (an as-yet-unplayed
 * today still shows the streak earned through yesterday).
 */
export function computeOverallStreak(): number {
  if (typeof window === "undefined") return 0;
  const today = getTodayDateStr();
  let cursor = playedAnyOn(today) ? today : dateOffsetStr(today, -1);
  let streak = 0;
  for (let i = 0; i < 400 && playedAnyOn(cursor); i++) {
    streak++;
    cursor = dateOffsetStr(cursor, -1);
  }
  return streak;
}

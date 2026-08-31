/**
 * Server-persisted daily-game activity: which UTC dates a user completed at
 * least one game on. Backs the cross-game day streak (previously localStorage
 * only, so it silently died on a new device or cleared browser) and the
 * calendar on /games.
 *
 * Doc: users/{uid}/gameActivity/main → { dates: { "2026-08-31": true, ... } }
 * Written on every game completion (syncAchievementsAfterGame) and topped up
 * from the local 400-day localStorage view so existing streaks carry over.
 */
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GAMES } from "@/lib/games";
import { completedOn, dateOffsetStr, getTodayDateStr } from "@/lib/games/streak";

function activityDoc(uid: string) {
  return doc(db, "users", uid, "gameActivity", "main");
}

// NOTE: there is deliberately no "mark today played" helper. Play dates are
// derived from each puzzle's localStorage completion key (mergeLocalDatesToServer),
// so a game started before UTC midnight and finished after it credits the
// puzzle's own day — a completion-time stamp would credit a phantom second day.

/** All played dates recorded server-side, ascending. */
export async function loadPlayedDates(uid: string): Promise<string[]> {
  try {
    const snap = await getDoc(activityDoc(uid));
    if (!snap.exists()) return [];
    const dates = (snap.data().dates ?? {}) as Record<string, unknown>;
    return Object.keys(dates)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();
  } catch {
    return [];
  }
}

/** Dates visible in THIS browser's localStorage (games keep ~400 days). */
export function localPlayedDates(maxDays = 400): string[] {
  if (typeof window === "undefined") return [];
  const out: string[] = [];
  const today = getTodayDateStr();
  // Hidden games count too — a completion is a completion.
  const slugs = GAMES.map((g) => g.slug);
  for (let i = 0; i < maxDays; i++) {
    const d = dateOffsetStr(today, -i);
    for (const slug of slugs) {
      if (completedOn(slug, d)) {
        out.push(d);
        break;
      }
    }
  }
  return out.sort();
}

/**
 * One-shot merge of local localStorage dates into the server doc (so streaks
 * earned before server tracking carry over). Skips the write when the server
 * already covers everything local knows.
 */
export async function mergeLocalDatesToServer(uid: string): Promise<string[]> {
  const [server, local] = [await loadPlayedDates(uid), localPlayedDates()];
  const serverSet = new Set(server);
  const missing = local.filter((d) => !serverSet.has(d));
  if (missing.length > 0) {
    const patch: Record<string, boolean> = {};
    for (const d of missing) patch[d] = true;
    await setDoc(
      activityDoc(uid),
      { dates: patch, updatedAt: new Date().toISOString() },
      { merge: true },
    ).catch(() => {});
  }
  return [...new Set([...server, ...local])].sort();
}

/**
 * Consecutive-day streak over a set of played dates. Counts today if played;
 * doesn't break until a full day is missed (same semantics as the old
 * localStorage streak).
 */
export function computeStreakFromDates(dates: Iterable<string>): number {
  const set = new Set(dates);
  const today = getTodayDateStr();
  let cursor = set.has(today) ? today : dateOffsetStr(today, -1);
  let streak = 0;
  for (let i = 0; i < 4000 && set.has(cursor); i++) {
    streak++;
    cursor = dateOffsetStr(cursor, -1);
  }
  return streak;
}

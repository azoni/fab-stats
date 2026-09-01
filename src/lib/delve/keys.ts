/**
 * Daily key refill — pure client math, no cron. Keys bank: 3 granted per UTC
 * day since the last refill stamp, capped at 9 (owner decision — missing a
 * weekend costs nothing). Keys are never purchasable.
 */
import type { DelveCharacter } from "./types";
import { getTodayDateStr } from "@/lib/games/date";
import { KEYS_PER_DAY, KEYS_BANK_CAP } from "./balance";

function daysBetweenUtc(fromDate: string, toDate: string): number {
  const [fy, fm, fd] = fromDate.split("-").map(Number);
  const [ty, tm, td] = toDate.split("-").map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/** Apply any pending refill. Returns keys gained (0 if none). Mutates the copy. */
export function refillKeys(character: DelveCharacter): number {
  const today = getTodayDateStr();
  if (!character.keys.lastRefill) {
    character.keys = { n: KEYS_PER_DAY, lastRefill: today };
    return KEYS_PER_DAY;
  }
  const days = daysBetweenUtc(character.keys.lastRefill, today);
  if (days <= 0) return 0;
  const before = character.keys.n;
  character.keys.n = Math.min(KEYS_BANK_CAP, character.keys.n + KEYS_PER_DAY * days);
  character.keys.lastRefill = today;
  return character.keys.n - before;
}

/** Whether today's Daily Delve is still available. */
export function dailyAvailable(character: DelveCharacter): boolean {
  return !(character.daily.done && character.daily.date === getTodayDateStr());
}

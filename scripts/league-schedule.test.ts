/**
 * League scheduled-sessions qualification test — `npx tsx scripts/league-schedule.test.ts`.
 * Mirrors the venue/date/session gate of matchQualifiesForLeague + buildSessionKeys
 * (src/lib/leagues-scoring.ts) — keep in sync if that changes. Uses an identity
 * alias expansion (no admin store merges). Legacy path = store-in-list + global
 * window; scheduled path = exact (store, date) pairings only.
 */
type Session = { storeSlug: string; date: string };

// mirror: slugifyStoreName (store-directory.ts)
const slugify = (raw: string) => raw.toLowerCase().replace(/[^a-z0-9]/g, "");
// mirror: buildSessionKeys (identity alias expansion)
const buildSessionKeys = (sessions: Session[]) => new Set(sessions.map((s) => `${s.storeSlug}|${s.date}`));
// mirror: the venue/date/session branch of matchQualifiesForLeague
function qualifies(
  venue: string,
  date: string,
  opts: { storeSet: Set<string>; startDate: string; endDate: string; sessionKeys?: Set<string> | null },
): boolean {
  const slug = slugify(venue);
  const matchDate = (date || "").slice(0, 10);
  if (!matchDate) return false;
  if (opts.sessionKeys) return opts.sessionKeys.has(`${slug}|${matchDate}`);
  if (!opts.storeSet.has(slug)) return false;
  if (matchDate < opts.startDate) return false;
  if (matchDate > opts.endDate) return false;
  return true;
}

let fail = 0;
const check = (name: string, cond: boolean) => { console.log(`  ${cond ? "✓" : "✗"} ${name}`); if (!cond) fail++; };
const storeSet = new Set(["storea", "storeb"]);
const win = { storeSet, startDate: "2026-07-01", endDate: "2026-07-31", sessionKeys: null as Set<string> | null };

console.log("1. Legacy (no schedule): store in list AND date in window");
check("Store A on an in-window day counts", qualifies("Store A", "2026-07-05", win));
check("Store A out of window does NOT", !qualifies("Store A", "2026-08-05", win));
check("Non-league store does NOT", !qualifies("Store C", "2026-07-05", win));

console.log("\n2. Scheduled sessions: only exact (store, date) pairings count");
const keys = buildSessionKeys([{ storeSlug: "storea", date: "2026-07-05" }, { storeSlug: "storeb", date: "2026-07-12" }]);
const sch = { ...win, sessionKeys: keys };
check("Store A on its scheduled date counts", qualifies("Store A", "2026-07-05", sch));
check("Store A on a NON-scheduled in-window date does NOT", !qualifies("Store A", "2026-07-12", sch));
check("Store B on ITS scheduled date counts", qualifies("Store B", "2026-07-12", sch));
check("Store B on Store A's date does NOT", !qualifies("Store B", "2026-07-05", sch));

// ---- Per-event min floor + attendance (mirror: eventScore/scoreMatches, leagues-scoring.ts) ----
type Rules = { minPointsPerEvent?: number; pointsPerEvent?: number };
const usesEventScoring = (r: Rules) => (r.minPointsPerEvent || 0) > 0 || (r.pointsPerEvent || 0) > 0;
const eventScore = (earned: number, r: Rules) => Math.max(earned, r.minPointsPerEvent || 0) + (r.pointsPerEvent || 0);
// events = list of events, each the list of per-match points earned at that event
const scoreEvents = (events: number[][], r: Rules): number => {
  if (!usesEventScoring(r)) return events.flat().reduce((a, b) => a + b, 0);
  return events.reduce((tot, ev) => tot + eventScore(ev.reduce((a, b) => a + b, 0), r), 0);
};

console.log("\n3. Minimum per event (a floor, NOT additive) — pointsPerWin=1, min=1");
const floor: Rules = { minPointsPerEvent: 1 };
check("0 wins → floor gives 1", scoreEvents([[]], floor) === 1); // winless attendee
check("1 win → still 1 (min replaces, not adds)", scoreEvents([[1]], floor) === 1);
check("2 wins → 2 (earned beats the floor)", scoreEvents([[1, 1]], floor) === 2);
check("floor is PER event: two winless events → 2", scoreEvents([[], []], floor) === 2);

console.log("\n4. Attendance points (added ON TOP) — pointsPerWin=1, attendance=2");
const att: Rules = { pointsPerEvent: 2 };
check("1 win at one event → 1 + 2 = 3", scoreEvents([[1]], att) === 3);
check("attendance is PER event: two 1-win events → 6", scoreEvents([[1], [1]], att) === 6);

console.log("\n5. Floor AND attendance together — min=1, attendance=2");
const both: Rules = { minPointsPerEvent: 1, pointsPerEvent: 2 };
check("winless event → max(0,1)+2 = 3", scoreEvents([[]], both) === 3);
check("3-win event → max(3,1)+2 = 5", scoreEvents([[1, 1, 1]], both) === 5);

console.log("\n6. Neither set → plain sum of match points (NO hidden 0-floor)");
const plain: Rules = {};
check("two events [1,1] and [1] → 3", scoreEvents([[1, 1], [1]], plain) === 3);
// Regression: with the feature OFF, a negative event total (e.g. penalized losses,
// win=3/loss=-1 → +3-4 = -1) must NOT be clamped to 0. Both standings paths sum raw.
check("negative event with feature off stays negative → -1", scoreEvents([[3, -1, -1, -1, -1]], plain) === -1);

console.log(`\n${fail === 0 ? "ALL PASS ✓" : fail + " FAILURE(S) ✗"}\n`);
process.exit(fail === 0 ? 0 : 1);

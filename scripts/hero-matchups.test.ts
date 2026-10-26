/** Run with `tsx scripts/hero-matchups.test.ts`; no Firebase or browser required. */
import assert from "node:assert/strict";
import { test } from "node:test";
import type { HeroMatchupDoc } from "@/types";
import { aggregateCommunityHeroMatchups, getMonthsForPreset } from "@/lib/hero-matchup-data";

const now = new Date("2026-10-26T01:00:00.000Z");

test("only the all-time preset produces the unbounded month sentinel", () => {
  assert.deepEqual(getMonthsForPreset("all", now), []);
  assert.deepEqual(getMonthsForPreset("custom:2026-10-26:2026-10-26", now), ["2026-10"]);
});

test("custom ranges include the end month even when its day is earlier", () => {
  assert.deepEqual(getMonthsForPreset("custom:2026-07-28:2026-10-26", now), [
    "2026-07",
    "2026-08",
    "2026-09",
    "2026-10",
  ]);
});

test("January 31 cannot skip February or a March 1 endpoint", () => {
  assert.deepEqual(getMonthsForPreset("custom:2026-01-31:2026-03-01", now), ["2026-01", "2026-02", "2026-03"]);
});

test("valid leap days and year boundaries retain every included month", () => {
  assert.deepEqual(getMonthsForPreset("custom:2023-12-31:2024-02-29", now), ["2023-12", "2024-01", "2024-02"]);
});

for (const preset of [
  "custom:2026-10-26:2026-10-25",
  "custom:2026-11-01:2026-10-31",
  "custom:2026-02-29:2026-03-01",
  "custom:2026-02-30:2026-03-01",
  "custom:2026-13-01:2027-01-01",
  "custom:2026-10-00:2026-10-31",
  "custom:2026-1-01:2026-10-31",
  "custom::2026-10-31",
  "custom:2026-10-01:",
  "custom:2026-10-01:2026-10-31:extra",
  "custom:invalid:2026-10-31",
]) {
  test(`invalid range throws instead of requesting all time: ${preset}`, () => {
    assert.throws(() => getMonthsForPreset(preset, now), RangeError);
  });
}

test("legacy rolling presets retain their calendar-month windows in UTC", () => {
  // This instant is still February in UTC, even though the input says March.
  const boundary = new Date("2026-03-01T00:30:00+14:00");
  assert.deepEqual(getMonthsForPreset("30d", boundary), ["2026-01", "2026-02"]);
  assert.deepEqual(getMonthsForPreset("90d", boundary), ["2025-12", "2026-01", "2026-02"]);
  assert.deepEqual(getMonthsForPreset("current", boundary), ["2026-02"]);
  assert.equal(boundary.toISOString(), "2026-02-28T10:30:00.000Z");
});

function tally(hero1Wins: number, hero2Wins: number, draws = 0) {
  return {
    hero1Wins,
    hero2Wins,
    draws,
    total: hero1Wins + hero2Wins + draws,
  };
}

function doc(overrides: Partial<HeroMatchupDoc> = {}): HeroMatchupDoc {
  return {
    hero1: "Bravo, Showstopper",
    hero2: "Dorinthea Ironsong",
    month: "2026-10",
    ...tally(13, 6, 1),
    byFormat: {
      "Classic Constructed": tally(4, 5, 1),
      Blitz: tally(9, 1),
    },
    byEventType: { Armory: tally(10, 4, 1), ProQuest: tally(3, 2) },
    byFormatEventType: {
      "Classic Constructed": {
        Armory: tally(1, 3, 1),
        ProQuest: tally(3, 2),
      },
      Blitz: { Armory: tally(9, 1) },
    },
    byRated: { rated: tally(3, 2), unrated: tally(10, 4, 1) },
    updatedAt: "2026-10-26T00:00:00.000Z",
    ...overrides,
  };
}

function expected(record: HeroMatchupDoc, counts: ReturnType<typeof tally>) {
  return { hero1: record.hero1, hero2: record.hero2, ...counts };
}

test("format and event intersection includes only matching-format events", () => {
  const record = doc();
  assert.deepEqual(aggregateCommunityHeroMatchups([record], "Classic Constructed", undefined, "Armory"), [
    expected(record, tally(1, 3, 1)),
  ]);
});

test("missing format/event intersection never falls back to broader event totals", () => {
  const intersections: HeroMatchupDoc["byFormatEventType"][] = [
    undefined,
    {},
    { Blitz: { Armory: tally(9, 1) } },
    { "Classic Constructed": { ProQuest: tally(3, 2) } },
  ];
  for (const byFormatEventType of intersections) {
    assert.deepEqual(
      aggregateCommunityHeroMatchups([doc({ byFormatEventType })], "Classic Constructed", undefined, "Armory"),
      [],
    );
  }
});

test("available intersections aggregate across months without admitting legacy broad totals", () => {
  const october = doc();
  const september = doc({ month: "2026-09" });
  const legacy = doc({ month: "2026-08", byFormatEventType: undefined });
  const records = [october, september, legacy];
  const before = JSON.stringify(records);
  assert.deepEqual(aggregateCommunityHeroMatchups(records, "Classic Constructed", undefined, "Armory"), [
    expected(october, tally(2, 6, 2)),
  ]);
  assert.equal(JSON.stringify(records), before);
});

test("single dimensions and unfiltered totals retain their original meanings", () => {
  const record = doc();
  assert.deepEqual(aggregateCommunityHeroMatchups([record]), [expected(record, tally(13, 6, 1))]);
  assert.deepEqual(aggregateCommunityHeroMatchups([record], "Blitz"), [expected(record, tally(9, 1))]);
  assert.deepEqual(aggregateCommunityHeroMatchups([record], undefined, "rated"), [expected(record, tally(3, 2))]);
  assert.deepEqual(aggregateCommunityHeroMatchups([record], undefined, "unrated"), [expected(record, tally(10, 4, 1))]);
  assert.deepEqual(aggregateCommunityHeroMatchups([record], undefined, undefined, "Armory"), [
    expected(record, tally(10, 4, 1)),
  ]);
});

test("format case and event aliases still resolve within the exact intersection", () => {
  const record = doc({
    byFormatEventType: { "classic constructed": { PQ: tally(2, 3) } },
  });
  assert.deepEqual(aggregateCommunityHeroMatchups([record], "Classic Constructed", undefined, "ProQuest"), [
    expected(record, tally(2, 3)),
  ]);
});

test("distinct pairs retain orientation, draws and exact totals across months", () => {
  const first = doc({ hero1: "A_B", hero2: "C" });
  const second = doc({ hero1: "A", hero2: "B_C", ...tally(2, 7, 3) });
  assert.deepEqual(aggregateCommunityHeroMatchups([first, { ...first, month: "2026-09", ...tally(1, 2, 3) }, second]), [
    expected(first, tally(14, 8, 4)),
    expected(second, tally(2, 7, 3)),
  ]);
});

test("missing and zero-count dimensions return no invented cells", () => {
  assert.deepEqual(aggregateCommunityHeroMatchups([], "Blitz"), []);
  assert.deepEqual(aggregateCommunityHeroMatchups([doc({ byRated: undefined })], undefined, "rated"), []);
  assert.deepEqual(aggregateCommunityHeroMatchups([doc({ ...tally(0, 0, 0), byFormat: undefined })]), []);
  assert.deepEqual(aggregateCommunityHeroMatchups([doc()], "Draft"), []);
});

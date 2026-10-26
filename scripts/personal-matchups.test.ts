/** Run with `tsx scripts/personal-matchups.test.ts`; deterministic synthetic records only. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { GameFormat, MatchResult, type MatchRecord } from "@/types";
import { getMatchEventKey, getMatchOpponentKey } from "@/lib/match-history";
import {
  DEFAULT_MATCHUP_FILTERS,
  getPersonalMatchups,
  hasKnownHeroes,
  readMatchupFilters,
  writeMatchupFilters,
  type MatchupFilters,
} from "@/lib/personal-matchups";

const hero = "Dorinthea Ironsong";
const opponentHero = "Bravo, Showstopper";

function match(id: string, overrides: Partial<MatchRecord> = {}): MatchRecord {
  return {
    id,
    date: "2026-10-23",
    heroPlayed: hero,
    opponentHero,
    opponentName: "Alex Rivera",
    opponentGemId: "1001",
    result: MatchResult.Win,
    format: GameFormat.ClassicConstructed,
    notes: "Friday Armory | Round 1",
    venue: "Haven Card Hall",
    eventType: "Armory",
    rated: true,
    createdAt: "2026-10-24T01:00:00.000Z",
    ...overrides,
  };
}

function filters(overrides: Partial<MatchupFilters> = {}): MatchupFilters {
  return { ...DEFAULT_MATCHUP_FILTERS, ...overrides };
}

function ids(records: MatchRecord[], selected: Partial<MatchupFilters> = {}) {
  return getPersonalMatchups(records, filters(selected)).records.map((record) => record.id);
}

test("one shared record set reconciles hero and pair totals, draws and byes", () => {
  const records = [
    match("win"),
    match("loss", { result: MatchResult.Loss }),
    match("draw", { result: MatchResult.Draw }),
    match("bye", { result: MatchResult.Bye }),
    match("other-pair", { opponentHero: "Fai, Rising Rebellion" }),
    match("other-hero", { heroPlayed: "Katsu, the Wanderer" }),
  ];
  const result = getPersonalMatchups(records, filters());
  assert.equal(result.records.length, 5);
  assert.equal(result.missingHeroes, 0);
  assert.equal(
    result.heroStats.reduce((total, stat) => total + stat.totalMatches, 0),
    result.records.length,
  );
  for (const stat of result.heroStats) {
    assert.equal(stat.totalMatches, stat.wins + stat.losses + stat.draws);
    assert.equal(
      stat.matchups.reduce((total, pair) => total + pair.totalMatches, 0),
      stat.totalMatches,
    );
    for (const pair of stat.matchups) {
      const detailRecords = result.records.filter(
        (record) => record.heroPlayed === stat.heroName && record.opponentHero === pair.opponentHero,
      );
      assert.equal(detailRecords.length, pair.totalMatches);
      assert.equal(pair.totalMatches, pair.wins + pair.losses + pair.draws);
    }
  }
  const pair = result.heroStats
    .find((stat) => stat.heroName === hero)!
    .matchups.find((entry) => entry.opponentHero === opponentHero)!;
  assert.deepEqual([pair.wins, pair.losses, pair.draws, pair.totalMatches], [1, 1, 1, 3]);
  assert.ok(Math.abs(pair.winRate - 100 / 3) < 1e-10);
});

test("missing-hero coverage counts only non-byes in the active filter scope", () => {
  const records = [
    match("known"),
    match("missing-own", { heroPlayed: "" }),
    match("missing-opponent", { opponentHero: undefined }),
    match("unknown", { opponentHero: " Unknown " }),
    match("both-missing", { heroPlayed: "unknown", opponentHero: "  " }),
    match("missing-bye", {
      heroPlayed: "",
      opponentHero: undefined,
      result: MatchResult.Bye,
    }),
    match("outside-scope", {
      opponentHero: undefined,
      format: GameFormat.Blitz,
    }),
  ];
  const result = getPersonalMatchups(records, filters({ format: GameFormat.ClassicConstructed }));
  assert.deepEqual(
    result.records.map((record) => record.id),
    ["known"],
  );
  assert.equal(result.missingHeroes, 4);
  assert.equal(result.heroStats[0].totalMatches, 1);
});

test("young, Living Legend and historical hero names remain available", () => {
  const records = [
    match("young", {
      heroPlayed: "Dorinthea",
      opponentHero: "Rhinar",
      format: GameFormat.Blitz,
    }),
    match("living-legend", {
      heroPlayed: "Bravo, Star of the Show",
      opponentHero: "Prism, Sculptor of Arc Light",
      format: GameFormat.LivingLegend,
    }),
    // Historical imports can contain labels absent from the current hero manifest.
    match("historical", {
      heroPlayed: "Archived Hero Label",
      opponentHero: "Archived Opponent Label",
      date: "2020-01-01",
    }),
  ];
  const result = getPersonalMatchups(records, filters());
  assert.deepEqual(
    new Set(result.records.map((record) => record.id)),
    new Set(["young", "living-legend", "historical"]),
  );
  assert.equal(result.heroStats.length, 3);
  assert.equal(result.missingHeroes, 0);
});

test("personal pairs are directional and do not include the reverse matchup", () => {
  const records = [
    match("forward"),
    match("reverse", { heroPlayed: opponentHero, opponentHero: hero }),
    match("other-opponent", { opponentHero: "Fai, Rising Rebellion" }),
    match("other-own", { heroPlayed: "Katsu, the Wanderer" }),
  ];
  assert.deepEqual(ids(records, { hero, opponentHero }), ["forward"]);
  assert.deepEqual(ids(records, { hero: opponentHero, opponentHero: hero }), ["reverse"]);
});

test("hero, opponent, player, event, format, type, dates and rating compose with AND", () => {
  const target = match("target");
  const records = [
    target,
    match("other-own", { heroPlayed: "Katsu, the Wanderer" }),
    match("other-opponent", { opponentHero: "Fai, Rising Rebellion" }),
    match("same-name-other-player", { opponentGemId: "1002" }),
    match("other-event", { notes: "Saturday Armory | Round 1" }),
    match("same-event-other-venue", { venue: "Another Card Hall" }),
    match("other-format", { format: GameFormat.Blitz }),
    match("other-type", { eventTypeOverride: "ProQuest" }),
    match("before", { date: "2026-10-22" }),
    match("after", { date: "2026-10-24" }),
    match("unrated", { rated: false }),
    match("rating-missing", { rated: undefined }),
    match("bye", { result: MatchResult.Bye }),
  ];
  assert.deepEqual(
    ids(records, {
      hero,
      opponentHero,
      opponent: getMatchOpponentKey(target),
      event: getMatchEventKey(target),
      format: GameFormat.ClassicConstructed,
      eventType: "Armory",
      from: target.date,
      to: target.date,
      rated: "rated",
    }),
    ["target"],
  );
});

test("unrated includes false and legacy missing rating, while rated is explicit", () => {
  const records = [match("rated"), match("unrated", { rated: false }), match("legacy", { rated: undefined })];
  assert.deepEqual(ids(records, { rated: "rated" }), ["rated"]);
  assert.deepEqual(new Set(ids(records, { rated: "unrated" })), new Set(["unrated", "legacy"]));
});

test("one-sided and two-sided dates are inclusive and reversed ranges stay empty", () => {
  const records = [
    match("before", { date: "2026-10-01" }),
    match("start", { date: "2026-10-02" }),
    match("end", { date: "2026-10-03" }),
    match("after", { date: "2026-10-04" }),
  ];
  assert.deepEqual(ids(records, { from: "2026-10-02" }), ["after", "end", "start"]);
  assert.deepEqual(ids(records, { to: "2026-10-03" }), ["end", "start", "before"]);
  assert.deepEqual(ids(records, { from: "2026-10-02", to: "2026-10-03" }), ["end", "start"]);
  assert.deepEqual(ids(records, { from: "2026-10-03", to: "2026-10-02" }), []);
});

test("stale hero, player and event selections never broaden into all records", () => {
  const records = [match("known")];
  assert.deepEqual(ids(records, { hero: "Unavailable Hero" }), []);
  assert.deepEqual(ids(records, { opponent: "gem:9999" }), []);
  assert.deepEqual(ids(records, { event: '["Unavailable event"]' }), []);
});

test("empty or all-incomplete history has no invented hero statistics", () => {
  assert.deepEqual(getPersonalMatchups([], filters()), {
    records: [],
    heroStats: [],
    missingHeroes: 0,
  });
  const result = getPersonalMatchups([match("unknown", { heroPlayed: "Unknown" })], filters());
  assert.deepEqual(result.heroStats, []);
  assert.deepEqual(result.records, []);
  assert.equal(result.missingHeroes, 1);
  assert.equal(hasKnownHeroes(match("blank", { opponentHero: "\t" })), false);
});

test("filtering does not mutate records or the default filter object", () => {
  const records = [match("old", { date: "2026-10-01" }), match("recent")];
  const before = JSON.stringify(records);
  const defaults = JSON.stringify(DEFAULT_MATCHUP_FILTERS);
  getPersonalMatchups(records, filters({ hero, rated: "rated" }));
  assert.equal(JSON.stringify(records), before);
  assert.equal(JSON.stringify(DEFAULT_MATCHUP_FILTERS), defaults);
});

test("URL round trip preserves all matchup selections and unrelated parameters", () => {
  const record = match("selected");
  const selected = filters({
    hero,
    opponentHero,
    opponent: getMatchOpponentKey(record),
    event: getMatchEventKey(record),
    format: GameFormat.ClassicConstructed,
    eventType: "Armory",
    from: "2026-10-01",
    to: "2026-10-26",
    rated: "rated",
    view: "grid",
    order: "worst",
  });
  const existing = new URLSearchParams("tab=personal&utm_source=friend&utm_source=team");
  const before = existing.toString();
  const written = writeMatchupFilters(selected, existing);
  assert.deepEqual(readMatchupFilters(new URLSearchParams(written.toString())), selected);
  assert.equal(written.get("tab"), "personal");
  assert.deepEqual(written.getAll("utm_source"), ["friend", "team"]);
  assert.equal(existing.toString(), before);
});

test("URL defaults and reset are complete, without retaining old filter state", () => {
  const parsed = readMatchupFilters(new URLSearchParams());
  assert.deepEqual(parsed, DEFAULT_MATCHUP_FILTERS);
  assert.notEqual(parsed, DEFAULT_MATCHUP_FILTERS);
  const written = writeMatchupFilters(
    filters(),
    new URLSearchParams("tab=personal&hero=old&player=gem%3A1001&rated=rated&view=grid&order=best&from=2026-10-01"),
  );
  assert.equal(written.toString(), "tab=personal");
});

test("URL validation clears invalid enums/dates but preserves explicit stale selections", () => {
  const parsed = readMatchupFilters(
    new URLSearchParams({
      hero: "Unavailable Hero",
      opponentHero: "Unavailable Opponent",
      player: "gem:9999",
      event: '["Unavailable event"]',
      format: "Imaginary Format",
      rated: "yes",
      view: "cards",
      order: "fastest",
      from: "2026-02-29",
      to: "2026-13-01",
    }),
  );
  assert.deepEqual(
    parsed,
    filters({
      hero: "Unavailable Hero",
      opponentHero: "Unavailable Opponent",
      opponent: "gem:9999",
      event: '["Unavailable event"]',
    }),
  );
});

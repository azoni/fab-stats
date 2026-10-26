/** Run with `npx tsx scripts/match-history.test.ts`; no Firebase or browser required. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { GameFormat, MatchResult, type MatchRecord } from "@/types";
import {
  DEFAULT_MATCH_FILTERS,
  filterMatchHistory,
  getMatchEventKey,
  getMatchFilterOptions,
  getMatchOpponentKey,
  readMatchFilters,
  writeMatchFilters,
  type MatchHistoryFilters,
} from "@/lib/match-history";
import { computeEventStats } from "@/lib/stats";

function match(id: string, overrides: Partial<MatchRecord> = {}): MatchRecord {
  return {
    id,
    date: "2026-10-23",
    heroPlayed: "Dorinthea Ironsong",
    opponentHero: "Bravo, Showstopper",
    opponentName: "Alex Rivera",
    opponentGemId: "1001",
    result: MatchResult.Win,
    format: GameFormat.ClassicConstructed,
    notes: "Friday Armory | Round 1",
    venue: "Haven Card Hall",
    eventType: "Armory",
    createdAt: "2026-10-24T01:00:00.000Z",
    ...overrides,
  };
}

function filters(overrides: Partial<MatchHistoryFilters> = {}): MatchHistoryFilters {
  return { ...DEFAULT_MATCH_FILTERS, ...overrides };
}

function ids(matches: MatchRecord[], overrides: Partial<MatchHistoryFilters> = {}) {
  return filterMatchHistory(matches, filters(overrides)).map((row) => row.id);
}

test("empty query parameters produce complete defaults without sharing mutable state", () => {
  const parsed = readMatchFilters(new URLSearchParams());
  assert.deepEqual(parsed, DEFAULT_MATCH_FILTERS);
  parsed.hero = "Changed";
  assert.equal(DEFAULT_MATCH_FILTERS.hero, "");
});

test("all filter fields round-trip through URL encoding, preserving unrelated parameters", () => {
  const selected = filters({
    query: "Jarl Vetreiði & Dash I/O",
    hero: "Jarl Vetreiði",
    opponentHero: "Dash I/O",
    opponent: "name:rivera, alex + friend",
    event: getMatchEventKey(match("event", { notes: "Hall A | Finals", venue: "A&B / North" })),
    format: GameFormat.ClassicConstructed,
    eventType: "Battlegrounds",
    venue: "A&B / North",
    missing: "no-opp-hero",
    result: MatchResult.Draw,
    from: "2024-02-29",
    to: "2026-10-26",
    sort: "oldest",
    page: 3,
  });
  const existing = new URLSearchParams("campaign=a&campaign=b&q=old&hero=old&hero=duplicate");
  const before = existing.toString();
  const encoded = writeMatchFilters(selected, existing);
  assert.deepEqual(readMatchFilters(new URLSearchParams(encoded.toString())), selected);
  assert.deepEqual(encoded.getAll("campaign"), ["a", "b"]);
  assert.equal(encoded.getAll("hero").length, 1);
  assert.equal(existing.toString(), before);
});

test("clear all removes only owned filters and default sort/page", () => {
  const params = writeMatchFilters(
    DEFAULT_MATCH_FILTERS,
    new URLSearchParams("q=Alex&hero=Bravo&filter=no-hero&sort=oldest&page=9&import=1&campaign=october"),
  );
  assert.equal(params.toString(), "import=1&campaign=october");
});

test("legacy missing-data links are preserved", () => {
  for (const missing of ["no-hero", "no-opp-hero"]) {
    const parsed = readMatchFilters(new URLSearchParams(`filter=${missing}`));
    assert.equal(parsed.missing, missing);
    assert.equal(writeMatchFilters(parsed).get("filter"), missing);
  }
});

test("unknown enum values, invalid dates and invalid page numbers cannot enter active state", () => {
  const parsed = readMatchFilters(
    new URLSearchParams(
      "result=victory&format=bogus&filter=unknown&from=2025-02-29&to=2026-13-01&sort=descending&page=2.5",
    ),
  );
  assert.deepEqual(parsed, DEFAULT_MATCH_FILTERS);
  for (const page of ["0", "-1", "1e3", "Infinity", "NaN", "9007199254740992"]) {
    assert.equal(readMatchFilters(new URLSearchParams({ page })).page, 1, page);
  }
  assert.equal(readMatchFilters(new URLSearchParams("from=2024-02-29&page=27")).from, "2024-02-29");
  assert.equal(readMatchFilters(new URLSearchParams("page=27")).page, 27);
});

test("stale hero, player, event, event-type and venue selections remain explicit", () => {
  const saved = filters({
    hero: "Archived Hero",
    opponentHero: "Retired Hero",
    opponent: "gem:deleted",
    event: "old-event-key",
    eventType: "Past tournament",
    venue: "Closed store",
  });
  assert.deepEqual(readMatchFilters(writeMatchFilters(saved)), saved);
  assert.deepEqual(filterMatchHistory([match("current")], saved), []);
});

test("named event keys group formats together and normalize venue whitespace/case", () => {
  const cc = match("cc");
  const draft = match("draft", {
    format: GameFormat.Draft,
    venue: "  HAVEN CARD HALL  ",
    notes: "Friday Armory | Round 2",
  });
  assert.equal(getMatchEventKey(cc), getMatchEventKey(draft));
  assert.equal(getMatchFilterOptions([cc, draft]).events.length, computeEventStats([cc, draft]).length);
  assert.deepEqual(ids([cc, draft], { event: getMatchEventKey(cc), format: GameFormat.Draft }), ["draft"]);
});

test("repeated event names on different dates or at different venues stay separate", () => {
  const rows = [
    match("friday"),
    match("next-week", { date: "2026-10-30" }),
    match("other-store", { venue: "Southside Games" }),
  ];
  assert.equal(new Set(rows.map(getMatchEventKey)).size, 3);
  const options = getMatchFilterOptions(rows).events;
  assert.equal(options.length, 3);
  assert.equal(options[0].value, getMatchEventKey(rows[1]));
  assert.match(options[0].detail || "", /2026-10-30.*Haven Card Hall/);
  assert.deepEqual(ids(rows, { event: getMatchEventKey(rows[2]) }), ["other-store"]);
});

test("event keys are collision-safe even when imported names or venues contain pipes", () => {
  const first = match("first", { notes: "Armory|2026-10-23 | Round 1", venue: "Store" });
  const second = match("second", { notes: "Armory | Round 1", venue: "2026-10-23|store" });
  assert.notEqual(getMatchEventKey(first), getMatchEventKey(second));
  assert.deepEqual(ids([first, second], { event: getMatchEventKey(first) }), ["first"]);
});

test("manual entries without event names use date/format/venue fallback grouping", () => {
  const cc = match("cc", { notes: undefined, gemEventId: undefined });
  const draft = match("draft", { notes: "", format: GameFormat.Draft, gemEventId: undefined });
  assert.notEqual(getMatchEventKey(cc), getMatchEventKey(draft));
  const options = getMatchFilterOptions([cc, draft]).events;
  assert.ok(options.some((option) => option.label === "2026-10-23 - Classic Constructed"));
  assert.deepEqual(ids([cc, draft], { event: getMatchEventKey(draft) }), ["draft"]);
});

test("one GEM player remains selected across display-name changes", () => {
  const rows = [
    match("old", { date: "2026-10-01", opponentName: "Alex Rivera" }),
    match("new", { opponentName: "Alex Newname" }),
  ];
  assert.equal(getMatchOpponentKey(rows[0]), "gem:1001");
  assert.equal(getMatchOpponentKey(rows[1]), "gem:1001");
  const options = getMatchFilterOptions(rows).opponents;
  assert.deepEqual(options, [{ value: "gem:1001", label: "Alex Newname", detail: "GEM ID 1001" }]);
  assert.deepEqual(ids(rows, { opponent: "gem:1001" }), ["new", "old"]);
});

test("same-name GEM players and a name-only record never merge", () => {
  const rows = [
    match("one"),
    match("two", { opponentGemId: "2002" }),
    match("name-only", { opponentGemId: undefined }),
  ];
  const options = getMatchFilterOptions(rows).opponents;
  assert.equal(options.length, 3);
  assert.ok(options.some((option) => option.value === "gem:1001" && option.detail === "GEM ID 1001"));
  assert.ok(options.some((option) => option.value === "gem:2002" && option.detail === "GEM ID 2002"));
  assert.ok(options.some((option) => option.value === "name:alex rivera" && option.detail?.includes("Name only")));
  assert.deepEqual(ids(rows, { opponent: "gem:1001" }), ["one"]);
  assert.deepEqual(ids(rows, { opponent: "name:alex rivera" }), ["name-only"]);
});

test("name-only normalization handles reversed names, case and repeated whitespace", () => {
  const first = match("first", { opponentGemId: undefined, opponentName: " Nguyen,   Chinh " });
  const second = match("second", { opponentGemId: undefined, opponentName: "chinh nguyen" });
  const unrelated = match("unrelated", { opponentGemId: undefined, opponentName: "Chinh Nguyen Jr" });
  assert.equal(getMatchOpponentKey(first), "name:chinh nguyen");
  assert.equal(getMatchOpponentKey(first), getMatchOpponentKey(second));
  assert.deepEqual(
    new Set(ids([first, second, unrelated], { opponent: "name:chinh nguyen" })),
    new Set(["first", "second"]),
  );
});

test("missing players have an explicit unknown option; byes are never player options", () => {
  const unknown = match("unknown", { opponentName: undefined, opponentGemId: undefined });
  const bye = match("bye", { result: MatchResult.Bye, opponentName: "BYE", opponentGemId: undefined });
  const emptyBye = match("empty-bye", { result: MatchResult.Bye, opponentName: undefined, opponentGemId: undefined });
  const rows = [unknown, bye, emptyBye];
  assert.equal(getMatchOpponentKey(unknown), "unknown");
  assert.deepEqual(getMatchFilterOptions(rows).opponents, [{ value: "unknown", label: "Unknown player" }]);
  assert.deepEqual(ids(rows, { opponent: "unknown" }), ["unknown"]);
});

test("hero options preserve historical, young/adult and unfamiliar imported hero names", () => {
  const rows = [
    match("adult"),
    match("young", { heroPlayed: "Dorinthea" }),
    match("legacy", { heroPlayed: "Historical Hero" }),
    match("unknown", { heroPlayed: "Unknown", opponentHero: "" }),
  ];
  assert.deepEqual(
    new Set(getMatchFilterOptions(rows).heroes.map((option) => option.value)),
    new Set(["Dorinthea Ironsong", "Dorinthea", "Historical Hero", "none"]),
  );
  assert.ok(getMatchFilterOptions(rows).opponentHeroes.some((option) => option.value === "none"));
  assert.deepEqual(ids(rows, { hero: "Dorinthea" }), ["young"]);
  assert.deepEqual(ids(rows, { hero: "Historical Hero" }), ["legacy"]);
});

test("unknown hero selection and legacy missing-data filters agree for empty/Unknown values", () => {
  const rows = [
    match("known"),
    match("empty", { heroPlayed: "", opponentHero: " " }),
    match("unknown", { heroPlayed: "Unknown", opponentHero: "unknown" }),
  ];
  const expected = new Set(["empty", "unknown"]);
  assert.deepEqual(new Set(ids(rows, { hero: "none" })), expected);
  assert.deepEqual(new Set(ids(rows, { missing: "no-hero" })), expected);
  assert.deepEqual(new Set(ids(rows, { opponentHero: "none" })), expected);
  assert.deepEqual(new Set(ids(rows, { missing: "no-opp-hero" })), expected);
});

test("all exact filters intersect at the individual-match level", () => {
  const target = match("target");
  const rows = [
    target,
    match("hero", { heroPlayed: "Fai, Rising Rebellion" }),
    match("opponent-hero", { opponentHero: "Katsu, the Wanderer" }),
    match("player", { opponentGemId: "2002" }),
    match("event", { date: "2026-10-30" }),
    match("format", { format: GameFormat.Draft }),
    match("type", { eventTypeOverride: "Other" }),
    match("venue", { venue: "Southside Games" }),
    match("loss", { result: MatchResult.Loss }),
  ];
  assert.deepEqual(
    ids(rows, {
      hero: target.heroPlayed,
      opponentHero: target.opponentHero,
      opponent: "gem:1001",
      event: getMatchEventKey(target),
      format: GameFormat.ClassicConstructed,
      eventType: "Armory",
      venue: "Haven Card Hall",
      result: MatchResult.Win,
    }),
    ["target"],
  );
});

test("event-type overrides remain authoritative and venue filtering uses cleaned values", () => {
  const row = match("overridden", { eventTypeOverride: "Other", venue: "  Haven Card Hall  " });
  assert.deepEqual(ids([row], { eventType: "Other", venue: "Haven Card Hall" }), ["overridden"]);
  assert.deepEqual(ids([row], { eventType: "Armory" }), []);
  assert.deepEqual(getMatchFilterOptions([row]).eventTypes, [{ value: "Other", label: "Other" }]);
});

test("contextual result counts omit only the result filter, not other selected filters", () => {
  const rows = [
    match("win"),
    match("loss", { result: MatchResult.Loss }),
    match("draw", { result: MatchResult.Draw }),
    match("bye", { result: MatchResult.Bye, opponentName: "BYE" }),
    match("elsewhere", { result: MatchResult.Win, venue: "Another Store" }),
  ];
  const selected = filters({ event: getMatchEventKey(rows[0]), result: MatchResult.Win });
  const contextual = filterMatchHistory(rows, selected, { includeResult: false });
  assert.equal(contextual.length, 4);
  assert.deepEqual(contextual.map((row) => row.result).sort(), ["bye", "draw", "loss", "win"]);
  assert.deepEqual(
    filterMatchHistory(rows, selected).map((row) => row.id),
    ["win"],
  );
});

test("bye-only records are retained when filtering results without a player selection", () => {
  const rows = [match("win"), match("bye", { result: MatchResult.Bye, opponentName: "BYE", opponentGemId: undefined })];
  assert.deepEqual(ids(rows, { result: MatchResult.Bye }), ["bye"]);
});

test("date boundaries are inclusive and support either bound independently", () => {
  const rows = [
    match("before", { date: "2026-10-22" }),
    match("start"),
    match("end", { date: "2026-10-24" }),
    match("after", { date: "2026-10-25" }),
  ];
  assert.deepEqual(ids(rows, { from: "2026-10-23", to: "2026-10-24" }), ["end", "start"]);
  assert.deepEqual(ids(rows, { from: "2026-10-24" }), ["after", "end"]);
  assert.deepEqual(ids(rows, { to: "2026-10-23" }), ["start", "before"]);
  assert.deepEqual(ids(rows, { from: "2026-10-25", to: "2026-10-23" }), []);
});

test("invalid stored dates cannot slip into a date-filtered range", () => {
  const rows = [match("empty", { date: "" }), match("invalid", { date: "2026-02-30" }), match("valid")];
  assert.deepEqual(ids(rows, { to: "2026-12-31" }), ["valid"]);
});

test("query tokens can span player, hero, event, format and venue fields", () => {
  const rows = [
    match("target", { opponentName: "Rivera, Alex" }),
    match("other", { opponentName: "Jamie Chen", opponentGemId: "2002" }),
  ];
  assert.deepEqual(ids(rows, { query: "  Alex Rivera  Dorinthea Friday CC Haven  " }), ["target"]);
  assert.deepEqual(ids(rows, { query: "Alex nonexistent" }), []);
  assert.deepEqual(ids(rows, { query: "1001" }), ["target"]);
});

test("obfuscation excludes player names and GEM IDs from search but preserves explicit selection", () => {
  const rows = [match("selected"), match("other", { opponentName: "Jamie Chen", opponentGemId: "2002" })];
  assert.deepEqual(filterMatchHistory(rows, filters({ query: "Rivera" }), { obfuscateOpponents: true }), []);
  assert.deepEqual(filterMatchHistory(rows, filters({ query: "1001" }), { obfuscateOpponents: true }), []);
  assert.equal(filterMatchHistory(rows, filters({ query: "Dorinthea" }), { obfuscateOpponents: true }).length, 2);
  assert.deepEqual(
    filterMatchHistory(rows, filters({ opponent: "gem:1001" }), { obfuscateOpponents: true }).map((row) => row.id),
    ["selected"],
  );
});

test("sort orders follow event date, round, then creation time without mutating source data", () => {
  const rows = [
    match("r1-early", { createdAt: "2026-10-24T01:00:00Z" }),
    match("r1-late", { createdAt: "2026-10-24T02:00:00Z" }),
    match("r2", { notes: "Friday Armory | Round 2" }),
    match("playoff", { notes: "Friday Armory | Round P1" }),
    match("next-day", { date: "2026-10-24" }),
  ];
  const original = structuredClone(rows);
  assert.deepEqual(ids(rows), ["next-day", "playoff", "r2", "r1-late", "r1-early"]);
  assert.deepEqual(ids(rows, { sort: "oldest" }), ["r1-early", "r1-late", "r2", "playoff", "next-day"]);
  assert.deepEqual(rows, original);
});

test("page state never truncates the helper's result set", () => {
  const rows = Array.from({ length: 60 }, (_, index) => match(`row-${index}`));
  assert.equal(filterMatchHistory(rows, filters({ page: 3 })).length, 60);
});

test("removed matches retain the saved selection and produce an honest empty result", () => {
  const removed = match("removed", { date: "2026-10-01" });
  const saved = readMatchFilters(writeMatchFilters(filters({ event: getMatchEventKey(removed) })));
  assert.deepEqual(filterMatchHistory([match("remaining")], saved), []);
  assert.equal(saved.event, getMatchEventKey(removed));
});

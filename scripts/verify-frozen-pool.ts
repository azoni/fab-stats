/**
 * Frozen-pool differential harness — THE gate for @flesh-and-blood/cards bumps.
 *
 * The four seeded daily games (FaBdoku hero + card, HeroGuesser, BruteBrawl)
 * derive answers by indexing pools built from the card list. This script proves
 * a package bump (or a frozen-pool regeneration) does not rewrite history:
 *
 *   1) BEFORE the bump:  npx tsx scripts/verify-frozen-pool.ts capture fixtures.json
 *   2) bump the package / regen pools / refactor
 *   3) AFTER:            npx tsx scripts/verify-frozen-pool.ts compare fixtures.json
 *
 * Compare exits 1 if ANY puzzle before the v4 cutover differs from the capture.
 * Dates on/after the cutover are allowed to differ (that's the point of the
 * cutover) and are reported informationally.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { generateDailyPuzzle } from "../src/lib/fabdoku/puzzle-generator";
import { generateDailyCardPuzzle } from "../src/lib/fabdoku/card-puzzle-generator";
import { generateDailyHero, getHeroPool } from "../src/lib/heroguesser/puzzle-generator";
import { generateDailyBrawl } from "../src/lib/brutebrawl/puzzle-generator";
import { CLASS_CATEGORIES, TALENT_CATEGORIES, AGE_CATEGORIES, STAT_CATEGORIES, FORMAT_CATEGORIES } from "../src/lib/fabdoku/categories";
import { CARD_GROUP_MAP } from "../src/lib/fabdoku/card-categories";
import { frozenHeroes, frozenCards } from "../src/lib/games/frozen-pool";
import { FROZEN_HEROES, FROZEN_CARD_IDS } from "../src/lib/games/frozen-pool-data";

const START = "2023-01-01";
const END = "2026-08-14"; // last pre-cutover date; extend if the cutover moves

interface DayFixture {
  fabdoku: string;
  fabdokuCard: string;
  heroguesser: string;
  brutebrawl: string;
}
interface Fixtures {
  range: [string, string];
  aux: {
    heroPool: string[];
    heroCategorySets: Record<string, string[]>;
    cardCategorySets: Record<string, string[]>;
    frozenHeroCount: number;
    frozenCardCount: number;
  };
  days: Record<string, DayFixture>;
}

function* dates(start: string, end: string): Generator<string> {
  const [y, m, d] = start.split("-").map(Number);
  const cur = new Date(Date.UTC(y, m - 1, d));
  for (;;) {
    const s = cur.toISOString().slice(0, 10);
    if (s > end) return;
    yield s;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
}

function dayFixture(date: string): DayFixture {
  const hero = generateDailyPuzzle(date);
  const card = generateDailyCardPuzzle(date);
  const hg = generateDailyHero(date);
  const bb = generateDailyBrawl(date);
  return {
    fabdoku: JSON.stringify({
      rows: hero.rows.map((r) => r.id),
      cols: hero.cols.map((c) => c.id),
      answers: hero.validAnswers,
    }),
    fabdokuCard: JSON.stringify({
      rows: card.rows.map((r) => r.id),
      cols: card.cols.map((c) => c.id),
      answers: card.validAnswers,
    }),
    heroguesser: hg.name,
    brutebrawl: JSON.stringify({
      defender: bb.defenderName,
      cls: bb.defenderClass,
      difficulty: bb.difficulty,
      dice: bb.diceSequence.join(""),
    }),
  };
}

function aux(): Fixtures["aux"] {
  // getHeroPool grew an optional date arg in the v4 refactor; a pre-refactor
  // capture calls it with no args. Pass a pre-cutover date so both eras of the
  // code report the SAME (v3) pool here.
  const pool = (getHeroPool as (d?: string) => { name: string }[])(END);
  const heroCategorySets: Record<string, string[]> = {};
  for (const cat of [...CLASS_CATEGORIES, ...TALENT_CATEGORIES, ...AGE_CATEGORIES, ...STAT_CATEGORIES, ...FORMAT_CATEGORIES]) {
    heroCategorySets[cat.id] = frozenHeroes.filter((h) => cat.test(h)).map((h) => h.name).sort();
  }
  const cardCategorySets: Record<string, string[]> = {};
  for (const group of Object.values(CARD_GROUP_MAP)) {
    for (const cat of group) {
      cardCategorySets[cat.id] = frozenCards.filter((c) => cat.test(c)).map((c) => c.cardIdentifier).sort();
    }
  }
  return {
    heroPool: pool.map((h) => h.name),
    heroCategorySets,
    cardCategorySets,
    frozenHeroCount: frozenHeroes.length,
    frozenCardCount: frozenCards.length,
  };
}

const [mode, file] = process.argv.slice(2);
if (!mode || !file || !["capture", "compare"].includes(mode)) {
  console.error("usage: npx tsx scripts/verify-frozen-pool.ts <capture|compare> <fixtures.json>");
  process.exit(2);
}

// Silent-drop guard: the frozen data lists must rebuild in full against the
// installed package — a shrunken pool remaps every historical answer.
if (frozenHeroes.length !== FROZEN_HEROES.length || frozenCards.length !== FROZEN_CARD_IDS.length) {
  console.error(
    `SILENT DROP: frozen pool rebuilt short — heroes ${frozenHeroes.length}/${FROZEN_HEROES.length}, cards ${frozenCards.length}/${FROZEN_CARD_IDS.length}`,
  );
  process.exit(1);
}

if (mode === "capture") {
  const days: Record<string, DayFixture> = {};
  let n = 0;
  for (const d of dates(START, END)) {
    days[d] = dayFixture(d);
    n++;
  }
  const out: Fixtures = { range: [START, END], aux: aux(), days };
  writeFileSync(file, JSON.stringify(out));
  console.log(`captured ${n} dates (${START}..${END}) -> ${file}`);
  process.exit(0);
}

// compare
const fix = JSON.parse(readFileSync(file, "utf8")) as Fixtures;
let bad = 0;
const report: string[] = [];
for (const [d, want] of Object.entries(fix.days)) {
  const got = dayFixture(d);
  for (const key of ["fabdoku", "fabdokuCard", "heroguesser", "brutebrawl"] as const) {
    if (got[key] !== want[key]) {
      bad++;
      if (report.length < 20) report.push(`${d} ${key}: CHANGED`);
    }
  }
}
const nowAux = aux();
const auxDiff = (label: string, a: string[], b: string[]) => {
  const A = new Set(a);
  const B = new Set(b);
  const gained = b.filter((x) => !A.has(x));
  const lost = a.filter((x) => !B.has(x));
  if (gained.length || lost.length) report.push(`${label}: +[${gained.join(", ")}] -[${lost.join(", ")}]`);
  return gained.length + lost.length;
};
let auxChanges = 0;
auxChanges += auxDiff("heroguesser pool", fix.aux.heroPool, nowAux.heroPool);
for (const id of Object.keys(fix.aux.heroCategorySets)) {
  auxChanges += auxDiff(`hero cat ${id}`, fix.aux.heroCategorySets[id], nowAux.heroCategorySets[id] ?? []);
}
for (const id of Object.keys(fix.aux.cardCategorySets)) {
  auxChanges += auxDiff(`card cat ${id}`, fix.aux.cardCategorySets[id], nowAux.cardCategorySets[id] ?? []);
}

console.log(report.join("\n"));
if (bad > 0 || auxChanges > 0) {
  console.error(`FAIL: ${bad} day-fixture mismatches, ${auxChanges} pool/category membership changes across ${Object.keys(fix.days).length} dates`);
  process.exit(1);
}
console.log(`OK: ${Object.keys(fix.days).length} dates byte-identical; pools and category sets unchanged.`);

import type { HeroInfo } from "@/types";
import heroData from "./generated/hero-data.json";

// Hero data comes from a build-time manifest (scripts/gen-card-manifests.ts)
// instead of the whole @flesh-and-blood/cards package: the package is a single
// 8.8 MB JS bundle that cannot be tree-shaken, and this module is reachable
// from nearly every route. The manifest holds exactly the HeroInfo records the
// old module-eval filter produced (reprints already merged), pre-sort and
// pre-override. REGENERATE ON EVERY PACKAGE BUMP:
//   npx tsx scripts/gen-card-manifests.ts
const heroMap = new Map<string, HeroInfo>();
for (const hero of heroData.heroes as HeroInfo[]) {
  heroMap.set(hero.name, hero);
}

// Override format data for heroes where the card package is out of date.
// LL_OVERRIDES *replaces* the legal-format list entirely. REVIEW ON EVERY
// PACKAGE BUMP: once upstream fixes the data, a stale replace-override
// clobbers it (Verdance's was removed at 4.0.62 — the package now carries
// Living Legend + Golden Age itself).
const LL_OVERRIDES: Record<string, string[]> = {};
for (const [name, formats] of Object.entries(LL_OVERRIDES)) {
  const hero = heroMap.get(name);
  if (hero) hero.legalFormats = formats;
}

// FORMAT_ADD_OVERRIDES *appends* formats the @flesh-and-blood/cards package
// omits (duplicate-safe, so a stale entry is harmless once upstream catches
// up — Blaze's Silver Age landed upstream at 4.0.62 and her entry was
// removed). REVIEW ON EVERY PACKAGE BUMP.
const FORMAT_ADD_OVERRIDES: Record<string, string[]> = {};
for (const [name, formats] of Object.entries(FORMAT_ADD_OVERRIDES)) {
  const hero = heroMap.get(name);
  if (hero) {
    for (const f of formats) {
      if (!hero.legalFormats.includes(f)) hero.legalFormats.push(f);
    }
  }
}

export const allHeroes: HeroInfo[] = Array.from(heroMap.values()).sort(
  (a, b) => a.name.localeCompare(b.name)
);

// ── Hero Portrait Images (from FABTCG CDN) ──
// Most heroes work with: {CDN}/media/images/heroes/{URL-encoded name}.jpg
// A few have non-standard filenames — these are handled with overrides.

const PORTRAIT_CDN = "https://dgmi4fxzalveh.cloudfront.net/media/images/heroes";

// Only heroes whose CDN filename doesn't match their canonical name
const PORTRAIT_OVERRIDES: Record<string, string> = {
  // Non-standard filenames (typos, underscores, alternate names on CDN)
  "Aurora, Emissary of Lightning": `${PORTRAIT_CDN}/Aurora_Emissary_of_Lightning.jpg`,
  "Aurora, Legacy of Tempest": `${PORTRAIT_CDN}/Aurora_Legacy_of_Tempest.jpg`,
  "Aurora, Shooting Star": `${PORTRAIT_CDN}/Aurora_Shooting_Star.jpg`,
  "Arakni, 5L!p3d 7hRu 7h3 cR4X": `${PORTRAIT_CDN}/Arakni_Slipped_thru_the_Cracks.jpg`,
  "Dash I/O": `${PORTRAIT_CDN}/Dash%20I%3AO.jpg`,
  "Enigma, Ledger of Ancestry": `${PORTRAIT_CDN}/Enigma%2C%20Legend%20of%20Ancestry.jpg`,
  "Florian, Rotwood Harbinger": `${PORTRAIT_CDN}/Florian%2C%20Rotwood%20Harbringer.jpg`,
  "Gravy Bones": `${PORTRAIT_CDN}/Gravy_Bones_Shipwrecked_Looter.jpg`,
  "Gravy Bones, Shipwrecked Looter": `${PORTRAIT_CDN}/Gravy_Bones_Shipwrecked_Looter.jpg`,
  "Hala, Bladesaint of the Vow": `${PORTRAIT_CDN}/Hala_Bladesaint_of_the_Vow.jpg`,
  "Jarl Vetreiði": `${PORTRAIT_CDN}/Jarl%20Vetrei%C4%91i.jpg`,
  "Kassai of the Golden Sand": `${PORTRAIT_CDN}/Kassai%2C%20of%20the%20Golden%20Sand.jpg`,
  "Kayo, Armed and Dangerous": `${PORTRAIT_CDN}/Kayo_Armed_and_Dangerous.jpg`,
  "Kayo, Berserker Runt": `${PORTRAIT_CDN}/Kayo.jpg`,
  "Kayo, Strong-arm": `${PORTRAIT_CDN}/Kayo.jpg`,
  "Kayo, Underhanded Cheat": `${PORTRAIT_CDN}/Kayo_Underhanded_Cheat.jpg`,
  "Lyath Goldmane": `${PORTRAIT_CDN}/Lyath_Goldmane_Vile_Savant.jpg`,
  "Lyath Goldmane, Vile Savant": `${PORTRAIT_CDN}/Lyath_Goldmane_Vile_Savant.jpg`,
  "Marlynn, Treasure Hunter": `${PORTRAIT_CDN}/Marlynn_Treasure_Hunter.jpg`,
  "Maxx Nitro": `${PORTRAIT_CDN}/Maxx%20%27The%20Hype%27%20Nitro.jpg`,
  "Oscilio, Forked Continuum": `${PORTRAIT_CDN}/Oscilio_Forked_Continuum.jpg`,
  "Oscilio, Scion of the Third Age": `${PORTRAIT_CDN}/Oscilio_Scion_of_the_Third_Age.jpg`,
  "Pleiades, Superstar": `${PORTRAIT_CDN}/Pleiades_Superstar.jpg`,
  "Puffin, Hightail": `${PORTRAIT_CDN}/Puffin_Hightail.jpg`,
  "Scurv, Stowaway": `${PORTRAIT_CDN}/Scurv_Stowaway.jpg`,
  "Tuffnut, Bumbling Hulkster": `${PORTRAIT_CDN}/Tuffnut_Bumbling_Hulkster.jpg`,
  "Valda Brightaxe": `${PORTRAIT_CDN}/Valda_Seismic_Impact_cWNA1HW.jpg`,
  "Valda, Seismic Impact": `${PORTRAIT_CDN}/Valda_Seismic_Impact_cWNA1HW.jpg`,
  "Verdance, Thorn of the Rose": `${PORTRAIT_CDN}/Verdance%2C%20Thorn%20of%20Rose.jpg`,
  "Zyggy Starlight": `${PORTRAIT_CDN}/Zyggy_Starlight.jpg`,
};

// Dynamic portraits from Firestore (populated by auto-scrape, catches new heroes)
let dynamicPortraits: Record<string, string> | null = null;
let dynamicPortraitsLoading = false;

export function getHeroPortraitUrl(name: string): string | null {
  // Check overrides first (non-standard filenames)
  if (PORTRAIT_OVERRIDES[name]) return PORTRAIT_OVERRIDES[name];

  // Check dynamic portraits from auto-scrape
  if (dynamicPortraits?.[name]) return dynamicPortraits[name];

  // Trigger async load of dynamic portraits if not loaded yet
  if (!dynamicPortraits && !dynamicPortraitsLoading) {
    loadDynamicPortraits();
  }

  // Default: URL-encode the hero name (works for ~90% of heroes)
  return `${PORTRAIT_CDN}/${encodeURIComponent(name)}.jpg`;
}

async function loadDynamicPortraits() {
  dynamicPortraitsLoading = true;
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const { db } = await import("./firebase");
    const snap = await getDoc(doc(db, "sitemap-meta/hero-portraits"));
    if (snap.exists()) {
      dynamicPortraits = (snap.data().portraits || {}) as Record<string, string>;
    } else {
      dynamicPortraits = {};
    }
  } catch {
    dynamicPortraits = {};
  }
  dynamicPortraitsLoading = false;
}

export function getHeroByName(name: string): HeroInfo | undefined {
  return allHeroes.find((h) => h.name === name);
}

/**
 * A hero is "Living Legend only" when they're legal in the Living Legend
 * format but no longer legal in Classic Constructed or Blitz — i.e. rotated
 * out of the active competitive formats.
 */
export function isLivingLegendHero(name: string): boolean {
  const hero = getHeroByName(name);
  if (!hero) return false;
  return (
    hero.legalFormats.includes("Living Legend") &&
    !hero.legalFormats.includes("Classic Constructed") &&
    !hero.legalFormats.includes("Blitz")
  );
}

/**
 * Try to resolve an arbitrary string to a canonical hero name.
 * Handles case differences, partial names (e.g. "Briar" → "Briar, Warden of Thorns"),
 * and minor typos. Returns null only if no reasonable match is found.
 */
export function resolveHeroName(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Exact match
  const exact = heroMap.get(trimmed);
  if (exact) return exact.name;

  // 2. Case-insensitive exact match
  const lower = trimmed.toLowerCase();
  for (const hero of allHeroes) {
    if (hero.name.toLowerCase() === lower) return hero.name;
  }

  // 3. Input matches the first part of a hero name (before comma)
  //    e.g. "Briar" matches "Briar, Warden of Thorns"
  for (const hero of allHeroes) {
    const firstName = hero.name.split(",")[0];
    if (firstName.toLowerCase() === lower) return hero.name;
  }

  // 4. Hero name starts with or contains input (case-insensitive, min 4 chars to avoid false positives)
  if (trimmed.length >= 4) {
    for (const hero of allHeroes) {
      if (hero.name.toLowerCase().startsWith(lower)) return hero.name;
    }
  }

  return null;
}

/** Several heroes share a first name — FaB has three adult Araknis (Marionette,
 *  Huntsman, "5L!p3d 7hRu 7h3 cR4X"), two Oscilios, and every character adds its
 *  young hero in the mixed views. Labelling a matchup axis by the first word alone
 *  makes them indistinguishable (a cross-hero cell then reads like an impossible
 *  mirror), so when a first name is shared in the given set we tack on the subtitle. */
export function buildHeroLabels(heroes: string[]): Map<string, { primary: string; secondary: string | null }> {
  const firstCount = new Map<string, number>();
  for (const h of heroes) {
    const first = (h.split(",")[0] || h).trim();
    firstCount.set(first, (firstCount.get(first) || 0) + 1);
  }
  const out = new Map<string, { primary: string; secondary: string | null }>();
  for (const h of heroes) {
    const idx = h.indexOf(",");
    const first = (idx === -1 ? h : h.slice(0, idx)).trim();
    const sub = idx === -1 ? "" : h.slice(idx + 1).trim();
    out.set(h, { primary: first, secondary: sub && (firstCount.get(first) || 0) > 1 ? sub : null });
  }
  return out;
}

export function searchHeroes(query: string, format?: string): HeroInfo[] {
  const lower = query.toLowerCase();
  const pool = format ? getHeroesForFormat(format) : allHeroes;
  return pool.filter(
    (h) =>
      h.name.toLowerCase().includes(lower) ||
      h.classes.some((c) => c.toLowerCase().includes(lower))
  );
}

// Rotating constructed formats where a hero that has since moved to Living
// Legend may still appear in *historical* match records — so LL heroes stay
// selectable. Limited/other formats (Draft, Sealed, Clash, Ultimate Pit Fight)
// are strict: a hero must actually be legal in that format to be picked. This
// keeps e.g. Arakni (a CC/LL hero) out of a Draft event's hero picker.
const LL_HISTORICAL_FORMATS = new Set<string>([
  "Classic Constructed",
  "Blitz",
  "Silver Age",
  // Golden Age is an eternal community format — heroes never rotate out, so
  // Living Legend heroes are always pickable there.
  "Golden Age",
]);

/** Filter heroes by game format. Returns all heroes if format has no mapping
 *  ("Other"/unknown). For rotating constructed formats, Living Legend heroes
 *  are also included so historical matches remain recordable. */
export function getHeroesForFormat(format: string): HeroInfo[] {
  // "Other" or unknown formats → show all heroes
  if (!format || format === "Other") return allHeroes;
  const includeLivingLegend = LL_HISTORICAL_FORMATS.has(format);
  return allHeroes.filter(
    (h) =>
      h.legalFormats.includes(format) ||
      (includeLivingLegend && h.legalFormats.includes("Living Legend"))
  );
}

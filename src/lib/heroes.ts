import { cards } from "@flesh-and-blood/cards";
import { Type } from "@flesh-and-blood/types";
import type { HeroInfo } from "@/types";

const CARD_IMAGE_CDN = "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large";

function getHeroImageUrl(card: (typeof cards)[number]): string {
  const printings = card.printings || [];
  const candidates = printings
    .map((p: { image?: string }) => p.image)
    .filter((i): i is string =>
      !!i && !i.includes("BACK") && !i.includes("_V2") && !i.includes("-MV") && !i.includes("-RF") && !i.includes("MARVEL")
    );
  // Prefer defaultImage if it's among the clean candidates
  const best = card.defaultImage && candidates.includes(card.defaultImage)
    ? card.defaultImage
    : candidates[0] || card.defaultImage || "";
  return best ? `${CARD_IMAGE_CDN}/${best}.webp` : "";
}

const heroCards = cards.filter((card) =>
  card.types.includes(Type.Hero)
);

const heroMap = new Map<string, HeroInfo>();
for (const card of heroCards) {
  const existing = heroMap.get(card.name);
  if (existing) {
    // Merge legal formats from duplicate entries (reprints)
    for (const f of (card.legalFormats || []).map(String)) {
      if (!existing.legalFormats.includes(f)) existing.legalFormats.push(f);
    }
  } else {
    heroMap.set(card.name, {
      name: card.name,
      cardIdentifier: card.cardIdentifier,
      classes: (card.classes || []).map(String),
      talents: (card.talents || []).map(String),
      legalFormats: (card.legalFormats || []).map(String),
      life: card.life,
      intellect: card.intellect,
      young: card.young,
      imageUrl: getHeroImageUrl(card),
    });
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
  "Aurora, Shooting Star": `${PORTRAIT_CDN}/Aurora_Shooting_Star.jpg`,
  "Arakni, 5L!p3d 7hRu 7h3 cR4X": `${PORTRAIT_CDN}/Arakni_Slipped_thru_the_Cracks.jpg`,
  "Dash I/O": `${PORTRAIT_CDN}/Dash%20I%3AO.jpg`,
  "Enigma, Ledger of Ancestry": `${PORTRAIT_CDN}/Enigma%2C%20Legend%20of%20Ancestry.jpg`,
  "Florian, Rotwood Harbinger": `${PORTRAIT_CDN}/Florian%2C%20Rotwood%20Harbringer.jpg`,
  "Gravy Bones": `${PORTRAIT_CDN}/Gravy_Bones_Shipwrecked_Looter.jpg`,
  "Gravy Bones, Shipwrecked Looter": `${PORTRAIT_CDN}/Gravy_Bones_Shipwrecked_Looter.jpg`,
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
  "Pleiades, Superstar": `${PORTRAIT_CDN}/Pleiades_Superstar.jpg`,
  "Puffin, Hightail": `${PORTRAIT_CDN}/Puffin_Hightail.jpg`,
  "Scurv, Stowaway": `${PORTRAIT_CDN}/Scurv_Stowaway.jpg`,
  "Tuffnut, Bumbling Hulkster": `${PORTRAIT_CDN}/Tuffnut_Bumbling_Hulkster.jpg`,
  "Valda Brightaxe": `${PORTRAIT_CDN}/Valda_Seismic_Impact_cWNA1HW.jpg`,
  "Valda, Seismic Impact": `${PORTRAIT_CDN}/Valda_Seismic_Impact_cWNA1HW.jpg`,
  "Verdance, Thorn of the Rose": `${PORTRAIT_CDN}/Verdance%2C%20Thorn%20of%20Rose.jpg`,
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

export function searchHeroes(query: string, format?: string): HeroInfo[] {
  const lower = query.toLowerCase();
  const pool = format ? getHeroesForFormat(format) : allHeroes;
  return pool.filter(
    (h) =>
      h.name.toLowerCase().includes(lower) ||
      h.classes.some((c) => c.toLowerCase().includes(lower))
  );
}

/** Filter heroes by game format. Returns all heroes if format has no mapping.
 *  Living Legend heroes are always included for constructed formats since users
 *  may need to record historical matches played before the hero was LL'd. */
export function getHeroesForFormat(format: string): HeroInfo[] {
  // "Other" or unknown formats → show all heroes
  if (!format || format === "Other") return allHeroes;
  return allHeroes.filter(
    (h) => h.legalFormats.includes(format) || h.legalFormats.includes("Living Legend")
  );
}

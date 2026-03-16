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

// ── Hero Portrait Images (from FABTCG coverage CDN) ──
// These are high-quality hero art portraits, not card images.
// URL naming is inconsistent on the CDN so we use a static map.

const PORTRAIT_CDN = "https://dgmi4fxzalveh.cloudfront.net/media/images/heroes";

const HERO_PORTRAIT_MAP: Record<string, string> = {
  "Arakni, Huntsman": `${PORTRAIT_CDN}/Arakni%2C%20Huntsman.jpg`,
  "Arakni, Marionette": `${PORTRAIT_CDN}/Arakni%2C%20Marionette.jpg`,
  "Aurora, Shooting Star": `${PORTRAIT_CDN}/Aurora_Shooting_Star.jpg`,
  "Aurora": `${PORTRAIT_CDN}/Aurora.jpg`,
  "Azalea, Ace in the Hole": `${PORTRAIT_CDN}/Azalea%2C%20Ace%20in%20the%20Hole.jpg`,
  "Bravo, Showstopper": `${PORTRAIT_CDN}/Bravo%2C%20Showstopper.jpg`,
  "Cindra, Dracai of Retribution": `${PORTRAIT_CDN}/Cindra%2C%20Dracai%20of%20Retribution.jpg`,
  "Dash I/O": `${PORTRAIT_CDN}/Dash%20I%3AO.jpg`,
  "Dash, Inventor Extraordinaire": `${PORTRAIT_CDN}/Dash%2C%20Inventor%20Extraordinaire.jpg`,
  "Dorinthea Ironsong": `${PORTRAIT_CDN}/Dorinthea%20Ironsong.jpg`,
  "Enigma, Ledger of Ancestry": `${PORTRAIT_CDN}/Enigma%2C%20Legend%20of%20Ancestry.jpg`,
  "Fai, Rising Rebellion": `${PORTRAIT_CDN}/Fai%2C%20Rising%20Rebellion.jpg`,
  "Fang, Dracai of Blades": `${PORTRAIT_CDN}/Fang%2C%20Dracai%20of%20Blades.jpg`,
  "Florian, Rotwood Harbinger": `${PORTRAIT_CDN}/Florian%2C%20Rotwood%20Harbringer.jpg`,
  "Ira, Scarlet Revenger": `${PORTRAIT_CDN}/Ira%2C%20Scarlet%20Revenger.jpg`,
  "Kano, Dracai of Aether": `${PORTRAIT_CDN}/Kano%2C%20Dracai%20of%20Aether.jpg`,
  "Kassai of the Golden Sand": `${PORTRAIT_CDN}/Kassai%2C%20of%20the%20Golden%20Sand.jpg`,
  "Katsu, the Wanderer": `${PORTRAIT_CDN}/Katsu%2C%20the%20Wanderer.jpg`,
  "Kayo, Armed and Dangerous": `${PORTRAIT_CDN}/Kayo_Armed_and_Dangerous.jpg`,
  "Levia, Shadowborn Abomination": `${PORTRAIT_CDN}/Levia%2C%20Shadowborn%20Abomination.jpg`,
  "Lyath Goldmane, Vile Savant": `${PORTRAIT_CDN}/Lyath_Goldmane_Vile_Savant.jpg`,
  "Maxx Nitro": `${PORTRAIT_CDN}/Maxx%20%27The%20Hype%27%20Nitro.jpg`,
  "Nuu, Alluring Desire": `${PORTRAIT_CDN}/Nuu%2C%20Alluring%20Desire.jpg`,
  "Olympia, Prized Fighter": `${PORTRAIT_CDN}/Olympia%2C%20Prized%20Fighter.jpg`,
  "Oscilio, Constella Intelligence": `${PORTRAIT_CDN}/Oscilio%2C%20Constella%20Intelligence.jpg`,
  "Pleiades, Superstar": `${PORTRAIT_CDN}/Pleiades_Superstar.jpg`,
  "Prism, Awakener of Sol": `${PORTRAIT_CDN}/Prism%2C%20Awakener%20of%20Sol.jpg`,
  "Rhinar, Reckless Rampage": `${PORTRAIT_CDN}/Rhinar%2C%20Reckless%20Rampage.jpg`,
  "Riptide, Lurker of the Deep": `${PORTRAIT_CDN}/Riptide%2C%20Lurker%20of%20the%20Deep.jpg`,
  "Ser Boltyn, Breaker of Dawn": `${PORTRAIT_CDN}/Ser%20Boltyn%2C%20Breaker%20of%20Dawn.jpg`,
  "Teklovossen, Esteemed Magnate": `${PORTRAIT_CDN}/Teklovossen%2C%20Esteemed%20Magnate.jpg`,
  "Uzuri, Switchblade": `${PORTRAIT_CDN}/Uzuri%2C%20Switchblade.jpg`,
  "Valda, Seismic Impact": `${PORTRAIT_CDN}/Valda_Seismic_Impact_cWNA1HW.jpg`,
  "Verdance, Thorn of the Rose": `${PORTRAIT_CDN}/Verdance%2C%20Thorn%20of%20Rose.jpg`,
  "Victor Goldmane, High and Mighty": `${PORTRAIT_CDN}/Victor%20Goldmane%2C%20High%20and%20Mighty.jpg`,
  "Viserai, Rune Blood": `${PORTRAIT_CDN}/Viserai%2C%20Rune%20Blood.jpg`,
  "Vynnset, Iron Maiden": `${PORTRAIT_CDN}/Vynnset%2C%20Iron%20Maiden.jpg`,
  "Zen, Tamer of Purpose": `${PORTRAIT_CDN}/Zen%2C%20Tamer%20of%20Purpose.jpg`,
};

export function getHeroPortraitUrl(name: string): string | null {
  return HERO_PORTRAIT_MAP[name] || null;
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

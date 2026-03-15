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

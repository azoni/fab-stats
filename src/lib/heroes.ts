import { cards } from "@flesh-and-blood/cards";
import { Type } from "@flesh-and-blood/types";
import type { HeroInfo } from "@/types";

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
      imageUrl: "",
    });
  }
}

export const allHeroes: HeroInfo[] = Array.from(heroMap.values()).sort(
  (a, b) => a.name.localeCompare(b.name)
);

export function getHeroByName(name: string): HeroInfo | undefined {
  return allHeroes.find((h) => h.name === name);
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

/** Filter heroes by game format. Returns all heroes if format has no mapping. */
export function getHeroesForFormat(format: string): HeroInfo[] {
  // "Other" or unknown formats → show all heroes
  if (!format || format === "Other") return allHeroes;
  return allHeroes.filter((h) => h.legalFormats.includes(format));
}

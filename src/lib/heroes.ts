import { cards } from "@flesh-and-blood/cards";
import { Type } from "@flesh-and-blood/types";
import type { HeroInfo } from "@/types";

const heroCards = cards.filter((card) =>
  card.types.includes(Type.Hero)
);

const heroMap = new Map<string, HeroInfo>();
for (const card of heroCards) {
  const existing = heroMap.get(card.name);
  if (!existing) {
    heroMap.set(card.name, {
      name: card.name,
      cardIdentifier: card.cardIdentifier,
      classes: (card.classes || []).map(String),
      talents: (card.talents || []).map(String),
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

export function searchHeroes(query: string): HeroInfo[] {
  const lower = query.toLowerCase();
  return allHeroes.filter(
    (h) =>
      h.name.toLowerCase().includes(lower) ||
      h.classes.some((c) => c.toLowerCase().includes(lower))
  );
}

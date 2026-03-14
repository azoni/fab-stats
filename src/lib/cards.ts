import { cards } from "@flesh-and-blood/cards";
import { Type } from "@flesh-and-blood/types";
import type { CardInfo } from "@/types";

const CARD_IMAGE_CDN = "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large";

const INCLUDED_TYPES = new Set<string>([
  Type.Action,
  Type.Equipment,
  Type.Weapon,
  Type.Instant,
  Type.DefenseReaction,
  Type.AttackReaction,
]);

/** Map raw type enums to display-friendly names. */
function getDisplayType(types: string[]): string {
  if (types.includes(Type.DefenseReaction)) return "Defense Reaction";
  if (types.includes(Type.AttackReaction)) return "Attack Reaction";
  if (types.includes(Type.Equipment)) return "Equipment";
  if (types.includes(Type.Weapon)) return "Weapon";
  if (types.includes(Type.Instant)) return "Instant";
  return "Action";
}

// Lazy initialization — defer heavy processing until first access
let _allCards: CardInfo[] | null = null;
let _cardByIdMap: Map<string, CardInfo> | null = null;

function initCards() {
  if (_allCards) return;

  const cardMap = new Map<string, CardInfo>();
  for (const card of cards) {
    if (!card.types.some((t) => INCLUDED_TYPES.has(t))) continue;
    if (cardMap.has(card.cardIdentifier)) continue;

    const imageId = card.defaultImage || "";
    cardMap.set(card.cardIdentifier, {
      name: card.name,
      cardIdentifier: card.cardIdentifier,
      types: [getDisplayType(card.types.map(String))],
      classes: (card.classes || []).map(String),
      talents: (card.talents || []).map(String),
      keywords: (card.keywords || []).map(String),
      pitch: card.pitch,
      cost: card.cost,
      power: card.power,
      defense: card.defense,
      legalFormats: (card.legalFormats || []).map(String),
      imageUrl: imageId ? `${CARD_IMAGE_CDN}/${imageId}.webp` : "",
    });
  }

  _allCards = Array.from(cardMap.values()).sort(
    (a, b) => a.name.localeCompare(b.name) || (a.pitch ?? 0) - (b.pitch ?? 0)
  );

  _cardByIdMap = new Map<string, CardInfo>();
  for (const c of _allCards) _cardByIdMap.set(c.cardIdentifier, c);
}

export function getAllCards(): CardInfo[] {
  initCards();
  return _allCards!;
}

/** @deprecated Use getAllCards() instead — kept for backward compat */
export const allCards: CardInfo[] = new Proxy([] as CardInfo[], {
  get(_, prop) {
    initCards();
    return Reflect.get(_allCards!, prop);
  },
});

export function getCardById(cardIdentifier: string): CardInfo | undefined {
  initCards();
  return _cardByIdMap!.get(cardIdentifier);
}

export function searchCards(query: string): CardInfo[] {
  initCards();
  const lower = query.toLowerCase();
  return _allCards!.filter(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      c.classes.some((cls) => cls.toLowerCase().includes(lower)) ||
      c.types.some((t) => t.toLowerCase().includes(lower))
  );
}

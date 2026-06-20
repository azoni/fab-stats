/**
 * Flesh and Blood card index — vendored from fab-stats-bot/src/lib/cards.ts.
 * Powers the find_card tool AND the card RAG corpus. Self-typed (minimal
 * RawCard) so we don't need @flesh-and-blood/types.
 */
import { cards } from "@flesh-and-blood/cards";

const CARD_IMAGE_CDN = "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large";

interface RawCard {
  name: string;
  cardIdentifier: string;
  typeText?: string;
  types?: unknown[];
  pitch?: number;
  cost?: number | string;
  power?: number | string;
  defense?: number | string;
  life?: number;
  intellect?: number;
  arcane?: number;
  keywords?: unknown[];
  classes?: unknown[];
  talents?: unknown[];
  legalFormats?: unknown[];
  functionalText?: string;
  defaultImage?: string;
  isCardBack?: boolean;
}

export interface FabCard {
  name: string;
  cardIdentifier: string;
  typeText: string;
  pitch?: number;
  cost?: number | string;
  power?: number | string;
  defense?: number | string;
  life?: number;
  intellect?: number;
  arcane?: number;
  keywords: string[];
  classes: string[];
  talents: string[];
  legalFormats: string[];
  functionalText?: string;
  imageUrl: string;
}

function toCard(c: RawCard): FabCard {
  return {
    name: c.name,
    cardIdentifier: c.cardIdentifier,
    typeText: c.typeText || (c.types || []).map(String).join(" "),
    pitch: c.pitch,
    cost: c.cost,
    power: c.power,
    defense: c.defense,
    life: c.life,
    intellect: c.intellect,
    arcane: c.arcane,
    keywords: (c.keywords || []).map(String),
    classes: (c.classes || []).map(String),
    talents: (c.talents || []).map(String),
    legalFormats: (c.legalFormats || []).map(String),
    functionalText: c.functionalText,
    imageUrl: c.defaultImage ? `${CARD_IMAGE_CDN}/${c.defaultImage}.webp` : "",
  };
}

const byName = new Map<string, FabCard>();
for (const raw of cards as unknown as RawCard[]) {
  if (raw.isCardBack) continue;
  const card = toCard(raw);
  const existing = byName.get(card.name.toLowerCase());
  if (!existing || (!existing.imageUrl && card.imageUrl)) {
    byName.set(card.name.toLowerCase(), card);
  }
}

export const allCards: FabCard[] = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));

/** Fuzzy-find one card by name: exact → prefix → substring. */
export function findCard(query: string): FabCard | null {
  const lower = query.trim().toLowerCase();
  if (!lower) return null;
  return (
    byName.get(lower) ??
    allCards.find((c) => c.name.toLowerCase().startsWith(lower)) ??
    allCards.find((c) => c.name.toLowerCase().includes(lower)) ??
    null
  );
}

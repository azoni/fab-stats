import type { CardInfo } from "@/types";
import cardData from "./generated/card-data.json";

const CARD_IMAGE_CDN = "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large";

// The playable-card pool comes from a build-time manifest
// (scripts/gen-card-manifests.ts) rather than the whole @flesh-and-blood/cards
// package — the package is a single 8.8 MB bundle. The manifest holds the same
// records the old module-eval filter produced (deduped by cardIdentifier, in
// package order); only the two CDN URLs are rebuilt here from their ids so the
// file does not repeat the prefixes 4,700 times. REGENERATE ON EVERY PACKAGE
// BUMP: npx tsx scripts/gen-card-manifests.ts

type CardManifestEntry = Omit<CardInfo, "imageUrl" | "imageUrlFallback"> & {
  img: string;
  tcg?: string;
};

/** A TCGplayer card scan (portrait, card-ratio) to fall back on when the community
 *  image CDN has no render yet — chiefly the newest sets (Omens of the Third Age,
 *  Mastery Pack: Warrior, …). Derived from the card's TCGplayer product id. */
function tcgplayerImage(productId: string | undefined): string | undefined {
  return productId ? `https://tcgplayer-cdn.tcgplayer.com/product/${productId}_in_1000x1000.jpg` : undefined;
}

const cardPool: CardInfo[] = (cardData.cards as CardManifestEntry[]).map(({ img, tcg, ...rest }) => ({
  ...rest,
  imageUrl: img ? `${CARD_IMAGE_CDN}/${img}.webp` : "",
  imageUrlFallback: tcgplayerImage(tcg),
}));

export const allCards: CardInfo[] = cardPool.sort(
  (a, b) => a.name.localeCompare(b.name) || (a.pitch ?? 0) - (b.pitch ?? 0)
);

const cardByIdMap = new Map<string, CardInfo>();
for (const c of allCards) cardByIdMap.set(c.cardIdentifier, c);

export function getCardById(cardIdentifier: string): CardInfo | undefined {
  return cardByIdMap.get(cardIdentifier);
}

export function searchCards(query: string): CardInfo[] {
  const lower = query.toLowerCase();
  return allCards.filter(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      c.classes.some((cls) => cls.toLowerCase().includes(lower)) ||
      c.types.some((t) => t.toLowerCase().includes(lower))
  );
}

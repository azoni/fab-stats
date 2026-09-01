/**
 * Generates the static hero + card manifests the client bundle ships instead
 * of the whole @flesh-and-blood/cards package (8.8 MB of JS that used to ride
 * in every route's shared chunk).
 *
 *   src/lib/generated/hero-data.json  — the Hero-type cards as HeroInfo (≈45 KB)
 *   src/lib/generated/card-data.json  — the playable-card pool as CardInfo (≈1.8 MB)
 *
 * The derivation is byte-for-byte the logic src/lib/heroes.ts and
 * src/lib/cards.ts used to run at module-eval time. Both files still sort at
 * runtime and heroes.ts still applies LL_OVERRIDES / FORMAT_ADD_OVERRIDES, so
 * the manifests are the PRE-sort, PRE-override arrays.
 *
 *   npx tsx scripts/gen-card-manifests.ts          # regenerate (every package bump)
 *   npx tsx scripts/gen-card-manifests.ts --check  # exit 1 if the committed files drift
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { cards } from "@flesh-and-blood/cards";
import { Type } from "@flesh-and-blood/types";
import type { HeroInfo, CardInfo } from "../src/types";

const CARD_IMAGE_CDN = "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large";

const pkgVersion = (
  JSON.parse(readFileSync("node_modules/@flesh-and-blood/cards/package.json", "utf8")) as { version: string }
).version;

// ── Heroes (mirrors the former src/lib/heroes.ts:7-46) ──

function getHeroImageUrl(card: (typeof cards)[number]): string {
  const printings = card.printings || [];
  const candidates = printings
    .map((p: { image?: string }) => p.image)
    .filter(
      (i): i is string =>
        !!i && !i.includes("BACK") && !i.includes("_V2") && !i.includes("-MV") && !i.includes("-RF") && !i.includes("MARVEL"),
    );
  const best =
    card.defaultImage && candidates.includes(card.defaultImage) ? card.defaultImage : candidates[0] || card.defaultImage || "";
  return best ? `${CARD_IMAGE_CDN}/${best}.webp` : "";
}

const heroMap = new Map<string, HeroInfo>();
for (const card of cards.filter((c) => c.types.includes(Type.Hero))) {
  const existing = heroMap.get(card.name);
  if (existing) {
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
const heroes = Array.from(heroMap.values());

// ── Cards (mirrors the former src/lib/cards.ts:7-62) ──

const INCLUDED_TYPES = new Set<string>([
  Type.Action,
  Type.Equipment,
  Type.Weapon,
  Type.Instant,
  Type.DefenseReaction,
  Type.AttackReaction,
]);

/** First printing's TCGplayer product id — cards.ts turns it into the
 *  `imageUrlFallback` scan URL at load (the former tcgplayerImage()). */
function tcgplayerProductId(card: { printings?: { tcgplayer?: { productId?: string } }[] }): string | undefined {
  for (const p of card.printings || []) {
    const id = p.tcgplayer?.productId;
    if (id) return id;
  }
  return undefined;
}

function getDisplayType(types: string[]): string {
  if (types.includes(Type.DefenseReaction)) return "Defense Reaction";
  if (types.includes(Type.AttackReaction)) return "Attack Reaction";
  if (types.includes(Type.Equipment)) return "Equipment";
  if (types.includes(Type.Weapon)) return "Weapon";
  if (types.includes(Type.Instant)) return "Instant";
  return "Action";
}

/** CardInfo minus the two URL fields, which are rebuilt from ids at load so the
 *  manifest does not repeat two CDN prefixes 4,700 times. */
export type CardManifestEntry = Omit<CardInfo, "imageUrl" | "imageUrlFallback"> & {
  /** `defaultImage` id; "" when the CDN has no render. */
  img: string;
  /** TCGplayer product id for the fallback scan, when any printing has one. */
  tcg?: string;
};

const cardMap = new Map<string, CardManifestEntry>();
for (const card of cards.filter((c) => c.types.some((t) => INCLUDED_TYPES.has(t)))) {
  if (cardMap.has(card.cardIdentifier)) continue;
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
    img: card.defaultImage || "",
    tcg: tcgplayerProductId(card),
  });
}
const cardPool = Array.from(cardMap.values());

// ── Emit ──

const HERO_FILE = "src/lib/generated/hero-data.json";
const CARD_FILE = "src/lib/generated/card-data.json";

// JSON.stringify drops `undefined` fields, exactly like the objects the old
// module-eval code produced once serialized — consumers treat absent and
// undefined the same (optional fields).
const heroOut = JSON.stringify({ packageVersion: pkgVersion, heroes });
const cardOut = JSON.stringify({ packageVersion: pkgVersion, cards: cardPool });

if (process.argv.includes("--check")) {
  let drift = false;
  for (const [file, next] of [
    [HERO_FILE, heroOut],
    [CARD_FILE, cardOut],
  ] as const) {
    const current = existsSync(file) ? readFileSync(file, "utf8") : "";
    if (current !== next) {
      drift = true;
      console.error(`DRIFT: ${file} does not match the installed package (${pkgVersion}). Re-run without --check.`);
    }
  }
  if (drift) process.exit(1);
  console.log(`manifests match package ${pkgVersion}: ${heroes.length} heroes, ${cardPool.length} cards`);
} else {
  writeFileSync(HERO_FILE, heroOut);
  writeFileSync(CARD_FILE, cardOut);
  console.log(
    `wrote ${HERO_FILE} (${heroes.length} heroes, ${heroOut.length} B) and ${CARD_FILE} (${cardPool.length} cards, ${cardOut.length} B) from package ${pkgVersion}`,
  );
}

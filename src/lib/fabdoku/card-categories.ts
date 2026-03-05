import type { CardInfo } from "@/types";

export type CardCategoryGroup = "class" | "type" | "pitch" | "cost" | "keyword" | "talent";

export interface CardCategoryDef {
  id: string;
  label: string;
  group: CardCategoryGroup;
  test: (card: CardInfo) => boolean;
  icon?: string;
}

// ─── Class categories ───
const CARD_CLASSES = [
  "Guardian", "Warrior", "Ninja", "Brute", "Runeblade",
  "Mechanologist", "Wizard", "Illusionist", "Ranger", "Assassin", "Pirate",
] as const;

export const CARD_CLASS_CATEGORIES: CardCategoryDef[] = CARD_CLASSES.map((cls) => ({
  id: `class-${cls.toLowerCase()}`,
  label: cls,
  group: "class" as const,
  test: (card: CardInfo) => card.classes.includes(cls),
  icon: cls.toLowerCase(),
}));

// ─── Type categories ───
export const CARD_TYPE_CATEGORIES: CardCategoryDef[] = [
  { id: "type-action", label: "Action", group: "type", test: (c) => c.types.includes("Action") },
  { id: "type-equipment", label: "Equipment", group: "type", test: (c) => c.types.includes("Equipment") },
  { id: "type-weapon", label: "Weapon", group: "type", test: (c) => c.types.includes("Weapon") },
  { id: "type-instant", label: "Instant", group: "type", test: (c) => c.types.includes("Instant") },
  { id: "type-defense-reaction", label: "Defense Reaction", group: "type", test: (c) => c.types.includes("Defense Reaction") },
  { id: "type-attack-reaction", label: "Attack Reaction", group: "type", test: (c) => c.types.includes("Attack Reaction") },
];

// ─── Pitch categories ───
export const CARD_PITCH_CATEGORIES: CardCategoryDef[] = [
  { id: "pitch-red", label: "Red (1)", group: "pitch", test: (c) => c.pitch === 1, icon: "red" },
  { id: "pitch-yellow", label: "Yellow (2)", group: "pitch", test: (c) => c.pitch === 2, icon: "yellow" },
  { id: "pitch-blue", label: "Blue (3)", group: "pitch", test: (c) => c.pitch === 3, icon: "blue" },
];

// ─── Cost categories ───
export const CARD_COST_CATEGORIES: CardCategoryDef[] = [
  { id: "cost-0", label: "Cost 0", group: "cost", test: (c) => c.cost === 0 },
  { id: "cost-1", label: "Cost 1", group: "cost", test: (c) => c.cost === 1 },
  { id: "cost-2", label: "Cost 2", group: "cost", test: (c) => c.cost === 2 },
  { id: "cost-3+", label: "Cost 3+", group: "cost", test: (c) => c.cost != null && c.cost >= 3 },
];

// ─── Keyword categories (only common keywords) ───
export const CARD_KEYWORD_CATEGORIES: CardCategoryDef[] = [
  { id: "kw-go-again", label: "Go Again", group: "keyword", test: (c) => c.keywords.includes("Go again") },
  { id: "kw-dominate", label: "Dominate", group: "keyword", test: (c) => c.keywords.includes("Dominate") },
  { id: "kw-combo", label: "Combo", group: "keyword", test: (c) => c.keywords.includes("Combo") },
  { id: "kw-boost", label: "Boost", group: "keyword", test: (c) => c.keywords.includes("Boost") },
  { id: "kw-stealth", label: "Stealth", group: "keyword", test: (c) => c.keywords.includes("Stealth") },
];

// ─── Talent categories ───
const CARD_TALENTS = [
  "Draconic", "Elemental", "Shadow", "Light", "Ice", "Earth", "Lightning",
] as const;

export const CARD_TALENT_CATEGORIES: CardCategoryDef[] = CARD_TALENTS.map((tal) => ({
  id: `talent-${tal.toLowerCase()}`,
  label: tal,
  group: "talent" as const,
  test: (card: CardInfo) => card.talents.includes(tal),
}));

// ─── Category group map ───
export const CARD_GROUP_MAP: Record<CardCategoryGroup, CardCategoryDef[]> = {
  class: CARD_CLASS_CATEGORIES,
  type: CARD_TYPE_CATEGORIES,
  pitch: CARD_PITCH_CATEGORIES,
  cost: CARD_COST_CATEGORIES,
  keyword: CARD_KEYWORD_CATEGORIES,
  talent: CARD_TALENT_CATEGORIES,
};

// ─── Axis pairs (conservative selection) ───
export const CARD_AXIS_PAIRS: [CardCategoryGroup, CardCategoryGroup][] = [
  ["class", "type"],
  ["class", "keyword"],
  ["class", "talent"],
  ["class", "pitch"],
  ["type", "talent"],
  ["type", "keyword"],
  ["type", "class"],
  ["pitch", "class"],
  ["pitch", "keyword"],
  ["talent", "keyword"],
  ["talent", "class"],
  ["cost", "class"],
  ["cost", "type"],
];

import type { CategoryDef } from "./types";

// Classes with enough heroes (≥7) for reliable puzzle generation
const PUZZLE_CLASSES = [
  "Guardian",
  "Warrior",
  "Runeblade",
  "Mechanologist",
  "Ninja",
  "Brute",
  "Assassin",
  "Wizard",
  "Illusionist",
  "Ranger",
  "Pirate",
] as const;

// Talents that have enough heroes
const PUZZLE_TALENTS = [
  "Elemental",
  "Earth",
  "Draconic",
  "Lightning",
  "Ice",
  "Light",
  "Mystic",
  "Shadow",
  "Royal",
] as const;

export const CLASS_CATEGORIES: CategoryDef[] = PUZZLE_CLASSES.map((cls) => ({
  id: `class-${cls.toLowerCase()}`,
  label: cls,
  group: "class",
  test: (hero) => hero.classes.includes(cls),
  icon: cls,
}));

export const TALENT_CATEGORIES: CategoryDef[] = [
  ...PUZZLE_TALENTS.map(
    (tal): CategoryDef => ({
      id: `talent-${tal.toLowerCase()}`,
      label: tal,
      group: "talent",
      test: (hero) => hero.talents.includes(tal),
    })
  ),
  {
    id: "talent-none",
    label: "No Talent",
    group: "talent",
    test: (hero) => hero.talents.length === 0,
  },
];

export const AGE_CATEGORIES: CategoryDef[] = [
  {
    id: "age-young",
    label: "Young Hero",
    group: "age",
    test: (hero) => hero.young === true,
  },
  {
    id: "age-adult",
    label: "Adult Hero",
    group: "age",
    test: (hero) => !hero.young,
  },
];

export const STAT_CATEGORIES: CategoryDef[] = [
  {
    id: "stat-life-low",
    label: "Life ≤ 20",
    group: "stat",
    test: (hero) => hero.life !== undefined && hero.life <= 20,
  },
  {
    id: "stat-life-mid",
    label: "Life 21–30",
    group: "stat",
    test: (hero) => hero.life !== undefined && hero.life >= 21 && hero.life <= 30,
  },
  {
    id: "stat-life-high",
    label: "Life ≥ 31",
    group: "stat",
    test: (hero) => hero.life !== undefined && hero.life >= 31,
  },
];

export const FORMAT_CATEGORIES: CategoryDef[] = [
  {
    id: "format-blitz",
    label: "Blitz Legal",
    group: "format",
    test: (hero) => hero.legalFormats.includes("Blitz"),
  },
  {
    id: "format-cc",
    label: "CC Legal",
    group: "format",
    test: (hero) => hero.legalFormats.includes("Classic Constructed"),
  },
  {
    id: "format-ll",
    label: "Living Legend",
    group: "format",
    test: (hero) => hero.legalFormats.includes("Living Legend"),
  },
];

export const ALL_CATEGORIES: CategoryDef[] = [
  ...CLASS_CATEGORIES,
  ...TALENT_CATEGORIES,
  ...AGE_CATEGORIES,
  ...STAT_CATEGORIES,
  ...FORMAT_CATEGORIES,
];

/** Groups that can be combined on row/col axes */
export const CATEGORY_GROUPS = {
  class: CLASS_CATEGORIES,
  talent: TALENT_CATEGORIES,
  age: AGE_CATEGORIES,
  stat: STAT_CATEGORIES,
  format: FORMAT_CATEGORIES,
} as const;

export type CategoryGroup = keyof typeof CATEGORY_GROUPS;

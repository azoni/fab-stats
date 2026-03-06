export interface BladeDashWord {
  id: number;
  word: string;
  category: "hero" | "weapon" | "attack" | "mechanic" | "equipment" | "region";
  difficulty: 1 | 2 | 3;
}

export const WORD_BANK: BladeDashWord[] = [
  // Easy (3-4 letters)
  { id: 1,  word: "FAI",    category: "hero",      difficulty: 1 },
  { id: 2,  word: "IRA",    category: "hero",      difficulty: 1 },
  { id: 3,  word: "ZEN",    category: "hero",      difficulty: 1 },
  { id: 4,  word: "NUU",    category: "hero",      difficulty: 1 },
  { id: 5,  word: "CLAW",   category: "weapon",    difficulty: 1 },
  { id: 6,  word: "KICK",   category: "attack",    difficulty: 1 },
  { id: 7,  word: "BOLT",   category: "attack",    difficulty: 1 },
  { id: 8,  word: "OPT",    category: "mechanic",  difficulty: 1 },
  { id: 9,  word: "ARC",    category: "mechanic",  difficulty: 1 },
  { id: 10, word: "MASK",   category: "equipment", difficulty: 1 },
  { id: 11, word: "JAB",    category: "attack",    difficulty: 1 },

  // Medium (5-6 letters)
  { id: 12, word: "KATSU",   category: "hero",      difficulty: 2 },
  { id: 13, word: "BENJI",   category: "hero",      difficulty: 2 },
  { id: 14, word: "COMBO",   category: "mechanic",  difficulty: 2 },
  { id: 15, word: "SNATCH",  category: "attack",    difficulty: 2 },
  { id: 16, word: "SURGE",   category: "attack",    difficulty: 2 },
  { id: 17, word: "WHIRL",   category: "attack",    difficulty: 2 },
  { id: 18, word: "PITCH",   category: "mechanic",  difficulty: 2 },
  { id: 19, word: "PUMMEL",  category: "attack",    difficulty: 2 },
  { id: 20, word: "STRIKE",  category: "attack",    difficulty: 2 },
  { id: 21, word: "UZURI",   category: "hero",      difficulty: 2 },
  { id: 22, word: "CINDRA",  category: "hero",      difficulty: 2 },
  { id: 23, word: "ENIGMA",  category: "hero",      difficulty: 2 },
  { id: 24, word: "ARAKNI",  category: "hero",      difficulty: 2 },
  { id: 25, word: "SHADOW",  category: "mechanic",  difficulty: 2 },
  { id: 26, word: "KUNAI",   category: "weapon",    difficulty: 2 },
  { id: 27, word: "VOLCOR",  category: "region",    difficulty: 2 },
  { id: 28, word: "RATHE",   category: "region",    difficulty: 2 },

  // Hard (7+ letters)
  { id: 29, word: "KODACHI",    category: "weapon",    difficulty: 3 },
  { id: 30, word: "STEALTH",    category: "mechanic",  difficulty: 3 },
  { id: 31, word: "TORNADO",    category: "attack",    difficulty: 3 },
  { id: 32, word: "MISTERIA",   category: "region",    difficulty: 3 },
  { id: 33, word: "MOMENTUM",   category: "equipment", difficulty: 3 },
  { id: 34, word: "FLUSTER",    category: "attack",    difficulty: 3 },
  { id: 35, word: "REPRISAL",   category: "mechanic",  difficulty: 3 },
  { id: 36, word: "WHELMING",   category: "attack",    difficulty: 3 },
  { id: 37, word: "SPINNING",   category: "attack",    difficulty: 3 },
  { id: 38, word: "SURGING",    category: "attack",    difficulty: 3 },
  { id: 39, word: "DOMINATE",   category: "mechanic",  difficulty: 3 },
  { id: 40, word: "SHURIKEN",   category: "weapon",    difficulty: 3 },
  { id: 41, word: "CROUCHING",  category: "attack",    difficulty: 3 },
  { id: 42, word: "SCALERS",    category: "equipment", difficulty: 3 },
  { id: 43, word: "GUSTWAVE",   category: "attack",    difficulty: 3 },
  { id: 44, word: "POUNCING",   category: "equipment", difficulty: 3 },
  { id: 45, word: "AGILITY",    category: "mechanic",  difficulty: 3 },
  { id: 46, word: "BREAKING",   category: "equipment", difficulty: 3 },
];

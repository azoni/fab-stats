export interface ShadowStrikeCard {
  id: number;
  label: string;
  emoji: string;
  category: "hero" | "weapon" | "attack" | "mechanic" | "equipment";
}

export const CARD_BANK: ShadowStrikeCard[] = [
  // Heroes
  { id: 1,  label: "Katsu",   emoji: "🥷", category: "hero" },
  { id: 2,  label: "Fai",     emoji: "🔥", category: "hero" },
  { id: 3,  label: "Ira",     emoji: "⚡", category: "hero" },
  { id: 4,  label: "Benji",   emoji: "🐒", category: "hero" },
  { id: 5,  label: "Zen",     emoji: "🧘", category: "hero" },
  { id: 6,  label: "Cindra",  emoji: "🌋", category: "hero" },
  { id: 7,  label: "Nuu",     emoji: "🕷️", category: "hero" },
  { id: 8,  label: "Uzuri",   emoji: "🗡️", category: "hero" },
  { id: 9,  label: "Arakni",  emoji: "🕸️", category: "hero" },
  { id: 10, label: "Enigma",  emoji: "🔮", category: "hero" },
  { id: 11, label: "Dash",    emoji: "⚙️", category: "hero" },
  { id: 12, label: "Viserai", emoji: "💀", category: "hero" },

  // Weapons
  { id: 13, label: "Kodachi",          emoji: "⚔️", category: "weapon" },
  { id: 14, label: "Harmonized Kodachi", emoji: "🎵", category: "weapon" },
  { id: 15, label: "Zephyr Needle",    emoji: "🪡", category: "weapon" },
  { id: 16, label: "Tiger Stripe Shuko", emoji: "🐅", category: "weapon" },
  { id: 17, label: "Claw",             emoji: "🦅", category: "weapon" },
  { id: 18, label: "Sai",              emoji: "🔱", category: "weapon" },
  { id: 19, label: "Waning Moon",      emoji: "🌙", category: "weapon" },
  { id: 20, label: "Spider's Bite",    emoji: "🕷️", category: "weapon" },

  // Attacks
  { id: 21, label: "Whelming Gustwave",  emoji: "🌊", category: "attack" },
  { id: 22, label: "Surging Strike",     emoji: "💥", category: "attack" },
  { id: 23, label: "Rising Knee Thrust", emoji: "🦵", category: "attack" },
  { id: 24, label: "Spinning Wheel Kick", emoji: "🌀", category: "attack" },
  { id: 25, label: "Head Jab",           emoji: "👊", category: "attack" },
  { id: 26, label: "Tornado Kick",       emoji: "🌪️", category: "attack" },
  { id: 27, label: "Flying Kick",        emoji: "🦶", category: "attack" },
  { id: 28, label: "Snatch",             emoji: "✊", category: "attack" },
  { id: 29, label: "Fluster Fist",       emoji: "🤜", category: "attack" },
  { id: 30, label: "Salt the Wound",     emoji: "🩸", category: "attack" },

  // Mechanics
  { id: 31, label: "Combo",    emoji: "🔗", category: "mechanic" },
  { id: 32, label: "Go Again", emoji: "♻️", category: "mechanic" },
  { id: 33, label: "Stealth",  emoji: "👤", category: "mechanic" },
  { id: 34, label: "On Hit",   emoji: "🎯", category: "mechanic" },
  { id: 35, label: "Dominate", emoji: "👑", category: "mechanic" },
  { id: 36, label: "Opt",      emoji: "🔍", category: "mechanic" },

  // Equipment
  { id: 37, label: "Mask of Momentum",       emoji: "🎭", category: "equipment" },
  { id: 38, label: "Snapdragon Scalers",     emoji: "🐉", category: "equipment" },
  { id: 39, label: "Breaking Scales",        emoji: "🛡️", category: "equipment" },
  { id: 40, label: "Fyendal's Spring Tunic", emoji: "👘", category: "equipment" },
  { id: 41, label: "Mask of the Pouncing Lynx", emoji: "🐆", category: "equipment" },
  { id: 42, label: "Stride of Reprisal",     emoji: "👟", category: "equipment" },
];

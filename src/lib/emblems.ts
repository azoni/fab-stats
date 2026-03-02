export interface Emblem {
  id: string;
  name: string;
  description: string;
}

// Legacy emblems — kept for backward compat with existing user selections
export const EMBLEMS: Emblem[] = [
  { id: "melee", name: "Warrior's Crest", description: "For those who fight up close" },
  { id: "ranged", name: "Ranger's Mark", description: "Strike from afar" },
  { id: "magic", name: "Arcane Sigil", description: "Channel the arcane" },
];

export const TALENT_EMBLEMS: Emblem[] = [
  { id: "t-light",     name: "Light",     description: "Radiance and purity" },
  { id: "t-shadow",    name: "Shadow",    description: "Darkness and void" },
  { id: "t-draconic",  name: "Draconic",  description: "Dragon flame" },
  { id: "t-elemental", name: "Elemental", description: "Forces of nature" },
  { id: "t-ice",       name: "Ice",       description: "Frost and crystal" },
  { id: "t-lightning", name: "Lightning", description: "Storm and static" },
  { id: "t-earth",     name: "Earth",     description: "Stone and mountain" },
  { id: "t-mystic",    name: "Mystic",    description: "Cosmic wisdom" },
  { id: "t-royal",     name: "Royal",     description: "Regal authority" },
  { id: "t-chaos",     name: "Chaos",     description: "Entropy unbound" },
  { id: "t-revered",   name: "Revered",   description: "Sacred and divine" },
  { id: "t-reviled",   name: "Reviled",   description: "Corrupted and dark" },
];

export const CLASS_EMBLEMS: Emblem[] = [
  { id: "c-warrior",       name: "Warrior",       description: "Blade and honor" },
  { id: "c-guardian",      name: "Guardian",      description: "Shield and protect" },
  { id: "c-brute",         name: "Brute",         description: "Savage strength" },
  { id: "c-ninja",         name: "Ninja",         description: "Speed and stealth" },
  { id: "c-ranger",        name: "Ranger",        description: "Precision from afar" },
  { id: "c-wizard",        name: "Wizard",        description: "Arcane mastery" },
  { id: "c-mechanologist", name: "Mechanologist", description: "Gears and gadgets" },
  { id: "c-runeblade",     name: "Runeblade",     description: "Runic sorcery" },
  { id: "c-illusionist",   name: "Illusionist",   description: "Deception and light" },
  { id: "c-assassin",      name: "Assassin",      description: "Lethal precision" },
  { id: "c-bard",          name: "Bard",          description: "Song and story" },
  { id: "c-necromancer",   name: "Necromancer",   description: "Death and rebirth" },
  { id: "c-shapeshifter",  name: "Shapeshifter",  description: "Ever-changing form" },
  { id: "c-merchant",      name: "Merchant",      description: "Trade and fortune" },
  { id: "c-pirate",        name: "Pirate",        description: "Seas and plunder" },
  { id: "c-adjudicator",   name: "Adjudicator",   description: "Balance and law" },
  { id: "c-thief",         name: "Thief",         description: "Cunning and stealth" },
];

export function getEmblemById(id: string): Emblem | undefined {
  return [...EMBLEMS, ...TALENT_EMBLEMS, ...CLASS_EMBLEMS].find((e) => e.id === id);
}

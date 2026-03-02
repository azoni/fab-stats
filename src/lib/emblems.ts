export interface Emblem {
  id: string;
  name: string;
  description: string;
}

export const EMBLEMS: Emblem[] = [
  { id: "melee", name: "Warrior's Crest", description: "For those who fight up close" },
  { id: "ranged", name: "Ranger's Mark", description: "Strike from afar" },
  { id: "magic", name: "Arcane Sigil", description: "Channel the arcane" },
];

export function getEmblemById(id: string): Emblem | undefined {
  return EMBLEMS.find((e) => e.id === id);
}

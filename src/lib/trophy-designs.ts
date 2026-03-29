export interface TrophyDesignDef {
  id: string;
  label: string;
  index: number;
  defaultUnlocked: boolean;
}

/** 3 design variants per event type */
export const TROPHY_DESIGNS: Record<string, TrophyDesignDef[]> = {
  // Trophy tier — Tier 4 + Tier 3
  Worlds: [
    { id: "worlds-globe", label: "Golden Globe", index: 0, defaultUnlocked: true },
    { id: "worlds-crown", label: "Celestial Crown", index: 1, defaultUnlocked: false },
    { id: "worlds-phoenix", label: "Phoenix Rising", index: 2, defaultUnlocked: false },
  ],
  "Pro Tour": [
    { id: "pt-chalice", label: "Classic Chalice", index: 0, defaultUnlocked: true },
    { id: "pt-standard", label: "War Standard", index: 1, defaultUnlocked: false },
    { id: "pt-spire", label: "Crystal Spire", index: 2, defaultUnlocked: false },
  ],
  Nationals: [
    { id: "nat-shield", label: "Flag Shield", index: 0, defaultUnlocked: true },
    { id: "nat-eagle", label: "Heraldic Eagle", index: 1, defaultUnlocked: false },
    { id: "nat-forge", label: "Forge & Anvil", index: 2, defaultUnlocked: false },
  ],
  "The Calling": [
    { id: "tc-chalice", label: "Mystic Chalice", index: 0, defaultUnlocked: true },
    { id: "tc-tome", label: "Arcane Tome", index: 1, defaultUnlocked: false },
    { id: "tc-circle", label: "Summoning Circle", index: 2, defaultUnlocked: false },
  ],
  "Battle Hardened": [
    { id: "bh-axes", label: "War Trophy", index: 0, defaultUnlocked: true },
    { id: "bh-helm", label: "Battle Helm", index: 1, defaultUnlocked: false },
    { id: "bh-gauntlet", label: "Gauntlet Fist", index: 2, defaultUnlocked: false },
  ],

  // Medal tier — Tier 2 Competitive
  Showdown: [
    { id: "sd-versus", label: "Versus Medal", index: 0, defaultUnlocked: true },
    { id: "sd-swords", label: "Dueling Swords", index: 1, defaultUnlocked: false },
    { id: "sd-arena", label: "Arena Gates", index: 2, defaultUnlocked: false },
  ],
  Battlegrounds: [
    { id: "bg-swords", label: "Crossed Swords", index: 0, defaultUnlocked: true },
    { id: "bg-shield", label: "Arena Shield", index: 1, defaultUnlocked: false },
    { id: "bg-banner", label: "War Banner", index: 2, defaultUnlocked: false },
  ],

  // Badge tier — Tier 2 qualifiers + Tier 1
  ProQuest: [
    { id: "pq-compass", label: "Compass Shield", index: 0, defaultUnlocked: true },
    { id: "pq-scroll", label: "Treasure Scroll", index: 1, defaultUnlocked: false },
    { id: "pq-pack", label: "Explorer's Pack", index: 2, defaultUnlocked: false },
  ],
  "Road to Nationals": [
    { id: "rtn-road", label: "Road Shield", index: 0, defaultUnlocked: true },
    { id: "rtn-stone", label: "Milestone Stone", index: 1, defaultUnlocked: false },
    { id: "rtn-compass", label: "Journey Compass", index: 2, defaultUnlocked: false },
  ],
  Skirmish: [
    { id: "sk-shield", label: "Round Shield", index: 0, defaultUnlocked: true },
    { id: "sk-dagger", label: "Dagger & Cloak", index: 1, defaultUnlocked: false },
    { id: "sk-bolt", label: "Lightning Strike", index: 2, defaultUnlocked: false },
  ],

  // Marble tier — Other
  Other: [
    { id: "other-marble", label: "Glass Marble", index: 0, defaultUnlocked: true },
    { id: "other-crystal", label: "Crystal Orb", index: 1, defaultUnlocked: false },
    { id: "other-coin", label: "Ancient Coin", index: 2, defaultUnlocked: false },
  ],
  Championship: [
    { id: "ch-ring", label: "Championship Ring", index: 0, defaultUnlocked: true },
    { id: "ch-wreath", label: "Victory Wreath", index: 1, defaultUnlocked: false },
    { id: "ch-star", label: "Star Medallion", index: 2, defaultUnlocked: false },
  ],
};

/** Get the selected design index for an event type (0 = default) */
export function getSelectedDesign(eventType: string, trophyDesigns?: Record<string, number>): number {
  if (!trophyDesigns) return 0;
  return trophyDesigns[eventType] ?? 0;
}

/** Check if a design is unlocked (index 0 always, admins always) */
export function isDesignUnlocked(index: number, isAdmin?: boolean): boolean {
  if (index === 0) return true;
  if (isAdmin) return true;
  // Future: check unlock conditions per design
  return false;
}

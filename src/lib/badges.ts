import type { Achievement } from "@/types";

export const ADMIN_BADGES: Achievement[] = [
  {
    id: "badge_pioneer",
    name: "Pioneer",
    icon: "rocket",
    rarity: "legendary",
    category: "special",
    description: "Among the first to join FaB Stats",
  },
  {
    id: "badge_early_adopter",
    name: "Early Adopter",
    icon: "seedling",
    rarity: "epic",
    category: "special",
    description: "Joined FaB Stats in its early days",
  },
  {
    id: "badge_bug_hunter",
    name: "Bug Hunter",
    icon: "bug",
    rarity: "rare",
    category: "special",
    description: "Found and reported a meaningful bug",
  },
  {
    id: "badge_visionary",
    name: "Visionary",
    icon: "lightbulb",
    rarity: "epic",
    category: "special",
    description: "Suggested a feature that became reality",
  },
  {
    id: "badge_creator",
    name: "Creator",
    icon: "crown",
    rarity: "legendary",
    category: "special",
    description: "Built FaB Stats",
  },
];

export function getBadgeById(id: string): Achievement | undefined {
  return ADMIN_BADGES.find((b) => b.id === id);
}

export function getBadgesForIds(ids: string[]): Achievement[] {
  return ids.map((id) => getBadgeById(id)).filter(Boolean) as Achievement[];
}

export function getAllBadges(): Achievement[] {
  return ADMIN_BADGES;
}

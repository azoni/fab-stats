import { getBadgeTier, type BadgeTierInfo } from "./badge-tiers";

export interface ProfileBadge {
  id: string;
  name: string;
  description: string;
}

export interface ProfileBadgeWithTier extends ProfileBadge {
  tier: BadgeTierInfo;
  count: number;
}

const BADGES: ProfileBadge[] = [
  { id: "first-match", name: "First Blood", description: "Logged a match!" },
  { id: "content-creator", name: "Content Creator", description: "Community content creator" },
  { id: "puzzle-player", name: "Puzzle Player", description: "Completed puzzle games" },
  { id: "knowledge-player", name: "Knowledge Buff", description: "Completed knowledge games" },
  { id: "dice-player", name: "Brute Brawler", description: "Completed Brute dice games" },
  { id: "ninja-player", name: "Shadow Striker", description: "Completed Ninja games" },
  { id: "feedback-contributor", name: "Feedback Hero", description: "Submitted feedback to help improve the site" },
];

export interface BadgeCounts {
  matchCount: number;
  isCreator?: boolean;
  puzzleGames?: number;
  knowledgeGames?: number;
  diceGames?: number;
  ninjaGames?: number;
  submittedFeedback?: boolean;
}

const BADGE_COUNT_MAP: Record<string, keyof BadgeCounts> = {
  "first-match": "matchCount",
  "puzzle-player": "puzzleGames",
  "knowledge-player": "knowledgeGames",
  "dice-player": "diceGames",
  "ninja-player": "ninjaGames",
};

export function getProfileBadges(counts: BadgeCounts): ProfileBadgeWithTier[] {
  const earned: ProfileBadgeWithTier[] = [];

  if (counts.isCreator) {
    const badge = BADGES.find((b) => b.id === "content-creator")!;
    earned.push({ ...badge, tier: getBadgeTier("content-creator", 1), count: 1 });
  }

  for (const [badgeId, countKey] of Object.entries(BADGE_COUNT_MAP)) {
    const count = (counts[countKey] as number) ?? 0;
    if (count >= 1) {
      const badge = BADGES.find((b) => b.id === badgeId)!;
      earned.push({ ...badge, tier: getBadgeTier(badgeId, count), count });
    }
  }

  if (counts.submittedFeedback) {
    const badge = BADGES.find((b) => b.id === "feedback-contributor")!;
    earned.push({ ...badge, tier: getBadgeTier("feedback-contributor", 1), count: 1 });
  }

  return earned;
}

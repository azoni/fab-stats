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
  { id: "fabdoku-player", name: "Puzzle Player", description: "Completed a FaBdoku puzzle" },
  { id: "fabdoku-card-player", name: "Card Puzzler", description: "Completed a FaBdoku Cards puzzle" },
  { id: "crossword-player", name: "Wordsmith", description: "Completed a Crossword puzzle" },
  { id: "heroguesser-player", name: "Hero Guesser", description: "Completed a Hero Guesser puzzle" },
  { id: "matchupmania-player", name: "Matchup Maniac", description: "Completed a Matchup Mania game" },
  { id: "trivia-player", name: "Trivia Buff", description: "Completed a FaB Trivia quiz" },
  { id: "timeline-player", name: "Historian", description: "Completed a Timeline challenge" },
  { id: "connections-player", name: "Connector", description: "Completed a Connections puzzle" },
  { id: "brute-brawler", name: "Brute Brawler", description: "Completed Brute dice games" },
  { id: "ninjacombo-player", name: "Shadow Striker", description: "Completed Katsu's Combo" },
  { id: "feedback-contributor", name: "Feedback Hero", description: "Submitted feedback to help improve the site" },
];

export interface BadgeCounts {
  matchCount: number;
  isCreator?: boolean;
  fabdokuGames?: number;
  fabdokuCardGames?: number;
  crosswordGames?: number;
  heroGuesserGames?: number;
  matchupManiaGames?: number;
  triviaGames?: number;
  timelineGames?: number;
  connectionsGames?: number;
  bruteBrawlerGames?: number;
  ninjaComboGames?: number;
  submittedFeedback?: boolean;
}

const BADGE_COUNT_MAP: Record<string, keyof BadgeCounts> = {
  "first-match": "matchCount",
  "fabdoku-player": "fabdokuGames",
  "fabdoku-card-player": "fabdokuCardGames",
  "crossword-player": "crosswordGames",
  "heroguesser-player": "heroGuesserGames",
  "matchupmania-player": "matchupManiaGames",
  "trivia-player": "triviaGames",
  "timeline-player": "timelineGames",
  "connections-player": "connectionsGames",
  "brute-brawler": "bruteBrawlerGames",
  "ninjacombo-player": "ninjaComboGames",
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

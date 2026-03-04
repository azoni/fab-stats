export interface ProfileBadge {
  id: string;
  name: string;
  description: string;
}

const BADGES: ProfileBadge[] = [
  { id: "first-match", name: "First Blood", description: "Logged a match!" },
  { id: "content-creator", name: "Content Creator", description: "Community content creator" },
  { id: "fabdoku-player", name: "Puzzle Player", description: "Completed a FaBdoku puzzle" },
  { id: "crossword-player", name: "Wordsmith", description: "Completed a Crossword puzzle" },
];

export function getProfileBadges(matchCount: number, flags?: { isCreator?: boolean; playedFabdoku?: boolean; playedCrossword?: boolean }): ProfileBadge[] {
  const earned: ProfileBadge[] = [];
  if (flags?.isCreator) {
    earned.push(BADGES.find((b) => b.id === "content-creator")!);
  }
  if (matchCount >= 1) {
    earned.push(BADGES.find((b) => b.id === "first-match")!);
  }
  if (flags?.playedFabdoku) {
    earned.push(BADGES.find((b) => b.id === "fabdoku-player")!);
  }
  if (flags?.playedCrossword) {
    earned.push(BADGES.find((b) => b.id === "crossword-player")!);
  }
  return earned;
}

export interface ProfileBadge {
  id: string;
  name: string;
  description: string;
}

const BADGES: ProfileBadge[] = [
  { id: "first-match", name: "First Blood", description: "Logged a match!" },
  { id: "content-creator", name: "Content Creator", description: "Community content creator" },
  { id: "fabdoku-sharer", name: "Puzzle Sharer", description: "Shared a FaBdoku result" },
];

export function getProfileBadges(matchCount: number, flags?: { isCreator?: boolean; hasSharedFabdoku?: boolean }): ProfileBadge[] {
  const earned: ProfileBadge[] = [];
  if (flags?.isCreator) {
    earned.push(BADGES.find((b) => b.id === "content-creator")!);
  }
  if (matchCount >= 1) {
    earned.push(BADGES.find((b) => b.id === "first-match")!);
  }
  if (flags?.hasSharedFabdoku) {
    earned.push(BADGES.find((b) => b.id === "fabdoku-sharer")!);
  }
  return earned;
}

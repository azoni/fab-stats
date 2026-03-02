export interface ProfileBadge {
  id: string;
  name: string;
  description: string;
}

const BADGES: ProfileBadge[] = [
  { id: "first-match", name: "First Blood", description: "Logged a match!" },
  { id: "content-creator", name: "Content Creator", description: "Community content creator" },
];

export function getProfileBadges(matchCount: number, flags?: { isCreator?: boolean }): ProfileBadge[] {
  const earned: ProfileBadge[] = [];
  if (flags?.isCreator) {
    earned.push(BADGES.find((b) => b.id === "content-creator")!);
  }
  if (matchCount >= 1) {
    earned.push(BADGES.find((b) => b.id === "first-match")!);
  }
  return earned;
}

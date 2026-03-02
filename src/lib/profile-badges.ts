export interface ProfileBadge {
  id: string;
  name: string;
  description: string;
}

const BADGES: ProfileBadge[] = [
  { id: "first-match", name: "First Blood", description: "Logged a match!" },
];

export function getProfileBadges(matchCount: number): ProfileBadge[] {
  const earned: ProfileBadge[] = [];
  if (matchCount >= 1) {
    earned.push(BADGES.find((b) => b.id === "first-match")!);
  }
  return earned;
}

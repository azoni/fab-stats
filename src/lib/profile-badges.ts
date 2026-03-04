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
  { id: "heroguesser-player", name: "Hero Guesser", description: "Completed a Hero Guesser puzzle" },
  { id: "matchupmania-player", name: "Matchup Maniac", description: "Completed a Matchup Mania game" },
  { id: "trivia-player", name: "Trivia Buff", description: "Completed a FaB Trivia quiz" },
  { id: "timeline-player", name: "Historian", description: "Completed a Timeline challenge" },
  { id: "connections-player", name: "Connector", description: "Completed a Connections puzzle" },
  { id: "feedback-contributor", name: "Feedback Hero", description: "Submitted feedback to help improve the site" },
];

export function getProfileBadges(matchCount: number, flags?: { isCreator?: boolean; playedFabdoku?: boolean; playedCrossword?: boolean; playedHeroGuesser?: boolean; playedMatchupMania?: boolean; playedTrivia?: boolean; playedTimeline?: boolean; playedConnections?: boolean; submittedFeedback?: boolean }): ProfileBadge[] {
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
  if (flags?.playedHeroGuesser) {
    earned.push(BADGES.find((b) => b.id === "heroguesser-player")!);
  }
  if (flags?.playedMatchupMania) {
    earned.push(BADGES.find((b) => b.id === "matchupmania-player")!);
  }
  if (flags?.playedTrivia) {
    earned.push(BADGES.find((b) => b.id === "trivia-player")!);
  }
  if (flags?.playedTimeline) {
    earned.push(BADGES.find((b) => b.id === "timeline-player")!);
  }
  if (flags?.playedConnections) {
    earned.push(BADGES.find((b) => b.id === "connections-player")!);
  }
  if (flags?.submittedFeedback) {
    earned.push(BADGES.find((b) => b.id === "feedback-contributor")!);
  }
  return earned;
}

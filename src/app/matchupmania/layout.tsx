import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Matchup Mania — FaB Stats",
  description: "Pick the hero with the higher community win rate. 10 rounds, daily puzzle.",
};

export default function MatchupManiaLayout({ children }: { children: React.ReactNode }) {
  return children;
}

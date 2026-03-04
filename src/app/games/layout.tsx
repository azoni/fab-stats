import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Games — FaB Stats",
  description: "Daily Flesh and Blood themed games — FaBdoku, Crossword, Hero Guesser, Matchup Mania, Connections, Timeline, and Trivia.",
};

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

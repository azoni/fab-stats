import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "See how Flesh and Blood players stack up — win rates, longest streaks, event wins, hero variety, and more.",
  openGraph: {
    title: "Leaderboard | FaB Stats",
    description:
      "See how Flesh and Blood players stack up — win rates, longest streaks, event wins, hero variety, and more.",
  },
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Players",
  description:
    "Search for Flesh and Blood players by username or name. View their public stats, match history, and leaderboard rankings.",
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

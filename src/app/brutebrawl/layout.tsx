import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brute Brawl — FaB Stats",
  description: "Dice combat! Roll attack dice vs a daily defender. Deal 20 damage to win!",
};

export default function BruteBrawlLayout({ children }: { children: React.ReactNode }) {
  return children;
}

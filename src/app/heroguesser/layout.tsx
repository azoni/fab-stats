import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hero Guesser — FaB Stats",
  description: "Guess the Flesh and Blood hero in 6 tries. Daily puzzle with class, talent, and stat clues.",
};

export default function HeroGuesserLayout({ children }: { children: React.ReactNode }) {
  return children;
}

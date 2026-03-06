import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kayo's Knockout — FaB Stats",
  description: "Yahtzee-style daily dice game! Roll combos to knock out Kayo in 3 rounds.",
};

export default function KayosKnockoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

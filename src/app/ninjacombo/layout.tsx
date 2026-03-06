import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Katsu's Combo — FaB Stats",
  description: "Build the perfect attack chain. Sequence 5 cards from your hand to maximize combo damage.",
};

export default function NinjaComboLayout({ children }: { children: React.ReactNode }) {
  return children;
}

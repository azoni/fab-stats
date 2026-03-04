import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FaB Timeline \u2014 FaB Stats",
  description: "Place Flesh and Blood events in chronological order.",
};

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return children;
}

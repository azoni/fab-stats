import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Understack — FaB Stats",
  description:
    "A persistent dungeon crawler beneath the Ledgerhall. Descend, fight what the stacks have grown, and haul relics back up.",
  robots: { index: false, follow: false }, // unlisted until launch
};

export default function DelveLayout({ children }: { children: React.ReactNode }) {
  return children;
}

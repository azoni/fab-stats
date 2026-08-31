import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Event Archive",
  description:
    "Top 8 results from official Flesh and Blood major-event coverage — heroes, players, and decklists from Pro Tours, Callings, Nationals, and more.",
  openGraph: {
    title: "Event Archive | FaB Stats",
    description:
      "Top 8 results from official Flesh and Blood major-event coverage — heroes, players, and decklists.",
    // Page-level openGraph REPLACES (not merges with) the root layout's, so the
    // image must be repeated here or shared /archive links get a bare card.
    images: ["/og-preview.png"],
  },
};

export default function ArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

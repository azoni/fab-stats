import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FaB Crossword",
  description: "Daily Flesh and Blood crossword puzzle. Test your FaB knowledge!",
  openGraph: {
    title: "FaB Crossword | FaB Stats",
    description: "Daily Flesh and Blood crossword puzzle — test your knowledge of heroes, keywords, and lore!",
    images: [{ url: "https://www.fabstats.net/og-preview.png", width: 1200, height: 630, alt: "FaB Crossword" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FaB Crossword | FaB Stats",
    description: "Daily Flesh and Blood crossword puzzle",
    images: ["https://www.fabstats.net/og-preview.png"],
  },
};

export default function CrosswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FaBdoku",
  description:
    "Daily Flesh and Blood hero puzzle. Fill the 3x3 grid with heroes that match both row and column categories!",
  openGraph: {
    title: "FaBdoku | FaB Stats",
    description: "Daily Flesh and Blood hero puzzle — fill the 3x3 grid with heroes that match both row and column categories!",
    images: [
      {
        url: "https://www.fabstats.net/og-preview.png",
        width: 1200,
        height: 630,
        alt: "FaBdoku - Daily Flesh and Blood hero puzzle",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FaBdoku | FaB Stats",
    description: "Daily Flesh and Blood hero puzzle",
    images: ["https://www.fabstats.net/og-preview.png"],
  },
};

export default function FaBdokuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FaBdoku",
  description:
    "Daily Flesh and Blood hero puzzle. Fill the 3x3 grid with heroes that match both row and column categories!",
  openGraph: {
    title: "FaBdoku | FaB Stats",
    description: "Daily Flesh and Blood hero puzzle",
    images: [
      {
        url: "https://www.fabstats.net/favicon.svg",
        width: 64,
        height: 64,
      },
    ],
  },
};

export default function FaBdokuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

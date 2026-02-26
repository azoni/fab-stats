import type { Metadata } from "next";
import PlayerProfile from "./PlayerProfile";

export async function generateStaticParams() {
  return [{ username: "_" }];
}

export const metadata: Metadata = {
  title: "Player Profile",
  description:
    "View this player's Flesh and Blood match history, win rates, and tournament results on FaB Stats.",
  openGraph: {
    title: "Player Profile | FaB Stats",
    description:
      "View this player's Flesh and Blood match history, win rates, and tournament results on FaB Stats.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Player Profile | FaB Stats",
    description:
      "View this player's Flesh and Blood match history, win rates, and tournament results on FaB Stats.",
    images: ["/og-image.png"],
  },
};

export default async function PlayerProfilePage() {
  return <PlayerProfile />;
}

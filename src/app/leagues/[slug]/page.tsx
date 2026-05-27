import type { Metadata } from "next";
import LeaguePage from "./LeaguePage";

export async function generateStaticParams() {
  return [{ slug: "_" }];
}

export const metadata: Metadata = {
  title: "League | FaB Stats",
  description:
    "View this FaB Stats league's standings, participating stores, scoring rules, and roster.",
  openGraph: {
    title: "League | FaB Stats",
    description:
      "View this FaB Stats league's standings, participating stores, scoring rules, and roster.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function LeagueDetailPage() {
  return <LeaguePage />;
}

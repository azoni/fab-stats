import type { Metadata } from "next";
import TeamPage from "./TeamPage";

export async function generateStaticParams() {
  return [{ teamname: "_" }];
}

export const metadata: Metadata = {
  title: "Team Profile | FaB Stats",
  description:
    "View this team's combined stats, trophy case, armory garden, and member roster on FaB Stats.",
  openGraph: {
    title: "Team Profile | FaB Stats",
    description:
      "View this team's combined stats, trophy case, armory garden, and member roster on FaB Stats.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default async function TeamProfilePage() {
  return <TeamPage />;
}

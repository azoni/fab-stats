import type { Metadata } from "next";
import PlayerProfile from "./PlayerProfile";

export async function generateStaticParams() {
  return [{ username: "_" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const title = `${username}'s FaB Stats`;
  const description = `View ${username}'s Flesh and Blood match history, win rates, and tournament results on FaB Stats.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://fabstats.netlify.app/player/${username}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <PlayerProfile username={username} />;
}

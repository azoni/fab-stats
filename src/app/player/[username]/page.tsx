import PlayerProfile from "./PlayerProfile";

export async function generateStaticParams() {
  return [{ username: "_" }];
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <PlayerProfile username={username} />;
}

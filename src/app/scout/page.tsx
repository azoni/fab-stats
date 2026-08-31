import type { Metadata } from "next";
import { PlayerScout } from "@/components/kg/PlayerScout";
import { RequireSignedIn } from "@/components/auth/RequireSignedIn";

export const metadata: Metadata = {
  title: "Player Scout",
  description:
    "Semantic search over Flesh and Blood player playstyles, powered by a Neo4j knowledge graph and vector embeddings.",
  // Sign-in gated — keep it out of search results.
  robots: { index: false, follow: false },
};

export default function ScoutPage() {
  return (
    <RequireSignedIn>
      <PlayerScout />
    </RequireSignedIn>
  );
}

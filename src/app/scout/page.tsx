import type { Metadata } from "next";
import { PlayerScout } from "@/components/kg/PlayerScout";
import { RequireAdmin } from "@/components/auth/RequireAdmin";

export const metadata: Metadata = {
  title: "Player Scout",
  description:
    "Semantic search over Flesh and Blood player playstyles, powered by a Neo4j knowledge graph and vector embeddings.",
  // Internal tool — keep it out of search results while gated.
  robots: { index: false, follow: false },
};

export default function ScoutPage() {
  return (
    <RequireAdmin>
      <PlayerScout />
    </RequireAdmin>
  );
}

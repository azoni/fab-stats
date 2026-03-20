import type { Metadata } from "next";
import MatchupsPageContent from "./MatchupsPageContent";

export const metadata: Metadata = {
  title: "Community Matchup Matrix",
  description: "See win rates between every hero in Flesh and Blood, powered by community match data.",
};

export default function MatchupsPage() {
  return <MatchupsPageContent />;
}

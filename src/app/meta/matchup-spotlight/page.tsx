import type { Metadata } from "next";
import MatchupSpotlightPage from "./MatchupSpotlightPage";

export const metadata: Metadata = {
  title: "Matchup Spotlight — FaB Stats",
  description: "This week's most interesting Flesh and Blood hero matchup, powered by community data.",
};

export default function Page() {
  return <MatchupSpotlightPage />;
}

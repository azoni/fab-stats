import type { Metadata } from "next";
import LeagueHub from "./LeagueHub";

export const metadata: Metadata = {
  title: "Leagues | FaB Stats",
  description:
    "Create and join community-run Flesh and Blood leagues. Track armory matches across a set of stores and a date window with custom scoring.",
};

export default function LeagueHubPage() {
  return <LeagueHub />;
}

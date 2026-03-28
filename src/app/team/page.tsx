import type { Metadata } from "next";
import TeamHub from "./TeamHub";

export const metadata: Metadata = {
  title: "Teams | FaB Stats",
  description: "Create a team, manage your roster, or browse teams on FaB Stats.",
};

export default function TeamHubPage() {
  return <TeamHub />;
}

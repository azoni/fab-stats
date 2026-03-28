import type { Metadata } from "next";
import dynamic from "next/dynamic";

const TeamHub = dynamic(() => import("./TeamHub"), { ssr: false });

export const metadata: Metadata = {
  title: "Teams | FaB Stats",
  description: "Create a team, manage your roster, or browse teams on FaB Stats.",
};

export default function TeamHubPage() {
  return <TeamHub />;
}

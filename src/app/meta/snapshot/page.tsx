import type { Metadata } from "next";
import MetaSnapshotPage from "./MetaSnapshotPage";

export const metadata: Metadata = {
  title: "Meta Snapshot — FaB Stats",
  description: "This week's Flesh and Blood meta — hero play rates, win rates, and top 8 breakdowns from community data.",
};

export default function Page() {
  return <MetaSnapshotPage />;
}

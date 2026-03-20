import type { Metadata } from "next";
import HotTakesPage from "./HotTakesPage";

export const metadata: Metadata = {
  title: "Community Hot Takes — FaB Stats",
  description: "Data-driven hot takes about the Flesh and Blood meta, powered by community match data.",
};

export default function Page() {
  return <HotTakesPage />;
}

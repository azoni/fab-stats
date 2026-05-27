import type { Metadata } from "next";
import StoresHub from "./StoresHub";

export const metadata: Metadata = {
  title: "Stores | FaB Stats",
  description:
    "Browse all Flesh and Blood game stores tracked by FaB Stats players. Stores appear automatically from imported match venues.",
};

export default function StoresPage() {
  return <StoresHub />;
}

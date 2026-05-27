import type { Metadata } from "next";
import StorePage from "./StorePage";

export async function generateStaticParams() {
  return [{ slug: "_" }];
}

export const metadata: Metadata = {
  title: "Store | FaB Stats",
  description:
    "View matches, players, and league activity at this Flesh and Blood game store.",
  openGraph: {
    title: "Store | FaB Stats",
    description:
      "View matches, players, and league activity at this Flesh and Blood game store.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function StoreDetailPage() {
  return <StorePage />;
}

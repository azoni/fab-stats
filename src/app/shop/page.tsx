import type { Metadata } from "next";
import { ShopClient } from "./ShopClient";

export const metadata: Metadata = {
  title: "The Reliquary",
  description: "Spend coins earned from importing matches on profile cosmetics.",
  robots: { index: false, follow: false },
};

export default function ShopPage() {
  return <ShopClient />;
}

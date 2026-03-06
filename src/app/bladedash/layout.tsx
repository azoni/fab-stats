import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blade Dash — FaB Stats",
  description: "Unscramble 8 ninja-themed words as fast as you can. A daily FaB puzzle.",
};

export default function BladeDashLayout({ children }: { children: React.ReactNode }) {
  return children;
}

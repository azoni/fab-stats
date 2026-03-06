import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shadow Strike — FaB Stats",
  description: "Find all 8 matching ninja card pairs in a 4×4 memory grid. A daily FaB puzzle.",
};

export default function ShadowStrikeLayout({ children }: { children: React.ReactNode }) {
  return children;
}

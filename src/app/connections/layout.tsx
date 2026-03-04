import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FaB Connections — FaB Stats",
  description: "Group 16 Flesh and Blood words into 4 categories.",
};

export default function ConnectionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

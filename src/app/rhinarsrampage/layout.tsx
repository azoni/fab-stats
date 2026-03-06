import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rhinar's Rampage — FaB Stats",
  description: "Push your luck dice game! Roll to build damage, bank or bust. Can you defeat Rhinar?",
};

export default function RhinarsRampageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

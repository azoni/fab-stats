import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Import Matches",
  description:
    "Import your Flesh and Blood match history from GEM in one click, or add matches manually.",
};

export default function ImportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

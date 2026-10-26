import type { Metadata } from "next";
import { Suspense } from "react";
import MatchupsPageContent from "./MatchupsPageContent";

export const metadata: Metadata = {
  title: "Matchup Matrix",
  description: "Explore your hero matchups, filter your results and compare with Flesh and Blood community data.",
};

export default function MatchupsPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="py-12 text-center text-sm text-fab-muted">
          Loading matchups…
        </p>
      }
    >
      <MatchupsPageContent />
    </Suspense>
  );
}

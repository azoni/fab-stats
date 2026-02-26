"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { NemesisCard } from "@/components/opponents/NemesisCard";
import { MatchResult } from "@/types";

function NemesisContent() {
  const params = useSearchParams();
  const playerName = params.get("p") || "Player";
  const nemesisName = params.get("n") || "Nemesis";
  const wins = parseInt(params.get("w") || "0", 10);
  const losses = parseInt(params.get("l") || "0", 10);
  const draws = parseInt(params.get("d") || "0", 10);
  const matches = wins + losses + draws;
  const winRate = matches > 0 ? (wins / matches) * 100 : 0;

  const recentStr = params.get("r") || "";
  const recentResults: MatchResult[] = recentStr.split("").map((c) => {
    if (c === "W") return MatchResult.Win;
    if (c === "L") return MatchResult.Loss;
    return MatchResult.Draw;
  }).filter(Boolean);

  if (matches === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-fab-muted">No nemesis data found.</p>
        <Link href="/opponents" className="text-fab-gold hover:text-fab-gold-light text-sm mt-4 inline-block">
          View Opponents
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8">
      <NemesisCard
        data={{
          playerName,
          nemesisName,
          wins,
          losses,
          draws,
          winRate,
          matches,
          recentResults: recentResults.slice(0, 20),
        }}
      />
      <div className="text-center mt-6">
        <Link
          href="/import"
          className="text-fab-gold hover:text-fab-gold-light text-sm"
        >
          Track your own FaB stats
        </Link>
      </div>
    </div>
  );
}

export default function NemesisPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-fab-muted">Loading...</div>}>
      <NemesisContent />
    </Suspense>
  );
}

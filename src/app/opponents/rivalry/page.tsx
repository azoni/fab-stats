"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RivalryCard } from "@/components/opponents/RivalryCard";
import { MatchResult } from "@/types";

export default function RivalryPage() {
  const params = useSearchParams();
  const playerName = params.get("p") || "Player";
  const opponentName = params.get("o") || "Opponent";
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

  const playerHeroes = (params.get("ph") || "").split(",").filter(Boolean);
  const opponentHeroes = (params.get("oh") || "").split(",").filter(Boolean);

  if (matches === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-fab-muted">No rivalry data found.</p>
        <Link href="/opponents" className="text-fab-gold hover:text-fab-gold-light text-sm mt-4 inline-block">
          View Opponents
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8">
      <RivalryCard
        data={{
          playerName,
          opponentName,
          wins,
          losses,
          draws,
          winRate,
          matches,
          recentResults: recentResults.slice(0, 20),
          playerHeroes,
          opponentHeroes,
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

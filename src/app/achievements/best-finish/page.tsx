"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BestFinishCard } from "@/components/profile/BestFinishCard";

function BestFinishContent() {
  const params = useSearchParams();
  const playerName = params.get("p") || "Player";
  const finishLabel = params.get("f") || "Champion";
  const eventName = params.get("e") || "Event";
  const eventDate = params.get("ed") || new Date().toISOString();
  const totalMatches = parseInt(params.get("m") || "0", 10);
  const winRate = parseInt(params.get("wr") || "0", 10);
  const topHero = params.get("h") || undefined;

  if (!params.get("p")) {
    return (
      <div className="text-center py-16">
        <p className="text-fab-muted">No finish data found.</p>
        <Link href="/search" className="text-fab-gold hover:text-fab-gold-light text-sm mt-4 inline-block">
          Search Players
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8">
      <BestFinishCard
        data={{
          playerName,
          finishLabel,
          eventName,
          eventDate,
          totalMatches,
          winRate,
          topHero,
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

export default function BestFinishPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-fab-muted">Loading...</div>}>
      <BestFinishContent />
    </Suspense>
  );
}

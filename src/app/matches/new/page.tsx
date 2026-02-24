"use client";
import { MatchForm } from "@/components/matches/MatchForm";

export default function NewMatchPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-fab-gold mb-6">Log Match</h1>
      <MatchForm />
    </div>
  );
}

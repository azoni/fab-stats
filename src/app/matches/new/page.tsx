"use client";
import { MatchForm } from "@/components/matches/MatchForm";
import { PlusIcon } from "@/components/icons/NavIcons";

export default function NewMatchPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center ring-1 ring-inset ring-emerald-500/20">
          <PlusIcon className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-fab-text leading-tight">Log Match</h1>
          <p className="text-xs text-fab-muted leading-tight">Record a single match result</p>
        </div>
      </div>
      <MatchForm />
    </div>
  );
}

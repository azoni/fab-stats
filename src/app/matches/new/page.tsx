"use client";
import { MatchForm } from "@/components/matches/MatchForm";
import { PlusIcon } from "@/components/icons/NavIcons";

export default function NewMatchPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-fab-border bg-fab-surface/85 p-4">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center ring-1 ring-inset ring-emerald-500/20">
          <PlusIcon className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-black text-fab-text leading-tight">Log Practice Match</h1>
          <p className="mt-1 text-sm text-fab-muted leading-tight">Record a quick match with hero data, result, and turn order.</p>
        </div>
      </div>
      <MatchForm />
    </div>
  );
}

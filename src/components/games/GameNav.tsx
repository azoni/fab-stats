"use client";
import Link from "next/link";
import { GAMES } from "@/lib/games";

export function GameNav({ current }: { current: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
      <Link
        href="/games"
        className="text-xs font-medium text-fab-dim hover:text-fab-text px-2.5 py-1.5 rounded-lg hover:bg-fab-surface transition-colors shrink-0"
      >
        &larr; All Games
      </Link>
      <span className="text-fab-border/40 mx-0.5">|</span>
      {GAMES.filter((g) => g.slug !== current).map((g) => (
        <Link
          key={g.slug}
          href={g.href}
          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg shrink-0 transition-colors hover:bg-fab-surface/80 ${g.color} hover:opacity-90`}
        >
          {g.label}
        </Link>
      ))}
    </div>
  );
}

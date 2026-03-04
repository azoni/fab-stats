"use client";
import Link from "next/link";
import { GAMES } from "@/lib/games";

export function GameNav({ current }: { current: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide">
      <Link href="/games" className="text-[10px] text-fab-dim hover:text-fab-text transition-colors shrink-0">
        &larr; Games
      </Link>
      <span className="text-fab-border">|</span>
      {GAMES.filter((g) => g.slug !== current).map((g) => (
        <Link
          key={g.slug}
          href={g.href}
          className={`text-[10px] ${g.color} hover:opacity-80 transition-opacity shrink-0`}
        >
          {g.label}
        </Link>
      ))}
    </div>
  );
}

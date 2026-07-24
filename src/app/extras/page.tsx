"use client";

import Link from "next/link";
import { BookOpen, CalendarClock, Gamepad2, ListOrdered, Swords, Trophy } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";

const extras = [
  {
    href: "/games",
    title: "Daily Games",
    text: "Quick puzzles for hero knowledge, matchups, trivia, and pattern recognition.",
    icon: <Gamepad2 className="h-5 w-5" />,
    accent: "text-emerald-300",
  },
  {
    href: "/tierlist",
    title: "Tier List Maker",
    text: "Rank heroes, cards, sets — or spoilers — with drag-and-drop tiers, then save & share.",
    icon: <ListOrdered className="h-5 w-5" />,
    accent: "text-fuchsia-300",
  },
  {
    href: "/achievements",
    title: "Achievements",
    text: "Track match milestones, mastery tiers, community kudos, and daily-game badges.",
    icon: <Trophy className="h-5 w-5" />,
    accent: "text-fab-gold",
  },
  {
    href: "/compare",
    title: "Versus",
    text: "Compare two public profiles side by side across records, heroes, and finishes.",
    icon: <Swords className="h-5 w-5" />,
    accent: "text-rose-300",
  },
  {
    href: "/docs",
    title: "Docs",
    text: "How imports, privacy, rankings, meta data, teams, and achievements work.",
    icon: <BookOpen className="h-5 w-5" />,
    accent: "text-sky-300",
  },
  {
    href: "/changelog",
    title: "Changelog",
    text: "Recent polish, fixes, data changes, and new tools shipped to FaB Stats.",
    icon: <CalendarClock className="h-5 w-5" />,
    accent: "text-violet-300",
  },
];

export default function ExtrasPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHero
        eyebrow="Extras"
        title="Tools, games, and reference"
        description="A clean home for the useful side tools that do not need to crowd the main navigation."
        icon={<Gamepad2 className="h-4 w-4" />}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {extras.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-lg border border-fab-border bg-fab-surface/95 p-4 transition-colors hover:border-fab-gold/45 hover:bg-fab-surface-hover/80"
          >
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-fab-border bg-fab-bg ${item.accent}`}>
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-fab-text transition-colors group-hover:text-fab-gold">{item.title}</span>
                <span className="mt-1 block text-xs leading-5 text-fab-muted">{item.text}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

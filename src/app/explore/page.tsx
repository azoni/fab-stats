import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Explore",
  description: "Explore Flesh and Blood community features — versus comparisons, tier lists, tournaments, and daily games.",
};

const EXPLORE_LINKS = [
  {
    title: "Versus",
    description: "Compare head-to-head stats between any two players.",
    href: "/compare",
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    ringColor: "ring-yellow-400/20",
  },
  {
    title: "Articles",
    description: "Read community articles, hero guides, and tournament writeups.",
    href: "/articles",
    color: "text-rose-400",
    bgColor: "bg-rose-400/10",
    ringColor: "ring-rose-400/20",
  },
  {
    title: "Tier List",
    description: "Community hero tier rankings based on recent tournament performance.",
    href: "/tier-list",
    color: "text-teal-400",
    bgColor: "bg-teal-400/10",
    ringColor: "ring-teal-400/20",
  },
  {
    title: "Tournaments",
    description: "Browse upcoming and past Flesh and Blood events.",
    href: "/tournaments",
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    ringColor: "ring-amber-400/20",
  },
  {
    title: "Games",
    description: "Daily minigames — FaBdoku, crosswords, trivia, and more.",
    href: "/games",
    color: "text-indigo-400",
    bgColor: "bg-indigo-400/10",
    ringColor: "ring-indigo-400/20",
  },
];

export default function ExplorePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-fab-text mb-2">Explore</h1>
        <p className="text-sm text-fab-muted leading-relaxed">
          Discover what the FaB Stats community has to offer.
        </p>
      </div>

      <div className="space-y-3">
        {EXPLORE_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-start gap-4 p-4 rounded-xl bg-fab-surface border border-fab-border hover:border-fab-muted transition-all group"
          >
            <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center ring-1 ring-inset ${item.ringColor} shrink-0`}>
              <span className={`text-lg font-bold ${item.color}`}>{item.title[0]}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fab-text group-hover:text-fab-gold transition-colors">
                {item.title}
              </p>
              <p className="text-xs text-fab-muted mt-0.5 leading-relaxed">
                {item.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resources",
  description: "FaB Stats resources — roadmap, changelog, and documentation.",
};

const RESOURCE_LINKS = [
  {
    title: "Roadmap",
    description: "See what's planned and what's coming next for FaB Stats.",
    href: "/roadmap",
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    ringColor: "ring-green-400/20",
  },
  {
    title: "Changelog",
    description: "Recent updates, fixes, and new features.",
    href: "/changelog",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    ringColor: "ring-blue-400/20",
  },
  {
    title: "Docs",
    description: "Guides on importing matches, using the extension, Discord bot, and more.",
    href: "/docs",
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    ringColor: "ring-purple-400/20",
  },
];

export default function ResourcesPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-fab-text mb-2">Resources</h1>
        <p className="text-sm text-fab-muted leading-relaxed">
          Everything you need to get the most out of FaB Stats.
        </p>
      </div>

      <div className="space-y-3">
        {RESOURCE_LINKS.map((item) => (
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

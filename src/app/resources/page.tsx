import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Bot, FileText, LifeBuoy, Puzzle, Rocket, ScrollText, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Resources",
  description: "FaB Stats resources, changelog, documentation, and setup guides.",
};

const RESOURCE_LINKS = [
  {
    title: "Documentation",
    eyebrow: "Learn",
    description: "Importing, profile setup, teams, activity, Discord bot commands, and site workflows.",
    href: "/docs",
    icon: BookOpen,
    color: "text-fab-gold",
    bgColor: "bg-fab-gold/10",
    ringColor: "ring-fab-gold/20",
  },
  {
    title: "Changelog",
    eyebrow: "Updates",
    description: "Recent launches, fixes, cleanup passes, and quality of life improvements.",
    href: "/changelog",
    icon: ScrollText,
    color: "text-sky-300",
    bgColor: "bg-sky-400/10",
    ringColor: "ring-sky-400/20",
  },
  {
    title: "Support",
    eyebrow: "Community",
    description: "Discord, the bot invite, feedback, and affiliate links that help keep the project going.",
    href: "/support",
    icon: LifeBuoy,
    color: "text-emerald-300",
    bgColor: "bg-emerald-400/10",
    ringColor: "ring-emerald-400/20",
  },
  {
    title: "Quick Sync",
    eyebrow: "Setup",
    description: "Import GEM match history and keep your profile, rankings, and event logs current.",
    href: "/import",
    icon: Zap,
    color: "text-amber-300",
    bgColor: "bg-amber-400/10",
    ringColor: "ring-amber-400/20",
  },
  {
    title: "Bookmarklet",
    eyebrow: "Tools",
    description: "A lightweight helper for syncing when you do not want the full browser extension.",
    href: "/bookmarklet",
    icon: Bot,
    color: "text-violet-300",
    bgColor: "bg-violet-400/10",
    ringColor: "ring-violet-400/20",
  },
  {
    title: "Daily Games",
    eyebrow: "Extras",
    description: "FaB puzzles and warmups for hero knowledge, matchups, trivia, and pattern recognition.",
    href: "/games",
    icon: Puzzle,
    color: "text-rose-300",
    bgColor: "bg-rose-400/10",
    ringColor: "ring-rose-400/20",
  },
];

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-fab-border/80 bg-[linear-gradient(135deg,rgba(25,23,18,0.96),rgba(14,15,14,0.95)_58%,rgba(17,24,22,0.92))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.28)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(245,179,57,0.16),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(38,211,177,0.11),transparent_28%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-fab-border/80 bg-fab-bg/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-fab-gold">
              <Rocket className="h-3.5 w-3.5" />
              Reference shelf
            </div>
            <h1 className="mt-4 text-3xl font-black text-fab-text sm:text-4xl">Resources</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-fab-muted sm:text-base">
              The fast path to setup help, release notes, community links, import tools, and daily warmups.
            </p>
          </div>

          <div className="rounded-xl border border-fab-border/80 bg-fab-bg/45 p-4 shadow-inner shadow-black/20">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-fab-gold/25 bg-fab-gold/10 text-fab-gold">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-fab-text">Start here</p>
                <p className="text-xs text-fab-muted">New setup usually starts with Docs or Quick Sync.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniStat label="Guides" value="Docs" />
              <MiniStat label="Setup" value="Import" tone="green" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {RESOURCE_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex min-h-40 flex-col rounded-xl border border-fab-border/80 bg-fab-surface/85 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.16)] transition-colors hover:border-fab-gold/50 hover:bg-fab-gold/10"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${item.bgColor} ${item.color} ring-1 ring-inset ${item.ringColor}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-fab-border/70 bg-fab-bg/45 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">
                {item.eyebrow}
              </span>
            </div>
            <div className="mt-auto">
              <h2 className="text-base font-black text-fab-text transition-colors group-hover:text-fab-gold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-fab-muted">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone = "gold" }: { label: string; value: string; tone?: "gold" | "green" }) {
  return (
    <div className="rounded-lg border border-fab-border/70 bg-fab-surface/60 px-3 py-2">
      <p className={`text-sm font-black ${tone === "green" ? "text-emerald-300" : "text-fab-gold"}`}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-fab-dim">{label}</p>
    </div>
  );
}

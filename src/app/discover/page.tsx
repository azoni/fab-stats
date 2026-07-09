import Link from "next/link";
import { Compass, Store, Trophy, Users, Shield, ChevronRight } from "lucide-react";

type Destination = {
  href: string;
  title: string;
  desc: string;
  icon: typeof Users;
  badge?: string;
  // Tailwind accent classes per card.
  iconWrap: string;
  hover: string;
};

const DESTINATIONS: Destination[] = [
  {
    href: "/players",
    title: "Players",
    desc: "Find players, coaching guides, decklists, and socials across the community.",
    icon: Users,
    iconWrap: "text-emerald-300 bg-emerald-400/12 border-emerald-400/25",
    hover: "hover:border-emerald-400/50",
  },
  {
    href: "/stores",
    title: "Stores",
    desc: "Browse game stores and the players who log their matches there.",
    icon: Store,
    badge: "Beta",
    iconWrap: "text-amber-300 bg-amber-400/12 border-amber-400/25",
    hover: "hover:border-amber-400/50",
  },
  {
    href: "/leagues",
    title: "Leagues",
    desc: "Join or run a store league and follow the live standings.",
    icon: Trophy,
    badge: "Beta",
    iconWrap: "text-fab-gold bg-fab-gold/12 border-fab-gold/25",
    hover: "hover:border-fab-gold/55",
  },
  {
    href: "/teams",
    title: "Teams",
    desc: "Team hubs, rosters, and shared stats for your crew.",
    icon: Shield,
    iconWrap: "text-sky-300 bg-sky-400/12 border-sky-400/25",
    hover: "hover:border-sky-400/50",
  },
];

export default function DiscoverPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-xl border border-fab-border bg-fab-surface/95 p-4 sm:p-5">
        <div className="inline-flex items-center gap-2 rounded-lg border border-fab-border/70 bg-fab-bg/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-fab-gold sm:text-[11px]">
          <Compass className="h-4 w-4" />
          Discover
        </div>
        <h1 className="mt-3 text-2xl font-black text-fab-text sm:text-3xl">Explore the community</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-fab-muted">
          Jump into players, stores, leagues, and teams — pick where you want to go.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DESTINATIONS.map(({ href, title, desc, icon: Icon, badge, iconWrap, hover }) => (
          <Link
            key={href}
            href={href}
            className={`group flex items-start gap-4 rounded-xl border border-fab-border bg-fab-surface/90 p-4 transition-colors hover:bg-fab-surface-hover/70 ${hover}`}
          >
            <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${iconWrap}`}>
              <Icon className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-lg font-black text-fab-text">{title}</span>
                {badge && (
                  <span className="rounded-full border border-fab-border bg-fab-bg/70 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-fab-dim">
                    {badge}
                  </span>
                )}
              </span>
              <span className="mt-1 block text-sm leading-6 text-fab-muted">{desc}</span>
            </span>
            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-fab-dim transition-colors group-hover:text-fab-gold" />
          </Link>
        ))}
      </div>
    </div>
  );
}

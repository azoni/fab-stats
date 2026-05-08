"use client";

import { type ReactNode } from "react";
import { Bot, ExternalLink, HeartHandshake, MessageCircle, Megaphone, ShoppingCart, Sparkles } from "lucide-react";
import { trackSupportClick } from "@/lib/analytics";

type SupportLink = {
  title: string;
  description: string;
  href: string;
  trackKey: string;
  color: string;
  bgColor: string;
  ringColor: string;
  icon: ReactNode;
  badge?: string;
};

const COMMUNITY_LINKS: SupportLink[] = [
  {
    title: "Join Discord",
    description: "Chat with other players, report bugs, suggest features, and follow what is being worked on.",
    href: "https://discord.gg/WPP5aqCUHY",
    trackKey: "discord",
    color: "text-indigo-400",
    bgColor: "bg-indigo-400/10",
    ringColor: "ring-indigo-400/20",
    icon: <DiscordIcon />,
  },
  {
    title: "Add Discord Bot",
    description: "Bring FaB Stats lookups, leaderboards, meta data, and armory recaps into your server.",
    href: "https://discord.com/oauth2/authorize?client_id=1478583612537573479&permissions=0&scope=bot+applications.commands",
    trackKey: "discord_bot",
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    ringColor: "ring-violet-400/20",
    icon: <Bot className="h-5 w-5" />,
  },
  {
    title: "Follow on X",
    description: "Updates, release notes, site highlights, and community posts.",
    href: "https://x.com/FabStats",
    trackKey: "twitter",
    color: "text-fab-dim",
    bgColor: "bg-fab-bg",
    ringColor: "ring-fab-border",
    icon: <XIcon />,
  },
];

const SHOP_LINKS: SupportLink[] = [
  {
    title: "Shop Amazon",
    description: "Start Amazon shopping here. You pay the same price and Amazon sends a small percentage to FaB Stats.",
    href: "https://www.amazon.com/?tag=oldwaystoda00-20",
    trackKey: "amazon",
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    ringColor: "ring-orange-400/20",
    icon: <ShoppingCart className="h-5 w-5" />,
    badge: "Free",
  },
  {
    title: "Shop TCGplayer",
    description: "Buying cards? Starting from this link helps support the site at no extra cost to you.",
    href: "https://partner.tcgplayer.com/fabstats",
    trackKey: "tcgplayer",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    ringColor: "ring-blue-400/20",
    icon: <ShoppingCart className="h-5 w-5" />,
  },
];

export default function SupportPageContent() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-fab-border/80 bg-[linear-gradient(135deg,rgba(25,23,18,0.96),rgba(14,15,14,0.95)_60%,rgba(17,24,22,0.92))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.28)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(245,179,57,0.17),transparent_30%),radial-gradient(circle_at_86%_20%,rgba(38,211,177,0.12),transparent_28%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-fab-border/80 bg-fab-bg/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-fab-gold">
              <HeartHandshake className="h-3.5 w-3.5" />
              Community backed
            </div>
            <h1 className="mt-4 text-3xl font-black text-fab-text sm:text-4xl">Support FaB Stats</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-fab-muted sm:text-base">
              FaB Stats is a free community project. The most useful support is simple: join the Discord,
              add the bot, share what is working, and use affiliate links when you were already shopping.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <SupportMetric label="Project" value="Free" />
              <SupportMetric label="Best feedback" value="Discord" tone="blue" />
              <SupportMetric label="Shopping cost" value="$0 extra" tone="green" />
            </div>
          </div>

          <div className="rounded-xl border border-fab-border/80 bg-fab-bg/45 p-4 shadow-inner shadow-black/20">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-fab-gold/25 bg-fab-gold/10 text-fab-gold">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-fab-text">Best ways to help</p>
                <p className="text-xs text-fab-muted">Low effort, high signal.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <HelpRow title="Invite players" text="More imports make the meta and matchup data better." />
              <HelpRow title="Report rough edges" text="Screenshots and examples make fixes much faster." />
              <HelpRow title="Use the bot" text="Discord lookups help the site meet players where they are." />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-fab-border/80 bg-fab-surface/85 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.18)] sm:p-5">
          <SectionHeader
            icon={<Megaphone className="h-4 w-4" />}
            title="Community"
            text="Discord, bot commands, and update channels."
          />
          <div className="mt-4 space-y-3">
            {COMMUNITY_LINKS.map((link) => (
              <SupportLinkCard key={link.title} link={link} />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-fab-border/80 bg-fab-surface/85 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.18)] sm:p-5">
          <SectionHeader
            icon={<ShoppingCart className="h-4 w-4" />}
            title="Affiliate Support"
            text="Only use these if you were already planning to shop."
          />
          <div className="mt-4 space-y-3">
            {SHOP_LINKS.map((link) => (
              <SupportLinkCard key={link.title} link={link} />
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-fab-border/80 bg-fab-surface/85 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-fab-gold/10 text-fab-gold ring-1 ring-inset ring-fab-gold/20">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-fab-text">Feedback keeps the site sharp</h2>
            <p className="mt-1 text-sm leading-6 text-fab-muted">
              Use Send Feedback from the Support sidebar menu or Settings when something feels broken,
              confusing, too slow, or worth improving.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function SupportMetric({ label, value, tone = "gold" }: { label: string; value: string; tone?: "gold" | "blue" | "green" }) {
  const color = tone === "blue" ? "text-sky-300" : tone === "green" ? "text-emerald-300" : "text-fab-gold";
  return (
    <div className="rounded-xl border border-fab-border/70 bg-fab-bg/45 px-4 py-3 shadow-inner shadow-black/10">
      <p className={`text-lg font-black leading-none ${color}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-fab-dim">{label}</p>
    </div>
  );
}

function HelpRow({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-fab-border/70 bg-fab-surface/60 p-3">
      <p className="text-sm font-bold text-fab-text">{title}</p>
      <p className="mt-0.5 text-xs leading-5 text-fab-muted">{text}</p>
    </div>
  );
}

function SectionHeader({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-fab-border/70 pb-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-fab-border/70 bg-fab-bg/60 text-fab-gold">
        {icon}
      </span>
      <div>
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-fab-text">{title}</h2>
        <p className="text-xs text-fab-muted">{text}</p>
      </div>
    </div>
  );
}

function SupportLinkCard({ link }: { link: SupportLink }) {
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-4 rounded-xl border border-fab-border/80 bg-fab-bg/40 p-4 transition-colors hover:border-fab-gold/50 hover:bg-fab-gold/10"
      onClick={() => trackSupportClick(link.trackKey)}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${link.bgColor} ${link.color} ring-1 ring-inset ${link.ringColor}`}>
        {link.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-fab-text transition-colors group-hover:text-fab-gold">{link.title}</p>
          {link.badge && (
            <span className="rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-emerald-300">
              {link.badge}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-fab-muted">{link.description}</p>
      </div>
      <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-fab-dim transition-colors group-hover:text-fab-gold" />
    </a>
  );
}

function DiscordIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

"use client";

import { Bot, MessageCircle, ShoppingCart } from "lucide-react";
import { trackSupportClick } from "@/lib/analytics";

const SUPPORT_LINKS = [
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
  {
    title: "Shop Amazon",
    description: "Start Amazon shopping here. You pay the same price and Amazon sends a small percentage to FaB Stats.",
    href: "https://www.amazon.com/?tag=oldwaystoda00-20",
    trackKey: "amazon",
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    ringColor: "ring-orange-400/20",
    icon: <ShoppingCart className="h-5 w-5" />,
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
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-fab-text">Support FaB Stats</h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-fab-muted">
          FaB Stats is a free community project. The best ways to help are joining the community,
          adding the Discord bot, sharing updates, or using affiliate links when you already planned to shop.
        </p>
      </div>

      <div className="mb-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-fab-gold">Community</p>
        <p className="text-xs text-fab-muted">The social and Discord links live here now so the main navigation stays cleaner.</p>
      </div>

      <div className="space-y-3">
        {SUPPORT_LINKS.map((link, index) => (
          <a
            key={link.title}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 rounded-xl border border-fab-border bg-fab-surface p-4 transition-all hover:border-fab-muted"
            onClick={() => trackSupportClick(link.trackKey)}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${link.bgColor} ${link.color} ring-1 ring-inset ${link.ringColor}`}>
              {link.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-fab-text transition-colors group-hover:text-fab-gold">
                  {link.title}
                </p>
                {index === 3 && (
                  <span className="rounded-full bg-fab-gold/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-fab-gold">
                    Free
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-fab-muted">{link.description}</p>
            </div>
            <ExternalIcon />
          </a>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-fab-border bg-fab-surface p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fab-gold/10 text-fab-gold ring-1 ring-inset ring-fab-gold/20">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-fab-text">Feedback</h2>
            <p className="mt-1 text-xs leading-5 text-fab-muted">
              Use the Send Feedback option in the Support sidebar menu or Settings if something feels broken,
              confusing, or worth improving.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-fab-dim">
        Thank you for helping keep the project alive.
      </p>
    </div>
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

function ExternalIcon() {
  return (
    <svg className="mt-1 h-4 w-4 shrink-0 text-fab-dim" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

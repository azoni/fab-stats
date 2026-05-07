"use client";

import { Bot, ExternalLink, MessageCircle } from "lucide-react";
import { trackSupportClick } from "@/lib/analytics";

const SOCIAL_LINKS = [
  {
    title: "Join Discord",
    description: "Talk FaB, share feedback, report issues, and see what is changing next.",
    href: "https://discord.gg/WPP5aqCUHY",
    trackKey: "discord",
    accent: "text-indigo-400",
    bg: "bg-indigo-400/10",
    icon: <MessageCircle className="w-5 h-5" />,
  },
  {
    title: "Add Discord Bot",
    description: "Bring FaB Stats slash commands, profiles, and meta snapshots into your server.",
    href: "https://discord.com/oauth2/authorize?client_id=1478583612537573479&permissions=0&scope=bot+applications.commands",
    trackKey: "discord_bot",
    accent: "text-fab-gold",
    bg: "bg-fab-gold/10",
    icon: <Bot className="w-5 h-5" />,
  },
  {
    title: "Follow on X",
    description: "Updates, release notes, and community highlights from @FabStats.",
    href: "https://x.com/FabStats",
    trackKey: "twitter",
    accent: "text-sky-400",
    bg: "bg-sky-400/10",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
];

const BOT_COMMANDS = [
  { command: "/profile", detail: "Look up a FaB Stats player profile." },
  { command: "/meta", detail: "Show community hero meta snapshots." },
  { command: "/compare", detail: "Compare two public player profiles." },
  { command: "/invite", detail: "Share the bot invite link." },
];

export default function SocialPageContent() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="border border-fab-border bg-fab-surface rounded-lg p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-fab-gold mb-2">Social</p>
        <h1 className="text-2xl font-bold text-fab-text">Connect with FaB Stats</h1>
        <p className="text-sm text-fab-muted mt-2 max-w-2xl leading-relaxed">
          Join the community Discord, add the Discord bot to your server, or follow public updates.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SOCIAL_LINKS.map((link) => (
          <a
            key={link.title}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackSupportClick(link.trackKey)}
            className="group bg-fab-surface border border-fab-border rounded-lg p-4 hover:border-fab-muted transition-colors min-h-[180px] flex flex-col"
          >
            <div className={`w-10 h-10 rounded-lg ${link.bg} ${link.accent} flex items-center justify-center ring-1 ring-inset ring-current/20`}>
              {link.icon}
            </div>
            <div className="mt-4 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-fab-text group-hover:text-fab-gold transition-colors">{link.title}</h2>
                <ExternalLink className="w-3.5 h-3.5 text-fab-dim" />
              </div>
              <p className="text-xs text-fab-muted mt-2 leading-relaxed">{link.description}</p>
            </div>
          </a>
        ))}
      </div>

      <section className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-fab-border flex items-center gap-2">
          <Bot className="w-4 h-4 text-fab-gold" />
          <h2 className="text-sm font-semibold text-fab-text">Discord Bot</h2>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BOT_COMMANDS.map((item) => (
            <div key={item.command} className="bg-fab-bg border border-fab-border rounded-md px-3 py-2">
              <p className="text-sm font-mono text-fab-gold">{item.command}</p>
              <p className="text-xs text-fab-muted mt-1">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

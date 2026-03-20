"use client";

import { trackSupportClick } from "@/lib/analytics";

const SUPPORT_OPTIONS = [
  {
    title: "Shop on TCGplayer",
    description:
      "Buying cards? Use this affiliate link and a portion goes to supporting FaB Stats — at no extra cost to you.",
    href: "https://partner.tcgplayer.com/fabstats",
    trackKey: "tcgplayer",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    ringColor: "ring-blue-400/20",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
  },
  {
    title: "GitHub Sponsors",
    description:
      "Monthly or one-time sponsorship through GitHub. Every bit helps cover hosting and development costs.",
    href: "https://github.com/sponsors/azoni",
    trackKey: "github_sponsors",
    color: "text-pink-400",
    bgColor: "bg-pink-400/10",
    ringColor: "ring-pink-400/20",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    ),
  },
  {
    title: "Ko-fi",
    description:
      "Buy me a coffee (or a booster pack). One-time donations welcome — no account needed.",
    href: "https://ko-fi.com/azoni",
    trackKey: "kofi",
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    ringColor: "ring-yellow-400/20",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.493s1.535-.199 2.089 1.024c.603 1.332-.084 4.39-1.9 4.629z" />
      </svg>
    ),
  },
];

const COMMUNITY_LINKS = [
  {
    title: "Join the Discord",
    description: "Chat with other players, report bugs, and suggest features.",
    href: "https://discord.gg/knDmm9s7",
    trackKey: "discord",
    color: "text-indigo-400",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
  },
  {
    title: "Follow @FabStats",
    description: "Updates, highlights, and community content on X.",
    href: "https://x.com/FabStats",
    trackKey: "twitter",
    color: "text-fab-dim",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
];

export default function SupportPageContent() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-fab-text mb-2">Support FaB Stats</h1>
        <p className="text-sm text-fab-muted leading-relaxed">
          FaB Stats is a free community project built by a Flesh and Blood player, for players.
          <br />
          Here are a few ways you can help keep it going.
        </p>
      </div>

      <div className="space-y-3">
        {SUPPORT_OPTIONS.map((opt) => (
          <a
            key={opt.title}
            href={opt.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-4 rounded-xl bg-fab-surface border border-fab-border hover:border-fab-muted transition-all group"
            onClick={() => trackSupportClick(opt.trackKey)}
          >
            <div className={`w-10 h-10 rounded-lg ${opt.bgColor} flex items-center justify-center ring-1 ring-inset ${opt.ringColor} shrink-0 ${opt.color}`}>
              {opt.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fab-text group-hover:text-fab-gold transition-colors">
                {opt.title}
              </p>
              <p className="text-xs text-fab-muted mt-0.5 leading-relaxed">
                {opt.description}
              </p>
            </div>
            <svg className="w-4 h-4 text-fab-dim shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        ))}
      </div>

      <div className="mt-8 mb-3">
        <h2 className="text-sm font-semibold text-fab-text">Stay Connected</h2>
      </div>
      <div className="space-y-3">
        {COMMUNITY_LINKS.map((link) => (
          <a
            key={link.title}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-xl bg-fab-surface border border-fab-border hover:border-fab-muted transition-all group"
            onClick={() => trackSupportClick(link.trackKey)}
          >
            <div className={`${link.color} shrink-0`}>{link.icon}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fab-text group-hover:text-fab-gold transition-colors">
                {link.title}
              </p>
              <p className="text-xs text-fab-muted mt-0.5">{link.description}</p>
            </div>
            <svg className="w-4 h-4 text-fab-dim shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        ))}
      </div>

      <p className="text-center text-xs text-fab-dim mt-8">
        Thank you for being part of the FaB Stats community.
      </p>
    </div>
  );
}

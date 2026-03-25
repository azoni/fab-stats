"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { trackSupportClick } from "@/lib/analytics";
import { Heart, ShoppingCart, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import dynamic from "next/dynamic";
const FeedbackModal = dynamic(() => import("@/components/feedback/FeedbackModal").then(m => ({ default: m.FeedbackModal })), { ssr: false });

const LINKS: { href: string; label: string; trackKey: string; badge?: string; icon: ReactNode }[] = [
  { href: "https://partner.tcgplayer.com/fabstats", label: "TCGplayer", trackKey: "tcgplayer", badge: "Free", icon: <ShoppingCart className="w-3.5 h-3.5" /> },
  { href: "https://www.amazon.com/?tag=oldwaystoda00-20", label: "Amazon", trackKey: "amazon", badge: "Free", icon: <ShoppingCart className="w-3.5 h-3.5" /> },
  { href: "https://discord.gg/WPP5aqCUHY", label: "Join Discord", trackKey: "discord", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg> },
  { href: "https://x.com/FabStats", label: "Follow on X", trackKey: "twitter", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
];

export function SupportFab() {
  const { user, isGuest } = useAuth();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <div className="fixed right-4 bottom-6 z-40 hidden md:flex flex-col items-end gap-2 group">
        {/* Hover links — hidden by default */}
        <div className="flex flex-col gap-1.5 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200">
          {LINKS.map((link) => (
            <a
              key={link.trackKey}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackSupportClick(link.trackKey)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-fab-surface border border-fab-border text-fab-text text-sm font-medium shadow-lg hover:border-fab-gold/50 hover:bg-fab-surface-hover transition-colors whitespace-nowrap"
            >
              <span className="text-fab-dim">{link.icon}</span>
              {link.label}
              {link.badge && <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/15 px-1.5 py-0.5 rounded-full">{link.badge}</span>}
            </a>
          ))}
          {user && !isGuest && (
            <button
              onClick={() => setFeedbackOpen(true)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-fab-surface border border-fab-border text-fab-text text-sm font-medium shadow-lg hover:border-fab-gold/50 hover:bg-fab-surface-hover transition-colors whitespace-nowrap"
            >
              <span className="text-fab-dim"><MessageCircle className="w-3.5 h-3.5" /></span>
              Send Feedback
            </button>
          )}
        </div>

        {/* Heart button — expands to "Support" on hover */}
        <Link
          href="/support"
          className="flex items-center gap-0 py-2.5 px-2.5 rounded-full bg-pink-500 text-white font-semibold text-sm shadow-lg hover:bg-pink-400 hover:gap-2 hover:px-4 transition-all active:scale-95"
          title="Support FaB Stats"
        >
          <Heart className="w-4 h-4 fill-current shrink-0" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[4rem] transition-all duration-200">
            Support
          </span>
        </Link>
      </div>
      {feedbackOpen && <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />}
    </>
  );
}

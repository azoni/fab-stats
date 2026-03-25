"use client";
import { useState } from "react";
import Link from "next/link";
import { trackSupportClick } from "@/lib/analytics";
import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { FeedbackModal } from "@/components/feedback/FeedbackModal";

const LINKS: { href: string; label: string; trackKey: string; badge?: string }[] = [
  { href: "https://partner.tcgplayer.com/fabstats", label: "TCGplayer", trackKey: "tcgplayer", badge: "Free" },
  { href: "https://www.amazon.com/?tag=oldwaystoda00-20", label: "Amazon", trackKey: "amazon", badge: "Free" },
  { href: "https://discord.gg/WPP5aqCUHY", label: "Join Discord", trackKey: "discord" },
  { href: "https://x.com/FabStats", label: "Follow on X", trackKey: "twitter" },
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
              {link.label}
              {link.badge && <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/15 px-1.5 py-0.5 rounded-full">{link.badge}</span>}
            </a>
          ))}
          {user && !isGuest && (
            <button
              onClick={() => setFeedbackOpen(true)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-fab-surface border border-fab-border text-fab-text text-sm font-medium shadow-lg hover:border-fab-gold/50 hover:bg-fab-surface-hover transition-colors whitespace-nowrap"
            >
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

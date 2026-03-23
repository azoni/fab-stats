"use client";
import Link from "next/link";
import { trackSupportClick } from "@/lib/analytics";
import { Heart } from "lucide-react";

const LINKS = [
  { href: "https://partner.tcgplayer.com/fabstats", label: "TCGplayer", trackKey: "tcgplayer" },
  { href: "https://www.amazon.com/?tag=oldwaystoda00-20", label: "Amazon", trackKey: "amazon" },
];

export function SupportFab() {
  return (
    <div className="fixed right-[10.5rem] bottom-6 z-40 hidden md:flex flex-col items-end gap-1.5 group">
      {/* Hover links — hidden by default */}
      <div className="flex flex-col gap-1 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200">
        {LINKS.map((link) => (
          <a
            key={link.trackKey}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackSupportClick(link.trackKey)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-fab-surface border border-fab-border text-fab-text text-xs font-medium shadow-lg hover:border-fab-gold/50 transition-colors whitespace-nowrap"
          >
            {link.label}
            <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/15 px-1.5 py-0.5 rounded-full">Free</span>
          </a>
        ))}
      </div>

      {/* Heart button — always visible */}
      <Link
        href="/support"
        className="flex items-center gap-0 py-2.5 px-2.5 rounded-full bg-pink-500 text-white font-semibold text-sm shadow-lg hover:bg-pink-400 transition-all active:scale-95"
        title="Support FaB Stats"
      >
        <Heart className="w-4 h-4 fill-current shrink-0" />
      </Link>
    </div>
  );
}

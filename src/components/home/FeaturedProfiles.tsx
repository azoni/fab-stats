"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import type { FeaturedProfile } from "@/lib/featured-profiles";

const SPOTLIGHT_CONFIG: Record<string, { css: string; accent: string; iconBg: string; icon: ReactNode }> = {
  "Hot Streak": {
    css: "spotlight-streak",
    accent: "text-orange-400",
    iconBg: "bg-orange-500/15 text-orange-400",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M13.5 4.938a7 7 0 11-9.006 1.737c.202-.257.59-.218.793.039.278.352.594.672.943.954.332.269.786-.049.773-.476a5.977 5.977 0 01.572-2.759 6.026 6.026 0 012.486-2.665c.247-.14.55-.016.677.238A6.967 6.967 0 0013.5 4.938zM14 12a4 4 0 01-5.168 3.821 3.007 3.007 0 01-.573-.237A3 3 0 0110 12a.75.75 0 01.75-.75c.578 0 1.127-.107 1.634-.303A4.003 4.003 0 0114 12z" clipRule="evenodd" />
      </svg>
    ),
  },
  "Event Warrior": {
    css: "spotlight-warrior",
    accent: "text-purple-400",
    iconBg: "bg-purple-500/15 text-purple-400",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10 1c.716 0 1.353.45 1.592 1.126l1.675 4.728 5.004.408c.731.06 1.028.97.47 1.443L15.19 11.66l1.06 4.878c.155.717-.596 1.283-1.224.923L10 14.408l-5.025 3.053c-.629.36-1.38-.206-1.224-.923l1.06-4.878L1.258 8.705c-.558-.473-.26-1.383.471-1.443l5.004-.408 1.675-4.728A1.68 1.68 0 0110 1z" />
      </svg>
    ),
  },
  "Top Win Rate": {
    css: "spotlight-winrate",
    accent: "text-cyan-400",
    iconBg: "bg-cyan-500/15 text-cyan-400",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 1c-1.828 0-3.623.149-5.371.435a.75.75 0 00-.629.74v.387c0 3.787 1.818 7.152 4.63 9.275A.5.5 0 019 12.24V16H7a.75.75 0 000 1.5h6a.75.75 0 000-1.5h-2v-3.76a.5.5 0 01.37-.483C14.182 9.764 16 6.4 16 2.612v-.387a.75.75 0 00-.629-.74A49.803 49.803 0 0010 1z" clipRule="evenodd" />
      </svg>
    ),
  },
  "Rising Star": {
    css: "spotlight-rising",
    accent: "text-emerald-400",
    iconBg: "bg-emerald-500/15 text-emerald-400",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M12.577 4.878a.75.75 0 01-.919.53 1.886 1.886 0 00-1.327.088 1.886 1.886 0 00-.952.914.75.75 0 01-1.37-.12 3.386 3.386 0 011.712-1.644 3.386 3.386 0 012.387-.158.75.75 0 01.53.919l-.061-.529zM10 8a2 2 0 100 4 2 2 0 000-4zm-5.696.134l.813 2.862a.75.75 0 11-1.443.41l-.813-2.862a.75.75 0 011.443-.41zM17.5 10a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" clipRule="evenodd" />
      </svg>
    ),
  },
  "Weekly Grinder": {
    css: "spotlight-grinder",
    accent: "text-amber-400",
    iconBg: "bg-amber-500/15 text-amber-400",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
      </svg>
    ),
  },
  "Most Active": {
    css: "spotlight-active",
    accent: "text-blue-400",
    iconBg: "bg-blue-500/15 text-blue-400",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0016.5 2h-1zM9.5 6A1.5 1.5 0 008 7.5v9A1.5 1.5 0 009.5 18h1a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0010.5 6h-1zM3.5 10A1.5 1.5 0 002 11.5v5A1.5 1.5 0 003.5 18h1A1.5 1.5 0 006 16.5v-5A1.5 1.5 0 004.5 10h-1z" />
      </svg>
    ),
  },
};

const DEFAULT_CONFIG = SPOTLIGHT_CONFIG["Most Active"];

interface FeaturedProfilesProps {
  profiles: FeaturedProfile[];
}

export function FeaturedProfiles({ profiles }: FeaturedProfilesProps) {
  if (profiles.length === 0) return null;

  return (
    <div>
      <div className="section-header mb-4">
        <h2 className="text-lg font-semibold text-fab-text">Player Spotlight</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {profiles.map((fp) => {
          const config = SPOTLIGHT_CONFIG[fp.reason] || DEFAULT_CONFIG;
          return (
            <Link
              key={fp.entry.userId}
              href={`/player/${fp.entry.username}`}
              className={`spotlight-card ${config.css} bg-fab-surface border border-fab-border rounded-lg p-4 hover:bg-fab-surface-hover transition-all group`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${config.iconBg}`}>
                  {config.icon}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${config.accent}`}>
                  {fp.reason}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                {fp.entry.photoUrl ? (
                  <img
                    src={fp.entry.photoUrl}
                    alt=""
                    className="w-10 h-10 rounded-full shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-sm font-bold shrink-0">
                    {fp.entry.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-fab-text truncate text-sm group-hover:text-fab-gold transition-colors">
                    {fp.entry.displayName}
                  </p>
                  <p className="text-xs text-fab-dim truncate">@{fp.entry.username}</p>
                </div>
              </div>
              <p className={`text-sm font-semibold ${config.accent}`}>{fp.stat}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

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
  "Streak Legend": {
    css: "spotlight-streak",
    accent: "text-rose-400",
    iconBg: "bg-rose-500/15 text-rose-400",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M5.404 14.596A6.5 6.5 0 1116.5 10a1.25 1.25 0 01-2.5 0 4 4 0 10-1.67 3.256.75.75 0 11-.927 1.178A5.5 5.5 0 115.404 14.596z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 2z" clipRule="evenodd" />
      </svg>
    ),
  },
  "Armory King": {
    css: "spotlight-grinder",
    accent: "text-lime-400",
    iconBg: "bg-lime-500/15 text-lime-400",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.5.5 0 01.479.425c.069.52.104 1.05.104 1.59 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 01-.332 0C5.26 16.564 2 12.163 2 7c0-.538.035-1.069.104-1.589a.5.5 0 01.48-.425 11.947 11.947 0 007.077-2.75z" clipRule="evenodd" />
      </svg>
    ),
  },
  "Hero Specialist": {
    css: "spotlight-warrior",
    accent: "text-indigo-400",
    iconBg: "bg-indigo-500/15 text-indigo-400",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
      </svg>
    ),
  },
  "Versatile": {
    css: "spotlight-rising",
    accent: "text-teal-400",
    iconBg: "bg-teal-500/15 text-teal-400",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm9-9A2.25 2.25 0 0011 4.25v2.5A2.25 2.25 0 0013.25 9h2.5A2.25 2.25 0 0018 6.75v-2.5A2.25 2.25 0 0015.75 2h-2.5zm0 9A2.25 2.25 0 0011 13.25v2.5A2.25 2.25 0 0013.25 18h2.5A2.25 2.25 0 0018 15.75v-2.5A2.25 2.25 0 0015.75 11h-2.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  "Monthly MVP": {
    css: "spotlight-winrate",
    accent: "text-sky-400",
    iconBg: "bg-sky-500/15 text-sky-400",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M5.25 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H6a.75.75 0 01-.75-.75V12zM6 13.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V14a.75.75 0 00-.75-.75H6zM7.25 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H8a.75.75 0 01-.75-.75V12zM8 13.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V14a.75.75 0 00-.75-.75H8z" />
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
      </svg>
    ),
  },
  "Rated Ace": {
    css: "spotlight-winrate",
    accent: "text-violet-400",
    iconBg: "bg-violet-500/15 text-violet-400",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
      </svg>
    ),
  },
  "Trophy Hunter": {
    css: "spotlight-warrior",
    accent: "text-yellow-400",
    iconBg: "bg-yellow-500/15 text-yellow-400",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 1c-1.828 0-3.623.149-5.371.435a.75.75 0 00-.629.74v.387c0 3.787 1.818 7.152 4.63 9.275A.5.5 0 019 12.24V16H7a.75.75 0 000 1.5h6a.75.75 0 000-1.5h-2v-3.76a.5.5 0 01.37-.483C14.182 9.764 16 6.4 16 2.612v-.387a.75.75 0 00-.629-.74A49.803 49.803 0 0010 1z" clipRule="evenodd" />
      </svg>
    ),
  },
  "Champion": {
    css: "spotlight-streak",
    accent: "text-fab-gold",
    iconBg: "bg-fab-gold/15 text-fab-gold",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M2.5 19h15v-3H2.5v3zM18.5 7l-4 3.2L10 3 5.5 10.2 1.5 7l1.6 9.6h13.8L18.5 7z" />
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

"use client";
import Link from "next/link";
import type { FeaturedProfile } from "@/lib/featured-profiles";

interface FeaturedProfilesProps {
  profiles: FeaturedProfile[];
}

export function FeaturedProfiles({ profiles }: FeaturedProfilesProps) {
  if (profiles.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-fab-text mb-4">Player Spotlight</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {profiles.map((fp) => (
          <Link
            key={fp.entry.userId}
            href={`/player/${fp.entry.username}`}
            className="bg-fab-surface border border-fab-border rounded-lg p-4 hover:bg-fab-surface-hover transition-colors group"
          >
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-fab-gold/10 text-fab-gold mb-3">
              {fp.reason}
            </span>
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
            <p className="text-xs text-fab-muted">{fp.stat}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

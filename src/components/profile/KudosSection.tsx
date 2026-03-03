"use client";

import { useState, useCallback } from "react";
import { KUDOS_TYPES, giveKudos, revokeKudos, getRemainingKudos } from "@/lib/kudos";
import { logActivity } from "@/lib/activity-log";
import type { KudosId } from "@/lib/kudos";

function KudosIcon({ type, className }: { type: string; className?: string }) {
  const cn = className || "w-5 h-5";
  switch (type) {
    case "thumbsUp":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" />
        </svg>
      );
    case "handshake":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3.15M10.05 4.575a1.575 1.575 0 0 1 3.15 0v3.15M10.05 4.575v3.15M3.75 7.725h16.5M3.75 7.725a2.25 2.25 0 0 0-2.25 2.25v7.5a2.25 2.25 0 0 0 2.25 2.25h16.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25M6 12.75h.008v.008H6V12.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM18 12.75h.008v.008H18v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      );
    case "sword":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      );
    case "hand":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
        </svg>
      );
    default:
      return null;
  }
}

interface KudosSectionProps {
  recipientId: string;
  currentUserId?: string;
  currentDisplayName?: string;
  counts: Record<string, number>;
  givenByMe: Set<string>;
  onUpdate: (newCounts: Record<string, number>, newGiven: Set<string>) => void;
  /** When true, renders without its own card wrapper (for embedding inside another card) */
  inline?: boolean;
}

export function KudosSection({
  recipientId,
  currentUserId,
  currentDisplayName,
  counts,
  givenByMe,
  onUpdate,
  inline,
}: KudosSectionProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const handleToggle = useCallback(
    async (kudosType: KudosId) => {
      if (!currentUserId || !currentDisplayName || loading) return;
      if (currentUserId === recipientId) return;

      const isGiven = givenByMe.has(kudosType);

      // Check rate limit before giving (not revoking)
      if (!isGiven && getRemainingKudos() <= 0) {
        setHint("No kudos left today!");
        setTimeout(() => setHint(null), 2500);
        return;
      }

      setLoading(kudosType);
      try {
        if (isGiven) {
          await revokeKudos(currentUserId, recipientId, kudosType);
          const newGiven = new Set(givenByMe);
          newGiven.delete(kudosType);
          const newCounts = { ...counts, [kudosType]: Math.max(0, (counts[kudosType] || 0) - 1) };
          newCounts.total = Math.max(0, (newCounts.total || 0) - 1);
          onUpdate(newCounts, newGiven);
        } else {
          await giveKudos(currentUserId, currentDisplayName, recipientId, kudosType);
          logActivity("kudos_given", kudosType);
          const newGiven = new Set(givenByMe);
          newGiven.add(kudosType);
          const newCounts = { ...counts, [kudosType]: (counts[kudosType] || 0) + 1 };
          newCounts.total = (newCounts.total || 0) + 1;
          onUpdate(newCounts, newGiven);

          // Show remaining kudos hint
          const remaining = getRemainingKudos();
          setHint(`${remaining} kudos left today`);
          setTimeout(() => setHint(null), 2000);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(null);
      }
    },
    [currentUserId, currentDisplayName, recipientId, counts, givenByMe, onUpdate, loading]
  );

  const isOwnProfile = currentUserId === recipientId;
  const canInteract = !!currentUserId && !isOwnProfile;
  const totalKudos = counts.total || 0;

  // Don't render if no kudos and it's own profile
  if (isOwnProfile && totalKudos === 0) return null;

  return (
    <div className={inline ? "" : "bg-fab-surface border border-fab-border rounded-lg px-3 py-2.5"}>
      <div className="flex items-center gap-2 relative">
        {hint && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-fab-bg border border-fab-border rounded-md px-2 py-0.5 text-[10px] text-fab-muted z-10 animate-fade-in pointer-events-none">
            {hint}
          </div>
        )}
        {KUDOS_TYPES.map((kt) => {
          const count = counts[kt.id] || 0;
          const isGiven = givenByMe.has(kt.id);
          const isLoading = loading === kt.id;

          return (
            <button
              key={kt.id}
              type="button"
              disabled={!canInteract || isLoading}
              onClick={() => handleToggle(kt.id)}
              title={`${kt.label}: ${kt.description}${isGiven ? " (click to remove)" : ""}`}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-[44px] ${
                isLoading
                  ? "opacity-50 cursor-wait"
                  : !canInteract
                  ? "opacity-60 cursor-default"
                  : isGiven
                  ? "bg-fab-gold/15 border border-fab-gold/30 hover:bg-fab-gold/25"
                  : "bg-fab-surface hover:bg-fab-surface-hover border border-fab-border hover:border-fab-gold/30"
              }`}
            >
              <KudosIcon
                type={kt.icon}
                className={`w-4 h-4 transition-colors ${
                  isGiven ? "text-fab-gold" : "text-fab-muted"
                }`}
              />
              <span className={`text-[10px] font-bold leading-tight tabular-nums ${
                isGiven ? "text-fab-gold" : "text-fab-dim"
              }`}>
                {count}
              </span>
              <span className={`text-[8px] leading-tight ${
                isGiven ? "text-fab-gold/70" : "text-fab-dim"
              }`}>
                {kt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { KUDOS_TYPES, giveKudos, revokeKudos, isOnCooldown, getCooldownRemaining, getRemainingKudos } from "@/lib/kudos";
import { logActivity } from "@/lib/activity-log";
import type { KudosId } from "@/lib/kudos";

function KudosIcon({ type, className }: { type: string; className?: string }) {
  const cn = className || "w-5 h-5";
  switch (type) {
    case "thumbsUp":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.493 18.5c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.125c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75A.75.75 0 0 1 15 2a2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23h-.777ZM2.331 10.727a11.969 11.969 0 0 0-.831 4.398 12 12 0 0 0 .52 3.507C2.28 19.482 3.105 20 3.994 20H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 0 1-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227Z" />
        </svg>
      );
    case "handshake":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
        </svg>
      );
    case "sword":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z" clipRule="evenodd" />
        </svg>
      );
    case "hand":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 8.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" />
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
  givenCounts?: Record<string, number>;
  givenByMe: Set<string>;
  onUpdate: (newCounts: Record<string, number>, newGiven: Set<string>) => void;
  /** When true, renders without its own card wrapper (for embedding inside another card) */
  inline?: boolean;
  /** Set of kudos types the admin has given this player */
  adminGiven?: Set<string>;
  /** Admin users bypass daily limits and cooldowns */
  isAdmin?: boolean;
}

export function KudosSection({
  recipientId,
  currentUserId,
  currentDisplayName,
  counts,
  givenCounts,
  givenByMe,
  onUpdate,
  inline,
  adminGiven,
  isAdmin,
}: KudosSectionProps) {
  const [hint, setHint] = useState<string | null>(null);

  const handleToggle = useCallback(
    (kudosType: KudosId) => {
      if (!currentUserId || !currentDisplayName) return;
      if (currentUserId === recipientId) return;

      const isGiven = givenByMe.has(kudosType);

      // Admin bypasses all limits
      if (!isAdmin) {
        // Check cooldown before giving non-props types (not revoking)
        if (!isGiven && isOnCooldown(recipientId, kudosType)) {
          const remaining = getCooldownRemaining(recipientId, kudosType);
          setHint(`Wait ${remaining} to re-give`);
          setTimeout(() => setHint(null), 2500);
          return;
        }

        // Check daily limit
        if (!isGiven && getRemainingKudos() <= 0) {
          setHint("No kudos left today!");
          setTimeout(() => setHint(null), 2500);
          return;
        }
      }

      // Optimistic UI update — apply immediately, fire Firestore writes in background
      if (isGiven) {
        const newGiven = new Set(givenByMe);
        newGiven.delete(kudosType);
        const newCounts = { ...counts, [kudosType]: Math.max(0, (counts[kudosType] || 0) - 1) };
        newCounts.total = Math.max(0, (newCounts.total || 0) - 1);
        onUpdate(newCounts, newGiven);
        revokeKudos(currentUserId, recipientId, kudosType).catch(() => {});
      } else {
        const newGiven = new Set(givenByMe);
        newGiven.add(kudosType);
        const newCounts = { ...counts, [kudosType]: (counts[kudosType] || 0) + 1 };
        newCounts.total = (newCounts.total || 0) + 1;
        onUpdate(newCounts, newGiven);
        giveKudos(currentUserId, currentDisplayName, recipientId, kudosType, { skipLimits: isAdmin }).catch(() => {});
        logActivity("kudos_given", kudosType);

        if (!isAdmin) {
          const remaining = getRemainingKudos();
          setHint(`${remaining} kudos left today`);
          setTimeout(() => setHint(null), 2000);
        }
      }
    },
    [currentUserId, currentDisplayName, recipientId, counts, givenByMe, onUpdate, isAdmin]
  );

  const isOwnProfile = currentUserId === recipientId;
  const canInteract = !!currentUserId && !isOwnProfile;
  const totalKudos = counts.total || 0;
  const totalGiven = givenCounts?.total || 0;

  // Don't render if no kudos and it's own profile
  if (isOwnProfile && totalKudos === 0 && totalGiven === 0) return null;

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
          const given = givenCounts?.[kt.id] || 0;
          const isGiven = givenByMe.has(kt.id);
          const hasAdminKudos = adminGiven?.has(kt.id);

          return (
            <button
              key={kt.id}
              type="button"
              disabled={!canInteract}
              onClick={() => handleToggle(kt.id)}
              title={`${kt.label}: ${kt.description}${isGiven ? " (click to remove)" : ""}${hasAdminKudos ? " ✦ Endorsed by admin" : ""}${given > 0 ? ` · ${given} given` : ""}`}
              className={`flex flex-col items-center gap-0.5 w-[52px] py-1.5 rounded-lg transition-all ${
                !canInteract
                  ? "opacity-60 cursor-default"
                  : isGiven
                  ? "bg-fab-gold/15 border border-fab-gold/30 hover:bg-fab-gold/25"
                  : "bg-fab-surface hover:bg-fab-surface-hover border border-fab-border hover:border-fab-gold/30"
              } ${hasAdminKudos ? "ring-1 ring-fuchsia-400/40 shadow-[0_0_6px_rgba(232,121,249,0.15)]" : ""}`}
            >
              <KudosIcon
                type={kt.icon}
                className={`w-3.5 h-3.5 transition-colors ${
                  isGiven ? "text-fab-gold" : hasAdminKudos ? "text-fuchsia-400/70" : "text-fab-muted"
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

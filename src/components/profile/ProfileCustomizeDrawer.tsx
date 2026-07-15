"use client";
/**
 * Owner-only "Customize" drawer — consolidates the profile's previously-scattered
 * edit controls (links, background, card border, name underline, emblems, badges,
 * cosmetics) into one slide-out panel, so the profile VIEW is a clean card that
 * everyone (owner + visitor) sees. Every save path is the SAME as before —
 * especially the links spread-merge that preserves hidden socialLinks keys
 * (metafyProfile, discoverTags). Name + privacy stay in /settings (linked here).
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { UserProfile } from "@/types";
import type { PlayoffFinish, MinorEventFinish } from "@/lib/stats";
import {
  BorderPicker,
  UnderlinePicker,
  type BorderSelection,
  type BorderStyleType,
  type UnderlineSelection,
} from "@/components/profile/CardBorderWrapper";
import { COSMETICS_ENABLED } from "@/lib/cosmetics/flags";
import { ProfileCosmeticsPanel } from "@/components/profile/ProfileCosmeticsPanel";

type SocialLinks = NonNullable<UserProfile["socialLinks"]>;

interface SocialDraft {
  twitter: string;
  discord: string;
  fabrary: string;
  fabraryName: string;
  metafy: string;
  metafyTitle: string;
}

function draftFromProfile(p: UserProfile): SocialDraft {
  return {
    twitter: p.socialLinks?.twitter || "",
    discord: p.socialLinks?.discord || "",
    fabrary: p.socialLinks?.fabrary || "",
    fabraryName: p.socialLinks?.fabraryName || "",
    metafy: p.socialLinks?.metafy || "",
    metafyTitle: p.socialLinks?.metafyTitle || "",
  };
}

/** Rebuild socialLinks from the draft, PRESERVING untouched keys (metafyProfile,
 *  discoverTags, …) via spread-merge and mirroring metafy↔metafyGuide. Identical
 *  to the original inline handler. */
function buildLinks(profile: UserProfile, d: SocialDraft): SocialLinks {
  const links: Record<string, string | string[]> = { ...(profile.socialLinks || {}) };
  const setText = (key: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed) links[key] = trimmed;
    else delete links[key];
  };
  setText("twitter", d.twitter.trim().replace(/^@/, ""));
  setText("discord", d.discord);
  setText("fabrary", d.fabrary);
  setText("fabraryName", d.fabraryName);
  const metafy = d.metafy.trim();
  if (metafy) {
    links.metafy = metafy;
    links.metafyGuide = metafy;
  } else {
    delete links.metafy;
    delete links.metafyGuide;
  }
  const metafyTitle = d.metafyTitle.trim();
  if (metafyTitle) {
    links.metafyTitle = metafyTitle;
    links.metafyGuideTitle = metafyTitle;
  } else {
    delete links.metafyTitle;
    delete links.metafyGuideTitle;
  }
  return (Object.keys(links).length > 0 ? links : {}) as SocialLinks;
}

const TIER_RANK: Record<string, number> = { "Battle Hardened": 1, "The Calling": 2, Nationals: 3, "Pro Tour": 4, Worlds: 5 };
const PLACE_RANK: Record<string, number> = { top8: 1, top4: 2, finalist: 3, champion: 4 };
const MINOR_TIER_RANK: Record<string, number> = { Armory: 1, Skirmish: 2, "Road to Nationals": 3, ProQuest: 4 };
const MINOR_PLACE_RANK: Record<string, number> = { undefeated: 1, top8: 1, top4: 2, finalist: 3, champion: 4 };

function bestBy<T>(items: T[], score: (x: T) => number, pick: (x: T) => string, fallback: string): string {
  let best = fallback;
  let bestScore = 0;
  for (const it of items) {
    const s = score(it);
    if (s > bestScore) {
      best = pick(it);
      bestScore = s;
    }
  }
  return best;
}

function Erow({ label, value, onClick, actionLabel = "Change" }: { label: string; value: string; onClick: () => void; actionLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-sm text-fab-text">{label}</p>
        <p className="truncate text-[11px] text-fab-dim">{value}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 rounded-md border border-fab-border px-2.5 py-1 text-xs font-medium text-fab-gold hover:border-fab-gold"
      >
        {actionLabel}
      </button>
    </div>
  );
}

const inputCls =
  "flex-1 min-w-[110px] bg-fab-bg border border-fab-border rounded-lg px-2.5 py-1.5 text-xs text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold";

export function ProfileCustomizeDrawer({
  open,
  onClose,
  profile,
  isAdmin,
  overlayOpen = false,
  playoffFinishes,
  minorFinishes,
  onEditBackground,
  onEditBadges,
  onEditEmblem,
  onEnterPreview,
  onSaveLinks,
  onSaveBorder,
  onSaveUnderline,
}: {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  isAdmin: boolean;
  /** True while a picker launched FROM the drawer (background/badge/emblem) is on
   *  top — so Escape dismisses that picker without also closing the drawer. */
  overlayOpen?: boolean;
  playoffFinishes: PlayoffFinish[];
  minorFinishes: MinorEventFinish[];
  onEditBackground: () => void;
  onEditBadges: () => void;
  onEditEmblem: (mode: "talent" | "class") => void;
  onEnterPreview: () => void;
  onSaveLinks: (links: SocialLinks) => Promise<void>;
  onSaveBorder: (sel: BorderSelection) => Promise<void>;
  onSaveUnderline: (sel: UnderlineSelection) => Promise<void>;
}) {
  const [draft, setDraft] = useState<SocialDraft>(() => draftFromProfile(profile));
  const [savingLinks, setSavingLinks] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const overlayOpenRef = useRef(overlayOpen);
  overlayOpenRef.current = overlayOpen;

  // Re-hydrate the links draft each time the drawer opens (reflect latest saves).
  useEffect(() => {
    if (open) setDraft(draftFromProfile(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      // Ignore Escape if a picker opened from the drawer is on top (it handles
      // its own dismissal) — don't close the drawer + lose the links draft.
      if (e.key === "Escape" && !overlayOpenRef.current) onClose();
    };
    window.addEventListener("keydown", h);
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", h);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const linksDirty =
    draft.twitter !== (profile.socialLinks?.twitter || "") ||
    draft.discord !== (profile.socialLinks?.discord || "") ||
    draft.fabrary !== (profile.socialLinks?.fabrary || "") ||
    draft.fabraryName !== (profile.socialLinks?.fabraryName || "") ||
    draft.metafy !== (profile.socialLinks?.metafy || "") ||
    draft.metafyTitle !== (profile.socialLinks?.metafyTitle || "");

  async function saveLinks() {
    setSavingLinks(true);
    try {
      await onSaveLinks(buildLinks(profile, draft));
    } finally {
      setSavingLinks(false);
    }
  }

  const adminPlayoffs: PlayoffFinish[] = isAdmin
    ? [
        ...playoffFinishes,
        ...["Battle Hardened", "The Calling", "Nationals", "Pro Tour", "Worlds"].flatMap((et) =>
          (["top8", "top4", "finalist", "champion"] as const).map((pl) => ({ type: pl, eventType: et, eventName: `${et} (test)`, eventDate: "", format: "" }) as PlayoffFinish),
        ),
      ]
    : playoffFinishes;
  const adminMinors: MinorEventFinish[] = isAdmin
    ? [
        ...minorFinishes,
        { type: "undefeated", eventType: "Armory", eventName: "Armory (test)", eventDate: "", format: "" } as MinorEventFinish,
        ...["Skirmish", "Road to Nationals", "ProQuest"].flatMap((et) =>
          (["top8", "top4", "finalist", "champion"] as const).map((pl) => ({ type: pl, eventType: et, eventName: `${et} (test)`, eventDate: "", format: "" }) as MinorEventFinish),
        ),
      ]
    : minorFinishes;

  const borderCurrent: BorderSelection = {
    eventType: profile.borderEventType || bestBy(playoffFinishes, (f) => TIER_RANK[f.eventType] || 0, (f) => f.eventType, ""),
    placement: profile.borderPlacement || bestBy(playoffFinishes, (f) => PLACE_RANK[f.type] || 0, (f) => f.type, "top8"),
    style: (profile.borderStyle || "beam") as BorderStyleType,
  };
  const underlineCurrent: UnderlineSelection = {
    eventType: profile.underlineEventType ?? bestBy(minorFinishes, (f) => MINOR_TIER_RANK[f.eventType] || 0, (f) => f.eventType, ""),
    placement: profile.underlinePlacement ?? bestBy(minorFinishes, (f) => MINOR_PLACE_RANK[f.type] || 0, (f) => f.type, ""),
  };

  const bgLabel = profile.siteBackgroundId && profile.siteBackgroundId !== "none" ? profile.siteBackgroundId : "None";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Customize your profile">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-fab-border bg-fab-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-fab-border px-4 py-3">
          <h2 className="font-cinzel text-base font-bold uppercase tracking-wide text-fab-gold">Customize</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded p-1 text-fab-dim hover:text-fab-text focus:outline-none focus:ring-2 focus:ring-fab-gold/40"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {COSMETICS_ENABLED && (
            <section>
              <ProfileCosmeticsPanel profile={profile} />
            </section>
          )}

          <section>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-fab-gold/80">Appearance</p>
            <div className="divide-y divide-fab-border/60 rounded-lg border border-fab-border bg-fab-bg/30 px-3">
              <Erow label="Profile background" value={bgLabel} onClick={onEditBackground} />
              <Erow label="Talent emblem" value={profile.selectedEmblem || "None"} onClick={() => onEditEmblem("talent")} />
              <Erow label="Class emblem" value={profile.selectedClassEmblem || "None"} onClick={() => onEditEmblem("class")} />
              {(playoffFinishes.length > 0 || isAdmin) && (
                <div className="py-2">
                  <p className="mb-1 text-sm text-fab-text">Card border</p>
                  <BorderPicker playoffFinishes={adminPlayoffs} current={borderCurrent} onChange={onSaveBorder} />
                </div>
              )}
              {(minorFinishes.length > 0 || isAdmin) && (
                <div className="py-2">
                  <p className="mb-1 text-sm text-fab-text">Name underline</p>
                  <UnderlinePicker minorFinishes={adminMinors} current={underlineCurrent} onChange={onSaveUnderline} />
                </div>
              )}
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-fab-gold/80">Links</p>
            <div className="flex flex-wrap gap-1.5">
              <input className={inputCls} placeholder="X handle" value={draft.twitter} onChange={(e) => setDraft((d) => ({ ...d, twitter: e.target.value }))} />
              <input className={inputCls} placeholder="Discord" value={draft.discord} onChange={(e) => setDraft((d) => ({ ...d, discord: e.target.value }))} />
              <input className={inputCls} placeholder="Deck URL" value={draft.fabrary} onChange={(e) => setDraft((d) => ({ ...d, fabrary: e.target.value }))} />
              {draft.fabrary.trim() && (
                <input className={inputCls} placeholder="Deck name" value={draft.fabraryName} onChange={(e) => setDraft((d) => ({ ...d, fabraryName: e.target.value }))} />
              )}
              <input className={inputCls} placeholder="Metafy URL" value={draft.metafy} onChange={(e) => setDraft((d) => ({ ...d, metafy: e.target.value }))} />
              {draft.metafy.trim() && (
                <input className={inputCls} placeholder="Guide title" value={draft.metafyTitle} onChange={(e) => setDraft((d) => ({ ...d, metafyTitle: e.target.value }))} />
              )}
            </div>
            {linksDirty && (
              <button
                type="button"
                onClick={saveLinks}
                disabled={savingLinks}
                className="mt-2 rounded-lg bg-fab-gold/20 px-3 py-1.5 text-xs font-semibold text-fab-gold hover:bg-fab-gold/30 disabled:opacity-50"
              >
                {savingLinks ? "Saving…" : "Save links"}
              </button>
            )}
          </section>

          <section>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-fab-gold/80">Badges</p>
            <div className="rounded-lg border border-fab-border bg-fab-bg/30 px-3">
              <Erow label="Badge strip" value={`${profile.selectedBadgeIds?.length || 0} pinned`} onClick={onEditBadges} actionLabel="Edit" />
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-fab-border bg-fab-bg/40 px-4 py-3">
          <Link href="/settings" className="text-xs text-fab-muted underline decoration-fab-border hover:text-fab-text">
            Name & privacy → Settings
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEnterPreview}
              className="rounded-md border border-fab-border px-2.5 py-1 text-xs font-medium text-fab-muted hover:text-fab-text"
            >
              View as visitor
            </button>
            <button type="button" onClick={onClose} className="rounded-md bg-fab-gold/20 px-3 py-1 text-xs font-semibold text-fab-gold hover:bg-fab-gold/30">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

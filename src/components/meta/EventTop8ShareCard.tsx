"use client";
import { useRef, useState } from "react";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import type { EventTop8 } from "@/lib/meta-stats";
import { FINISH_THEMES, type FinishTheme } from "@/components/profile/BestFinishCard";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";

// ── Placement colors ──

function placementColor(type: string): string {
  switch (type) {
    case "champion": return "#FFD700";
    case "finalist": return "#C0C0C0";
    case "top4": return "#F59E0B";
    case "top8": return "#60A5FA";
    default: return "#9CA3AF";
  }
}

function placementLabel(type: string): string {
  switch (type) {
    case "champion": return "1st";
    case "finalist": return "2nd";
    case "top4": return "T4";
    case "top8": return "T8";
    default: return type;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Card Component ──

export function EventTop8Card({ event, theme }: { event: EventTop8; theme?: FinishTheme }) {
  const t = theme || FINISH_THEMES[0];

  return (
    <div style={{ backgroundColor: t.surface, borderColor: t.border, width: 380 }} className="border rounded-xl overflow-hidden">
      {/* Header */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-3 border-b">
        <p style={{ color: t.accent }} className="text-[11px] uppercase tracking-[0.25em] text-center font-black">
          {event.eventType} Top 8
        </p>
      </div>

      <div className="px-5 pt-4 pb-3">
        {/* Event info */}
        <div className="text-center mb-4">
          <p style={{ color: t.text }} className="text-sm font-bold leading-tight">{event.eventName}</p>
          <p style={{ color: t.dim }} className="text-xs mt-1">
            {event.format} &middot; {formatDate(event.eventDate)}
          </p>
        </div>

        {/* Hero list */}
        <div style={{ borderColor: t.border }} className="border rounded-lg overflow-hidden">
          {event.heroes.slice(0, 8).map((h, i) => {
            const heroInfo = getHeroByName(h.hero);
            const heroClass = heroInfo?.classes[0];
            const pColor = placementColor(h.placementType);
            return (
              <div
                key={h.hero}
                className="flex items-center gap-2.5 px-3 py-2"
                style={{
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: t.border,
                  borderTopStyle: "solid",
                }}
              >
                <span
                  style={{ color: pColor }}
                  className="text-xs font-bold w-5 text-center shrink-0"
                >
                  {placementLabel(h.placementType)}
                </span>
                <HeroClassIcon heroClass={heroClass} size="sm" />
                <span
                  style={{ color: h.placementType === "champion" ? t.trophy : t.text }}
                  className="text-sm font-medium flex-1 truncate"
                >
                  {h.hero}
                </span>
                {heroClass && (
                  <span style={{ color: t.dim }} className="text-[10px] shrink-0">{heroClass}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-2.5 border-t">
        <p style={{ color: t.accent }} className="text-[11px] text-center tracking-wider font-semibold opacity-50">fabstats.net</p>
      </div>
    </div>
  );
}

// ── Share Modal ──

interface EventTop8ShareModalProps {
  event: EventTop8;
  onClose: () => void;
}

export function EventTop8ShareModal({ event, onClose }: EventTop8ShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedTheme, setSelectedTheme] = useState(FINISH_THEMES[0]);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "text-copied" | "sharing">("idle");

  async function handleCopy() {
    const shareText = `${event.eventType} Top 8 — ${event.eventName}`;

    setShareStatus("sharing");
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: selectedTheme.bg, fileName: "event-top8.png",
      shareTitle: "FaB Stats — Event Top 8", shareText, fallbackText: shareText,
    });
    if (result === "image" || result === "shared") {
      setShareStatus("copied");
      setTimeout(() => { setShareStatus("idle"); onClose(); }, 1500);
    } else if (result === "text") {
      setShareStatus("text-copied");
      setTimeout(() => { setShareStatus("idle"); onClose(); }, 2000);
    } else {
      setShareStatus("idle");
    }
  }

  async function handleDownload() {
    setShareStatus("sharing");
    await downloadCardImage(cardRef.current, { backgroundColor: selectedTheme.bg, fileName: "event-top8.png" });
    setShareStatus("idle");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl max-w-lg w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
          <h3 className="text-sm font-semibold text-fab-text">Share Event Top 8</h3>
          <button onClick={onClose} className="text-fab-muted hover:text-fab-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card preview */}
        <div className="p-4 flex justify-center overflow-x-auto">
          <div ref={cardRef}>
            <EventTop8Card event={event} theme={selectedTheme} />
          </div>
        </div>

        {/* Theme picker */}
        <div className="px-4 pb-3">
          <p className="text-[10px] text-fab-muted uppercase tracking-wider font-medium mb-2">Theme</p>
          <div className="flex gap-2">
            {FINISH_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className={`flex-1 rounded-lg p-2 text-center transition-all border ${
                  selectedTheme.id === theme.id
                    ? "border-fab-gold ring-1 ring-fab-gold/30"
                    : "border-fab-border hover:border-fab-muted"
                }`}
              >
                <div className="flex gap-0.5 justify-center mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.bg }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.accent }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.trophy }} />
                </div>
                <p className="text-[10px] text-fab-muted">{theme.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Copy + Download buttons */}
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={handleCopy} disabled={shareStatus === "sharing"} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50">
            {shareStatus === "sharing" ? "Capturing..." : shareStatus === "copied" ? "Image Copied!" : shareStatus === "text-copied" ? "Link Copied" : "Copy Image"}
          </button>
          <button onClick={handleDownload} disabled={shareStatus === "sharing"} className="px-4 py-2.5 rounded-lg text-sm font-medium border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-muted transition-colors disabled:opacity-50" title="Save Image">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

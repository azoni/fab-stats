"use client";
import { useRef, useState } from "react";
import type { EventStats } from "@/types";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import { FINISH_THEMES, type FinishTheme } from "@/components/profile/BestFinishCard";

// ── Card ──

interface EventShareData {
  event: EventStats;
  playerName: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function EventShareCardInner({ data, theme }: { data: EventShareData; theme?: FinishTheme }) {
  const t = theme || FINISH_THEMES[0];
  const { event, playerName } = data;

  // Determine shared hero (if all matches use same hero)
  const heroes = new Set(event.matches.map((m) => m.heroPlayed).filter((h) => h && h !== "Unknown"));
  const sharedHero = heroes.size === 1 ? [...heroes][0]! : null;
  const heroInfo = sharedHero ? getHeroByName(sharedHero) : null;
  const heroClass = heroInfo?.classes[0];

  const isPositive = event.wins >= event.losses;

  return (
    <div style={{ backgroundColor: t.surface, borderColor: t.border, width: 380 }} className="border rounded-xl overflow-hidden">
      {/* Header */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-3 border-b">
        <p style={{ color: t.accent }} className="text-[11px] uppercase tracking-[0.25em] text-center font-black">
          {event.eventType && event.eventType !== "Other" ? event.eventType : "Event"} Result
        </p>
      </div>

      <div className="px-5 pt-5 pb-4">
        {/* Record */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-3">
            <span style={{ color: isPositive ? "#4ade80" : "#f87171" }} className="text-4xl font-black">
              {event.wins}
            </span>
            <span style={{ color: t.dim }} className="text-2xl font-light">-</span>
            <span style={{ color: isPositive ? "#f87171" : "#4ade80" }} className="text-4xl font-black">
              {event.losses}
            </span>
            {event.draws > 0 && (
              <>
                <span style={{ color: t.dim }} className="text-2xl font-light">-</span>
                <span style={{ color: t.muted }} className="text-4xl font-black">{event.draws}</span>
              </>
            )}
          </div>
          <p style={{ color: isPositive ? "#4ade80" : "#f87171" }} className="text-sm font-semibold mt-1">
            {event.winRate.toFixed(0)}% Win Rate
          </p>
        </div>

        {/* Event info */}
        <div className="text-center">
          <p style={{ color: t.text }} className="text-sm font-bold leading-tight">{event.eventName}</p>
          <p style={{ color: t.dim }} className="text-xs mt-1">
            {event.format === "Classic Constructed" ? "CC" : event.format}
            {event.eventType && event.eventType !== "Other" ? ` \u00b7 ${event.eventType}` : ""}
            {" \u00b7 "}{formatDate(event.eventDate)}
          </p>
        </div>

        {/* Player */}
        <div style={{ backgroundColor: t.bg }} className="rounded-lg p-3 mt-4 text-center">
          <p style={{ color: t.muted }} className="text-[10px] uppercase tracking-widest mb-1">Player</p>
          <p style={{ color: t.accent }} className="text-lg font-black">{playerName}</p>
          {sharedHero && (
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <HeroClassIcon heroClass={heroClass} size="sm" />
              <span style={{ color: t.dim }} className="text-xs">{sharedHero}</span>
            </div>
          )}
        </div>

        {/* Tagline */}
        <p style={{ color: t.dim }} className="text-[10px] text-center mt-3 italic">
          {event.wins > event.losses ? "A tournament to remember." : event.wins === event.losses ? "A hard-fought day." : "Learning from every match."}
        </p>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-2.5 border-t">
        <p style={{ color: t.accent }} className="text-[11px] text-center tracking-wider font-semibold opacity-50">fabstats.net</p>
      </div>
    </div>
  );
}

// ── Share Modal ──

interface EventShareModalProps {
  event: EventStats;
  playerName: string;
  onClose: () => void;
}

export function EventShareModal({ event, playerName, onClose }: EventShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedTheme, setSelectedTheme] = useState(FINISH_THEMES[0]);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "sharing">("idle");

  const cardData: EventShareData = { event, playerName };

  async function handleCopy() {
    setShareStatus("sharing");
    try {
      const { toBlob } = await import("html-to-image");
      const blob = cardRef.current
        ? await toBlob(cardRef.current, { pixelRatio: 2, backgroundColor: selectedTheme.bg })
        : null;

      const shareText = `${playerName} went ${event.wins}-${event.losses}${event.draws > 0 ? `-${event.draws}` : ""} at ${event.eventName}`;

      const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      if (isMobile && blob && navigator.share && navigator.canShare?.({ files: [new File([blob], "event-result.png", { type: "image/png" })] })) {
        const file = new File([blob], "event-result.png", { type: "image/png" });
        await navigator.share({ title: "FaB Stats — Event Result", text: shareText, files: [file] });
      } else if (blob && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setShareStatus("copied");
        setTimeout(() => { setShareStatus("idle"); onClose(); }, 1500);
        return;
      } else {
        await navigator.clipboard.writeText(shareText);
        setShareStatus("copied");
        setTimeout(() => { setShareStatus("idle"); onClose(); }, 1500);
        return;
      }
    } catch {
      try {
        await navigator.clipboard.writeText(`${playerName} at ${event.eventName}: ${event.wins}-${event.losses}`);
        setShareStatus("copied");
        setTimeout(() => { setShareStatus("idle"); onClose(); }, 1500);
        return;
      } catch { /* ignore */ }
    }
    setShareStatus("idle");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl max-w-lg w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
          <h3 className="text-sm font-semibold text-fab-text">Share Event Result</h3>
          <button onClick={onClose} className="text-fab-muted hover:text-fab-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card preview */}
        <div className="p-4 flex justify-center overflow-x-auto">
          <div ref={cardRef}>
            <EventShareCardInner data={cardData} theme={selectedTheme} />
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

        {/* Copy button */}
        <div className="px-4 pb-4">
          <button
            onClick={handleCopy}
            disabled={shareStatus === "sharing"}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
          >
            {shareStatus === "sharing" ? "Capturing..." : shareStatus === "copied" ? "Copied!" : "Copy Image"}
          </button>
        </div>
      </div>
    </div>
  );
}

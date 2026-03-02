"use client";
import { useRef, useState, useEffect } from "react";
import type { PlayoffFinish } from "@/lib/stats";
import { logActivity } from "@/lib/activity-log";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";
import {
  TIER_MAP,
  PLACEMENT_TEXT,
  col,
  glowFilter,
  ShieldBadge,
  MedalIcon,
  TrophyIcon,
  MarbleIcon,
} from "@/components/profile/TrophyCase";
import { FINISH_THEMES, type FinishTheme } from "@/components/profile/BestFinishCard";

// ── Placement Card ──

interface PlacementCardData {
  playerName: string;
  finish: PlayoffFinish;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getPlacementLabel(type: PlayoffFinish["type"]): string {
  switch (type) {
    case "champion": return "Champion";
    case "finalist": return "Finalist";
    case "top4": return "Top 4";
    case "top8": return "Top 8";
  }
}

function getTagline(type: PlayoffFinish["type"]): string {
  switch (type) {
    case "champion": return "Standing at the top.";
    case "finalist": return "So close to glory.";
    case "top4": return "Among the best.";
    case "top8": return "Making their mark.";
  }
}

/** Get the badge accent color that matches the placement type */
function badgeAccent(type: PlayoffFinish["type"]): string {
  const c = col(type);
  return c.from;
}

/** Large centered badge for the share card */
function LargeBadge({ finish, theme }: { finish: PlayoffFinish; theme: FinishTheme }) {
  const tier = TIER_MAP[finish.eventType] || "marble";
  const id = "share-badge";

  // Scale up: render the SVG badges at 3-4x normal size for the share card
  const wrapperClass = "flex items-center justify-center";

  if (tier === "trophy") {
    return (
      <div className={wrapperClass} style={{ transform: "scale(3)", transformOrigin: "center" }}>
        <TrophyIcon type={finish.type} id={id} />
      </div>
    );
  }
  if (tier === "medal") {
    return (
      <div className={wrapperClass} style={{ transform: "scale(3)", transformOrigin: "center" }}>
        <MedalIcon type={finish.type} id={id} />
      </div>
    );
  }
  if (tier === "marble") {
    return (
      <div className={wrapperClass} style={{ transform: "scale(3.5)", transformOrigin: "center" }}>
        <MarbleIcon type={finish.type} id={id} idx={0} />
      </div>
    );
  }
  // badge (shield)
  return (
    <div className={wrapperClass} style={{ transform: "scale(3)", transformOrigin: "center" }}>
      <ShieldBadge type={finish.type} id={id} />
    </div>
  );
}

export function PlacementShareCard({ data, theme }: { data: PlacementCardData; theme?: FinishTheme }) {
  const t = theme || FINISH_THEMES[0];
  const { playerName, finish } = data;
  const accent = badgeAccent(finish.type);

  return (
    <div style={{ backgroundColor: t.surface, borderColor: t.border, width: 380 }} className="border rounded-xl overflow-hidden">
      {/* Header */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-3 border-b">
        <p style={{ color: t.accent }} className="text-[11px] uppercase tracking-[0.25em] text-center font-black">
          {finish.eventType || "Event"} Finish
        </p>
      </div>

      <div className="px-5 pt-5 pb-4">
        {/* Badge */}
        <div className="flex justify-center mb-4" style={{ height: 80 }}>
          <LargeBadge finish={finish} theme={t} />
        </div>

        {/* Placement label */}
        <div className="text-center mb-3">
          <p style={{ color: accent }} className="text-2xl font-black tracking-tight">
            {getPlacementLabel(finish.type)}
          </p>
        </div>

        {/* Event info */}
        <div className="text-center">
          <p style={{ color: t.text }} className="text-sm font-bold leading-tight">{finish.eventName}</p>
          <p style={{ color: t.dim }} className="text-xs mt-1">
            {finish.format}{finish.eventType ? ` \u00b7 ${finish.eventType}` : ""} \u00b7 {formatDate(finish.eventDate)}
          </p>
        </div>

        {/* Player */}
        <div style={{ backgroundColor: t.bg }} className="rounded-lg p-3 mt-4 text-center">
          <p style={{ color: t.muted }} className="text-[10px] uppercase tracking-widest mb-1">Player</p>
          <p style={{ color: t.accent }} className="text-lg font-black">{playerName}</p>
          {finish.hero && finish.hero !== "Unknown" && (
            <p style={{ color: t.dim }} className="text-xs mt-0.5">{finish.hero}</p>
          )}
        </div>

        {/* Tagline */}
        <p style={{ color: t.dim }} className="text-[10px] text-center mt-3 italic">
          {getTagline(finish.type)}
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

interface PlacementShareModalProps {
  playerName: string;
  finish: PlayoffFinish;
  onClose: () => void;
}

export function PlacementShareModal({ playerName, finish, onClose }: PlacementShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedTheme, setSelectedTheme] = useState(FINISH_THEMES[0]);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "text-copied" | "sharing">("idle");

  const cardData: PlacementCardData = { playerName, finish };

  async function handleCopy() {
    const shareText = `${playerName} — ${getPlacementLabel(finish.type)} at ${finish.eventName}`;

    logActivity("placement_share", finish.eventName);
    setShareStatus("sharing");
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: selectedTheme.bg, fileName: "placement.png",
      shareTitle: "FaB Stats — Event Placement", shareText, fallbackText: shareText,
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
    logActivity("placement_share", finish.eventName);
    setShareStatus("sharing");
    await downloadCardImage(cardRef.current, { backgroundColor: selectedTheme.bg, fileName: "placement.png" });
    setShareStatus("idle");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl max-w-lg w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
          <h3 className="text-sm font-semibold text-fab-text">Share Your Finish</h3>
          <button onClick={onClose} className="text-fab-muted hover:text-fab-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card preview */}
        <div className="p-4 flex justify-center overflow-x-auto">
          <div ref={cardRef}>
            <PlacementShareCard data={cardData} theme={selectedTheme} />
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

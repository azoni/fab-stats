"use client";
import { useRef, useState } from "react";

import { MatchResult } from "@/types";
import { CARD_THEMES, type CardTheme } from "@/components/opponents/RivalryCard";
import type { PlayoffFinish } from "@/lib/stats";

export interface ProfileCardData {
  playerName: string;
  username?: string;
  photoUrl?: string;
  wins: number;
  losses: number;
  draws: number;
  byes: number;
  winRate: number;
  events: number;
  totalMatches: number;
  topHero: string | null;
  currentStreak: { type: MatchResult.Win | MatchResult.Loss; count: number } | null;
  bestFinish: string | null;
  bestFinishEvent?: string | null;
  recentResults: MatchResult[];
  cardBorder?: { border: string; shadow: string } | null;
  bestRank?: 1 | 2 | 3 | 4 | 5 | null;
  playoffFinishes?: PlayoffFinish[];
  armoryCount?: number;
  armoryUndefeated?: number;
}

const RANK_RING_COLORS: Record<number, { color: string; shadow: string }> = {
  1: { color: "rgba(255, 50, 150, 0.9)", shadow: "0 0 8px rgba(255,50,150,0.5)" },
  2: { color: "rgba(56, 189, 248, 0.8)", shadow: "0 0 8px rgba(56,189,248,0.4)" },
  3: { color: "rgba(250, 204, 21, 0.8)", shadow: "0 0 8px rgba(250,204,21,0.4)" },
  4: { color: "rgba(192, 192, 210, 0.7)", shadow: "0 0 6px rgba(192,192,210,0.3)" },
  5: { color: "rgba(205, 127, 50, 0.7)", shadow: "0 0 6px rgba(205,127,50,0.3)" },
};

const FINISH_COLORS: Record<string, string> = {
  champion: "#FFD700",
  finalist: "#C0C0C0",
  top4: "#F59E0B",
  top8: "#60A5FA",
};

const FINISH_LABELS: Record<string, string> = {
  champion: "W",
  finalist: "F",
  top4: "T4",
  top8: "T8",
};

const EVENT_ABBR: Record<string, string> = {
  Skirmish: "SK",
  "Road to Nationals": "RTN",
  ProQuest: "PQ",
  "Battle Hardened": "BH",
  "The Calling": "TC",
  Nationals: "NAT",
  "Pro Tour": "PT",
  Worlds: "WLD",
  Championship: "CH",
};

export function ProfileCard({ data, theme }: { data: ProfileCardData; theme?: CardTheme }) {
  const t = theme || CARD_THEMES[0];
  const {
    playerName, username, photoUrl, wins, losses, draws,
    winRate, events, totalMatches, topHero, currentStreak, bestFinish,
    recentResults, cardBorder, bestRank, playoffFinishes,
    armoryCount, armoryUndefeated,
  } = data;
  const isWinning = winRate >= 50;
  const rankRing = bestRank ? RANK_RING_COLORS[bestRank] : null;
  const hasTrophies = playoffFinishes && playoffFinishes.length > 0;
  const hasArmory = armoryCount && armoryCount > 0;
  const recent20 = recentResults.slice(-20);

  // Dynamic slot 3: streak (if 3+) → best finish → matches
  const slot3 = currentStreak && currentStreak.count >= 3
    ? { label: "Streak", value: `${currentStreak.count}${currentStreak.type === MatchResult.Win ? "W" : "L"}`, color: currentStreak.type === MatchResult.Win ? t.win : t.loss }
    : bestFinish
    ? { label: "Best Finish", value: bestFinish, color: t.accent }
    : { label: "Matches", value: `${totalMatches}`, color: t.text };

  // Trophy summary counts
  const trophyCounts = hasTrophies ? (["champion", "finalist", "top4", "top8"] as const)
    .map((type) => ({ type, count: playoffFinishes!.filter((f) => f.type === type).length }))
    .filter((t) => t.count > 0) : [];

  const TROPHY_LABELS: Record<string, string> = { champion: "Champ", finalist: "Finalist", top4: "Top 4", top8: "Top 8" };

  return (
    <div
      style={{
        backgroundColor: t.surface,
        borderColor: cardBorder?.border || t.border,
        boxShadow: cardBorder?.shadow || undefined,
        width: 440,
      }}
      className="border-2 rounded-xl overflow-hidden"
    >
      {/* Accent bar */}
      <div style={{ height: 3, backgroundColor: cardBorder?.border || t.accent }} />

      {/* Identity + Hero Metric */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          {/* Left: photo + name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0">
              {photoUrl ? (
                <div
                  className="rounded-full"
                  style={rankRing ? {
                    padding: 3,
                    background: `linear-gradient(135deg, ${rankRing.color}, transparent, ${rankRing.color})`,
                    boxShadow: rankRing.shadow,
                  } : undefined}
                >
                  <img
                    src={photoUrl}
                    alt=""
                    style={{ borderColor: rankRing ? t.surface : t.accent }}
                    className="w-14 h-14 rounded-full border-2"
                    crossOrigin="anonymous"
                  />
                </div>
              ) : (
                <div
                  className="rounded-full"
                  style={rankRing ? {
                    padding: 3,
                    background: `linear-gradient(135deg, ${rankRing.color}, transparent, ${rankRing.color})`,
                    boxShadow: rankRing.shadow,
                  } : undefined}
                >
                  <div
                    style={{
                      backgroundColor: `${t.accent}20`,
                      borderColor: rankRing ? t.surface : `${t.accent}60`,
                      color: t.accent,
                    }}
                    className="w-14 h-14 rounded-full border-2 flex items-center justify-center text-2xl font-black"
                  >
                    {playerName.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p style={{ color: t.text }} className="text-xl font-black truncate leading-tight">{playerName}</p>
              {username && <p style={{ color: t.dim }} className="text-[11px]">@{username}</p>}
            </div>
          </div>

          {/* Right: Win rate hero metric */}
          <div className="shrink-0 text-right pl-4">
            <p style={{ color: isWinning ? t.win : t.loss }}>
              <span className="text-4xl font-black leading-none">{winRate.toFixed(1)}</span>
              <span className="text-xl font-bold">%</span>
            </p>
            <p className="text-sm font-bold mt-0.5">
              <span style={{ color: t.win }}>{wins}W</span>
              <span style={{ color: t.border }}> - </span>
              <span style={{ color: t.loss }}>{losses}L</span>
              {draws > 0 && <span style={{ color: t.dim }} className="text-[10px] ml-1">({draws}D)</span>}
            </p>
            <div style={{ backgroundColor: t.barBg }} className="h-[3px] rounded-full overflow-hidden w-24 ml-auto mt-1.5">
              <div
                style={{ backgroundColor: isWinning ? t.win : t.loss, width: `${Math.min(winRate, 100)}%` }}
                className="h-full rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5" style={{ borderTop: `1px solid ${t.border}4D` }} />

      {/* Context bar — 3 col */}
      <div className="grid grid-cols-3 gap-2 px-5 py-2.5">
        <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2 text-center">
          <p style={{ color: t.muted }} className="text-[9px] uppercase tracking-wider font-semibold">Events</p>
          <p style={{ color: t.text }} className="text-sm font-black">{events}</p>
        </div>
        <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2 text-center">
          <p style={{ color: t.muted }} className="text-[9px] uppercase tracking-wider font-semibold">Top Hero</p>
          <p style={{ color: t.text }} className="text-xs font-bold truncate mt-0.5">{topHero || "—"}</p>
        </div>
        <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2 text-center">
          <p style={{ color: t.muted }} className="text-[9px] uppercase tracking-wider font-semibold">{slot3.label}</p>
          <p style={{ color: slot3.color }} className="text-sm font-black truncate">{slot3.value}</p>
        </div>
      </div>

      {/* Trophy Case — summary counts */}
      {trophyCounts.length > 0 && (
        <div className="flex items-center gap-1.5 px-5 py-1.5">
          <p style={{ color: t.dim }} className="text-[8px] uppercase tracking-wider font-semibold shrink-0">Trophies</p>
          <div className="flex items-center gap-1 flex-wrap">
            {trophyCounts.map((tc, i) => (
              <span key={tc.type}>
                <span style={{ color: FINISH_COLORS[tc.type] }} className="text-[10px] font-bold">{tc.count}x {TROPHY_LABELS[tc.type]}</span>
                {i < trophyCounts.length - 1 && <span style={{ color: t.border }} className="text-[10px] mx-0.5">·</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Armory — single line */}
      {hasArmory && (
        <div className="flex items-center gap-1.5 px-5 py-1.5">
          <p style={{ color: t.dim }} className="text-[8px] uppercase tracking-wider font-semibold shrink-0">Armory</p>
          <p className="text-[10px]">
            <span style={{ color: t.text }}>{armoryCount} event{armoryCount !== 1 ? "s" : ""}</span>
            {armoryUndefeated ? (
              <>
                <span style={{ color: t.border }} className="mx-0.5">·</span>
                <span style={{ color: t.win }}>{armoryUndefeated} undefeated</span>
              </>
            ) : null}
          </p>
        </div>
      )}

      {/* Recent form */}
      {recent20.length > 0 && (
        <div className="flex items-center gap-2 px-5 py-2">
          <p style={{ color: t.dim }} className="text-[8px] uppercase tracking-wider font-semibold shrink-0">Form</p>
          <div className="flex gap-[3px]">
            {recent20.map((r, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    r === MatchResult.Win ? t.win
                    : r === MatchResult.Loss ? t.loss
                    : r === MatchResult.Draw ? t.draw
                    : t.muted,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ backgroundColor: t.bg, borderTop: `1px solid ${t.border}` }} className="px-5 py-1.5">
        <p style={{ color: t.accent, opacity: 0.5 }} className="text-[10px] tracking-wider font-semibold">fabstats.net</p>
      </div>
    </div>
  );
}

export function ProfileShareModal({
  data,
  onClose,
}: {
  data: ProfileCardData;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedTheme, setSelectedTheme] = useState(CARD_THEMES[0]);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "sharing">("idle");

  async function captureCard(): Promise<Blob | null> {
    if (!cardRef.current) return null;
    const { toBlob } = await import("html-to-image");
    const opts = { pixelRatio: 2, backgroundColor: selectedTheme.bg, cacheBust: true };
    try {
      return await toBlob(cardRef.current, opts);
    } catch {
      // CORS failure on external images — retry without <img> elements
      try {
        return await toBlob(cardRef.current, {
          ...opts,
          filter: (node: HTMLElement) => node.tagName !== "IMG",
        });
      } catch {
        return null;
      }
    }
  }

  async function handleCopy() {
    const profileUrl = data.username
      ? `${window.location.origin}/player/${data.username}`
      : window.location.origin;
    const shareText = `${data.playerName} — ${data.winRate.toFixed(1)}% win rate across ${data.totalMatches} matches\n${profileUrl}`;

    setShareStatus("sharing");
    try {
      const blob = await captureCard();

      const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      if (isMobile && blob && navigator.share && navigator.canShare?.({ files: [new File([blob], "fab-stats.png", { type: "image/png" })] })) {
        const file = new File([blob], "fab-stats.png", { type: "image/png" });
        await navigator.share({ title: "FaB Stats — Profile", text: shareText, files: [file] });
      } else if (blob && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setShareStatus("copied");
        setTimeout(() => { setShareStatus("idle"); onClose(); }, 1500);
        return;
      } else {
        await navigator.clipboard.writeText(profileUrl);
        setShareStatus("copied");
        setTimeout(() => { setShareStatus("idle"); onClose(); }, 1500);
        return;
      }
    } catch {
      try {
        await navigator.clipboard.writeText(profileUrl);
      } catch { /* ignore */ }
    }
    setShareStatus("idle");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl max-w-lg w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
          <h3 className="text-sm font-semibold text-fab-text">Share Profile Card</h3>
          <button onClick={onClose} className="text-fab-muted hover:text-fab-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card preview */}
        <div className="p-4 flex justify-center overflow-x-auto">
          <div ref={cardRef}>
            <ProfileCard data={data} theme={selectedTheme} />
          </div>
        </div>

        {/* Theme picker */}
        <div className="px-4 pb-3">
          <p className="text-[10px] text-fab-muted uppercase tracking-wider font-medium mb-2">Theme</p>
          <div className="flex gap-2">
            {CARD_THEMES.map((theme) => (
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
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.win }} />
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

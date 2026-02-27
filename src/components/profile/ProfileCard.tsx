"use client";
import { useRef, useState } from "react";
import { toBlob } from "html-to-image";
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
  bestFinishEvent: string | null;
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
    playerName, username, photoUrl, wins, losses, draws, byes,
    winRate, events, totalMatches, topHero, currentStreak, bestFinish,
    bestFinishEvent, recentResults, cardBorder, bestRank, playoffFinishes,
    armoryCount, armoryUndefeated,
  } = data;
  const isWinning = winRate >= 50;
  const rankRing = bestRank ? RANK_RING_COLORS[bestRank] : null;
  const hasTrophies = playoffFinishes && playoffFinishes.length > 0;
  const hasArmory = armoryCount && armoryCount > 0;

  return (
    <div
      style={{
        backgroundColor: t.surface,
        borderColor: cardBorder?.border || t.border,
        boxShadow: cardBorder?.shadow || undefined,
        width: 420,
      }}
      className="border-2 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-2.5 border-b">
        <p style={{ color: t.accent }} className="text-[10px] uppercase tracking-[0.2em] text-center font-bold">Player Stats</p>
      </div>

      <div className="px-5 pt-4 pb-3">
        {/* Player identity row — photo + name + win rate */}
        <div className="flex items-center gap-3 mb-4">
          {/* Photo with rank ring */}
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

          {/* Name + username */}
          <div className="min-w-0 flex-1">
            <p style={{ color: t.text }} className="text-lg font-black truncate leading-tight">{playerName}</p>
            {username && <p style={{ color: t.dim }} className="text-xs">@{username}</p>}
          </div>

          {/* Win rate — compact, top-right */}
          <div className="shrink-0 text-right">
            <p style={{ color: isWinning ? t.win : t.loss }} className="text-2xl font-black leading-tight">{winRate.toFixed(1)}%</p>
            <div style={{ backgroundColor: t.barBg }} className="h-1.5 rounded-full overflow-hidden w-16 ml-auto mt-1">
              <div
                style={{ backgroundColor: isWinning ? t.win : t.loss, width: `${Math.min(winRate, 100)}%` }}
                className="h-full rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Record */}
        <div className="text-center mb-3">
          <p className="text-xl font-black">
            <span style={{ color: t.win }}>{wins}W</span>
            <span style={{ color: t.border }} className="mx-1.5">—</span>
            <span style={{ color: t.loss }}>{losses}L</span>
          </p>
          {(draws > 0 || byes > 0) && (
            <p style={{ color: t.dim }} className="text-[10px] mt-0.5">
              {[
                draws > 0 ? `${draws} draw${draws !== 1 ? "s" : ""}` : "",
                byes > 0 ? `${byes} bye${byes !== 1 ? "s" : ""}` : "",
              ].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Stats grid — 3 col */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2 text-center">
            <p style={{ color: t.muted }} className="text-[9px] uppercase tracking-wider font-semibold">Events</p>
            <p style={{ color: t.text }} className="text-base font-black">{events}</p>
          </div>
          <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2 text-center">
            <p style={{ color: t.muted }} className="text-[9px] uppercase tracking-wider font-semibold">Matches</p>
            <p style={{ color: t.text }} className="text-base font-black">{totalMatches}</p>
          </div>
          <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2 text-center">
            <p style={{ color: t.muted }} className="text-[9px] uppercase tracking-wider font-semibold">Top Hero</p>
            <p style={{ color: t.text }} className="text-xs font-bold truncate mt-0.5">{topHero || "—"}</p>
          </div>
        </div>

        {/* Streak + Best Finish — 2 col */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2 text-center">
            <p style={{ color: t.muted }} className="text-[9px] uppercase tracking-wider font-semibold">Streak</p>
            <p style={{ color: currentStreak?.type === MatchResult.Win ? t.win : currentStreak?.type === MatchResult.Loss ? t.loss : t.dim }} className="text-base font-black">
              {currentStreak ? `${currentStreak.count}${currentStreak.type === MatchResult.Win ? "W" : "L"}` : "—"}
            </p>
          </div>
          <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2 text-center">
            <p style={{ color: t.muted }} className="text-[9px] uppercase tracking-wider font-semibold">Best Finish</p>
            <p style={{ color: bestFinish ? t.accent : t.dim }} className="text-xs font-bold truncate mt-0.5">{bestFinish || "—"}</p>
            {bestFinishEvent && (
              <p style={{ color: t.dim }} className="text-[9px] truncate">{bestFinishEvent}</p>
            )}
          </div>
        </div>

        {/* Trophy Case — compact inline */}
        {hasTrophies && (
          <div style={{ backgroundColor: t.bg }} className="rounded-lg px-3 py-2 mb-3">
            <p style={{ color: t.muted }} className="text-[9px] uppercase tracking-wider font-semibold mb-1.5">Trophy Case</p>
            <div className="flex gap-1 flex-wrap">
              {playoffFinishes!.map((f, i) => {
                const abbr = EVENT_ABBR[f.eventType] || f.eventType.slice(0, 3).toUpperCase();
                return (
                  <div
                    key={i}
                    className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5"
                    style={{ backgroundColor: `${FINISH_COLORS[f.type]}15`, border: `1px solid ${FINISH_COLORS[f.type]}40` }}
                  >
                    <span style={{ color: FINISH_COLORS[f.type] }} className="text-[9px] font-bold">{FINISH_LABELS[f.type]}</span>
                    <span style={{ color: t.dim }} className="text-[8px] font-medium">{abbr}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Armory — compact */}
        {hasArmory && (
          <div style={{ backgroundColor: t.bg }} className="rounded-lg px-3 py-2 mb-3">
            <div className="flex items-center gap-2">
              <p style={{ color: t.muted }} className="text-[9px] uppercase tracking-wider font-semibold">Armory</p>
              <div className="flex items-center gap-1.5">
                {/* Small flower icons */}
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(armoryCount!, 8) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: i < (armoryUndefeated || 0) ? t.win : `${t.accent}60`,
                      }}
                    />
                  ))}
                  {armoryCount! > 8 && (
                    <span style={{ color: t.dim }} className="text-[9px] font-medium ml-0.5">+{armoryCount! - 8}</span>
                  )}
                </div>
                <span style={{ color: t.dim }} className="text-[9px]">
                  {armoryCount} event{armoryCount !== 1 ? "s" : ""}
                  {armoryUndefeated ? ` · ${armoryUndefeated} undefeated` : ""}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Recent form */}
        {recentResults.length > 0 && (
          <div>
            <p style={{ color: t.muted }} className="text-[9px] mb-1.5 text-center uppercase tracking-wider font-semibold">Recent Form</p>
            <div className="flex gap-1 justify-center flex-wrap">
              {recentResults.map((r, i) => (
                <div
                  key={i}
                  style={{ backgroundColor: r === MatchResult.Win ? t.win : r === MatchResult.Loss ? t.loss : r === MatchResult.Bye ? t.dim : t.draw }}
                  className="w-3 h-3 rounded-full"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-2 border-t">
        <p style={{ color: t.accent }} className="text-[10px] text-center tracking-wider font-semibold opacity-70">fabstats.net</p>
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

  async function handleCopy() {
    const profileUrl = data.username
      ? `${window.location.origin}/player/${data.username}`
      : window.location.origin;
    const shareText = `${data.playerName} — ${data.winRate.toFixed(1)}% win rate across ${data.totalMatches} matches\n${profileUrl}`;

    setShareStatus("sharing");
    try {
      const blob = cardRef.current
        ? await toBlob(cardRef.current, { pixelRatio: 2, backgroundColor: selectedTheme.bg })
        : null;

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

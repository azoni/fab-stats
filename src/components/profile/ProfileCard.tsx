"use client";
import { useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { MatchResult } from "@/types";
import { CARD_THEMES, type CardTheme } from "@/components/opponents/RivalryCard";

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
  recentResults: MatchResult[];
}

export function ProfileCard({ data, theme }: { data: ProfileCardData; theme?: CardTheme }) {
  const t = theme || CARD_THEMES[0];
  const {
    playerName, username, photoUrl, wins, losses, draws, byes,
    winRate, events, totalMatches, topHero, currentStreak, bestFinish, recentResults,
  } = data;
  const isWinning = winRate >= 50;

  return (
    <div style={{ backgroundColor: t.surface, borderColor: t.border, width: 420 }} className="border rounded-xl overflow-hidden">
      {/* Header */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-3 border-b">
        <p style={{ color: t.accent }} className="text-[11px] uppercase tracking-[0.2em] text-center font-bold">Player Stats</p>
      </div>

      <div className="px-5 pt-5 pb-4">
        {/* Player identity */}
        <div className="flex items-center gap-3 mb-4">
          {photoUrl ? (
            <img src={photoUrl} alt="" style={{ borderColor: t.accent }} className="w-14 h-14 rounded-full border-2" crossOrigin="anonymous" />
          ) : (
            <div style={{ backgroundColor: `${t.accent}20`, borderColor: `${t.accent}60`, color: t.accent }} className="w-14 h-14 rounded-full border-2 flex items-center justify-center text-2xl font-black shrink-0">
              {playerName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p style={{ color: t.text }} className="text-xl font-black truncate">{playerName}</p>
            {username && <p style={{ color: t.dim }} className="text-xs">@{username}</p>}
          </div>
        </div>

        {/* Win rate */}
        <div style={{ backgroundColor: t.bg }} className="rounded-lg p-4 mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <p style={{ color: t.muted }} className="text-[10px] uppercase tracking-wider font-semibold">Win Rate</p>
            <p style={{ color: isWinning ? t.win : t.loss }} className="text-3xl font-black">{winRate.toFixed(1)}%</p>
          </div>
          <div style={{ backgroundColor: t.barBg }} className="h-2.5 rounded-full overflow-hidden">
            <div
              style={{ backgroundColor: isWinning ? t.win : t.loss, width: `${Math.min(winRate, 100)}%` }}
              className="h-full rounded-full"
            />
          </div>
        </div>

        {/* Record */}
        <div className="text-center mb-4">
          <p className="text-2xl font-black">
            <span style={{ color: t.win }}>{wins}W</span>
            <span style={{ color: t.border }} className="mx-2">—</span>
            <span style={{ color: t.loss }}>{losses}L</span>
          </p>
          {(draws > 0 || byes > 0) && (
            <p style={{ color: t.dim }} className="text-xs mt-1">
              {[
                draws > 0 ? `${draws} draw${draws !== 1 ? "s" : ""}` : "",
                byes > 0 ? `${byes} bye${byes !== 1 ? "s" : ""}` : "",
              ].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2.5 text-center">
            <p style={{ color: t.muted }} className="text-[10px] uppercase tracking-wider font-semibold mb-0.5">Events</p>
            <p style={{ color: t.text }} className="text-lg font-black">{events}</p>
          </div>
          <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2.5 text-center">
            <p style={{ color: t.muted }} className="text-[10px] uppercase tracking-wider font-semibold mb-0.5">Matches</p>
            <p style={{ color: t.text }} className="text-lg font-black">{totalMatches}</p>
          </div>
          <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2.5 text-center">
            <p style={{ color: t.muted }} className="text-[10px] uppercase tracking-wider font-semibold mb-0.5">Top Hero</p>
            <p style={{ color: t.text }} className="text-sm font-bold truncate">{topHero || "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2.5 text-center">
            <p style={{ color: t.muted }} className="text-[10px] uppercase tracking-wider font-semibold mb-0.5">Streak</p>
            <p style={{ color: currentStreak?.type === MatchResult.Win ? t.win : currentStreak?.type === MatchResult.Loss ? t.loss : t.dim }} className="text-lg font-black">
              {currentStreak ? `${currentStreak.count}${currentStreak.type === MatchResult.Win ? "W" : "L"}` : "—"}
            </p>
          </div>
          <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2.5 text-center">
            <p style={{ color: t.muted }} className="text-[10px] uppercase tracking-wider font-semibold mb-0.5">Best Finish</p>
            <p style={{ color: bestFinish ? t.accent : t.dim }} className="text-sm font-bold truncate">{bestFinish || "—"}</p>
          </div>
        </div>

        {/* Recent form */}
        {recentResults.length > 0 && (
          <div>
            <p style={{ color: t.muted }} className="text-[10px] mb-2 text-center uppercase tracking-wider font-semibold">Recent Form</p>
            <div className="flex gap-1.5 justify-center flex-wrap">
              {recentResults.map((r, i) => (
                <div
                  key={i}
                  style={{ backgroundColor: r === MatchResult.Win ? t.win : r === MatchResult.Loss ? t.loss : r === MatchResult.Bye ? t.dim : t.draw }}
                  className="w-3.5 h-3.5 rounded-full"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-2.5 border-t">
        <p style={{ color: t.accent }} className="text-[11px] text-center tracking-wider font-semibold opacity-70">fabstats.net</p>
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

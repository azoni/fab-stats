"use client";
import { useRef, useState } from "react";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";
import { logActivity } from "@/lib/activity-log";
import { OrnamentalDivider, CornerFiligree, CardBackgroundPattern, InnerVignette } from "@/components/share/CardOrnaments";

export interface TrendsShareData {
  playerName: string;
  totalMatches: number;
  winRate: number;
  wins: number;
  losses: number;
  draws: number;
  longestWinStreak: number;
  eventsPlayed: number;
  uniqueHeroes: number;
  topHero?: { name: string; winRate: number; matches: number };
  recentTrend?: number;
}

const GOLD = "#c9a84c";

function ShareCardInner({ data }: { data: TrendsShareData }) {
  return (
    <div className="relative bg-[#0e0c08] rounded-lg p-5 border border-fab-border overflow-hidden" style={{ width: 380 }}>
      <CardBackgroundPattern color={GOLD} id="trends-share" />
      <InnerVignette />
      <CornerFiligree color={GOLD} />

      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#c9a84c]/60 mb-1">My Stats</p>
          <p className="text-lg font-bold text-[#e5e5e5]">{data.playerName}</p>
        </div>

        <OrnamentalDivider color={GOLD} />

        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-3 my-4 text-center">
          <div>
            <p className="text-2xl font-black text-[#c9a84c]">{data.totalMatches}</p>
            <p className="text-[9px] uppercase tracking-wider text-[#888899]">Matches</p>
          </div>
          <div>
            <p className={`text-2xl font-black ${data.winRate >= 50 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>{data.winRate}%</p>
            <p className="text-[9px] uppercase tracking-wider text-[#888899]">Win Rate</p>
          </div>
          <div>
            <p className="text-2xl font-black text-[#c9a84c]">{data.eventsPlayed}</p>
            <p className="text-[9px] uppercase tracking-wider text-[#888899]">Events</p>
          </div>
        </div>

        {/* Record */}
        <div className="text-center mb-3">
          <p className="text-sm tabular-nums">
            <span className="text-[#22c55e] font-bold">{data.wins}W</span>
            <span className="text-[#888899]"> - </span>
            <span className="text-[#ef4444] font-bold">{data.losses}L</span>
            {data.draws > 0 && (
              <>
                <span className="text-[#888899]"> - </span>
                <span className="text-[#eab308] font-bold">{data.draws}D</span>
              </>
            )}
          </p>
        </div>

        <OrnamentalDivider color={GOLD} />

        {/* Details */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 my-4 text-[11px]">
          <div className="flex justify-between">
            <span className="text-[#888899]">Win Streak</span>
            <span className="text-[#22c55e] font-bold">{data.longestWinStreak}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#888899]">Heroes Played</span>
            <span className="text-[#e5e5e5] font-bold">{data.uniqueHeroes}</span>
          </div>
          {data.topHero && (
            <div className="flex justify-between col-span-2">
              <span className="text-[#888899]">Top Hero</span>
              <span className="text-[#e5e5e5] font-bold">
                {data.topHero.name}{" "}
                <span className={data.topHero.winRate >= 50 ? "text-[#22c55e]" : "text-[#ef4444]"}>
                  ({data.topHero.winRate}% in {data.topHero.matches})
                </span>
              </span>
            </div>
          )}
          {data.recentTrend !== undefined && data.recentTrend !== 0 && (
            <div className="flex justify-between col-span-2">
              <span className="text-[#888899]">Recent Trend</span>
              <span className={`font-bold ${data.recentTrend > 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                {data.recentTrend > 0 ? "+" : ""}{data.recentTrend}% vs all-time
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-3">
          <p className="text-[8px] uppercase tracking-[0.15em] text-[#888899]/50">fabstats.com</p>
        </div>
      </div>
    </div>
  );
}

export function TrendsShareModal({ data, onClose }: { data: TrendsShareData; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "downloaded">("idle");

  async function handleCopy() {
    if (!cardRef.current) return;
    setStatus("copying");
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `my-stats-${data.playerName}.png`,
      shareTitle: "My FaB Stats",
      shareText: `${data.playerName} — ${data.totalMatches} matches, ${data.winRate}% win rate | fabstats.com`,
      fallbackText: `${data.playerName} — ${data.totalMatches} matches, ${data.winRate}% WR | fabstats.com`,
    });
    setStatus(result === "failed" ? "idle" : "copied");
    if (result !== "failed") {
      logActivity("trends_share");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  async function handleDownload() {
    if (!cardRef.current) return;
    await downloadCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `my-stats-${data.playerName}.png`,
    });
    logActivity("trends_share");
    setStatus("downloaded");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl max-w-md w-full p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fab-text">Share My Stats</h3>
          <button onClick={onClose} className="text-fab-dim hover:text-fab-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div ref={cardRef} className="flex justify-center">
          <ShareCardInner data={data} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            disabled={status === "copying"}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-fab-gold/15 text-fab-gold text-sm font-medium hover:bg-fab-gold/25 transition-colors disabled:opacity-50"
          >
            {status === "copied" ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Copied!
              </>
            ) : status === "copying" ? (
              "Copying..."
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-fab-surface border border-fab-border text-fab-text text-sm font-medium hover:bg-fab-surface-hover transition-colors"
          >
            {status === "downloaded" ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Saved!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

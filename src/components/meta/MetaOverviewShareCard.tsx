"use client";
import { useRef, useState, useMemo } from "react";
import type { HeroMetaStats, CommunityOverview } from "@/lib/meta-stats";
import { FINISH_THEMES, type FinishTheme } from "@/components/profile/BestFinishCard";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";
import { logActivity } from "@/lib/activity-log";
import { CornerFiligree, OrnamentalDivider, CardBackgroundPattern, AccentTopBar, InnerVignette } from "@/components/share/CardOrnaments";

const SEGMENT_COLORS = [
  "#c9a84c", "#60a5fa", "#f87171", "#34d399", "#a78bfa",
  "#fb923c", "#22d3ee", "#f472b6", "#facc15", "#818cf8",
  "#4ade80", "#e879f9", "#2dd4bf", "#fca5a5", "#93c5fd",
];

interface DonutSegment {
  hero: string;
  percent: number;
  color: string;
  matches: number;
}

function buildOverviewSegments(heroes: HeroMetaStats[], maxSegments = 10): DonutSegment[] {
  const totalMatches = heroes.reduce((sum, h) => sum + h.totalMatches, 0);
  if (totalMatches === 0) return [];

  const top = heroes.slice(0, maxSegments);
  const otherMatches = heroes.slice(maxSegments).reduce((sum, h) => sum + h.totalMatches, 0);

  const segments: DonutSegment[] = top.map((h, i) => ({
    hero: h.hero,
    percent: h.metaShare,
    color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
    matches: h.totalMatches,
  }));

  if (otherMatches > 0) {
    segments.push({
      hero: "Other Heroes",
      percent: totalMatches > 0 ? (otherMatches / totalMatches) * 100 : 0,
      color: "#4b5563",
      matches: otherMatches,
    });
  }

  return segments;
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const sweep = Math.min(endAngle - startAngle, 359.99);
  const endA = startAngle + sweep;
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endA - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function OverviewDonut({ segments, size = 160, strokeWidth = 26 }: { segments: DonutSegment[]; size?: number; strokeWidth?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  let currentAngle = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg) => {
        const sweep = (seg.percent / 100) * 360;
        const path = describeArc(cx, cy, r, currentAngle, currentAngle + sweep);
        currentAngle += sweep;
        return (
          <path key={seg.hero} d={path} fill="none" stroke={seg.color} strokeWidth={strokeWidth} strokeLinecap="butt" />
        );
      })}
    </svg>
  );
}

// ── Card Component ──

interface MetaOverviewCardProps {
  overview: CommunityOverview;
  heroStats: HeroMetaStats[];
  title: string;
  subtitle?: string;
  theme?: FinishTheme;
}

function MetaOverviewCard({ overview, heroStats, title, subtitle, theme }: MetaOverviewCardProps) {
  const t = theme || FINISH_THEMES[0];
  const segments = useMemo(() => buildOverviewSegments(heroStats), [heroStats]);

  return (
    <div style={{ backgroundColor: t.surface, borderColor: t.border, width: 440 }} className="border-2 rounded-xl overflow-hidden relative">
      <CardBackgroundPattern color={t.accent} id="meta-overview" opacity={0.04} />
      <InnerVignette opacity={0.2} />
      <CornerFiligree color={t.accent} opacity={0.18} />
      <AccentTopBar color={t.accent} />

      {/* Header */}
      <div className="px-5 pt-4 pb-2 text-center relative">
        <p style={{ color: t.accent }} className="text-[11px] uppercase tracking-[0.25em] font-black">
          Community Meta
        </p>
        <p style={{ color: t.text }} className="text-base font-bold mt-1 leading-tight">{title}</p>
        {subtitle && (
          <p style={{ color: t.dim }} className="text-[11px] mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Overview stats */}
      <div className="flex justify-center gap-6 px-5 pb-3 relative">
        <div className="text-center">
          <p style={{ color: t.text }} className="text-xl font-black leading-none">{overview.totalPlayers}</p>
          <p style={{ color: t.dim }} className="text-[9px] uppercase tracking-wider font-semibold mt-0.5">Players</p>
        </div>
        <div className="text-center">
          <p style={{ color: t.text }} className="text-xl font-black leading-none">{overview.totalMatches.toLocaleString()}</p>
          <p style={{ color: t.dim }} className="text-[9px] uppercase tracking-wider font-semibold mt-0.5">Matches</p>
        </div>
        <div className="text-center">
          <p style={{ color: t.text }} className="text-xl font-black leading-none">{overview.totalHeroes}</p>
          <p style={{ color: t.dim }} className="text-[9px] uppercase tracking-wider font-semibold mt-0.5">Heroes</p>
        </div>
        <div className="text-center">
          <p style={{ color: t.text }} className="text-xl font-black leading-none">{overview.avgWinRate.toFixed(1)}%</p>
          <p style={{ color: t.dim }} className="text-[9px] uppercase tracking-wider font-semibold mt-0.5">Avg WR</p>
        </div>
      </div>

      {/* Donut + Legend */}
      <div style={{ borderColor: t.border }} className="border-t mx-5 pt-3 pb-3">
        <p style={{ color: t.dim }} className="text-[9px] uppercase tracking-wider font-semibold mb-2">Hero Distribution</p>
        <div className="flex items-center gap-4">
          <div className="shrink-0 relative">
            <OverviewDonut segments={segments} size={140} strokeWidth={22} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p style={{ color: t.text }} className="text-lg font-black leading-none">{overview.totalHeroes}</p>
              <p style={{ color: t.muted }} className="text-[9px] uppercase tracking-wider font-bold mt-0.5">Heroes</p>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            {segments.map((seg) => (
              <div key={seg.hero} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                <span style={{ color: t.text }} className="text-[11px] font-medium truncate flex-1">{seg.hero}</span>
                <span style={{ color: t.muted }} className="text-[10px] font-bold shrink-0 tabular-nums">{seg.matches}</span>
                <span style={{ color: t.dim }} className="text-[9px] shrink-0 tabular-nums w-10 text-right">{seg.percent.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <OrnamentalDivider color={t.accent} className="mx-3" />
      <div style={{ backgroundColor: t.bg }} className="px-5 py-1.5 relative">
        <p style={{ color: t.accent, opacity: 0.5 }} className="text-[10px] tracking-wider font-semibold">fabstats.net</p>
      </div>
    </div>
  );
}

// ── Share Modal ──

interface MetaOverviewShareModalProps {
  overview: CommunityOverview;
  heroStats: HeroMetaStats[];
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export function MetaOverviewShareModal({ overview, heroStats, title, subtitle, onClose }: MetaOverviewShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedTheme, setSelectedTheme] = useState(FINISH_THEMES[0]);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "text-copied" | "sharing">("idle");

  async function handleCopy() {
    const shareText = `${title} — Community Meta on FaB Stats`;
    logActivity("meta_share");
    setShareStatus("sharing");
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: selectedTheme.bg, fileName: "fab-meta-overview.png",
      shareTitle: "FaB Stats — Community Meta", shareText, fallbackText: shareText,
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
    logActivity("meta_share");
    setShareStatus("sharing");
    await downloadCardImage(cardRef.current, { backgroundColor: selectedTheme.bg, fileName: "fab-meta-overview.png" });
    setShareStatus("idle");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl max-w-lg w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
          <h3 className="text-sm font-semibold text-fab-text">Share Meta Overview</h3>
          <button onClick={onClose} className="text-fab-muted hover:text-fab-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 flex justify-center overflow-x-auto">
          <div ref={cardRef}>
            <MetaOverviewCard overview={overview} heroStats={heroStats} title={title} subtitle={subtitle} theme={selectedTheme} />
          </div>
        </div>

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

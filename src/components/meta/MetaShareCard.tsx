"use client";
import { useRef, useState, useMemo } from "react";
import { getHeroByName } from "@/lib/heroes";
import type { Top8HeroMeta } from "@/lib/meta-stats";
import { FINISH_THEMES, type FinishTheme } from "@/components/profile/BestFinishCard";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";
import { logActivity } from "@/lib/activity-log";
import { buildOptimizedImageUrl, resolveBackgroundPositionForImage } from "@/lib/profile-backgrounds";
import { CornerFiligree, OrnamentalDivider, CardBackgroundPattern, AccentTopBar, InnerVignette } from "@/components/share/CardOrnaments";

// ── Donut chart colors — distinct, vibrant palette for hero segments ──

const SEGMENT_COLORS = [
  "#c9a84c", // gold
  "#60a5fa", // blue
  "#f87171", // red
  "#34d399", // green
  "#a78bfa", // purple
  "#fb923c", // orange
  "#22d3ee", // cyan
  "#f472b6", // pink
  "#facc15", // yellow
  "#818cf8", // indigo
  "#4ade80", // lime
  "#e879f9", // fuchsia
  "#2dd4bf", // teal
  "#fca5a5", // light red
  "#93c5fd", // light blue
];

interface DonutSegment {
  hero: string;
  count: number;
  percent: number;
  color: string;
}

export function buildSegments(heroes: Top8HeroMeta[], maxSegments = 12): DonutSegment[] {
  const total = heroes.reduce((sum, h) => sum + h.count, 0);
  if (total === 0) return [];

  const top = heroes.slice(0, maxSegments);
  const otherCount = heroes.slice(maxSegments).reduce((sum, h) => sum + h.count, 0);

  const segments: DonutSegment[] = top.map((h, i) => ({
    hero: h.hero,
    count: h.count,
    percent: (h.count / total) * 100,
    color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
  }));

  if (otherCount > 0) {
    segments.push({
      hero: "Other Heroes",
      count: otherCount,
      percent: (otherCount / total) * 100,
      color: "#4b5563", // gray
    });
  }

  return segments;
}

/** Build SVG donut arc path */
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  // Clamp to avoid full-circle issues
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

export function DonutChart({ segments, size = 200, strokeWidth = 32 }: { segments: DonutSegment[]; size?: number; strokeWidth?: number }) {
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
          <path
            key={seg.hero}
            d={path}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />
        );
      })}
    </svg>
  );
}

// ── Card Component ──

interface MetaShareCardProps {
  heroes: Top8HeroMeta[];
  title: string;
  subtitle?: string;
  theme?: FinishTheme;
}

export function MetaShareCard({ heroes, title, subtitle, theme }: MetaShareCardProps) {
  const t = theme || FINISH_THEMES[0];
  const segments = useMemo(() => buildSegments(heroes), [heroes]);
  const total = heroes.reduce((sum, h) => sum + h.count, 0);

  return (
    <div style={{ backgroundColor: t.surface, borderColor: t.border, width: 440 }} className="border-2 rounded-xl overflow-hidden relative">
      {t.backgroundImage && (
        <>
          <img
            src={buildOptimizedImageUrl(t.backgroundImage, 1200, 62)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: resolveBackgroundPositionForImage(t.backgroundImage) }}
            loading="eager"
            decoding="async"
            crossOrigin="anonymous"
          />
          <div className="absolute inset-0" style={{ backgroundColor: `${t.surface}B8` }} />
        </>
      )}
      {/* Background pattern + vignette */}
      <CardBackgroundPattern color={t.accent} id="meta" opacity={0.04} />
      <InnerVignette opacity={0.2} />
      {/* Corner filigree */}
      <CornerFiligree color={t.accent} opacity={0.18} />
      {/* Accent bar */}
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

      {/* Donut + Legend */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-4">
          {/* Donut chart */}
          <div className="shrink-0 relative">
            <DonutChart segments={segments} size={160} strokeWidth={26} />
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p style={{ color: t.text }} className="text-2xl font-black leading-none">{total}</p>
              <p style={{ color: t.muted }} className="text-[10px] uppercase tracking-wider font-bold mt-0.5">Top 8s</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 min-w-0 space-y-0.5">
            {segments.map((seg) => (
              <div key={seg.hero} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                <span style={{ color: t.text }} className="text-[11px] font-medium truncate flex-1">{seg.hero}</span>
                <span style={{ color: t.muted }} className="text-[10px] font-bold shrink-0 tabular-nums">{seg.count}</span>
                <span style={{ color: t.dim }} className="text-[9px] shrink-0 tabular-nums w-8 text-right">{seg.percent.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 heroes by wins */}
      {heroes.length > 0 && (() => {
        const topWinners = [...heroes]
          .filter((h) => h.champions > 0)
          .sort((a, b) => b.champions - a.champions)
          .slice(0, 5);
        return topWinners.length > 0 ? (
          <div style={{ borderColor: t.border }} className="border-t mx-5 py-2">
            <p style={{ color: t.dim }} className="text-[9px] uppercase tracking-wider font-semibold mb-1">Most Wins</p>
            <div className="space-y-0.5">
              {topWinners.map((h, i) => (
                <div key={h.hero} className="flex items-center justify-between">
                  <span style={{ color: i === 0 ? t.trophy : t.text }} className={`text-[11px] ${i === 0 ? "font-bold" : "font-medium"}`}>{h.hero}</span>
                  <span style={{ color: t.muted }} className="text-[10px] tabular-nums">{h.champions}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Footer */}
      <OrnamentalDivider color={t.accent} className="mx-3" />
      <div style={{ backgroundColor: t.backgroundImage ? `${t.bg}CC` : t.bg }} className="px-5 py-1.5 relative">
        <p style={{ color: t.accent, opacity: 0.5 }} className="text-[10px] tracking-wider font-semibold">fabstats.net</p>
      </div>
    </div>
  );
}

// ── Share Modal ──

interface MetaShareModalProps {
  heroes: Top8HeroMeta[];
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export function MetaShareModal({ heroes, title, subtitle, onClose }: MetaShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedTheme, setSelectedTheme] = useState(FINISH_THEMES[0]);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "text-copied" | "sharing">("idle");

  async function handleCopy() {
    const shareText = `${title} — Community Meta on FaB Stats`;

    logActivity("meta_share");
    setShareStatus("sharing");
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: selectedTheme.bg, fileName: "fab-meta.png",
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
    await downloadCardImage(cardRef.current, { backgroundColor: selectedTheme.bg, fileName: "fab-meta.png" });
    setShareStatus("idle");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl max-w-lg w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
          <h3 className="text-sm font-semibold text-fab-text">Share Meta</h3>
          <button onClick={onClose} className="text-fab-muted hover:text-fab-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card preview */}
        <div className="p-4 flex justify-center overflow-x-auto">
          <div ref={cardRef}>
            <MetaShareCard heroes={heroes} title={title} subtitle={subtitle} theme={selectedTheme} />
          </div>
        </div>

        {/* Theme picker */}
        <div className="px-4 pb-3">
          <p className="text-[10px] text-fab-muted uppercase tracking-wider font-medium mb-2">Theme</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {FINISH_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className={`rounded-lg p-2 text-center transition-all border ${
                  selectedTheme.id === theme.id
                    ? "border-fab-gold ring-1 ring-fab-gold/30"
                    : "border-fab-border hover:border-fab-muted"
                }`}
              >
                <div className="h-8 rounded-md overflow-hidden border border-white/10 mb-1.5 relative">
                  {theme.backgroundImage ? (
                    <>
                      <img
                        src={buildOptimizedImageUrl(theme.backgroundImage, 260, 46)}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ objectPosition: resolveBackgroundPositionForImage(theme.backgroundImage) }}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        crossOrigin="anonymous"
                      />
                      <div className="absolute inset-0" style={{ backgroundColor: `${theme.surface}99` }} />
                    </>
                  ) : (
                    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.bg}, ${theme.surface})` }} />
                  )}
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: theme.accent }} />
                </div>
                <p className="text-[10px] text-fab-muted leading-tight">{theme.label}</p>
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

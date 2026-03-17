"use client";
import { useMemo, useRef, useState } from "react";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";
import { logActivity } from "@/lib/activity-log";
import { buildOptimizedImageUrl, resolveBackgroundPositionForImage } from "@/lib/profile-backgrounds";
import { OrnamentalDivider, CornerFiligree, CardBackgroundPattern, InnerVignette } from "@/components/share/CardOrnaments";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileBackgroundCatalog } from "@/hooks/useProfileBackgroundCatalog";
import { appendCatalogBackgroundThemes } from "@/lib/catalog-share-themes";

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

interface TrendsTheme {
  id: string;
  label: string;
  bg: string;
  surface: string;
  border: string;
  accent: string;
  text: string;
  muted: string;
  dim: string;
  win: string;
  loss: string;
  draw: string;
  backgroundImage?: string;
}

const TRENDS_THEMES: TrendsTheme[] = [
  {
    id: "classic",
    label: "Classic",
    bg: "#0e0c08",
    surface: "#15120b",
    border: "#3e3528",
    accent: "#c9a84c",
    text: "#e5e5e5",
    muted: "#888899",
    dim: "#6b6050",
    win: "#22c55e",
    loss: "#ef4444",
    draw: "#eab308",
  },
  {
    id: "wtr",
    label: "Rathe",
    bg: "#0a0604",
    surface: "#1a100a",
    border: "#3d2510",
    accent: "#f59e0b",
    text: "#fff3da",
    muted: "#a8845a",
    dim: "#6b5330",
    win: "#4ade80",
    loss: "#f87171",
    draw: "#facc15",
    backgroundImage: "/backgrounds/fab-official/wtr-key-art-v1.jpg",
  },
  {
    id: "arcane",
    label: "Arcane",
    bg: "#06030c",
    surface: "#120e1c",
    border: "#2a1f4a",
    accent: "#8b5cf6",
    text: "#ede9fe",
    muted: "#7c6b9b",
    dim: "#4c3d6e",
    win: "#34d399",
    loss: "#fb7185",
    draw: "#a1a1aa",
    backgroundImage: "/backgrounds/fab-official/arcane-rising-key-art.jpg",
  },
  {
    id: "cindra",
    label: "Cindra",
    bg: "#0a0404",
    surface: "#1a0808",
    border: "#3a1015",
    accent: "#ef4444",
    text: "#fef2f2",
    muted: "#9b6060",
    dim: "#5c2525",
    win: "#4ade80",
    loss: "#fda4af",
    draw: "#facc15",
    backgroundImage: "/backgrounds/fab-official/hunted-cindra-adult.jpg",
  },
  {
    id: "gravybones",
    label: "Gravy Bones",
    bg: "#060810",
    surface: "#0e1218",
    border: "#1a2e42",
    accent: "#38bdf8",
    text: "#e0f2fe",
    muted: "#5a8aaa",
    dim: "#2e5570",
    win: "#4ade80",
    loss: "#fca5a5",
    draw: "#facc15",
    backgroundImage: "/backgrounds/fab-official/high-seas-gravybones.jpg",
  },
  {
    id: "aria",
    label: "Aria",
    bg: "#040a08",
    surface: "#081210",
    border: "#1a3520",
    accent: "#10b981",
    text: "#ecfdf5",
    muted: "#5f8a6e",
    dim: "#3b5c44",
    win: "#6ee7b7",
    loss: "#fca5a5",
    draw: "#a1a1aa",
    backgroundImage: "/backgrounds/fab-official/tales-of-aria-key-art.jpg",
  },
  {
    id: "playmat-solana",
    label: "Solana Playmat",
    bg: "#1a1408",
    surface: "#241b0c",
    border: "#5b4520",
    accent: "#f5d26c",
    text: "#fff6dc",
    muted: "#b9a678",
    dim: "#8a7750",
    win: "#86efac",
    loss: "#fda4af",
    draw: "#c4b5fd",
    backgroundImage: "/backgrounds/fab-official/lore-solana-matte.jpg",
  },
  {
    id: "playmat-volcor",
    label: "Volcor Playmat",
    bg: "#1a0c08",
    surface: "#24120f",
    border: "#5b2f20",
    accent: "#fb923c",
    text: "#fff2eb",
    muted: "#c08d78",
    dim: "#875c4d",
    win: "#86efac",
    loss: "#fda4af",
    draw: "#a1a1aa",
    backgroundImage: "/backgrounds/fab-official/lore-volcor-matte.jpg",
  },
];

function ShareCardInner({ data, theme }: { data: TrendsShareData; theme: TrendsTheme }) {
  const t = theme;
  return (
    <div
      className="relative rounded-lg p-5 border overflow-hidden"
      style={{ width: 380, backgroundColor: t.surface, borderColor: t.border }}
    >
      {t.backgroundImage && (
        <>
          <img
            src={buildOptimizedImageUrl(t.backgroundImage, 960, 60)}
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

      <CardBackgroundPattern color={t.accent} id="trends-share" />
      <InnerVignette />
      <CornerFiligree color={t.accent} />

      <div className="relative z-10">
        <div className="text-center mb-3">
          <p className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: `${t.accent}99` }}>My Stats</p>
          <p className="text-lg font-bold" style={{ color: t.text }}>{data.playerName}</p>
        </div>

        <OrnamentalDivider color={t.accent} />

        <div className="grid grid-cols-3 gap-3 my-4 text-center">
          <div>
            <p className="text-2xl font-black" style={{ color: t.accent }}>{data.totalMatches}</p>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: t.muted }}>Matches</p>
          </div>
          <div>
            <p className="text-2xl font-black" style={{ color: data.winRate >= 50 ? t.win : t.loss }}>{data.winRate}%</p>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: t.muted }}>Win Rate</p>
          </div>
          <div>
            <p className="text-2xl font-black" style={{ color: t.accent }}>{data.eventsPlayed}</p>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: t.muted }}>Events</p>
          </div>
        </div>

        <div className="text-center mb-3 text-sm tabular-nums">
          <span className="font-bold" style={{ color: t.win }}>{data.wins}W</span>
          <span style={{ color: t.muted }}> - </span>
          <span className="font-bold" style={{ color: t.loss }}>{data.losses}L</span>
          {data.draws > 0 && (
            <>
              <span style={{ color: t.muted }}> - </span>
              <span className="font-bold" style={{ color: t.draw }}>{data.draws}D</span>
            </>
          )}
        </div>

        <OrnamentalDivider color={t.accent} />

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 my-4 text-[11px]">
          <div className="flex justify-between">
            <span style={{ color: t.muted }}>Win Streak</span>
            <span className="font-bold" style={{ color: t.win }}>{data.longestWinStreak}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: t.muted }}>Heroes Played</span>
            <span className="font-bold" style={{ color: t.text }}>{data.uniqueHeroes}</span>
          </div>
          {data.topHero && (
            <div className="flex justify-between col-span-2">
              <span style={{ color: t.muted }}>Top Hero</span>
              <span className="font-bold" style={{ color: t.text }}>
                {data.topHero.name}{" "}
                <span style={{ color: data.topHero.winRate >= 50 ? t.win : t.loss }}>
                  ({data.topHero.winRate}% in {data.topHero.matches})
                </span>
              </span>
            </div>
          )}
          {data.recentTrend !== undefined && data.recentTrend !== 0 && (
            <div className="flex justify-between col-span-2">
              <span style={{ color: t.muted }}>Recent Trend</span>
              <span className="font-bold" style={{ color: data.recentTrend > 0 ? t.win : t.loss }}>
                {data.recentTrend > 0 ? "+" : ""}{data.recentTrend}% vs all-time
              </span>
            </div>
          )}
        </div>

        <div className="text-center mt-3">
          <p className="text-[8px] uppercase tracking-[0.15em]" style={{ color: `${t.muted}88` }}>fabstats.com</p>
        </div>
      </div>
    </div>
  );
}

export function TrendsShareModal({ data, onClose }: { data: TrendsShareData; onClose: () => void }) {
  const { isAdmin } = useAuth();
  const { options: backgroundOptions } = useProfileBackgroundCatalog(Boolean(isAdmin));
  const cardRef = useRef<HTMLDivElement>(null);
  const themeOptions = useMemo(
    () => appendCatalogBackgroundThemes(TRENDS_THEMES, backgroundOptions, (background, index, base) => ({
      ...base,
      id: `catalog-${background.id}-${index}`,
      label: background.label,
      backgroundImage: background.imageUrl,
    })),
    [backgroundOptions],
  );
  const [selectedThemeId, setSelectedThemeId] = useState(TRENDS_THEMES[0].id);
  const selectedTheme = useMemo(
    () => themeOptions.find((theme) => theme.id === selectedThemeId) || themeOptions[0] || TRENDS_THEMES[0],
    [themeOptions, selectedThemeId],
  );
  const [themeQuery, setThemeQuery] = useState("");
  const [themeExpanded, setThemeExpanded] = useState(false);
  const [themePage, setThemePage] = useState(1);
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "downloaded">("idle");

  const filteredThemes = useMemo(() => {
    const q = themeQuery.trim().toLowerCase();
    if (!q) return themeOptions;
    return themeOptions.filter((theme) => theme.label.toLowerCase().includes(q) || theme.id.toLowerCase().includes(q));
  }, [themeOptions, themeQuery]);

  const displayedThemes = useMemo(() => {
    if (!themeExpanded) return filteredThemes.slice(0, 12);
    return filteredThemes.slice(0, themePage * 24);
  }, [filteredThemes, themeExpanded, themePage]);

  async function handleCopy() {
    if (!cardRef.current) return;
    setStatus("copying");
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: selectedTheme.bg,
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
      backgroundColor: selectedTheme.bg,
      fileName: `my-stats-${data.playerName}.png`,
    });
    logActivity("trends_share");
    setStatus("downloaded");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl max-w-lg w-full p-3 sm:p-4 space-y-2 sm:space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fab-text">Share My Stats</h3>
          <button onClick={onClose} className="text-fab-dim hover:text-fab-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div ref={cardRef} className="flex justify-center overflow-x-auto">
          <ShareCardInner data={data} theme={selectedTheme} />
        </div>

        <div>
          <p className="text-[10px] text-fab-muted uppercase tracking-wider font-medium mb-2">Theme</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            <input
              type="text"
              value={themeQuery}
              onChange={(e) => {
                setThemeQuery(e.target.value);
                setThemePage(1);
              }}
              placeholder="Search backgrounds..."
              className="col-span-3 sm:col-span-4 bg-fab-surface border border-fab-border text-fab-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
            />
            {displayedThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedThemeId(theme.id)}
                className={`rounded-lg p-2 text-center transition-all border ${
                  selectedTheme.id === theme.id
                    ? "border-fab-gold ring-1 ring-fab-gold/30"
                    : "border-fab-border hover:border-fab-muted"
                }`}
              >
                <div className="h-12 rounded-md overflow-hidden border border-white/10 mb-1.5 relative bg-fab-bg/70">
                  {theme.backgroundImage ? (
                    <>
                      <img
                        src={buildOptimizedImageUrl(theme.backgroundImage, 360, 48)}
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain"
                        style={{ objectPosition: "center center" }}
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
            {!themeExpanded && filteredThemes.length > 12 && (
              <button
                type="button"
                onClick={() => {
                  setThemeExpanded(true);
                  setThemePage(1);
                }}
                className="col-span-3 sm:col-span-4 text-xs text-fab-gold hover:text-fab-gold-light transition-colors font-medium py-1"
              >
                Show all {filteredThemes.length} backgrounds
              </button>
            )}
            {themeExpanded && (themePage * 24) < filteredThemes.length && (
              <button
                type="button"
                onClick={() => setThemePage((prev) => prev + 1)}
                className="col-span-3 sm:col-span-4 text-xs text-fab-gold hover:text-fab-gold-light transition-colors font-medium py-1"
              >
                Load more ({Math.min(24, filteredThemes.length - (themePage * 24))})
              </button>
            )}
            {themeExpanded && (
              <button
                type="button"
                onClick={() => setThemeExpanded(false)}
                className="col-span-3 sm:col-span-4 text-xs text-fab-muted hover:text-fab-text transition-colors font-medium py-1"
              >
                Show less
              </button>
            )}
          </div>
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

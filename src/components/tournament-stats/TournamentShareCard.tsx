"use client";
import { useMemo, useRef, useState } from "react";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";
import { logActivity } from "@/lib/activity-log";
import { buildOptimizedImageUrl, resolveBackgroundPositionForImage } from "@/lib/profile-backgrounds";
import { OrnamentalDivider, CornerFiligree, CardBackgroundPattern, InnerVignette } from "@/components/share/CardOrnaments";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileBackgroundCatalog } from "@/hooks/useProfileBackgroundCatalog";
import { appendCatalogBackgroundThemes } from "@/lib/catalog-share-themes";
import { useTeamOnce } from "@/hooks/useTeam";

export interface TournamentShareData {
  playerName: string;
  totalEvents: number;
  totalMatches: number;
  overallWinRate: number;
  r1WinRate: number;
  r1Wins: number;
  r1Losses: number;
  top8Count: number;
  top8Rate: number;
  undefeatedSwissCount: number;
  longestCrossEventWinStreak: number;
  consecutiveTop8s: number;
  consecutiveEventWins: number;
  championCount: number;
  finalistCount: number;
  top4Count: number;
  submarineCount: number;
  filterLabel?: string;
  heroCompletionPct?: number;
  teamName?: string;
  teamIconUrl?: string;
}

interface TournamentTheme {
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
  gold: string;
  backgroundImage?: string;
}

const THEMES: TournamentTheme[] = [
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
    gold: "#fbbf24",
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
    gold: "#fbbf24",
    backgroundImage: "/backgrounds/fab-official/wtr-key-art-v1.webp",
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
    gold: "#fbbf24",
    backgroundImage: "/backgrounds/fab-official/arcane-rising-key-art.webp",
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
    gold: "#fbbf24",
    backgroundImage: "/backgrounds/fab-official/hunted-cindra-adult.webp",
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
    gold: "#fbbf24",
    backgroundImage: "/backgrounds/fab-official/high-seas-gravybones.webp",
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
    gold: "#fbbf24",
    backgroundImage: "/backgrounds/fab-official/tales-of-aria-key-art.webp",
  },
  {
    id: "playmat-solana",
    label: "Solana",
    bg: "#1a1408",
    surface: "#241b0c",
    border: "#5b4520",
    accent: "#f5d26c",
    text: "#fff6dc",
    muted: "#b9a678",
    dim: "#8a7750",
    win: "#86efac",
    loss: "#fda4af",
    gold: "#fbbf24",
    backgroundImage: "/backgrounds/fab-official/lore-solana-matte.webp",
  },
  {
    id: "playmat-volcor",
    label: "Volcor",
    bg: "#1a0c08",
    surface: "#24120f",
    border: "#5b2f20",
    accent: "#fb923c",
    text: "#fff2eb",
    muted: "#c08d78",
    dim: "#875c4d",
    win: "#86efac",
    loss: "#fda4af",
    gold: "#fbbf24",
    backgroundImage: "/backgrounds/fab-official/lore-volcor-matte.webp",
  },
];

function ShareCardInner({ data, theme }: { data: TournamentShareData; theme: TournamentTheme }) {
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
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div className="absolute inset-0" style={{ backgroundColor: `${t.surface}B8` }} />
        </>
      )}

      <CardBackgroundPattern color={t.accent} id="tourney-share" />
      <InnerVignette />
      <CornerFiligree color={t.accent} />

      <div className="relative z-10">
        {/* Header — title + name on same row */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: `${t.accent}99` }}>Tournament Stats</p>
          <span className="flex items-center gap-1.5">
            <p className="text-lg font-bold" style={{ color: t.text }}>{data.playerName}</p>
            {data.teamName && (
              data.teamIconUrl ? (
                <img src={data.teamIconUrl} alt={data.teamName} className="w-4 h-4 rounded-full object-cover border border-white/20" />
              ) : (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-bold border border-white/10 bg-amber-500/60 text-white">{data.teamName.slice(0, 2).toUpperCase()}</span>
              )
            )}
            {data.heroCompletionPct !== undefined && data.heroCompletionPct >= 35 && (
              <svg className="w-4 h-4" style={{ color: data.heroCompletionPct === 100 ? "#fbbf24" : data.heroCompletionPct >= 90 ? "#a78bfa" : data.heroCompletionPct >= 75 ? "#f87171" : data.heroCompletionPct >= 50 ? "#60a5fa" : "#cd7f32" }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.5 13.5l-3.5-3.5 1.41-1.41L10.5 11.67l5.09-5.09L17 8l-6.5 6.5z" />
              </svg>
            )}
          </span>
        </div>

        <OrnamentalDivider color={t.accent} />

        {/* Big 4: Events, Win Rate, Top 8s, R1 WR */}
        <div className="grid grid-cols-4 gap-2 my-3 text-center">
          <div>
            <p className="text-2xl font-black" style={{ color: t.accent }}>{data.totalEvents}</p>
            <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: t.text, opacity: 0.6 }}>Events</p>
          </div>
          <div>
            <p className="text-2xl font-black" style={{ color: data.overallWinRate >= 50 ? t.win : t.loss }}>
              {data.overallWinRate.toFixed(1)}%
            </p>
            <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: t.text, opacity: 0.6 }}>Win Rate</p>
          </div>
          <div>
            <p className="text-2xl font-black" style={{ color: t.gold }}>{data.top8Count}</p>
            <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: t.text, opacity: 0.6 }}>Top 8s</p>
          </div>
          <div>
            <p className="text-2xl font-black" style={{ color: data.r1WinRate >= 50 ? t.win : t.loss }}>
              {Math.round(data.r1WinRate)}%
            </p>
            <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: t.text, opacity: 0.6 }}>R1 WR</p>
          </div>
        </div>

        <OrnamentalDivider color={t.accent} />

        {/* Detail stats */}
        <div className="grid grid-cols-3 gap-3 my-4 text-center">
          <div>
            <p className="text-lg font-black" style={{ color: t.gold }}>{data.championCount || "—"}</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: t.text, opacity: 0.6 }}>Wins</p>
          </div>
          <div>
            <p className="text-lg font-black" style={{ color: t.text }}>{data.finalistCount || "—"}</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: t.text, opacity: 0.6 }}>Finals</p>
          </div>
          <div>
            <p className="text-lg font-black" style={{ color: t.text }}>{data.top4Count || "—"}</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: t.text, opacity: 0.6 }}>Top 4s</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 my-3 text-[11px]">
          <div className="flex justify-between">
            <span style={{ color: t.text, opacity: 0.6 }}>Best Win Streak</span>
            <span className="font-bold" style={{ color: t.win }}>{data.longestCrossEventWinStreak || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: t.text, opacity: 0.6 }}>Top 8 Rate</span>
            <span className="font-bold" style={{ color: t.text }}>{Math.round(data.top8Rate)}%</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: t.text, opacity: 0.6 }}>Undefeated Swiss</span>
            <span className="font-bold" style={{ color: data.undefeatedSwissCount > 0 ? t.win : t.dim }}>
              {data.undefeatedSwissCount || "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: t.text, opacity: 0.6 }}>Submarines</span>
            <span className="font-bold" style={{ color: data.submarineCount > 0 ? t.win : t.dim }}>{data.submarineCount || "—"}</span>
          </div>
          {data.consecutiveEventWins > 0 && (
            <div className="flex justify-between col-span-2">
              <span style={{ color: t.text, opacity: 0.6 }}>Consecutive Wins</span>
              <span className="font-bold" style={{ color: t.gold }}>{data.consecutiveEventWins}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3">
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: t.accent, opacity: 0.5 }}>fabstats.net</p>
          {data.filterLabel && (
            <span className="flex items-center gap-1.5">
              <span style={{ color: t.text, opacity: 0.4 }} className="text-[9px] uppercase tracking-wider font-semibold">Filtered</span>
              <span className="text-[10px] tracking-wider font-bold" style={{ color: t.accent }}>{data.filterLabel}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TournamentShareModal({ data, onClose }: { data: TournamentShareData; onClose: () => void }) {
  const THEME_PAGE_SIZE = 16;
  const { isAdmin, profile } = useAuth();
  const { options: backgroundOptions } = useProfileBackgroundCatalog(Boolean(isAdmin));
  const { team } = useTeamOnce(profile?.teamId || null);
  const cardRef = useRef<HTMLDivElement>(null);
  const themeOptions = useMemo(() => {
    const base = appendCatalogBackgroundThemes(THEMES, backgroundOptions, (background, index, baseTheme) => ({
      ...baseTheme,
      id: `catalog-${background.id}-${index}`,
      label: background.label,
      backgroundImage: background.imageUrl,
    }));
    if (team?.backgroundUrl) {
      base.splice(1, 0, {
        ...THEMES[0],
        id: `team-${team.id}`,
        label: team.name,
        backgroundImage: team.backgroundUrl,
      });
    }
    return base;
  }, [backgroundOptions, team]);
  const [selectedThemeId, setSelectedThemeId] = useState(THEMES[0].id);
  const selectedTheme = useMemo(
    () => themeOptions.find((theme) => theme.id === selectedThemeId) || themeOptions[0] || THEMES[0],
    [themeOptions, selectedThemeId],
  );
  const [themeQuery, setThemeQuery] = useState("");
  const [themePage, setThemePage] = useState(1);
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "downloaded">("idle");

  const filteredThemes = useMemo(() => {
    const q = themeQuery.trim().toLowerCase();
    if (!q) return themeOptions;
    return themeOptions.filter((theme) => theme.label.toLowerCase().includes(q) || theme.id.toLowerCase().includes(q));
  }, [themeOptions, themeQuery]);

  const totalThemePages = Math.max(1, Math.ceil(filteredThemes.length / THEME_PAGE_SIZE));
  const currentThemePage = Math.min(themePage, totalThemePages);

  const displayedThemes = useMemo(() => {
    const start = (currentThemePage - 1) * THEME_PAGE_SIZE;
    return filteredThemes.slice(start, start + THEME_PAGE_SIZE);
  }, [filteredThemes, currentThemePage, THEME_PAGE_SIZE]);

  async function handleCopy() {
    if (!cardRef.current) return;
    setStatus("copying");
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: selectedTheme.bg,
      fileName: `tournament-stats-${data.playerName}.png`,
      shareTitle: "My Tournament Stats",
      shareText: `${data.playerName} — ${data.totalEvents} events, ${data.overallWinRate.toFixed(1)}% WR, ${data.top8Count} top 8s | fabstats.net`,
      fallbackText: `${data.playerName} — ${data.totalEvents} events, ${data.overallWinRate.toFixed(1)}% WR | fabstats.net`,
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
      fileName: `tournament-stats-${data.playerName}.png`,
    });
    logActivity("trends_share");
    setStatus("downloaded");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl max-w-lg w-full p-3 sm:p-4 space-y-2 sm:space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fab-text">Share Tournament Stats</h3>
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
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
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
            {filteredThemes.length > THEME_PAGE_SIZE && (
              <div className="col-span-3 sm:col-span-4 flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setThemePage((prev) => Math.max(1, prev - 1))}
                  disabled={currentThemePage <= 1}
                  className="text-xs px-2 py-1 rounded border border-fab-border text-fab-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-fab-text"
                >
                  Prev
                </button>
                <span className="text-[10px] text-fab-dim">Page {currentThemePage} / {totalThemePages}</span>
                <button
                  type="button"
                  onClick={() => setThemePage((prev) => Math.min(totalThemePages, prev + 1))}
                  disabled={currentThemePage >= totalThemePages}
                  className="text-xs px-2 py-1 rounded border border-fab-border text-fab-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-fab-text"
                >
                  Next
                </button>
              </div>
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

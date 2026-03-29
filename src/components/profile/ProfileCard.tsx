"use client";
import { useMemo, useRef, useState } from "react";

import { MatchResult } from "@/types";
import type { Achievement } from "@/types";

import { logActivity } from "@/lib/activity-log";
import { copyCardImage, downloadCardImage } from "@/lib/share-image";
import { EMBLEM_COMPONENTS, EMBLEM_COLORS } from "@/components/profile/EmblemIcons";
import { AchievementIcon } from "@/components/gamification/AchievementIcons";
import { BadgeTierWrapper } from "@/components/profile/BadgeTierWrapper";
import { RARITY_VISUALS } from "@/lib/badge-tiers";
import { getAllAchievements } from "@/lib/achievements";
import { getAllBadges } from "@/lib/badges";
import { buildOptimizedImageUrl, resolveBackgroundPositionForImage } from "@/lib/profile-backgrounds";
import { CornerFiligree, OrnamentalDivider, CardBackgroundPattern, AccentTopBar, InnerVignette } from "@/components/share/CardOrnaments";
import type { CardTheme } from "@/components/opponents/RivalryCard";
import type { PlayoffFinish } from "@/lib/stats";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileBackgroundCatalog } from "@/hooks/useProfileBackgroundCatalog";
import { appendCatalogBackgroundThemes } from "@/lib/catalog-share-themes";
import { useTeamOnce } from "@/hooks/useTeam";

export interface ProfileCardData {
  playerName: string;
  username?: string;
  photoUrl?: string;
  talentEmblemId?: string | null;
  classEmblemId?: string | null;
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
  cardBorder?: { border: string; shadow: string; rgb?: string; placement?: number } | null;
  underline?: { color: string; rgb: string; placement: number } | null;
  bestRank?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | null;
  playoffFinishes?: PlayoffFinish[];
  armoryCount?: number;
  armoryUndefeated?: number;
  isSiteCreator?: boolean;
  selectedBadgeIds?: string[];
  filterLabel?: string;
  teamName?: string;
  teamIconUrl?: string;
}

// ── Fantasy-themed profile card themes ──

export const PROFILE_THEMES: CardTheme[] = [
  {
    id: "warrior",
    label: "Warrior",
    bg: "#0a0604",
    surface: "#1a100a",
    border: "#3d2510",
    accent: "#f59e0b",
    text: "#fef3c7",
    muted: "#a8845a",
    dim: "#6b5330",
    win: "#86efac",
    loss: "#fca5a5",
    draw: "#a1a1aa",
    barBg: "rgba(245,158,11,0.2)",
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
    draw: "#a1a1aa",
    barBg: "rgba(139,92,246,0.2)",
    backgroundImage: "/backgrounds/fab-official/arcane-rising-key-art.webp",
  },
  {
    id: "dragon",
    label: "Dragon",
    bg: "#0a0404",
    surface: "#1a0808",
    border: "#3a1015",
    accent: "#ef4444",
    text: "#fef2f2",
    muted: "#9b6060",
    dim: "#5c2525",
    win: "#4ade80",
    loss: "#fda4af",
    draw: "#a1a1aa",
    barBg: "rgba(239,68,68,0.2)",
    backgroundImage: "/backgrounds/fab-official/hunted-cindra-adult.webp",
  },
  {
    id: "guardian",
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
    draw: "#94a3b8",
    barBg: "rgba(56,189,248,0.2)",
    backgroundImage: "/backgrounds/fab-official/high-seas-gravybones.webp",
  },
  {
    id: "nature",
    label: "Nature",
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
    barBg: "rgba(16,185,129,0.2)",
    backgroundImage: "/backgrounds/fab-official/tales-of-aria-key-art.webp",
  },
  {
    id: "playmat-aria",
    label: "Aria Playmat",
    bg: "#0a1410",
    surface: "#102018",
    border: "#2e4e3d",
    accent: "#7ee0bb",
    text: "#eafdf4",
    muted: "#8bb9a6",
    dim: "#557764",
    win: "#6ee7b7",
    loss: "#fca5a5",
    draw: "#a1a1aa",
    barBg: "rgba(126,224,187,0.2)",
    backgroundImage: "/backgrounds/fab-official/lore-aria-matte.webp",
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
    barBg: "rgba(245,210,108,0.2)",
    backgroundImage: "/backgrounds/fab-official/lore-solana-matte.webp",
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
    barBg: "rgba(251,146,60,0.22)",
    backgroundImage: "/backgrounds/fab-official/lore-volcor-matte.webp",
  },
];

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
  Other: "OTH",
};

// Event tier order (highest first) for trophy grouping
const EVENT_TIER_ORDER: string[] = [
  "Worlds", "Pro Tour", "Nationals", "The Calling", "Battle Hardened",
  "Road to Nationals", "ProQuest", "Championship", "Skirmish", "Other",
];

export function ProfileCard({ data, theme }: { data: ProfileCardData; theme?: CardTheme }) {
  const t = theme || PROFILE_THEMES[0];
  const {
    playerName, username, photoUrl, wins, losses, draws,
    winRate, events, totalMatches, topHero, currentStreak, bestFinish,
    cardBorder, bestRank, playoffFinishes,
    armoryCount, armoryUndefeated,
  } = data;
  const isWinning = winRate >= 50;
  const rankRing = bestRank ? RANK_RING_COLORS[bestRank] : null;
  const hasTrophies = playoffFinishes && playoffFinishes.length > 0;
  const hasArmory = armoryCount && armoryCount > 0;

  // Dynamic slot 3: streak (if 3+) → best finish → matches
  const slot3 = currentStreak && currentStreak.count >= 3
    ? { label: "Streak", value: `${currentStreak.count}${currentStreak.type === MatchResult.Win ? "W" : "L"}`, color: currentStreak.type === MatchResult.Win ? t.win : t.loss }
    : bestFinish
    ? { label: "Best Finish", value: bestFinish, color: t.accent }
    : { label: "Matches", value: `${totalMatches}`, color: t.text };

  // Group trophies by event tier
  const trophyByTier: { tier: string; abbr: string; finishes: PlayoffFinish[] }[] = [];
  if (hasTrophies) {
    const tierMap = new Map<string, PlayoffFinish[]>();
    for (const f of playoffFinishes!) {
      const existing = tierMap.get(f.eventType) || [];
      existing.push(f);
      tierMap.set(f.eventType, existing);
    }
    for (const tier of EVENT_TIER_ORDER) {
      const finishes = tierMap.get(tier);
      if (finishes && finishes.length > 0) {
        trophyByTier.push({ tier, abbr: EVENT_ABBR[tier] || tier.slice(0, 3).toUpperCase(), finishes });
      }
    }
  }

  const cbPlacement = cardBorder?.placement ?? 0;
  const cbRgb = cardBorder?.rgb;

  return (
    <div
      style={{
        backgroundColor: t.surface,
        borderColor: cardBorder?.border || t.border,
        boxShadow: cbPlacement >= 2 && cbRgb
          ? (cbPlacement >= 4
            ? `0 0 16px rgba(${cbRgb},0.5), 0 0 32px rgba(${cbRgb},0.25), 0 0 48px rgba(${cbRgb},0.1)`
            : cbPlacement >= 3
              ? `0 0 12px rgba(${cbRgb},0.4), 0 0 24px rgba(${cbRgb},0.2)`
              : `0 0 8px rgba(${cbRgb},0.35), 0 0 16px rgba(${cbRgb},0.15)`)
          : (cardBorder?.shadow || undefined),
        borderWidth: cbPlacement >= 3 ? 3 : undefined,
        width: 440,
      } as React.CSSProperties}
      className="border-2 rounded-xl overflow-hidden relative"
    >
      {/* Background pattern + vignette */}
      <CardBackgroundPattern color={t.accent} id="profile" opacity={0.04} />
      <InnerVignette opacity={0.25} />
      {/* Background image (optional per theme) */}
      {t.backgroundImage && (
        <>
          <img
            src={buildOptimizedImageUrl(t.backgroundImage, 1200, 62)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: resolveBackgroundPositionForImage(t.backgroundImage) }}
            loading="eager"
            decoding="async"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div className="absolute inset-0" style={{ backgroundColor: `${t.surface}B3` }} />
        </>
      )}
      {/* Corner filigree */}
      <CornerFiligree color={cardBorder?.border || t.accent} opacity={cbPlacement >= 3 ? 0.3 : 0.2} />
      {/* Accent bar */}
      <AccentTopBar color={cardBorder?.border || t.accent} rgb={cbRgb} />

      {/* Identity + Hero Metric */}
      <div className="px-5 pt-4 pb-3 relative">
        <div className="flex items-center justify-between">
          {/* Left: photo + name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 relative">
              {data.isSiteCreator && (
                <svg className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-6 h-6 z-10" style={{ color: "#FFD700", filter: "drop-shadow(0 0 4px rgba(255,215,0,0.5))" }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.5 19h19v3h-19zM22.5 7l-5 4-5.5-7-5.5 7-5-4 2 12h17z" />
                </svg>
              )}
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
              <div className="flex items-center gap-1.5">
                <p style={{ color: t.text }} className="text-xl font-black truncate leading-tight">{playerName}</p>
                {data.teamName && (
                  data.teamIconUrl ? (
                    <img src={data.teamIconUrl} alt={data.teamName} title={data.teamName} className="w-5 h-5 rounded-full object-cover border border-white/20 shrink-0" />
                  ) : (
                    <span title={data.teamName} className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold shrink-0 border border-white/10 bg-amber-500/60 text-white">
                      {data.teamName.slice(0, 2).toUpperCase()}
                    </span>
                  )
                )}
                {data.talentEmblemId && EMBLEM_COMPONENTS[data.talentEmblemId] && (() => {
                  const Icon = EMBLEM_COMPONENTS[data.talentEmblemId!];
                  const colors = EMBLEM_COLORS[data.talentEmblemId!];
                  return <span style={{ color: colors?.text ? undefined : t.accent }} className={colors?.text || ""}><Icon className="w-6 h-6" /></span>;
                })()}
                {data.classEmblemId && EMBLEM_COMPONENTS[data.classEmblemId] && (() => {
                  const Icon = EMBLEM_COMPONENTS[data.classEmblemId!];
                  const colors = EMBLEM_COLORS[data.classEmblemId!];
                  return <span style={{ color: colors?.text ? undefined : t.accent }} className={colors?.text || ""}><Icon className="w-6 h-6" /></span>;
                })()}
              </div>
              {username && <p style={{ color: t.dim }} className="text-[11px]">@{username}</p>}
              {(() => {
                if (!data.selectedBadgeIds?.length) return null;
                const RARITY_ORDER: Record<string, number> = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
                const allAch = [...getAllAchievements(), ...getAllBadges()];
                const achMap = new Map(allAch.map((a) => [a.id, a]));
                const sorted = data.selectedBadgeIds
                  .map((id) => achMap.get(id))
                  .filter((a): a is Achievement => !!a)
                  .sort((a, b) => {
                    const ra = RARITY_ORDER[a.rarity] ?? 0;
                    const rb = RARITY_ORDER[b.rarity] ?? 0;
                    if (ra !== rb) return rb - ra;
                    return a.name.localeCompare(b.name);
                  })
                  .slice(0, 7);
                return (
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {sorted.map((ach) => {
                      const visual = RARITY_VISUALS[ach.rarity] || RARITY_VISUALS.common;
                      return (
                        <BadgeTierWrapper key={ach.id} visual={visual} size="sm">
                          <span style={{ color: visual.ringColor, opacity: 0.8 }}><AchievementIcon icon={ach.icon} className="w-4 h-4" /></span>
                        </BadgeTierWrapper>
                      );
                    })}
                  </div>
                );
              })()}
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

      {/* Ornamental divider */}
      <OrnamentalDivider color={cardBorder?.border || t.accent} className="mx-3 relative" />

      {/* Context bar — 3 col */}
      <div className="grid grid-cols-3 gap-2 px-5 py-2.5 relative">
        <div style={{ backgroundColor: t.backgroundImage ? `${t.bg}CC` : t.bg }} className="rounded-lg p-2 text-center">
          <p style={{ color: t.text, opacity: 0.6 }} className="text-[10px] uppercase tracking-wider font-semibold">Events</p>
          <p style={{ color: t.text }} className="text-base font-black">{events}</p>
        </div>
        <div style={{ backgroundColor: t.backgroundImage ? `${t.bg}CC` : t.bg }} className="rounded-lg p-2 text-center">
          <p style={{ color: t.text, opacity: 0.6 }} className="text-[10px] uppercase tracking-wider font-semibold">Top Hero</p>
          <p style={{ color: t.text }} className="text-xs font-bold truncate mt-0.5">{topHero || "—"}</p>
        </div>
        <div style={{ backgroundColor: t.backgroundImage ? `${t.bg}CC` : t.bg }} className="rounded-lg p-2 text-center">
          <p style={{ color: t.text, opacity: 0.6 }} className="text-[10px] uppercase tracking-wider font-semibold">{slot3.label}</p>
          <p style={{ color: slot3.color }} className="text-base font-black truncate">{slot3.value}</p>
        </div>
      </div>

      {/* Trophy Case — grouped by event tier */}
      {trophyByTier.length > 0 && (
        <div className="px-5 py-1.5 relative">
          <p style={{ color: t.text, opacity: 0.5 }} className="text-[9px] uppercase tracking-wider font-semibold mb-1">Trophies</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {trophyByTier.map((group) => (
              <div key={group.tier} className="flex items-center gap-1">
                <span style={{ color: t.muted }} className="text-[9px] font-bold">{group.abbr}:</span>
                {group.finishes.map((f, i) => (
                  <span key={i}>
                    <span style={{ color: FINISH_COLORS[f.type] }} className="text-[9px] font-bold">{FINISH_LABELS[f.type]}</span>
                    {i < group.finishes.length - 1 && <span style={{ color: t.border }} className="text-[9px]">,</span>}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Armory — single line */}
      {hasArmory && (
        <div className="flex items-center gap-1.5 px-5 py-1.5 relative">
          <p style={{ color: t.text, opacity: 0.5 }} className="text-[9px] uppercase tracking-wider font-semibold shrink-0">Armory</p>
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

      {/* Footer */}
      <div className="relative">
        <OrnamentalDivider color={cardBorder?.border || t.accent} className="mx-3" />
        <div style={{ backgroundColor: t.backgroundImage ? `${t.bg}CC` : t.bg }} className="px-5 py-1.5 flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 32 32" style={{ opacity: 0.5 }}>
            <rect width="32" height="32" rx="6" fill={t.accent} />
            <g transform="translate(4, 4)">
              <rect x="5" y="2" width="14" height="20" rx="2" stroke={t.bg} strokeWidth="2" fill="none" />
              <rect x="7.5" y="13" width="2" height="3" fill={t.bg} />
              <rect x="11" y="10" width="2" height="6" fill={t.bg} />
              <rect x="14.5" y="6" width="2" height="10" fill={t.bg} />
            </g>
          </svg>
          <p style={{ color: t.accent, opacity: 0.5 }} className="text-[10px] tracking-wider font-semibold">fabstats.net</p>
          {data.filterLabel && (
            <span className="ml-auto flex items-center gap-1.5">
              <span style={{ color: t.text, opacity: 0.4 }} className="text-[9px] uppercase tracking-wider font-semibold">Filtered</span>
              <span style={{ color: t.accent }} className="text-[10px] tracking-wider font-bold">{data.filterLabel}</span>
            </span>
          )}
        </div>
        {/* Underline bar */}
        {data.underline && (
          <div
            style={{
              height: data.underline.placement >= 4 ? 4 : data.underline.placement >= 3 ? 3.5 : data.underline.placement >= 2 ? 3 : 2.5,
              background: data.underline.color,
              boxShadow: data.underline.placement >= 3
                ? `0 0 8px rgba(${data.underline.rgb},0.5), 0 0 16px rgba(${data.underline.rgb},0.2)`
                : `0 0 5px rgba(${data.underline.rgb},0.3)`,
              borderRadius: "0 0 10px 10px",
            }}
          />
        )}
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
  const THEME_PAGE_SIZE = 16;
  const { isAdmin, profile } = useAuth();
  const { options: backgroundOptions } = useProfileBackgroundCatalog(Boolean(isAdmin));
  const { team } = useTeamOnce(profile?.teamId || null);
  const cardRef = useRef<HTMLDivElement>(null);
  const themeOptions = useMemo(() => {
    const base = appendCatalogBackgroundThemes(PROFILE_THEMES, backgroundOptions, (background, index, baseTheme) => ({
      ...baseTheme,
      id: `catalog-${background.id}-${index}`,
      label: background.label,
      backgroundImage: background.imageUrl,
    }));
    // Insert team background right after the default theme
    if (team?.backgroundUrl) {
      base.splice(1, 0, {
        ...PROFILE_THEMES[0],
        id: `team-${team.id}`,
        label: team.name,
        backgroundImage: team.backgroundUrl,
      });
    }
    return base;
  }, [backgroundOptions, team]);
  const [selectedThemeId, setSelectedThemeId] = useState(PROFILE_THEMES[0].id);
  const selectedTheme = useMemo(
    () => themeOptions.find((theme) => theme.id === selectedThemeId) || themeOptions[0] || PROFILE_THEMES[0],
    [themeOptions, selectedThemeId],
  );
  const [themeQuery, setThemeQuery] = useState("");
  const [themePage, setThemePage] = useState(1);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "text-copied" | "sharing">("idle");

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
    const profileUrl = data.username
      ? `${window.location.origin}/player/${data.username}`
      : window.location.origin;
    const shareText = `${data.playerName} — ${data.winRate.toFixed(1)}% win rate across ${data.totalMatches} matches\n${profileUrl}`;

    logActivity("profile_share");
    setShareStatus("sharing");
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: selectedTheme.bg, fileName: "fab-stats.png",
      shareTitle: "FaB Stats — Profile", shareText, fallbackText: profileUrl,
      retryWithoutImages: true,
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
    logActivity("profile_share");
    setShareStatus("sharing");
    await downloadCardImage(cardRef.current, {
      backgroundColor: selectedTheme.bg, fileName: "fab-stats.png",
      retryWithoutImages: true,
    });
    setShareStatus("idle");
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl max-w-lg w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
          <h3 className="text-sm font-semibold text-fab-text">Share Profile Card</h3>
          <button onClick={onClose} className="text-fab-muted hover:text-fab-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card preview — scale down on mobile to fit viewport */}
        <div className="px-4 pt-2 pb-1 sm:p-4 flex justify-center overflow-hidden">
          <div className="scale-[0.75] sm:scale-100 origin-top -mb-[25%] sm:mb-0">
            <div ref={cardRef}>
              <ProfileCard data={data} theme={selectedTheme} />
            </div>
          </div>
        </div>

        {/* Theme picker */}
        <div className="px-4 pb-2 sm:pb-3">
          <p className="text-[10px] text-fab-muted uppercase tracking-wider font-medium mb-1.5 sm:mb-2">Theme</p>
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
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <div className="absolute inset-0" style={{ backgroundColor: `${theme.surface}99` }} />
                    </>
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{ background: `linear-gradient(135deg, ${theme.bg}, ${theme.surface})` }}
                    />
                  )}
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: theme.accent }}
                  />
                </div>
                <p className="text-[10px] text-fab-muted">{theme.label}</p>
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

        {/* Copy + Download buttons */}
        <div className="px-4 pb-3 sm:pb-4 flex gap-2">
          <button
            onClick={handleCopy}
            disabled={shareStatus === "sharing"}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
          >
            {shareStatus === "sharing" ? "Capturing..." : shareStatus === "copied" ? "Image Copied!" : shareStatus === "text-copied" ? "Link Copied" : "Copy Image"}
          </button>
          <button
            onClick={handleDownload}
            disabled={shareStatus === "sharing"}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-muted transition-colors disabled:opacity-50"
            title="Save Image"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

// ── Types ──

interface PlayerData {
  displayName: string;
  username: string;
  photoUrl: string | null;
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  winRate: number;
  topHero: string;
  currentWinStreak: number;
  eventsPlayed: number;
  totalTop8s: number;
  longestWinStreak: number;
  earnings: number;
}

// satori accepts a VDOM tree (not React elements)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VNode = any;

// ── Firestore REST API ──

async function fetchPlayer(username: string): Promise<PlayerData | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return null;

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "leaderboard" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "username" },
              op: "EQUAL",
              value: { stringValue: username.toLowerCase() },
            },
          },
          limit: 1,
        },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data[0]?.document?.fields) return null;

    const f = data[0].document.fields;
    if (!f.isPublic?.booleanValue) return null;

    return {
      displayName: f.displayName?.stringValue || username,
      username: f.username?.stringValue || username,
      photoUrl: f.photoUrl?.stringValue || null,
      totalMatches: Number(f.totalMatches?.integerValue || 0),
      totalWins: Number(f.totalWins?.integerValue || 0),
      totalLosses: Number(f.totalLosses?.integerValue || 0),
      totalDraws: Number(f.totalDraws?.integerValue || 0),
      winRate: Number(f.winRate?.doubleValue ?? f.winRate?.integerValue ?? 0),
      topHero: (f.topHero?.stringValue && f.topHero.stringValue !== "Unknown") ? f.topHero.stringValue : "—",
      currentWinStreak: Number(f.currentWinStreak?.integerValue || 0),
      eventsPlayed: Number(f.eventsPlayed?.integerValue || 0),
      totalTop8s: Number(f.totalTop8s?.integerValue || 0),
      longestWinStreak: Number(f.longestWinStreak?.integerValue || 0),
      earnings: Number(f.earnings?.integerValue ?? f.earnings?.doubleValue ?? 0),
    };
  } catch {
    return null;
  }
}

// ── Font loading (cached across invocations) ──

let fontCache: ArrayBuffer | null = null;
let fontBoldCache: ArrayBuffer | null = null;

async function loadFonts(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  if (fontCache && fontBoldCache) {
    return { regular: fontCache, bold: fontBoldCache };
  }

  const [regular, bold] = await Promise.all([
    fetch("https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff").then(
      (r) => r.arrayBuffer()
    ),
    fetch("https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiA.woff").then(
      (r) => r.arrayBuffer()
    ),
  ]);

  fontCache = regular;
  fontBoldCache = bold;
  return { regular, bold };
}

// ── Card renderer ──

function renderCard(player: PlayerData | null): VNode {
  if (!player) return renderGenericCard();

  const gold = "#c9a84c";
  const goldDim = "#a08838";
  const muted = "#6b6580";
  const surface = "#1a1625";
  const border = "#2a2435";
  const textLight = "#e8e4f0";
  const wrColor = player.winRate >= 50 ? "#22c55e" : "#ef4444";

  // ── Build stat tiles for the bottom row ──
  const statTiles: { label: string; value: string; color: string }[] = [
    { label: "RECORD", value: `${player.totalWins}W-${player.totalLosses}L${player.totalDraws > 0 ? `-${player.totalDraws}D` : ""}`, color: textLight },
    { label: "TOP HERO", value: player.topHero, color: gold },
  ];
  if (player.totalTop8s > 0) {
    statTiles.push({ label: "TOP 8s", value: String(player.totalTop8s), color: gold });
  }
  if (player.longestWinStreak >= 3) {
    statTiles.push({ label: "BEST STREAK", value: `${player.longestWinStreak}W`, color: "#22c55e" });
  }
  if (player.eventsPlayed > 0 && statTiles.length < 4) {
    statTiles.push({ label: "EVENTS", value: String(player.eventsPlayed), color: textLight });
  }

  // Win rate bar
  const barWidth = 400;
  const fillWidth = Math.max(4, Math.round((player.winRate / 100) * barWidth));

  return {
    type: "div",
    props: {
      style: {
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column" as const,
        background: "#0c0a10",
        fontFamily: "Inter",
        position: "relative" as const,
      },
      children: [
        // Top accent bar
        { type: "div", props: { style: { width: 1200, height: 4, background: `linear-gradient(90deg, ${gold}, #e8c860, ${gold})` } } },

        // Main content
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column" as const, flex: 1, padding: "40px 60px 32px" },
            children: [
              // ── TOP: Branding + Player identity ──
              {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 },
                  children: [
                    // Left: Avatar + Name
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", alignItems: "center", gap: 24 },
                        children: [
                          // Avatar
                          player.photoUrl
                            ? { type: "img", props: { src: player.photoUrl, width: 88, height: 88, style: { borderRadius: 44, border: `3px solid ${gold}` } } }
                            : {
                                type: "div",
                                props: {
                                  style: {
                                    width: 88, height: 88, borderRadius: 44,
                                    background: `linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.08))`,
                                    border: `3px solid ${gold}`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 38, fontWeight: 700, color: gold,
                                  },
                                  children: player.displayName.charAt(0).toUpperCase(),
                                },
                              },
                          // Name stack
                          {
                            type: "div",
                            props: {
                              style: { display: "flex", flexDirection: "column" as const },
                              children: [
                                { type: "div", props: { style: { fontSize: 42, fontWeight: 700, color: textLight, letterSpacing: "-0.03em", lineHeight: 1.15 }, children: player.displayName } },
                                { type: "div", props: { style: { fontSize: 20, color: muted, marginTop: 4 }, children: `@${player.username}` } },
                              ],
                            },
                          },
                        ],
                      },
                    },
                    // Right: Branding
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", alignItems: "center", gap: 10, marginTop: 8 },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: { width: 24, height: 24, display: "flex" },
                              children: {
                                type: "svg",
                                props: {
                                  width: 24, height: 24, viewBox: "0 0 32 32",
                                  children: [
                                    { type: "path", props: { d: "M16 4L6 9v7c0 6.2 4.3 11.9 10 13.7 5.7-1.8 10-7.5 10-13.7V9L16 4z", fill: gold, opacity: 0.3 } },
                                    { type: "path", props: { d: "M16 4L6 9v7c0 6.2 4.3 11.9 10 13.7 5.7-1.8 10-7.5 10-13.7V9L16 4z", stroke: gold, strokeWidth: 1.5, fill: "none" } },
                                  ],
                                },
                              },
                            },
                          },
                          { type: "span", props: { style: { fontSize: 18, fontWeight: 700, color: goldDim }, children: "FaB Stats" } },
                        ],
                      },
                    },
                  ],
                },
              },

              // ── MIDDLE: Giant win rate hero section ──
              {
                type: "div",
                props: {
                  style: {
                    display: "flex", alignItems: "center", gap: 48,
                    background: `linear-gradient(135deg, ${surface}, #141020)`,
                    border: `1px solid ${border}`,
                    borderRadius: 24, padding: "36px 48px",
                    flex: 1,
                  },
                  children: [
                    // Win rate big number
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", flexDirection: "column" as const, alignItems: "center", minWidth: 280 },
                        children: [
                          { type: "span", props: { style: { fontSize: 14, fontWeight: 700, color: muted, letterSpacing: "0.12em", marginBottom: 8 }, children: "WIN RATE" } },
                          { type: "span", props: { style: { fontSize: 96, fontWeight: 700, color: wrColor, lineHeight: 1, letterSpacing: "-0.04em" }, children: `${player.winRate.toFixed(1)}%` } },
                          // Progress bar
                          {
                            type: "div",
                            props: {
                              style: { display: "flex", width: barWidth, height: 8, background: "rgba(107,101,128,0.15)", borderRadius: 4, marginTop: 16 },
                              children: [
                                { type: "div", props: { style: { width: fillWidth, height: 8, background: wrColor, borderRadius: 4 } } },
                              ],
                            },
                          },
                          { type: "span", props: { style: { fontSize: 16, color: muted, marginTop: 10 }, children: `${player.totalMatches} matches played` } },
                        ],
                      },
                    },
                    // Divider
                    { type: "div", props: { style: { width: 1, height: 140, background: border } } },
                    // Stat tiles (2x2 grid-like)
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", flexWrap: "wrap" as const, gap: 24, flex: 1, justifyContent: "center" },
                        children: statTiles.map((t) => ({
                          type: "div",
                          props: {
                            style: { display: "flex", flexDirection: "column" as const, alignItems: "center", minWidth: 140 },
                            children: [
                              { type: "span", props: { style: { fontSize: 12, fontWeight: 700, color: muted, letterSpacing: "0.1em", marginBottom: 6 }, children: t.label } },
                              { type: "span", props: { style: { fontSize: 28, fontWeight: 700, color: t.color, letterSpacing: "-0.02em" }, children: t.value } },
                            ],
                          },
                        })),
                      },
                    },
                  ],
                },
              },

              // ── BOTTOM: URL ──
              {
                type: "div",
                props: {
                  style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 },
                  children: [
                    { type: "span", props: { style: { fontSize: 16, color: muted }, children: `fabstats.net/player/${player.username}` } },
                    { type: "span", props: { style: { fontSize: 14, color: goldDim, letterSpacing: "0.06em" }, children: "Flesh and Blood TCG Stats Tracker" } },
                  ],
                },
              },
            ],
          },
        },

        // Bottom accent bar
        { type: "div", props: { style: { width: 1200, height: 4, background: `linear-gradient(90deg, ${gold}, #e8c860, ${gold})` } } },
      ],
    },
  };
}

function statBox(label: string, value: string, valueColor: string, bg: string, border: string): VNode {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: "20px 28px",
        minWidth: 160,
        flex: 1,
      },
      children: [
        { type: "span", props: { style: { fontSize: 13, fontWeight: 600, color: "#6b6580", letterSpacing: "0.08em", marginBottom: 8 }, children: label } },
        { type: "span", props: { style: { fontSize: 36, fontWeight: 700, color: valueColor }, children: value } },
      ],
    },
  };
}

function renderGenericCard(): VNode {
  return {
    type: "div",
    props: {
      style: {
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0c0a0e 0%, #161222 100%)",
        fontFamily: "Inter",
      },
      children: [
        { type: "div", props: { style: { fontSize: 72, fontWeight: 700, color: "#c9a84c", letterSpacing: "-0.02em" }, children: "FaB Stats" } },
        { type: "div", props: { style: { fontSize: 28, color: "#6b6580", marginTop: 16 }, children: "Track your Flesh and Blood match history" } },
      ],
    },
  };
}

// ── Meta page data ──

interface MetaHeroAgg {
  hero: string;
  matches: number;
  wins: number;
  players: number;
}

interface MetaPageData {
  totalPlayers: number;
  totalMatches: number;
  totalHeroes: number;
  mostPlayed: MetaHeroAgg | null;
  bestWinRate: MetaHeroAgg | null;
}

function isLikelyHeroName(name: string): boolean {
  if (!name || name.length < 2) return false;
  const lower = name.toLowerCase().trim();
  const blocked = [
    "not rated", "rated", "unrated", "competitive", "casual",
    "classic constructed", "blitz", "draft", "sealed", "clash",
    "ultimate pit fight", "other", "unknown",
  ];
  if (blocked.includes(lower)) return false;
  if (/\b(19|20)\d{2}\b/.test(name)) return false;
  return true;
}

async function fetchMetaData(): Promise<MetaPageData | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return null;

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "leaderboard" }],
          select: {
            fields: [
              { fieldPath: "totalMatches" },
              { fieldPath: "totalWins" },
              { fieldPath: "heroBreakdown" },
              { fieldPath: "topHero" },
              { fieldPath: "topHeroMatches" },
              { fieldPath: "winRate" },
            ],
          },
          limit: 500,
        },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;

    const heroMap = new Map<string, { matches: number; wins: number; players: Set<string> }>();
    let totalMatches = 0;
    let playerCount = 0;

    for (const doc of data) {
      const f = doc?.document?.fields;
      if (!f) continue;
      const docPath = doc.document.name || "";
      playerCount++;
      totalMatches += Number(f.totalMatches?.integerValue || 0);

      const breakdown = f.heroBreakdown?.arrayValue?.values;
      if (breakdown && Array.isArray(breakdown)) {
        for (const item of breakdown) {
          const fields = item?.mapValue?.fields;
          if (!fields) continue;
          const hero = fields.hero?.stringValue;
          if (!hero || !isLikelyHeroName(hero)) continue;
          const matches = Number(fields.matches?.integerValue || 0);
          const wins = Number(fields.wins?.integerValue || 0);
          const cur = heroMap.get(hero) || { matches: 0, wins: 0, players: new Set<string>() };
          cur.matches += matches;
          cur.wins += wins;
          cur.players.add(docPath);
          heroMap.set(hero, cur);
        }
      } else if (f.topHero?.stringValue && isLikelyHeroName(f.topHero.stringValue)) {
        const hero = f.topHero.stringValue;
        const matches = Number(f.topHeroMatches?.integerValue || 0);
        const wr = Number(f.winRate?.doubleValue ?? f.winRate?.integerValue ?? 0);
        const wins = Math.round(matches * (wr / 100));
        const cur = heroMap.get(hero) || { matches: 0, wins: 0, players: new Set<string>() };
        cur.matches += matches;
        cur.wins += wins;
        cur.players.add(docPath);
        heroMap.set(hero, cur);
      }
    }

    const heroList: MetaHeroAgg[] = [...heroMap.entries()].map(([hero, d]) => ({
      hero,
      matches: d.matches,
      wins: d.wins,
      players: d.players.size,
    }));

    const mostPlayed = heroList.length > 0
      ? heroList.reduce((best, h) => h.matches > best.matches ? h : best)
      : null;

    const eligible = heroList.filter((h) => h.matches >= 50);
    const bestWinRate = eligible.length > 0
      ? eligible.reduce((best, h) => {
          const hWr = h.matches > 0 ? h.wins / h.matches : 0;
          const bWr = best.matches > 0 ? best.wins / best.matches : 0;
          return hWr > bWr ? h : best;
        })
      : null;

    return { totalPlayers: playerCount, totalMatches, totalHeroes: heroMap.size, mostPlayed, bestWinRate };
  } catch {
    return null;
  }
}

function renderMetaCard(meta: MetaPageData | null): VNode {
  const gold = "#c9a84c";
  const muted = "#6b6580";
  const cardBg = "#1a1625";
  const cardBorder = "#2a2435";
  const textLight = "#e8e4f0";

  if (!meta) return renderGenericCard();

  const mpShare = meta.mostPlayed && meta.totalMatches > 0
    ? ((meta.mostPlayed.matches / meta.totalMatches) * 100).toFixed(1)
    : "0";
  const bwrRate = meta.bestWinRate && meta.bestWinRate.matches > 0
    ? ((meta.bestWinRate.wins / meta.bestWinRate.matches) * 100).toFixed(1)
    : "0";

  return {
    type: "div",
    props: {
      style: {
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column" as const,
        background: "linear-gradient(135deg, #0c0a0e 0%, #161222 100%)",
        fontFamily: "Inter",
      },
      children: [
        { type: "div", props: { style: { width: 1200, height: 4, background: "linear-gradient(90deg, #c9a84c, #e8c860)" } } },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column" as const, padding: "48px 64px", flex: 1 },
            children: [
              // Header
              {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "center", marginBottom: 40 },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: { width: 32, height: 32, marginRight: 12, display: "flex" },
                        children: {
                          type: "svg",
                          props: {
                            width: 32, height: 32, viewBox: "0 0 32 32",
                            children: [
                              { type: "path", props: { d: "M16 4L6 9v7c0 6.2 4.3 11.9 10 13.7 5.7-1.8 10-7.5 10-13.7V9L16 4z", fill: gold, opacity: 0.3 } },
                              { type: "path", props: { d: "M16 4L6 9v7c0 6.2 4.3 11.9 10 13.7 5.7-1.8 10-7.5 10-13.7V9L16 4z", stroke: gold, strokeWidth: 1.5, fill: "none" } },
                            ],
                          },
                        },
                      },
                    },
                    { type: "span", props: { style: { fontSize: 22, fontWeight: 700, color: gold, letterSpacing: "-0.02em" }, children: "FaB Stats" } },
                  ],
                },
              },
              // Title
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column" as const, marginBottom: 40 },
                  children: [
                    { type: "div", props: { style: { fontSize: 56, fontWeight: 700, color: textLight, letterSpacing: "-0.02em", lineHeight: 1.1 }, children: "Community Meta" } },
                    { type: "div", props: { style: { fontSize: 22, color: muted, marginTop: 12 }, children: `Hero usage & performance across ${meta.totalPlayers} players` } },
                  ],
                },
              },
              // Stats row
              {
                type: "div",
                props: {
                  style: { display: "flex", gap: 20, flex: 1 },
                  children: [
                    statBox("MOST PLAYED", meta.mostPlayed?.hero || "—", gold, cardBg, cardBorder),
                    statBox("META SHARE", meta.mostPlayed ? `${mpShare}%` : "—", textLight, cardBg, cardBorder),
                    statBox("TOP WIN RATE", meta.bestWinRate?.hero || "—", "#22c55e", cardBg, cardBorder),
                    statBox("WIN RATE", meta.bestWinRate ? `${bwrRate}%` : "—", "#22c55e", cardBg, cardBorder),
                  ],
                },
              },
              // Bottom row
              {
                type: "div",
                props: {
                  style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", gap: 24, fontSize: 18, color: muted },
                        children: [
                          { type: "span", props: { children: `${meta.totalMatches.toLocaleString()} total matches` } },
                          { type: "span", props: { children: `${meta.totalHeroes} heroes tracked` } },
                        ],
                      },
                    },
                    { type: "span", props: { style: { fontSize: 18, color: muted }, children: "fabstats.net/meta" } },
                  ],
                },
              },
            ],
          },
        },
        { type: "div", props: { style: { width: 1200, height: 4, background: "linear-gradient(90deg, #c9a84c, #e8c860)" } } },
      ],
    },
  };
}

// ── Handler ──

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "";
  const username = url.searchParams.get("username") || "";

  if (!username && type !== "meta") {
    return new Response("Missing username", { status: 400 });
  }

  try {
    let card: VNode;

    if (type === "meta") {
      const meta = await fetchMetaData();
      card = renderMetaCard(meta);
    } else {
      const player = await fetchPlayer(username);
      card = renderCard(player);
    }

    const { regular, bold } = await loadFonts();

    const svg = await satori(card, {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
        { name: "Inter", data: bold, weight: 700 as const, style: "normal" as const },
      ],
    });

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width" as const, value: 1200 },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    return new Response(Buffer.from(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    console.error("OG image generation error:", msg);
    return new Response(`OG error: ${err instanceof Error ? err.message : String(err)}`, { status: 500 });
  }
}

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
      topHero: f.topHero?.stringValue || "Unknown",
      currentWinStreak: Number(f.currentWinStreak?.integerValue || 0),
      eventsPlayed: Number(f.eventsPlayed?.integerValue || 0),
      totalTop8s: Number(f.totalTop8s?.integerValue || 0),
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
  const muted = "#6b6580";
  const cardBg = "#1a1625";
  const cardBorder = "#2a2435";
  const textLight = "#e8e4f0";
  const wrColor = player.winRate >= 50 ? "#22c55e" : "#ef4444";
  const record = `${player.totalWins}W ${player.totalLosses}L${player.totalDraws > 0 ? ` ${player.totalDraws}D` : ""}`;

  // Build bottom info items
  const bottomItems: VNode[] = [];
  if (player.currentWinStreak > 0) {
    bottomItems.push({
      type: "span",
      props: { style: { color: "#22c55e" }, children: `${player.currentWinStreak} game win streak` },
    });
  }
  if (player.totalTop8s > 0) {
    bottomItems.push({
      type: "span",
      props: { style: { color: gold }, children: `${player.totalTop8s} Top 8${player.totalTop8s !== 1 ? "s" : ""}` },
    });
  }
  if (player.eventsPlayed > 0) {
    bottomItems.push({
      type: "span",
      props: { children: `${player.eventsPlayed} events played` },
    });
  }

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
        // Top gold bar
        { type: "div", props: { style: { width: 1200, height: 4, background: "linear-gradient(90deg, #c9a84c, #e8c860)" } } },
        // Main content
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column" as const, padding: "48px 64px", flex: 1 },
            children: [
              // Header: FaB Stats branding
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
              // Player name + username + avatar
              {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "center", marginBottom: 40, gap: 24 },
                  children: [
                    // Avatar
                    player.photoUrl
                      ? { type: "img", props: { src: player.photoUrl, width: 96, height: 96, style: { borderRadius: 48, border: `3px solid ${gold}` } } }
                      : {
                          type: "div",
                          props: {
                            style: {
                              width: 96, height: 96, borderRadius: 48, background: "rgba(201,168,76,0.2)",
                              border: `3px solid ${gold}`, display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 40, fontWeight: 700, color: gold,
                            },
                            children: player.displayName.charAt(0).toUpperCase(),
                          },
                        },
                    // Name + username
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", flexDirection: "column" as const },
                        children: [
                          { type: "div", props: { style: { fontSize: 56, fontWeight: 700, color: textLight, letterSpacing: "-0.02em", lineHeight: 1.1 }, children: player.displayName } },
                          { type: "div", props: { style: { fontSize: 24, color: muted, marginTop: 8 }, children: `@${player.username}` } },
                        ],
                      },
                    },
                  ],
                },
              },
              // Stats row
              {
                type: "div",
                props: {
                  style: { display: "flex", gap: 20, flex: 1 },
                  children: [
                    statBox("WIN RATE", `${player.winRate.toFixed(1)}%`, wrColor, cardBg, cardBorder),
                    statBox("MATCHES", String(player.totalMatches), textLight, cardBg, cardBorder),
                    statBox("RECORD", record, textLight, cardBg, cardBorder),
                    statBox("TOP HERO", player.topHero, gold, cardBg, cardBorder),
                  ],
                },
              },
              // Bottom row: streak + events + URL
              {
                type: "div",
                props: {
                  style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", gap: 24, fontSize: 18, color: muted },
                        children: bottomItems,
                      },
                    },
                    { type: "span", props: { style: { fontSize: 18, color: muted }, children: "fabstats.net" } },
                  ],
                },
              },
            ],
          },
        },
        // Bottom gold bar
        { type: "div", props: { style: { width: 1200, height: 4, background: "linear-gradient(90deg, #c9a84c, #e8c860)" } } },
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

// ── Handler ──

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const username = url.searchParams.get("username") || "";

  if (!username) {
    return new Response("Missing username", { status: 400 });
  }

  try {
    const player = await fetchPlayer(username);
    const { regular, bold } = await loadFonts();

    const card = renderCard(player);

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
    console.error("OG image generation error:", err);
    return new Response("Internal error", { status: 500 });
  }
}

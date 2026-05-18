interface PlayerData {
  displayName: string;
  username: string;
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  topHero: string;
  currentWinStreak: number;
  totalTop8s: number;
  isPublic: boolean;
}

async function fetchPlayer(username: string): Promise<PlayerData | null> {
  const projectId = Deno.env.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const apiKey = Deno.env.get("NEXT_PUBLIC_FIREBASE_API_KEY");
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
    const isPublic = f.isPublic?.booleanValue;
    if (!isPublic) return null;

    return {
      displayName: f.displayName?.stringValue || username,
      username: f.username?.stringValue || username,
      totalMatches: Number(f.totalMatches?.integerValue || 0),
      totalWins: Number(f.totalWins?.integerValue || 0),
      totalLosses: Number(f.totalLosses?.integerValue || 0),
      winRate: Number(f.winRate?.doubleValue ?? f.winRate?.integerValue ?? 0),
      topHero: f.topHero?.stringValue || "Unknown",
      currentWinStreak: Number(f.currentWinStreak?.integerValue || 0),
      totalTop8s: Number(f.totalTop8s?.integerValue || 0),
      isPublic: true,
    };
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Build schema.org Person JSON-LD for a player. Inlined here (rather than
 * imported from src/lib/kg/json-ld.ts) because edge functions run on Deno,
 * not Node — they can't import the Next.js-aliased src/ tree directly. The
 * canonical generator is at src/lib/kg/json-ld.ts; keep this in sync.
 */
function playerJsonLdScript(username: string, player: PlayerData): string {
  const personUri = `https://www.fabstats.net/player/${encodeURIComponent(username)}`;
  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": personUri,
    name: player.displayName || player.username,
    alternateName: player.username,
    identifier: player.username,
    url: personUri,
    description:
      `${player.winRate.toFixed(1)}% win rate across ${player.totalMatches} matches in Flesh and Blood TCG.` +
      (player.topHero ? ` Most-played hero: ${player.topHero}.` : "") +
      (player.totalTop8s > 0 ? ` ${player.totalTop8s} Top 8 finish${player.totalTop8s !== 1 ? "es" : ""}.` : ""),
  };
  // Defensive: prevent "</script>" sequences breaking out of the script tag.
  return JSON.stringify(obj).replace(/<\//g, "<\\/");
}

export default async function handler(
  request: Request,
  context: { next: () => Promise<Response> }
) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/");
  const username = decodeURIComponent(parts[2] || "");

  if (!username || username === "_") {
    return context.next();
  }

  let response: Response;
  try {
    response = await context.next();
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  let html: string;
  try {
    html = await response.text();
  } catch {
    return response;
  }

  try {
  // Try to fetch real player data
  const player = await fetchPlayer(username);

  const title = player
    ? escapeHtml(`${player.displayName} | FaB Stats`)
    : `${escapeHtml(username)}'s FaB Stats | FaB Stats`;

  const desc = player
    ? escapeHtml(
        `${player.winRate.toFixed(1)}% win rate across ${player.totalMatches} matches · ${player.totalWins}W-${player.totalLosses}L · Playing ${player.topHero}${player.totalTop8s > 0 ? ` · ${player.totalTop8s} Top 8 finish${player.totalTop8s !== 1 ? "es" : ""}` : ""} · Track your stats at fabstats.net`
      )
    : `View ${escapeHtml(username)}'s Flesh and Blood tournament stats, win rate, and match history on FaB Stats.`;

  const ogImageUrl = `https://www.fabstats.net/og/player/${encodeURIComponent(username)}.png`;

  // Replace OG meta tags
  html = html.replace(
    /(<meta\s+property="og:title"\s+content=")([^"]*?)(")/,
    `$1${title}$3`
  );
  html = html.replace(
    /(<meta\s+property="og:description"\s+content=")([^"]*?)(")/,
    `$1${desc}$3`
  );
  html = html.replace(
    /(<meta\s+name="twitter:title"\s+content=")([^"]*?)(")/,
    `$1${title}$3`
  );
  html = html.replace(
    /(<meta\s+name="twitter:description"\s+content=")([^"]*?)(")/,
    `$1${desc}$3`
  );
  // Replace <title> tag
  html = html.replace(
    /(<title>)([^<]*?)(<\/title>)/,
    `$1${title}$3`
  );

  // Replace or inject OG image
  if (html.includes('og:image')) {
    html = html.replace(
      /(<meta\s+property="og:image"\s+content=")([^"]*?)(")/,
      `$1${ogImageUrl}$3`
    );
  } else {
    html = html.replace(
      '</head>',
      `<meta property="og:image" content="${ogImageUrl}"/>\n<meta property="og:image:width" content="1200"/>\n<meta property="og:image:height" content="630"/>\n</head>`
    );
  }

  // Replace or inject twitter image
  if (html.includes('twitter:image')) {
    html = html.replace(
      /(<meta\s+name="twitter:image"\s+content=")([^"]*?)(")/,
      `$1${ogImageUrl}$3`
    );
  } else {
    html = html.replace(
      '</head>',
      `<meta name="twitter:image" content="${ogImageUrl}"/>\n</head>`
    );
  }

  // Add OG image dimensions if not present
  if (!html.includes('og:image:width')) {
    html = html.replace(
      /(<meta\s+property="og:image"\s+content="[^"]*?"[^>]*>)/,
      `$1\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">`
    );
  }

  // Ensure twitter:card is summary_large_image
  html = html.replace(
    /(<meta\s+name="twitter:card"\s+content=")([^"]*?)(")/,
    `$1summary_large_image$3`
  );

  // Set canonical URL
  const canonicalUrl = `https://www.fabstats.net/player/${encodeURIComponent(username)}`;
  if (html.includes('og:url')) {
    html = html.replace(
      /(<meta\s+property="og:url"\s+content=")([^"]*?)(")/,
      `$1${canonicalUrl}$3`
    );
  } else {
    html = html.replace(
      '</head>',
      `<meta property="og:url" content="${canonicalUrl}"/>\n</head>`
    );
  }

  // Inject Person JSON-LD if we have real player data. Skipped for unknown
  // usernames so we don't ship broken structured data.
  if (player) {
    const jsonLd = playerJsonLdScript(username, player);
    html = html.replace(
      '</head>',
      `<script type="application/ld+json">${jsonLd}</script>\n</head>`
    );
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");

  return new Response(html, {
    status: response.status,
    headers,
  });
} catch (e) {
    console.error("og-rewrite edge function error:", e);
    return context.next();
  }
}

export const config = {
  path: "/player/*",
};

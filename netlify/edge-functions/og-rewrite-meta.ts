interface HeroAgg {
  hero: string;
  matches: number;
  wins: number;
  players: number;
}

interface MetaData {
  totalPlayers: number;
  totalMatches: number;
  totalHeroes: number;
  mostPlayed: HeroAgg | null;
  bestWinRate: HeroAgg | null;
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
  // Filter date patterns (contain a 4-digit year)
  if (/\b(19|20)\d{2}\b/.test(name)) return false;
  return true;
}

async function fetchMetaData(): Promise<MetaData | null> {
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

      // Try heroBreakdown array first
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
        // Fallback: use topHero field
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

    const heroList: HeroAgg[] = [...heroMap.entries()].map(([hero, d]) => ({
      hero,
      matches: d.matches,
      wins: d.wins,
      players: d.players.size,
    }));

    // Most played by total matches
    const mostPlayed = heroList.length > 0
      ? heroList.reduce((best, h) => h.matches > best.matches ? h : best)
      : null;

    // Best win rate (minimum 50 matches across community)
    const eligible = heroList.filter((h) => h.matches >= 50);
    const bestWinRate = eligible.length > 0
      ? eligible.reduce((best, h) => {
          const hWr = h.matches > 0 ? h.wins / h.matches : 0;
          const bWr = best.matches > 0 ? best.wins / best.matches : 0;
          return hWr > bWr ? h : best;
        })
      : null;

    return {
      totalPlayers: playerCount,
      totalMatches,
      totalHeroes: heroMap.size,
      mostPlayed,
      bestWinRate,
    };
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default async function handler(
  _request: Request,
  context: { next: () => Promise<Response> }
) {
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
  const meta = await fetchMetaData();

  const title = "Community Meta | FaB Stats";

  let descParts: string[] = [];
  if (meta) {
    descParts.push(`${meta.totalPlayers} players · ${meta.totalMatches.toLocaleString()} matches · ${meta.totalHeroes} heroes`);
    if (meta.mostPlayed) {
      const share = meta.totalMatches > 0 ? ((meta.mostPlayed.matches / meta.totalMatches) * 100).toFixed(1) : "0";
      descParts.push(`Most played: ${meta.mostPlayed.hero} (${share}% of matches)`);
    }
    if (meta.bestWinRate && meta.bestWinRate.matches > 0) {
      const wr = ((meta.bestWinRate.wins / meta.bestWinRate.matches) * 100).toFixed(1);
      descParts.push(`Top win rate: ${meta.bestWinRate.hero} (${wr}%)`);
    }
  } else {
    descParts.push("Hero usage and performance across the FaB Stats community.");
  }

  const desc = escapeHtml(descParts.join(" · "));
  const escapedTitle = escapeHtml(title);

  const ogImageUrl = `https://www.fabstats.net/.netlify/functions/og-image?type=meta`;

  // Replace OG meta tags
  html = html.replace(
    /(<meta\s+property="og:title"\s+content=")([^"]*?)(")/,
    `$1${escapedTitle}$3`
  );
  html = html.replace(
    /(<meta\s+property="og:description"\s+content=")([^"]*?)(")/,
    `$1${desc}$3`
  );
  html = html.replace(
    /(<meta\s+name="twitter:title"\s+content=")([^"]*?)(")/,
    `$1${escapedTitle}$3`
  );
  html = html.replace(
    /(<meta\s+name="twitter:description"\s+content=")([^"]*?)(")/,
    `$1${desc}$3`
  );
  html = html.replace(
    /(<title>)([^<]*?)(<\/title>)/,
    `$1${escapedTitle}$3`
  );

  // Replace OG image
  html = html.replace(
    /(<meta\s+property="og:image"\s+content=")([^"]*?)(")/,
    `$1${ogImageUrl}$3`
  );
  html = html.replace(
    /(<meta\s+name="twitter:image"\s+content=")([^"]*?)(")/,
    `$1${ogImageUrl}$3`
  );

  // Add OG image dimensions if not present
  if (!html.includes('og:image:width')) {
    html = html.replace(
      /(<meta\s+property="og:image"\s+content="[^"]*?"[^>]*>)/,
      `$1\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">`
    );
  }

  // Set canonical URL
  html = html.replace(
    /(<meta\s+property="og:url"\s+content=")([^"]*?)(")/,
    `$1https://www.fabstats.net/meta$3`
  );

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");

  return new Response(html, {
    status: response.status,
    headers,
  });
  } catch (e) {
    console.error("og-rewrite-meta edge function error:", e);
    return context.next();
  }
}

export const config = {
  path: "/meta",
};

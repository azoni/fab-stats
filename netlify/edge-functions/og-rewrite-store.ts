// Edge function: inject store-specific OG/meta tags for /stores/<slug> pages.
// Mirrors og-rewrite.ts (player). Runs on Deno.

interface StoreData {
  name: string;
  totalMatches: number;
  uniquePlayers: number;
  topPlayer: string | null;
  topHero: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fInt(f: any): number {
  return Number(f?.integerValue ?? f?.doubleValue ?? 0);
}

async function fetchStore(slug: string): Promise<StoreData | null> {
  const projectId = Deno.env.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const apiKey = Deno.env.get("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!projectId || !apiKey) return null;
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/storeAggregates/${encodeURIComponent(slug)}?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const doc = await res.json();
    const f = doc?.fields;
    if (!f) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const players: any[] = f.players?.arrayValue?.values || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heroes: any[] = f.heroes?.arrayValue?.values || [];
    return {
      name: f.name?.stringValue || slug,
      totalMatches: fInt(f.totalMatches),
      uniquePlayers: fInt(f.uniquePlayers),
      topPlayer: players[0]?.mapValue?.fields?.displayName?.stringValue || null,
      topHero: heroes[0]?.mapValue?.fields?.hero?.stringValue || null,
    };
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function setMeta(html: string, property: "property" | "name", key: string, value: string): string {
  const re = new RegExp(`(<meta\\s+${property}="${key}"\\s+content=")([^"]*?)(")`);
  if (re.test(html)) return html.replace(re, `$1${value}$3`);
  return html.replace("</head>", `<meta ${property}="${key}" content="${value}"/>\n</head>`);
}

export default async function handler(request: Request, context: { next: () => Promise<Response> }) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/");
  const slug = decodeURIComponent(parts[2] || "");

  // No slug → the directory page; leave its default meta alone.
  if (!slug || slug === "_") return context.next();

  let response: Response;
  try {
    response = await context.next();
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
  if (!(response.headers.get("content-type") || "").includes("text/html")) return response;

  let html: string;
  try {
    html = await response.text();
  } catch {
    return response;
  }

  try {
    const store = await fetchStore(slug);
    const name = store ? store.name : decodeURIComponent(slug);
    const title = escapeHtml(`${name} | FaB Stats`);
    const desc = store
      ? escapeHtml(
          `${store.totalMatches.toLocaleString()} matches · ${store.uniquePlayers} player${store.uniquePlayers === 1 ? "" : "s"}` +
            (store.topHero ? ` · Top hero: ${store.topHero}` : "") +
            (store.topPlayer ? ` · Most active: ${store.topPlayer}` : "") +
            " · Flesh and Blood store stats on FaB Stats",
        )
      : escapeHtml(`Flesh and Blood store stats, players, and leagues at ${name} on FaB Stats.`);
    const imageUrl = `https://www.fabstats.net/og/store/${encodeURIComponent(slug)}.png`;
    const canonicalUrl = `https://www.fabstats.net/stores/${encodeURIComponent(slug)}`;

    html = html.replace(/(<title>)([^<]*?)(<\/title>)/, `$1${title}$3`);
    html = setMeta(html, "property", "og:title", title);
    html = setMeta(html, "name", "twitter:title", title);
    html = setMeta(html, "property", "og:description", desc);
    html = setMeta(html, "name", "twitter:description", desc);
    html = setMeta(html, "property", "og:image", imageUrl);
    html = setMeta(html, "name", "twitter:image", imageUrl);
    html = setMeta(html, "property", "og:url", canonicalUrl);
    html = setMeta(html, "name", "twitter:card", "summary_large_image");
    if (!html.includes("og:image:width")) {
      html = html.replace(
        /(<meta\s+property="og:image"\s+content="[^"]*?"[^>]*>)/,
        `$1\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">`,
      );
    }

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response(html, { status: response.status, headers });
  } catch (e) {
    console.error("og-rewrite-store error:", e);
    return context.next();
  }
}

export const config = { path: "/stores/*" };

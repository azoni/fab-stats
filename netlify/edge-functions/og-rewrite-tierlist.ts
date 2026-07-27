// Edge function: inject OG/meta tags for a shared tier list — /tierlist?id=<id>.
// Runs on Deno. Private lists aren't readable unauthenticated, so their meta is left
// as the site default (no leak).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fStr(f: any): string {
  return f?.stringValue || "";
}

function env(): { projectId: string; apiKey: string } | null {
  const projectId = Deno.env.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const apiKey = Deno.env.get("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!projectId || !apiKey) return null;
  return { projectId, apiKey };
}

async function fetchDoc(path: string): Promise<Record<string, unknown> | null> {
  const e = env();
  if (!e) return null;
  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${e.projectId}/databases/(default)/documents/${path}?key=${e.apiKey}`);
    if (!res.ok) return null;
    const doc = await res.json();
    return doc?.fields || null;
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function setMeta(html: string, property: "property" | "name", key: string, value: string): string {
  // Escape `$` so a value like "$20 deck" isn't read as a replacement backreference.
  const v = value.replace(/\$/g, "$$$$");
  const re = new RegExp(`(<meta\\s+${property}="${key}"\\s+content=")([^"]*?)(")`);
  if (re.test(html)) return html.replace(re, `$1${v}$3`);
  return html.replace("</head>", `<meta ${property}="${key}" content="${v}"/>\n</head>`);
}

export default async function handler(request: Request, context: { next: () => Promise<Response> }) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";

  // Directory (/tierlist) or new-list (?new=1) → no specific list; leave default meta.
  if (!id) return context.next();

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
    const f = await fetchDoc(`tierLists/${encodeURIComponent(id)}`);
    if (!f) return new Response(html, { status: response.status, headers: response.headers });

    const name = fStr(f.title) || "Tier List";
    const owner = fStr(f.ownerName);
    const rawDesc = fStr(f.description) || `${owner ? `${owner}'s ` : ""}Flesh and Blood tier list on FaB Stats.`;

    const title = escapeHtml(`${name} | FaB Stats`);
    const desc = escapeHtml(rawDesc);
    const imageUrl = `https://www.fabstats.net/og/tierlist/${encodeURIComponent(id)}.png`;
    const canonicalUrl = `https://www.fabstats.net/tierlist?id=${encodeURIComponent(id)}`;

    html = html.replace(/(<title>)([^<]*?)(<\/title>)/, (_m, p1, _p2, p3) => p1 + title + p3);
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
    console.error("og-rewrite-tierlist error:", e);
    return new Response(html, { status: response.status, headers: response.headers });
  }
}

export const config = { path: ["/tierlist"] };

// Edge function: inject OG/meta tags for community entity pages —
// /leagues/<slug>, /teams/<slug>, /group/<slug>. Runs on Deno.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fInt(f: any): number {
  return Number(f?.integerValue ?? f?.doubleValue ?? 0);
}
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

async function fetchQuery(collection: string, field: string, value: string): Promise<Record<string, unknown> | null> {
  const e = env();
  if (!e) return null;
  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${e.projectId}/databases/(default)/documents:runQuery?key=${e.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: { stringValue: value } } }, limit: 1 } }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0]?.document?.fields || null;
  } catch {
    return null;
  }
}

interface Meta {
  ogType: string; // og image kind: league | team | group
  routePrefix: string; // url path prefix: leagues | teams | group
  name: string;
  desc: string;
}

async function resolve(kind: string, slug: string): Promise<Meta | null> {
  if (kind === "leagues") {
    const f = await fetchQuery("leagues", "slug", slug);
    const name = f ? fStr(f.name) || slug : slug;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stores: any[] = f ? (f.storeSlugs as any)?.arrayValue?.values || [] : [];
    const desc = f
      ? `${fInt(f.memberCount)} players · ${stores.length} store${stores.length === 1 ? "" : "s"} · ${fStr(f.status) || "draft"} · Flesh and Blood community league on FaB Stats`
      : `A Flesh and Blood community league on FaB Stats.`;
    return { ogType: "league", routePrefix: "leagues", name, desc };
  }
  if (kind === "teams") {
    const nameDoc = await fetchDoc(`teamnames/${encodeURIComponent(slug)}`);
    const teamId = nameDoc ? fStr(nameDoc.teamId) : "";
    const f = teamId ? await fetchDoc(`teams/${teamId}`) : null;
    const name = f ? fStr(f.name) || slug : slug;
    const desc = f ? `${fInt(f.memberCount)} members · Flesh and Blood team on FaB Stats` : `A Flesh and Blood team on FaB Stats.`;
    return { ogType: "team", routePrefix: "teams", name, desc };
  }
  if (kind === "group") {
    const nameDoc = await fetchDoc(`groupnames/${encodeURIComponent(slug)}`);
    const groupId = nameDoc ? fStr(nameDoc.groupId) : "";
    const f = groupId ? await fetchDoc(`groups/${groupId}`) : null;
    const name = f ? fStr(f.name) || slug : slug;
    const desc = f ? `${fInt(f.memberCount)} members · Flesh and Blood group on FaB Stats` : `A Flesh and Blood group on FaB Stats.`;
    return { ogType: "group", routePrefix: "group", name, desc };
  }
  return null;
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
  const kind = parts[1] || ""; // leagues | teams | group
  const slug = decodeURIComponent(parts[2] || "");

  // No slug → list/landing page; leave its default meta alone.
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
    const meta = await resolve(kind, slug);
    if (!meta) return new Response(html, { status: response.status, headers: response.headers });

    const title = escapeHtml(`${meta.name} | FaB Stats`);
    const desc = escapeHtml(meta.desc);
    const imageUrl = `https://www.fabstats.net/og/${meta.ogType}/${encodeURIComponent(slug)}.png`;
    const canonicalUrl = `https://www.fabstats.net/${meta.routePrefix}/${encodeURIComponent(slug)}`;

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
    console.error("og-rewrite-entity error:", e);
    return context.next();
  }
}

export const config = { path: ["/leagues/*", "/teams/*", "/group/*"] };

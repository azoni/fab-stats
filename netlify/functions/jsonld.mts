/**
 * Public JSON-LD endpoint — exposes any KG entity as schema.org JSON-LD.
 *
 *   GET /api/jsonld/player/{userId}
 *   GET /api/jsonld/article/{slug}
 *   GET /api/jsonld/event/{eventId}
 *   GET /api/jsonld/team/{teamId}
 *   GET /api/jsonld/hero/{heroName}
 *
 * Powers external integrations (data partners, MCP, search engines) and is the
 * verifiable public surface of the KG. Validate at https://validator.schema.org.
 *
 * Routing: see netlify.toml redirect rule mapping /api/jsonld/:type/:id to this function.
 */
import type { Context } from "@netlify/functions";
import { getAdminDb } from "./firebase-admin.ts";
import {
  playerJsonLd,
  heroJsonLd,
  eventJsonLd,
  articleJsonLd,
  teamJsonLd,
  withContext,
  type JsonLd,
} from "../../src/lib/kg/json-ld.ts";

const HEADERS = {
  "Content-Type": "application/ld+json; charset=utf-8",
  "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
  "Access-Control-Allow-Origin": "*",
};

function notFound(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 404,
    headers: { ...HEADERS, "Content-Type": "application/json" },
  });
}

function badRequest(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { ...HEADERS, "Content-Type": "application/json" },
  });
}

async function lookupPlayer(id: string): Promise<JsonLd | null> {
  const db = getAdminDb();
  // Public profile: leaderboard/{userId} OR users/{uid}/profile/main
  const lb = await db.collection("leaderboard").doc(id).get();
  if (!lb.exists) return null;
  const d = lb.data()!;
  if (d.isPublic === false || d.hideFromSpotlight) return null;

  // Pull richer social links from the public profile if present.
  let socialLinks: Record<string, string> | undefined;
  try {
    const profile = await db.doc(`users/${id}/profile/main`).get();
    if (profile.exists) {
      const sl = profile.data()?.socialLinks;
      if (sl && typeof sl === "object") socialLinks = sl as Record<string, string>;
    }
  } catch {
    // ignore — read may be denied for private profiles, that's fine
  }

  return playerJsonLd({
    id,
    username: d.username ?? "",
    displayName: d.displayName ?? "",
    photoUrl: d.photoUrl ?? null,
    socialLinks,
    teamId: d.teamId ?? null,
    teamName: d.teamName ?? null,
  });
}

async function lookupArticle(slug: string): Promise<JsonLd | null> {
  const db = getAdminDb();
  // Slug-based lookup
  const snap = await db.collection("articles").where("slug", "==", slug).limit(1).get();
  if (snap.empty) {
    // Fall back to id lookup
    const byId = await db.collection("articles").doc(slug).get();
    if (!byId.exists) return null;
    return articleFromDoc(byId.id, byId.data()!);
  }
  const doc = snap.docs[0];
  return articleFromDoc(doc.id, doc.data());
}

function articleFromDoc(id: string, d: Record<string, unknown>): JsonLd {
  return articleJsonLd({
    id,
    slug: (d.slug as string) ?? id,
    title: (d.title as string) ?? "",
    excerpt: (d.excerpt as string) ?? "",
    coverImageUrl: (d.coverImageUrl as string) ?? undefined,
    author: {
      id: (d.authorUid as string) ?? "",
      displayName: (d.authorDisplayName as string) ?? "",
      username: (d.authorUsername as string) ?? "",
    },
    publishedAt: (d.publishedAt as string) ?? (d.createdAt as string) ?? "",
    updatedAt: (d.updatedAt as string) ?? undefined,
    heroTags: (d.heroTags as string[]) ?? undefined,
  });
}

async function lookupEvent(id: string): Promise<JsonLd | null> {
  const db = getAdminDb();
  // historicalEvents collection (per CLAUDE.md naming) — try both shapes.
  const candidates = ["historicalEvents", "events", "featuredEvents"];
  for (const col of candidates) {
    const doc = await db.collection(col).doc(id).get();
    if (doc.exists) {
      const d = doc.data()!;
      return eventJsonLd({
        id,
        name: d.name ?? d.eventName ?? id,
        date: d.date ?? d.eventDate ?? "",
        format: d.format,
        eventType: d.eventType,
        venue: d.venue,
      });
    }
  }
  return null;
}

async function lookupTeam(id: string): Promise<JsonLd | null> {
  const db = getAdminDb();
  // Try ID lookup first, then teamnames slug lookup
  let doc = await db.collection("teams").doc(id).get();
  if (!doc.exists) {
    const slug = await db.collection("teamnames").doc(id).get();
    if (!slug.exists) return null;
    const teamId = slug.data()?.teamId;
    if (!teamId) return null;
    doc = await db.collection("teams").doc(teamId).get();
    if (!doc.exists) return null;
  }
  const d = doc.data()!;
  if (d.visibility === "private") return null;
  return teamJsonLd({
    id: doc.id,
    name: d.name ?? "",
    iconUrl: d.iconUrl,
    description: d.description,
    memberCount: d.memberCount,
  });
}

function lookupHero(name: string): JsonLd | null {
  // Hero data is canonical from the @flesh-and-blood/cards npm package; we
  // don't need a Firestore round-trip. For the v1 endpoint we emit a minimal
  // schema.org "Thing" stub. A richer version can hydrate from the cards pkg.
  return heroJsonLd({ name });
}

const HANDLERS: Record<string, (id: string) => Promise<JsonLd | null> | JsonLd | null> = {
  player: lookupPlayer,
  article: lookupArticle,
  event: lookupEvent,
  team: lookupTeam,
  hero: lookupHero,
};

const handler = async (req: Request, _ctx: Context): Promise<Response> => {
  void _ctx; // Context unused; netlify function signature still requires it.
  const url = new URL(req.url);
  const type = url.searchParams.get("type")?.toLowerCase();
  const id = url.searchParams.get("id");

  if (!type || !id) return badRequest("Missing 'type' or 'id' query param");
  const handler = HANDLERS[type];
  if (!handler) return badRequest(`Unknown entity type '${type}'. Valid: ${Object.keys(HANDLERS).join(", ")}`);

  try {
    const result = await handler(id);
    if (!result) return notFound(`No ${type} found with id '${id}'`);
    return new Response(JSON.stringify(withContext(result), null, 2), {
      status: 200,
      headers: HEADERS,
    });
  } catch (err) {
    console.error(`[jsonld] ${type}/${id} failed:`, err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...HEADERS, "Content-Type": "application/json" },
    });
  }
};

export default handler;

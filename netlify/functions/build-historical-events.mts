// Netlify function — aggregates sitemap-decklists into historical-events.
// Manually triggered via /.netlify/functions/build-historical-events
// Groups decklists by event, filters to major events, extracts top-8 data.

import type { Config } from "@netlify/functions";
import { getAdminDb } from "./firebase-admin.ts";

const MAJOR_EVENT_TYPES = new Set([
  "The Calling",
  "Battle Hardened",
  "Pro Tour",
  "Nationals",
  "Worlds",
]);

function inferEventType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("calling")) return "The Calling";
  if (lower.includes("battle hardened")) return "Battle Hardened";
  if (lower.includes("pro tour")) return "Pro Tour";
  if (lower.includes("world championship") || lower.includes("worlds")) return "Worlds";
  if (lower.includes("road to nationals")) return "Road to Nationals";
  if (lower.includes("nationals")) return "Nationals";
  return "";
}

function placementOrder(placement: string): number {
  const match = placement.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);
  const lower = placement.toLowerCase();
  if (lower.includes("1st") || lower === "winner") return 1;
  if (lower.includes("2nd") || lower === "finalist") return 2;
  if (lower.includes("top 4")) return 3;
  if (lower.includes("top 8")) return 5;
  if (lower.includes("top 16")) return 9;
  return 999;
}

function slugify(name: string, date: string): string {
  return `${name}-${date}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

// Normalize event names to group slight variations
function normalizeEventName(event: string): string {
  return event
    .replace(/\s*[-–—]\s*(Classic Constructed|Blitz|Living Legend|CC|Draft|Sealed|Silver Age)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface DecklistDoc {
  player: string;
  hero: string;
  placement: string;
  event: string;
  eventDate: string;
  format: string;
  country?: string;
  countryCode?: string;
  playerGemId?: string;
  url?: string;
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    const db = getAdminDb();

    // 1. Read all sitemap-decklists
    console.log("[build-historical] Reading sitemap-decklists...");
    const snap = await db.collection("sitemap-decklists").get();
    console.log(`[build-historical] Found ${snap.size} decklists`);

    // 2. Group by normalized event name
    const eventMap = new Map<string, DecklistDoc[]>();

    for (const doc of snap.docs) {
      const d = doc.data() as DecklistDoc;
      if (!d.event || !d.player) continue;

      const normalized = normalizeEventName(d.event);
      const eventType = inferEventType(normalized);
      if (!MAJOR_EVENT_TYPES.has(eventType)) continue;

      const key = normalized;
      if (!eventMap.has(key)) eventMap.set(key, []);
      eventMap.get(key)!.push(d);
    }

    console.log(`[build-historical] Found ${eventMap.size} major events`);

    // 3. Look up GEM ID → fabstats username mapping
    const gemIdSnap = await db.collection("gemIds").get();
    const gemIdToUsername = new Map<string, string>();
    for (const doc of gemIdSnap.docs) {
      const data = doc.data();
      if (data.username) {
        gemIdToUsername.set(doc.id, data.username);
      }
    }

    // 4. Build historical events and batch write
    let batch = db.batch();
    let count = 0;
    let totalEvents = 0;

    for (const [eventName, decklists] of eventMap) {
      // Sort by placement
      decklists.sort((a, b) => placementOrder(a.placement) - placementOrder(b.placement));

      // Take top 8 (or all if fewer)
      const top8 = decklists.slice(0, 8);
      const first = top8[0];
      const eventType = inferEventType(eventName);
      const date = first.eventDate || "";

      const slug = slugify(eventName, date);

      const players = top8.map((d) => ({
        placement: d.placement || "",
        name: d.player,
        hero: d.hero || "",
        country: d.countryCode || d.country || "",
        decklistUrl: d.url || "",
        fabstatsUsername: d.playerGemId ? gemIdToUsername.get(d.playerGemId) || "" : "",
      }));

      const eventDoc = {
        name: eventName,
        date,
        format: first.format || "",
        eventType,
        totalDecklists: decklists.length,
        top8: players,
        updatedAt: new Date().toISOString(),
      };

      batch.set(db.collection("historical-events").doc(slug), eventDoc);
      count++;
      totalEvents++;

      if (count >= 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) await batch.commit();

    console.log(`[build-historical] Wrote ${totalEvents} historical events`);

    return new Response(
      JSON.stringify({ success: true, eventsWritten: totalEvents }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[build-historical] Error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const config: Config = {};

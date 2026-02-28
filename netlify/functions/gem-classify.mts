// Netlify serverless function that uses Claude Haiku to classify
// raw text blocks from GEM event pages into structured event metadata.

import { verifyFirebaseToken } from "./verify-auth.ts";

interface EventTextBlocks {
  textBlocks: string[];
}

interface ClassifiedEvent {
  name: string;
  date: string;
  venue: string;
  eventType: string;
  format: string;
  rated: boolean;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async function handler(req: Request) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  // Verify Firebase authentication
  const uid = await verifyFirebaseToken(req);
  if (!uid) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "API key not configured" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const events: EventTextBlocks[] = body?.events;

    if (!Array.isArray(events) || events.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing events array" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Cap at 30 events per request to limit cost
    const capped = events.slice(0, 30);

    // Build the prompt with all events
    const eventsText = capped
      .map((e, i) => {
        const lines = e.textBlocks
          .map((b, j) => `  ${j + 1}. "${b}"`)
          .join("\n");
        return `Event ${i + 1}:\n${lines}`;
      })
      .join("\n\n");

    const systemPrompt = `You classify text blocks scraped from Flesh and Blood TCG (FaB) tournament pages on GEM (gem.fabtcg.com). Each event has ordered text lines extracted from the page before the match table.

Your job: identify which line is the event name, date, venue, event type, format, and rated status.

Rules:
- name: The tournament name (e.g. "PTI Sunday", "Armory Night CC", "Battle Hardened Sydney"). NOT the event type description.
- date: Return as YYYY-MM-DD. Parse from full month names ("September 17, 2023") or abbreviated ("Sep. 16, 2023").
- venue: The store/location name (e.g. "FaB Foundry", "Good Games Melbourne"). NOT the city.
- eventType: One of: Armory, Skirmish, ProQuest, Road to Nationals, Battle Hardened, The Calling, Nationals, Pro Tour, Worlds, Championship, Pre-Release, On Demand, Other
- format: One of: Classic Constructed, Blitz, Draft, Sealed, Clash, Ultimate Pit Fight, Silver Age, Other
- rated: true if rated, false if "Not rated" or unspecified

Return a JSON array with one object per event. Only return the JSON array, no other text.`;

    const userPrompt = `Classify these ${capped.length} event(s):\n\n${eventsText}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic API error:", res.status, errText);
      return new Response(
        JSON.stringify({ error: "Classification failed" }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text || "[]";

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    let classified: ClassifiedEvent[];
    try {
      classified = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse Haiku response:", jsonStr);
      return new Response(
        JSON.stringify({ error: "Invalid response format" }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ events: classified }), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("gem-classify error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
}

// Netlify serverless function that uses Claude's vision to extract
// GEM event text from a screenshot, returning it in a format that
// parseSingleEventPaste can parse.

import { verifyFirebaseToken } from "./verify-auth.ts";

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4 MB base64 limit

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async function handler(req: Request) {
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
    const image: string = body?.image;

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Missing image data" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Reject oversized images to prevent API cost abuse
    if (image.length > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: "Image too large. Maximum size is 4 MB." }),
        { status: 413, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Detect media type from base64 header or default to jpeg
    let mediaType = "image/jpeg";
    if (image.startsWith("/9j/")) mediaType = "image/jpeg";
    else if (image.startsWith("iVBOR")) mediaType = "image/png";
    else if (image.startsWith("R0lG")) mediaType = "image/gif";
    else if (image.startsWith("UklG")) mediaType = "image/webp";

    const systemPrompt = `You extract text from screenshots of Flesh and Blood TCG event pages on GEM (gem.fabtcg.com).

Given a screenshot of a GEM event page, extract the event details and match results as plain text in EXACTLY this format:

Event Name
Month Day, Year
Venue Name
Format (e.g. Classic Constructed, Blitz, Sealed, Draft, Clash)
Rated or Not Rated
1  Opponent Name (GEM ID)  Win/Loss/Draw
2  Opponent Name (GEM ID)  Win/Loss/Draw
...

Rules:
- The event name is usually at the top of the page in large text
- The date should be in full format: "February 26, 2026"
- Each match row must be: round number, two spaces, opponent name with GEM ID in parentheses, two spaces, result
- Results must be exactly "Win", "Loss", or "Draw"
- If a round is a Bye, write: round number, two spaces, "Bye"
- Include ALL rounds visible in the screenshot
- If you can see playoff rounds (Top 8, Top 4, Finals), include them with their labels instead of round numbers
- Only output the extracted text, nothing else — no explanations, no markdown`;

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
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: image,
                },
              },
              {
                type: "text",
                text: "Extract the event details and match results from this GEM screenshot.",
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic API error:", res.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to process screenshot" }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text || "";

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("ocr-event error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
}

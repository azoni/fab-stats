// Netlify serverless function that fetches tournament top-8 data
// from fabtcgmeta.com and returns structured event data for the admin panel.

interface RawDecklist {
  name: string;        // "Jacob Clements - Kano"
  hero: string;        // "Kano"
  format: string;      // "CC"
  result: string;      // "1st"
  date: string;        // "2026-02-14"
  event: string;       // "Calling: San Diego"
  url: string;
  eventUrl: string;
}

interface LookupPlayer {
  name: string;
  hero: string;
  result: string;
}

interface LookupEvent {
  name: string;
  date: string;
  format: string;
  eventType: string;
  players: LookupPlayer[];
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const FORMAT_MAP: Record<string, string> = {
  CC: "Classic Constructed",
  Blitz: "Blitz",
  SA: "Silver Age",
  Draft: "Draft",
  Sealed: "Sealed",
  LL: "Classic Constructed", // Living Legend events were CC
};

function inferEventType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("calling")) return "The Calling";
  if (lower.includes("battle hardened")) return "Battle Hardened";
  if (lower.includes("pro tour")) return "Pro Tour";
  if (lower.includes("road to nationals")) return "Road to Nationals";
  if (lower.includes("nationals")) return "Nationals";
  if (lower.includes("proquest")) return "ProQuest";
  if (lower.includes("skirmish")) return "Skirmish";
  if (lower.includes("armory")) return "Armory";
  if (lower.includes("worlds")) return "Worlds";
  if (lower.includes("showdown")) return "Skirmish";
  return "";
}

function resultOrder(result: string): number {
  const match = result.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 999;
}

function extractPlayerName(raw: string): string {
  // "Jacob Clements - Kano" → "Jacob Clements"
  const dashIdx = raw.lastIndexOf(" - ");
  return dashIdx > 0 ? raw.substring(0, dashIdx).trim() : raw;
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  try {
    const res = await fetch("https://fabtcgmeta.com/en/decklists/", {
      headers: {
        "User-Agent": "FaBStats/1.0 (fabstats.net)",
        Accept: "text/html",
      },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch data source" }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const html = await res.text();

    // Extract the initialDecklists JSON from the Next.js RSC payload
    // The data is in escaped JSON within self.__next_f.push() calls
    // Pattern: "initialDecklists":[ ... ],"initialEvents"
    let decklists: RawDecklist[] = [];

    // Try unescaped first (SSR HTML), then escaped (RSC stream)
    const patterns = [
      /"initialDecklists"\s*:\s*(\[[\s\S]*?\])\s*,\s*"initialEvents"/,
      /\\"initialDecklists\\":\s*(\[[\s\S]*?\])\s*,\s*\\"initialEvents\\"/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        let jsonStr = match[1];
        // Unescape if from RSC stream
        if (pattern.source.includes("\\\\")) {
          jsonStr = jsonStr.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
        }
        try {
          decklists = JSON.parse(jsonStr);
          break;
        } catch {
          // Try next pattern
        }
      }
    }

    if (decklists.length === 0) {
      return new Response(
        JSON.stringify({ error: "Could not parse event data" }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Filter out entries without event names
    const withEvents = decklists.filter((d) => d.event && d.event.trim() !== "");

    // Group by event name
    const eventMap = new Map<string, RawDecklist[]>();
    for (const d of withEvents) {
      const key = d.event;
      if (!eventMap.has(key)) eventMap.set(key, []);
      eventMap.get(key)!.push(d);
    }

    // Build structured events
    const events: LookupEvent[] = [];
    for (const [eventName, entries] of eventMap) {
      // Sort by placement
      entries.sort((a, b) => resultOrder(a.result) - resultOrder(b.result));

      const first = entries[0];
      events.push({
        name: eventName,
        date: first.date,
        format: FORMAT_MAP[first.format] || first.format,
        eventType: inferEventType(eventName),
        players: entries.map((e) => ({
          name: extractPlayerName(e.name),
          hero: e.hero,
          result: e.result,
        })),
      });
    }

    // Sort events by date descending (most recent first)
    events.sort((a, b) => b.date.localeCompare(a.date));

    return new Response(JSON.stringify({ events }), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=600", // 10 min cache
      },
    });
  } catch (err) {
    console.error("event-lookup error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
}

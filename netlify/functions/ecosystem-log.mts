// Netlify serverless function — forwards activity events to the Azoni MCP ecosystem.

const MCP_URL = process.env.MCP_URL || "https://azoni-mcp.onrender.com";
const MCP_ADMIN_KEY = process.env.MCP_ADMIN_KEY;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function clamp(value: unknown, fallback: string, maxLen = 180): string {
  const v = typeof value === "string" ? value.trim() : "";
  return (v || fallback).slice(0, maxLen);
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const type = clamp(body.type, "fabstats_activity", 64);
    const title = clamp(body.title, "Activity", 120);
    const description = clamp(body.description, "", 500);

    if (MCP_ADMIN_KEY) {
      await fetch(`${MCP_URL}/activity/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MCP_ADMIN_KEY}`,
        },
        body: JSON.stringify({ type, title, source: "fabstats", description }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
}

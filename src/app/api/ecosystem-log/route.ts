import { NextResponse } from "next/server";

const MCP_URL = process.env.MCP_URL || "https://azoni-mcp.onrender.com";
const MCP_ADMIN_KEY = process.env.MCP_ADMIN_KEY;

function clampString(value: unknown, fallback: string, maxLen = 180) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return fallback;
  return v.slice(0, maxLen);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type = clampString(body.type, "fabstats_activity", 64);
    const title = clampString(body.title, "Activity", 120);
    const description = clampString(body.description, "", 500);

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

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

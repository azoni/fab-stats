import { NextResponse } from "next/server";

const MCP_URL = process.env.MCP_URL || "https://azoni-mcp.onrender.com";
const MCP_ADMIN_KEY = process.env.MCP_ADMIN_KEY;

export async function POST(req: Request) {
  if (!MCP_ADMIN_KEY) return NextResponse.json({ ok: true });

  try {
    const body = await req.json();
    await fetch(`${MCP_URL}/activity/log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MCP_ADMIN_KEY}`,
      },
      body: JSON.stringify({
        type: body.type || "fabstats_activity",
        title: body.title || "Activity",
        source: "fabstats",
        description: body.description || "",
      }),
    });
  } catch {
    // Fire and forget
  }

  return NextResponse.json({ ok: true });
}

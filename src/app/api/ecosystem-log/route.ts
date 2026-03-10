import { NextResponse } from "next/server";

const MCP_URL = process.env.MCP_URL || "https://azoni-mcp.onrender.com";
const MCP_ADMIN_KEY = process.env.MCP_ADMIN_KEY;
const AZONI_ACTIVITY_WEBHOOK_URL =
  process.env.AZONI_ACTIVITY_WEBHOOK_URL ||
  "https://azoni.ai/.netlify/functions/log-agent-activity";
const AGENT_WEBHOOK_SECRET = process.env.AGENT_WEBHOOK_SECRET;

const AZONI_FIREBASE_PROJECT_ID =
  process.env.AZONI_FIREBASE_PROJECT_ID || "azoni-ai-7abdd";
const AZONI_FIREBASE_API_KEY =
  process.env.AZONI_FIREBASE_API_KEY || "AIzaSyCwAemduEmk58XsdvNXKa9EDphRm_xHpOQ";

function clampString(value: unknown, fallback: string, maxLen = 180) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return fallback;
  return v.slice(0, maxLen);
}

async function sendToAzoniWebhook(type: string, title: string, description: string) {
  if (!AGENT_WEBHOOK_SECRET) return false;

  const res = await fetch(AZONI_ACTIVITY_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      title,
      source: "fabstats",
      description,
      secret: AGENT_WEBHOOK_SECRET,
    }),
  });

  return res.ok;
}

async function sendToMcp(type: string, title: string, description: string) {
  if (!MCP_ADMIN_KEY) return false;

  const res = await fetch(`${MCP_URL}/activity/log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MCP_ADMIN_KEY}`,
    },
    body: JSON.stringify({
      type,
      title,
      source: "fabstats",
      description,
    }),
  });

  return res.ok;
}

// Last-resort fallback when no webhook keys are configured.
// Uses Firestore REST and existing public rules for agent_activity.
async function sendDirectToActivityFeed(type: string, title: string, description: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${AZONI_FIREBASE_PROJECT_ID}/databases/(default)/documents/agent_activity?key=${AZONI_FIREBASE_API_KEY}`;
  const body = {
    fields: {
      type: { stringValue: type },
      title: { stringValue: title },
      source: { stringValue: "fabstats" },
      description: { stringValue: description },
      timestamp: { timestampValue: new Date().toISOString() },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return res.ok;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const type = clampString(body.type, "fabstats_activity", 64);
    const title = clampString(body.title, "Activity", 120);
    const description = clampString(body.description, "", 500);

    const routed = [];

    if (await sendToAzoniWebhook(type, title, description)) {
      routed.push("azoni-webhook");
    }

    if (await sendToMcp(type, title, description)) {
      routed.push("mcp");
    }

    if (!routed.length && await sendDirectToActivityFeed(type, title, description)) {
      routed.push("firestore-rest");
    }

    return NextResponse.json({ ok: true, routed });
  } catch {
    // Fire and forget
  }

  return NextResponse.json({ ok: true });
}

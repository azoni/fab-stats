/**
 * AI Insights — admin-only, Netlify-native. The agent loop runs HERE, using the
 * Anthropic key already in Netlify env, the admin Firestore, and the
 * Firestore-vector knowledge base. No separate service, no Postgres.
 */
import { verifyFirebaseToken } from "./verify-auth.js";
import { isAdminEmail } from "./lib/admin-check.ts";
import { getAdminDb } from "./firebase-admin.ts";
import { ask } from "./lib/agent/core.ts";
import { AI_MODELS, DEFAULT_AI_MODEL } from "../../src/lib/ai-models.ts";
import type { Firestore } from "firebase-admin/firestore";

/** The admin-selected model (admin/aiConfig), validated; falls back to default. */
async function getAiModel(db: Firestore): Promise<string> {
  try {
    const snap = await db.doc("admin/aiConfig").get();
    const m = snap.data()?.model;
    if (typeof m === "string" && AI_MODELS.some((x) => x.id === m)) return m;
  } catch {
    /* fall through */
  }
  return process.env.FAB_AGENT_MODEL || DEFAULT_AI_MODEL;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: "Assistant not configured (ANTHROPIC_API_KEY missing)." }, 503);

  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const question = (body.question ?? "").trim();
  if (!question) return json({ error: "question is required" }, 400);
  if (question.length > 1000) return json({ error: "question too long" }, 400);

  // Admin-only beta.
  const auth = await verifyFirebaseToken(req);
  if (!auth) return json({ error: "Sign in required." }, 401);
  if (!(await isAdminEmail(auth.email))) return json({ error: "The assistant is in a private admin beta." }, 403);

  const db = getAdminDb();
  const model = await getAiModel(db);
  const t0 = Date.now();
  try {
    const result = await ask(question, { uid: auth.uid, db, model });
    const latencyMs = Date.now() - t0;

    // Best-effort trace for the admin AI monitor (never fails the response).
    db.collection("aiTraces")
      .add({
        ts: new Date().toISOString(),
        surface: "web",
        model,
        email: auth.email,
        question: question.slice(0, 500),
        answer: result.answer.slice(0, 2000),
        tools: result.toolsUsed,
        citations: result.citations.length,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        costUsd: result.usage.costUsd,
        latencyMs,
        ok: true,
      })
      .catch(() => {});

    return json({
      answer: result.answer,
      citations: result.citations,
      toolsUsed: result.toolsUsed,
      traceId: result.traceId,
      usage: result.usage,
    });
  } catch (e) {
    console.error("ai-insights error:", e);
    db.collection("aiTraces")
      .add({ ts: new Date().toISOString(), surface: "web", model, email: auth.email, question: question.slice(0, 500), latencyMs: Date.now() - t0, ok: false, error: (e as Error)?.message?.slice(0, 300) })
      .catch(() => {});
    return json({ error: "The assistant hit an error. Please try again.", detail: (e as Error)?.message?.slice(0, 200) }, 500);
  }
}

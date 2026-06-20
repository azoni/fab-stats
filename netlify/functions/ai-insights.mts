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
import { readAiConfig, getUsage } from "./lib/ai-usage.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Validate client-supplied history → clean alternating turns starting with user. */
function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: ChatTurn[] = [];
  for (const item of raw) {
    const role = (item as { role?: unknown })?.role;
    const content = (item as { content?: unknown })?.content;
    if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
      turns.push({ role, content: content.slice(0, 4000) });
    }
  }
  const out: ChatTurn[] = [];
  for (const t of turns) {
    const last = out[out.length - 1];
    if (last && last.role === t.role) continue; // no consecutive same-role
    if (out.length === 0 && t.role !== "user") continue; // must start with user
    out.push(t);
  }
  let capped = out.slice(-12); // bound token cost (also enforced by the budget cap)
  if (capped[0]?.role === "assistant") capped = capped.slice(1);
  return capped;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: "Assistant not configured (ANTHROPIC_API_KEY missing)." }, 503);

  let body: { question?: string; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const question = (body.question ?? "").trim();
  if (!question) return json({ error: "question is required" }, 400);
  if (question.length > 1000) return json({ error: "question too long" }, 400);
  const history = sanitizeHistory(body.history);

  // Admin-only beta.
  const auth = await verifyFirebaseToken(req);
  if (!auth) return json({ error: "Sign in required." }, 401);
  if (!(await isAdminEmail(auth.email))) return json({ error: "The assistant is in a private admin beta." }, 403);

  const db = getAdminDb();
  const cfg = await readAiConfig(db);
  const model = cfg.model && AI_MODELS.some((m) => m.id === cfg.model) ? cfg.model : process.env.FAB_AGENT_MODEL || DEFAULT_AI_MODEL;

  // Enforce admin budget / rate caps before spending anything.
  if (cfg.monthlyBudgetUsd != null || cfg.dailyQueryLimit != null) {
    const usage = await getUsage(db);
    if (cfg.monthlyBudgetUsd != null && usage.monthSpendUsd >= cfg.monthlyBudgetUsd) {
      return json({ error: `The monthly AI budget ($${cfg.monthlyBudgetUsd}) has been reached. Raise it in Admin → AI.` }, 429);
    }
    if (cfg.dailyQueryLimit != null && usage.todayCount >= cfg.dailyQueryLimit) {
      return json({ error: `The daily query limit (${cfg.dailyQueryLimit}) has been reached. Raise it in Admin → AI or try tomorrow.` }, 429);
    }
  }

  const t0 = Date.now();
  try {
    const result = await ask(question, { uid: auth.uid, db, model, history });
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

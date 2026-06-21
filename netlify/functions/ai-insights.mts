/**
 * AI Insights — admin-only, Netlify-native. The agent loop runs HERE, using the
 * Anthropic key already in Netlify env, the admin Firestore, and the
 * Firestore-vector knowledge base. No separate service, no Postgres.
 *
 * Two response modes share all the auth/cap/trace logic:
 *  - JSON   (default)        — one `{ answer, citations, ... }` body.
 *  - SSE    (`stream: true`) — `text/event-stream` of start/status/reset/delta/
 *                              done events. Same tokens & cost, streamed live.
 */
import { verifyFirebaseToken } from "./verify-auth.js";
import { isAdminEmail } from "./lib/admin-check.ts";
import { getAdminDb } from "./firebase-admin.ts";
import { ask, askStream } from "./lib/agent/core.ts";
import type { AskResult } from "./lib/agent/defs.ts";
import { AI_MODELS, DEFAULT_AI_MODEL } from "../../src/lib/ai-models.ts";
import { readAiConfig, getUsage } from "./lib/ai-usage.ts";
import type { Firestore } from "firebase-admin/firestore";

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

/** Best-effort trace for the admin AI monitor (never throws into the response path). */
function writeOkTrace(db: Firestore, fields: { model: string; email: string | null; question: string; result: AskResult; latencyMs: number }): void {
  db.collection("aiTraces")
    .add({
      ts: new Date().toISOString(),
      surface: "web",
      model: fields.model,
      email: fields.email,
      question: fields.question.slice(0, 500),
      answer: fields.result.answer.slice(0, 2000),
      tools: fields.result.toolsUsed,
      citations: fields.result.citations.length,
      inputTokens: fields.result.usage.inputTokens,
      outputTokens: fields.result.usage.outputTokens,
      costUsd: fields.result.usage.costUsd,
      latencyMs: fields.latencyMs,
      ok: true,
    })
    .catch(() => {});
}

function writeErrTrace(db: Firestore, fields: { model: string; email: string | null; question: string; latencyMs: number; error: string }): void {
  db.collection("aiTraces")
    .add({ ts: new Date().toISOString(), surface: "web", model: fields.model, email: fields.email, question: fields.question.slice(0, 500), latencyMs: fields.latencyMs, ok: false, error: fields.error.slice(0, 300) })
    .catch(() => {});
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: "Assistant not configured (ANTHROPIC_API_KEY missing)." }, 503);

  let body: { question?: string; history?: unknown; stream?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const question = (body.question ?? "").trim();
  if (!question) return json({ error: "question is required" }, 400);
  if (question.length > 1000) return json({ error: "question too long" }, 400);
  const history = sanitizeHistory(body.history);
  const wantStream = body.stream === true;

  // Admin-only beta.
  const auth = await verifyFirebaseToken(req);
  if (!auth) return json({ error: "Sign in required." }, 401);
  if (!(await isAdminEmail(auth.email))) return json({ error: "The assistant is in a private admin beta." }, 403);

  const db = getAdminDb();
  const cfg = await readAiConfig(db);
  const model = cfg.model && AI_MODELS.some((m) => m.id === cfg.model) ? cfg.model : process.env.FAB_AGENT_MODEL || DEFAULT_AI_MODEL;

  // Enforce admin budget / rate caps before spending anything. (Pre-stream, so
  // the client gets a clean non-200 JSON error rather than a half-open stream.)
  if (cfg.monthlyBudgetUsd != null || cfg.dailyQueryLimit != null) {
    const usage = await getUsage(db);
    if (cfg.monthlyBudgetUsd != null && usage.monthSpendUsd >= cfg.monthlyBudgetUsd) {
      return json({ error: `The monthly AI budget ($${cfg.monthlyBudgetUsd}) has been reached. Raise it in Admin → AI.` }, 429);
    }
    if (cfg.dailyQueryLimit != null && usage.todayCount >= cfg.dailyQueryLimit) {
      return json({ error: `The daily query limit (${cfg.dailyQueryLimit}) has been reached. Raise it in Admin → AI or try tomorrow.` }, 429);
    }
  }

  // ── Streaming (SSE) path ────────────────────────────────────────────────
  if (wantStream) {
    const encoder = new TextEncoder();
    const ac = new AbortController();
    const t0 = Date.now();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let open = true;
        const send = (event: unknown) => {
          if (!open) return;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch {
            open = false; // controller closed (client gone)
          }
        };
        send({ type: "start" }); // flip the client to "thinking" immediately
        try {
          const result = await askStream(question, { uid: auth.uid, db, model, history, signal: ac.signal }, send);
          send({ type: "done", answer: result.answer, citations: result.citations, toolsUsed: result.toolsUsed, traceId: result.traceId, usage: result.usage });
          writeOkTrace(db, { model, email: auth.email, question, result, latencyMs: Date.now() - t0 });
        } catch (e) {
          if (!ac.signal.aborted) {
            console.error("ai-insights stream error:", e);
            send({ type: "error", error: "The assistant hit an error. Please try again." });
            writeErrTrace(db, { model, email: auth.email, question, latencyMs: Date.now() - t0, error: (e as Error)?.message ?? String(e) });
          }
        } finally {
          open = false;
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      },
      cancel() {
        ac.abort(); // client disconnected → stop generating (and stop billing)
      },
    });
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        ...CORS,
      },
    });
  }

  // ── JSON path (fallback / programmatic callers) ─────────────────────────
  const t0 = Date.now();
  try {
    const result = await ask(question, { uid: auth.uid, db, model, history });
    writeOkTrace(db, { model, email: auth.email, question, result, latencyMs: Date.now() - t0 });
    return json({ answer: result.answer, citations: result.citations, toolsUsed: result.toolsUsed, traceId: result.traceId, usage: result.usage });
  } catch (e) {
    console.error("ai-insights error:", e);
    writeErrTrace(db, { model, email: auth.email, question, latencyMs: Date.now() - t0, error: (e as Error)?.message ?? String(e) });
    return json({ error: "The assistant hit an error. Please try again.", detail: (e as Error)?.message?.slice(0, 200) }, 500);
  }
}

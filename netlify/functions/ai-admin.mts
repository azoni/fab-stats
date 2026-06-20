/**
 * Admin AI ops — monitoring + model config. Admin-only (Firebase token + admin
 * email). Powers the /admin/ai panel.
 *
 *   POST { action: "stats" }            -> { config, summary, traces }
 *   POST { action: "set-model", model } -> { ok, model }
 */
import { verifyFirebaseToken } from "./verify-auth.js";
import { isAdminEmail } from "./lib/admin-check.ts";
import { getAdminDb } from "./firebase-admin.ts";
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

interface TraceDoc {
  ts?: string;
  model?: string;
  question?: string;
  answer?: string;
  tools?: string[];
  citations?: number;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  latencyMs?: number;
  ok?: boolean;
  error?: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await verifyFirebaseToken(req);
  if (!auth) return json({ error: "Sign in required." }, 401);
  if (!(await isAdminEmail(auth.email))) return json({ error: "Admins only." }, 403);

  let body: { action?: string; model?: string; monthlyBudgetUsd?: number | null; dailyQueryLimit?: number | null };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const db = getAdminDb();

  // ── set the agent model ──
  if (body.action === "set-model") {
    const model = body.model;
    if (!model || !AI_MODELS.some((m) => m.id === model)) return json({ error: "Unknown model" }, 400);
    await db.doc("admin/aiConfig").set({ model, updatedAt: new Date().toISOString(), updatedBy: auth.email }, { merge: true });
    return json({ ok: true, model });
  }

  // ── set budget / rate caps (a value <= 0 or null clears the cap) ──
  if (body.action === "set-limits") {
    const clean = (v: number | null | undefined): number | null => (typeof v === "number" && v > 0 ? v : null);
    await db.doc("admin/aiConfig").set(
      {
        monthlyBudgetUsd: clean(body.monthlyBudgetUsd),
        dailyQueryLimit: body.dailyQueryLimit && body.dailyQueryLimit > 0 ? Math.floor(body.dailyQueryLimit) : null,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.email,
      },
      { merge: true },
    );
    return json({ ok: true });
  }

  // ── stats (default) ──
  const cfg = await readAiConfig(db);
  const model = cfg.model && AI_MODELS.some((m) => m.id === cfg.model) ? cfg.model : DEFAULT_AI_MODEL;
  const usage = await getUsage(db);

  const snap = await db.collection("aiTraces").orderBy("ts", "desc").limit(200).get();
  const docs = snap.docs.map((d) => d.data() as TraceDoc);

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const byModel: Record<string, { count: number; costUsd: number }> = {};
  let totalCost = 0;
  let totalLatency = 0;
  let latencyN = 0;
  let last7dCost = 0;
  let errors = 0;
  for (const t of docs) {
    totalCost += t.costUsd ?? 0;
    if (typeof t.latencyMs === "number") {
      totalLatency += t.latencyMs;
      latencyN++;
    }
    if (t.ok === false) errors++;
    const m = t.model ?? "unknown";
    (byModel[m] ??= { count: 0, costUsd: 0 }).count++;
    byModel[m]!.costUsd += t.costUsd ?? 0;
    if (t.ts && now - Date.parse(t.ts) < 7 * dayMs) last7dCost += t.costUsd ?? 0;
  }

  return json({
    config: { model, monthlyBudgetUsd: cfg.monthlyBudgetUsd ?? null, dailyQueryLimit: cfg.dailyQueryLimit ?? null },
    summary: {
      total: docs.length,
      totalCostUsd: totalCost,
      avgLatencyMs: latencyN ? Math.round(totalLatency / latencyN) : 0,
      last7dCostUsd: last7dCost,
      errors,
      byModel,
      monthSpendUsd: usage.monthSpendUsd,
      monthCount: usage.monthCount,
      todayCount: usage.todayCount,
      todaySpendUsd: usage.todaySpendUsd,
    },
    traces: docs.slice(0, 50).map((t) => ({
      ts: t.ts,
      model: t.model,
      question: t.question,
      tools: t.tools ?? [],
      citations: t.citations ?? 0,
      costUsd: t.costUsd ?? 0,
      latencyMs: t.latencyMs ?? 0,
      ok: t.ok !== false,
      error: t.error,
    })),
  });
}

/**
 * AI config + usage helpers shared by ai-insights (enforcement) and ai-admin
 * (display). Usage is derived from the aiTraces collection (UTC month/day).
 */
import type { Firestore } from "firebase-admin/firestore";

export interface RawAiConfig {
  model?: string;
  monthlyBudgetUsd?: number;
  dailyQueryLimit?: number;
}

export interface AiUsage {
  monthSpendUsd: number;
  monthCount: number;
  todayCount: number;
  todaySpendUsd: number;
}

export async function readAiConfig(db: Firestore): Promise<RawAiConfig> {
  try {
    const snap = await db.doc("admin/aiConfig").get();
    const d = (snap.data() ?? {}) as Record<string, unknown>;
    return {
      model: typeof d.model === "string" ? d.model : undefined,
      monthlyBudgetUsd: typeof d.monthlyBudgetUsd === "number" ? d.monthlyBudgetUsd : undefined,
      dailyQueryLimit: typeof d.dailyQueryLimit === "number" ? d.dailyQueryLimit : undefined,
    };
  } catch {
    return {};
  }
}

export async function getUsage(db: Firestore): Promise<AiUsage> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

  const snap = await db.collection("aiTraces").where("ts", ">=", monthStart).limit(5000).get();
  let monthSpend = 0;
  let todayCount = 0;
  let todaySpend = 0;
  for (const doc of snap.docs) {
    const t = doc.data() as { ts?: string; costUsd?: number };
    monthSpend += t.costUsd ?? 0;
    if ((t.ts ?? "") >= todayStart) {
      todayCount++;
      todaySpend += t.costUsd ?? 0;
    }
  }
  return { monthSpendUsd: monthSpend, monthCount: snap.size, todayCount, todaySpendUsd: todaySpend };
}

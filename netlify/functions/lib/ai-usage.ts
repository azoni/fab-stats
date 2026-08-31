/**
 * AI config + usage helpers shared by ai-insights (enforcement) and ai-admin
 * (display). Usage is derived from the aiTraces collection (UTC month/day).
 */
import type { Firestore } from "firebase-admin/firestore";

export interface RawAiConfig {
  model?: string;
  monthlyBudgetUsd?: number;
  dailyQueryLimit?: number;
  /** Per-user daily query cap for non-admin users (0 disables non-admin access). */
  perUserDailyLimit?: number;
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
      perUserDailyLimit: typeof d.perUserDailyLimit === "number" ? d.perUserDailyLimit : undefined,
    };
  } catch {
    return {};
  }
}

function utcDateStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

/** How many queries this uid has made today (UTC), from the per-user counter doc. */
export async function getUserTodayCount(db: Firestore, uid: string): Promise<number> {
  try {
    const snap = await db.doc(`aiUserDaily/${uid}_${utcDateStr()}`).get();
    const d = (snap.data() ?? {}) as { count?: number };
    return typeof d.count === "number" ? d.count : 0;
  } catch {
    return 0;
  }
}

/** Increment this uid's daily counter (called before spending, so parallel
 *  requests can't slip past the cap by racing the trace write). */
export async function bumpUserDailyCount(db: Firestore, uid: string): Promise<void> {
  const { FieldValue } = await import("firebase-admin/firestore");
  await db
    .doc(`aiUserDaily/${uid}_${utcDateStr()}`)
    .set({ count: FieldValue.increment(1), updatedAt: new Date().toISOString() }, { merge: true });
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

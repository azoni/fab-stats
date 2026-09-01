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

/**
 * Atomically claim one of this uid's daily query slots (UTC day). Runs a
 * transaction on aiUserDaily/{uid}_{date} so concurrent requests serialize —
 * a check-then-increment here would let a parallel burst blow past the cap.
 * Returns false when the cap is already spent.
 */
export async function takeUserDailySlot(db: Firestore, uid: string, limit: number): Promise<boolean> {
  const ref = db.doc(`aiUserDaily/${uid}_${utcDateStr()}`);
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const count = typeof snap.data()?.count === "number" ? (snap.data()!.count as number) : 0;
      if (count >= limit) return false;
      tx.set(ref, { count: count + 1, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    });
  } catch {
    // Contention/transport failure: fail closed rather than granting free slots.
    return false;
  }
}

export async function getUsage(db: Firestore): Promise<AiUsage> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

  // Only the two fields summed below — traces carry the full question/answer.
  const snap = await db.collection("aiTraces").where("ts", ">=", monthStart).select("ts", "costUsd").limit(5000).get();
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

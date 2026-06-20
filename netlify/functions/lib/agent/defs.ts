/** Agent type defs (web/Netlify-native build). */
import type { Firestore } from "firebase-admin/firestore";

export interface Citation {
  id: string;
  label: string;
  url?: string | null;
  kind: "kb" | "computed";
}

/** Injected into every tool handler. `db` is the admin Firestore; `uid` is the
 *  authenticated (admin) user resolved at the edge. */
export interface ToolContext {
  uid: string | null;
  db: Firestore;
  trace: (event: { type: string; data: unknown }) => void;
}

export interface ToolOutput {
  data: unknown;
  citations?: Citation[];
}

export interface Tool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  handler: (input: Record<string, unknown>, ctx: ToolContext) => Promise<ToolOutput>;
}

export interface AskResult {
  answer: string;
  citations: Citation[];
  toolsUsed: string[];
  traceId: string;
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
}

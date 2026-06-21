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

/**
 * Events streamed out of `askStream` while the agent runs.
 * - `delta`  — a chunk of model-generated answer text (append to the bubble)
 * - `status` — a short human label for what the agent is doing (a tool round)
 * - `reset`  — discard any answer text streamed so far (it was tool-call
 *              preamble, not the final answer); fall back to the status line
 * The transport layer adds `start`/`done`/`error` envelope events around these.
 */
export type AgentEvent = { type: "delta"; text: string } | { type: "status"; value: string } | { type: "reset" };

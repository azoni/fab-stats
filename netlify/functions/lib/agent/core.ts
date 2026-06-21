/**
 * Agentic tool-use loop (Netlify-native build). Runs inside the ai-insights
 * function — uses the Anthropic key already on Netlify, the admin Firestore,
 * and the Firestore-vector KB. Lean step/token budget to fit the function
 * window.
 *
 * Two entry points share one loop:
 *  - `ask`        — buffers, returns the final answer in one shot (JSON path).
 *  - `askStream`  — emits text deltas + tool-round status as the agent runs
 *                   (SSE path). Same tokens, same cost, delivered incrementally.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Firestore } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { anthropic, AGENT_MODEL, estimateCostUsd } from "./anthropic";
import { SYSTEM_PROMPT, FORCE_FINAL_NUDGE } from "./prompts";
import { TOOLS, TOOL_BY_NAME } from "./tools";
import type { AgentEvent, AskResult, Citation, ToolContext } from "./defs";

// Tuned for a ~26s Netlify Pro function budget: room for a couple of tool
// rounds + a fuller synthesized answer, while staying comfortably under the cap.
const MAX_STEPS = 5;
const MAX_TOKENS = 1500;

// Friendly status labels surfaced while a tool round runs (streaming only).
const TOOL_STATUS: Record<string, string> = {
  search_knowledge: "Searching the knowledge base…",
  find_card: "Looking up the card…",
  get_meta_snapshot: "Pulling the community meta…",
  get_my_stats: "Reading your match history…",
  get_matchup: "Crunching the matchup…",
};

function textFrom(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function dedupe(cs: Citation[]): Citation[] {
  const seen = new Set<string>();
  return cs.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AskOptions {
  uid: string | null;
  db: Firestore;
  maxSteps?: number;
  model?: string;
  history?: ChatTurn[];
  signal?: AbortSignal;
}

/** Shared per-call agent state (request config + running accumulators). */
interface AgentRun {
  client: Anthropic;
  model: string;
  traceId: string;
  tools: Anthropic.Tool[];
  system: Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  ctx: ToolContext;
  citations: Citation[];
  toolsUsed: string[];
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
}

function startRun(question: string, opts: AskOptions): AgentRun {
  const model = opts.model ?? AGENT_MODEL;
  const tools: Anthropic.Tool[] = TOOLS.map((t, i) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as unknown as Anthropic.Tool.InputSchema,
    ...(i === TOOLS.length - 1 ? { cache_control: { type: "ephemeral" as const } } : {}),
  }));
  return {
    client: anthropic(),
    model,
    traceId: randomUUID(),
    tools,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [...(opts.history ?? []).map((t) => ({ role: t.role, content: t.content })), { role: "user", content: question }],
    ctx: { uid: opts.uid, db: opts.db, trace: () => {} },
    citations: [],
    toolsUsed: [],
    usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
  };
}

function accrue(run: AgentRun, usage: Anthropic.Usage): void {
  run.usage.inputTokens += usage.input_tokens;
  run.usage.outputTokens += usage.output_tokens;
  run.usage.costUsd += estimateCostUsd(usage, run.model);
}

function finish(run: AgentRun, answer: string): AskResult {
  return { answer, citations: dedupe(run.citations), toolsUsed: run.toolsUsed, traceId: run.traceId, usage: run.usage };
}

/** Dispatch every tool_use block in an assistant turn; returns the tool_result turn to append. */
async function dispatchTools(run: AgentRun, content: Anthropic.ContentBlock[]): Promise<Anthropic.ToolResultBlockParam[]> {
  const toolResults: Anthropic.ToolResultBlockParam[] = [];
  for (const block of content) {
    if (block.type !== "tool_use") continue;
    run.toolsUsed.push(block.name);
    const tool = TOOL_BY_NAME.get(block.name);
    if (!tool) {
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: `Unknown tool: ${block.name}`, is_error: true });
      continue;
    }
    try {
      const out = await tool.handler(block.input as Record<string, unknown>, run.ctx);
      if (out.citations) run.citations.push(...out.citations);
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out.data) });
    } catch (e) {
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: `Error: ${(e as Error)?.message ?? String(e)}`, is_error: true });
    }
  }
  return toolResults;
}

/** Non-streaming agent loop. Returns the final grounded answer + citations + usage. */
export async function ask(question: string, opts: AskOptions): Promise<AskResult> {
  const run = startRun(question, opts);
  const maxSteps = opts.maxSteps ?? MAX_STEPS;

  for (let step = 0; step < maxSteps; step++) {
    const res = await run.client.messages.create({ model: run.model, max_tokens: MAX_TOKENS, system: run.system, tools: run.tools, messages: run.messages });
    accrue(run, res.usage);
    run.messages.push({ role: "assistant", content: res.content });
    if (res.stop_reason !== "tool_use") return finish(run, textFrom(res.content));
    run.messages.push({ role: "user", content: await dispatchTools(run, res.content) });
  }

  // Step cap → one forced tool-free turn.
  run.messages.push({ role: "user", content: FORCE_FINAL_NUDGE });
  const final = await run.client.messages.create({ model: run.model, max_tokens: MAX_TOKENS, system: run.system, messages: run.messages });
  accrue(run, final.usage);
  return finish(run, textFrom(final.content));
}

/**
 * Streaming agent loop. Identical logic to `ask`, but emits `AgentEvent`s as it
 * goes: answer text streams via `delta`; each tool round emits `status`; text
 * produced before a tool call is retracted with `reset` so only the final
 * synthesized answer survives in the bubble. Returns the same AskResult so the
 * caller can send a `done` envelope + write the trace. Honors `opts.signal`.
 */
export async function askStream(question: string, opts: AskOptions, emit: (e: AgentEvent) => void): Promise<AskResult> {
  const run = startRun(question, opts);
  const maxSteps = opts.maxSteps ?? MAX_STEPS;
  const reqOpts = opts.signal ? { signal: opts.signal } : undefined;

  for (let step = 0; step < maxSteps; step++) {
    const stream = run.client.messages.stream({ model: run.model, max_tokens: MAX_TOKENS, system: run.system, tools: run.tools, messages: run.messages }, reqOpts);
    stream.on("text", (delta) => emit({ type: "delta", text: delta }));
    const msg = await stream.finalMessage();
    accrue(run, msg.usage);
    run.messages.push({ role: "assistant", content: msg.content });

    if (msg.stop_reason !== "tool_use") return finish(run, textFrom(msg.content));

    // Any text this turn streamed was preamble before a tool call — retract it.
    emit({ type: "reset" });
    for (const block of msg.content) {
      if (block.type === "tool_use") {
        const label = TOOL_STATUS[block.name];
        if (label) emit({ type: "status", value: label });
      }
    }
    run.messages.push({ role: "user", content: await dispatchTools(run, msg.content) });
  }

  // Step cap → one forced tool-free turn, streamed.
  emit({ type: "reset" });
  emit({ type: "status", value: "Composing the answer…" });
  run.messages.push({ role: "user", content: FORCE_FINAL_NUDGE });
  const finalStream = run.client.messages.stream({ model: run.model, max_tokens: MAX_TOKENS, system: run.system, messages: run.messages }, reqOpts);
  finalStream.on("text", (delta) => emit({ type: "delta", text: delta }));
  const final = await finalStream.finalMessage();
  accrue(run, final.usage);
  return finish(run, textFrom(final.content));
}

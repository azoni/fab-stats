/**
 * Agentic tool-use loop (Netlify-native build). Runs inside the ai-insights
 * function — uses the Anthropic key already on Netlify, the admin Firestore,
 * and the Firestore-vector KB. Lean step/token budget to fit the function
 * window.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Firestore } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { anthropic, AGENT_MODEL, estimateCostUsd } from "./anthropic";
import { SYSTEM_PROMPT, FORCE_FINAL_NUDGE } from "./prompts";
import { TOOLS, TOOL_BY_NAME } from "./tools";
import type { AskResult, Citation, ToolContext } from "./defs";

// Tuned for a ~26s Netlify Pro function budget: room for a couple of tool
// rounds + a fuller synthesized answer, while staying comfortably under the cap.
const MAX_STEPS = 5;
const MAX_TOKENS = 1500;

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

export async function ask(
  question: string,
  opts: { uid: string | null; db: Firestore; maxSteps?: number; model?: string },
): Promise<AskResult> {
  const client = anthropic();
  const maxSteps = opts.maxSteps ?? MAX_STEPS;
  const model = opts.model ?? AGENT_MODEL;
  const traceId = randomUUID();

  const tools: Anthropic.Tool[] = TOOLS.map((t, i) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as unknown as Anthropic.Tool.InputSchema,
    ...(i === TOOLS.length - 1 ? { cache_control: { type: "ephemeral" as const } } : {}),
  }));
  const system: Anthropic.TextBlockParam[] = [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }];
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];

  const ctx: ToolContext = { uid: opts.uid, db: opts.db, trace: () => {} };
  const citations: Citation[] = [];
  const toolsUsed: string[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;

  const result = (answer: string): AskResult => ({
    answer,
    citations: dedupe(citations),
    toolsUsed,
    traceId,
    usage: { inputTokens, outputTokens, costUsd },
  });

  for (let step = 0; step < maxSteps; step++) {
    const res = await client.messages.create({ model, max_tokens: MAX_TOKENS, system, tools, messages });
    inputTokens += res.usage.input_tokens;
    outputTokens += res.usage.output_tokens;
    costUsd += estimateCostUsd(res.usage, model);
    messages.push({ role: "assistant", content: res.content });

    if (res.stop_reason !== "tool_use") return result(textFrom(res.content));

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of res.content) {
      if (block.type !== "tool_use") continue;
      toolsUsed.push(block.name);
      const tool = TOOL_BY_NAME.get(block.name);
      if (!tool) {
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: `Unknown tool: ${block.name}`, is_error: true });
        continue;
      }
      try {
        const out = await tool.handler(block.input as Record<string, unknown>, ctx);
        if (out.citations) citations.push(...out.citations);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out.data) });
      } catch (e) {
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: `Error: ${(e as Error)?.message ?? String(e)}`, is_error: true });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  // Step cap → one forced tool-free turn.
  messages.push({ role: "user", content: FORCE_FINAL_NUDGE });
  const final = await client.messages.create({ model, max_tokens: MAX_TOKENS, system, messages });
  inputTokens += final.usage.input_tokens;
  outputTokens += final.usage.output_tokens;
  costUsd += estimateCostUsd(final.usage, model);
  return result(textFrom(final.content));
}

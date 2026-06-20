/**
 * Thin Anthropic client singleton — vendored from the fab-stats web app
 * (src/lib/kg/anthropic-client.ts) so fab-agent builds independently.
 * Lazy so ANTHROPIC_API_KEY isn't required at import time (e.g. for `ingest`).
 */
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set (see .env.example)");
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * Agent model. Default Sonnet 4.6 — excellent at grounded tool-use + synthesis
 * at ~1/5 the cost of Opus. Override with FAB_AGENT_MODEL (e.g. claude-opus-4-7
 * for max rigor, claude-haiku-4-5-20251001 for cheapest tool-routing).
 */
export const AGENT_MODEL = process.env.FAB_AGENT_MODEL || "claude-sonnet-4-6";

/** USD per 1M tokens, by model family (input / output / cache-read). */
const PRICING_BY_FAMILY: Record<string, { in: number; out: number; cacheRead: number }> = {
  opus: { in: 15, out: 75, cacheRead: 1.5 },
  sonnet: { in: 3, out: 15, cacheRead: 0.3 },
  haiku: { in: 1, out: 5, cacheRead: 0.1 },
};

function pricingFor(model: string) {
  if (model.includes("opus")) return PRICING_BY_FAMILY.opus!;
  if (model.includes("haiku")) return PRICING_BY_FAMILY.haiku!;
  return PRICING_BY_FAMILY.sonnet!;
}

export function estimateCostUsd(
  usage: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number | null },
  model: string = AGENT_MODEL,
): number {
  const p = pricingFor(model);
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  return (input / 1_000_000) * p.in + (output / 1_000_000) * p.out + (cacheRead / 1_000_000) * p.cacheRead;
}

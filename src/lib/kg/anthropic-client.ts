/**
 * Shared Anthropic client singleton. Lazy so importing modules that reference
 * it doesn't require ANTHROPIC_API_KEY at import time (only at first call).
 */
import Anthropic from "@anthropic-ai/sdk";

export const CONTENT_MODEL = "claude-opus-4-7";

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not set");
    }
    _client = new Anthropic();
  }
  return _client;
}

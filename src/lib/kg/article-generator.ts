/**
 * Weekly meta article generator (RAG generation step).
 *
 * Design (per claude-api skill guidance):
 *  - Model: claude-opus-4-7
 *  - The system prompt is STATIC (style guide + rules + schema contract) and
 *    carries `cache_control: ephemeral` so it's prompt-cached. Only the weekly
 *    DATA block changes, and it lives in the user turn AFTER the cache
 *    breakpoint — so every weekly run is a cache read, not a rewrite.
 *  - Structured output via `output_config.format` (NOT prefills — they 400 on
 *    Opus 4.7). The model returns blocks WITHOUT ids; we assign ids server-side
 *    so the LLM never has to invent UUIDs.
 *  - Adaptive thinking + effort:"high" (article quality is intelligence-
 *    sensitive). Streamed + finalMessage() so a slow generation can't trip an
 *    HTTP timeout.
 *  - Grounding: the model is told to use ONLY facts in the DATA block. That
 *    block is exactly the KG retrieval output — no fact can be invented.
 */
import type { ArticleBlock } from "@/types";
import type { MetaInsights } from "./meta-insights";
import { anthropic, CONTENT_MODEL } from "./anthropic-client";

export const ARTICLE_MODEL = CONTENT_MODEL;

/** Blocks the generator is allowed to emit (subset of ArticleBlock — no media). */
type GenBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; style: "bullet" | "numbered"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "callout"; tone: "note" | "tip" | "warning"; title?: string; text: string }
  | { type: "divider" };

interface GenOutput {
  title: string;
  excerpt: string;
  heroTags: string[];
  blocks: GenBlock[];
}

export interface GeneratedArticle {
  title: string;
  excerpt: string;
  heroTags: string[];
  contentBlocks: ArticleBlock[];
  /** usernames of players the article references (for JSON-LD `mentions`). */
  mentionedPlayerUsernames: string[];
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  };
}

// JSON Schema for structured output. Discriminated union via anyOf + const.
// Every object MUST set additionalProperties:false (structured-output rule).
const ARTICLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "excerpt", "heroTags", "blocks"],
  properties: {
    title: { type: "string" },
    excerpt: { type: "string" },
    heroTags: { type: "array", items: { type: "string" } },
    blocks: {
      type: "array",
      items: {
        anyOf: [
          {
            type: "object", additionalProperties: false,
            required: ["type", "text"],
            properties: { type: { const: "paragraph" }, text: { type: "string" } },
          },
          {
            type: "object", additionalProperties: false,
            required: ["type", "level", "text"],
            properties: {
              type: { const: "heading" },
              level: { type: "integer", enum: [2, 3] },
              text: { type: "string" },
            },
          },
          {
            type: "object", additionalProperties: false,
            required: ["type", "style", "items"],
            properties: {
              type: { const: "list" },
              style: { type: "string", enum: ["bullet", "numbered"] },
              items: { type: "array", items: { type: "string" } },
            },
          },
          {
            type: "object", additionalProperties: false,
            required: ["type", "text"],
            properties: { type: { const: "quote" }, text: { type: "string" } },
          },
          {
            type: "object", additionalProperties: false,
            required: ["type", "tone", "text"],
            properties: {
              type: { const: "callout" },
              tone: { type: "string", enum: ["note", "tip", "warning"] },
              title: { type: "string" },
              text: { type: "string" },
            },
          },
          {
            type: "object", additionalProperties: false,
            required: ["type"],
            properties: { type: { const: "divider" } },
          },
        ],
      },
    },
  },
} as const;

// STATIC system prompt — never changes week to week, so it caches.
const SYSTEM_PROMPT = `You are the staff data journalist for fabstats.net, a community stats site for the Flesh and Blood trading card game (FaB). You write the "Weekly Meta Report" — a short, sharp, data-driven article about the competitive metagame.

VOICE & STYLE
- Knowledgeable but accessible. You write for competitive FaB players who know the heroes but want the data read for them.
- Confident and specific. Lead with the number, then the interpretation.
- No hype, no filler, no "in the ever-evolving world of...". No emoji.
- ~500-800 words total. Tight. Every paragraph earns its place.
- Refer to heroes by the names exactly as they appear in the data.

HARD GROUNDING RULES (non-negotiable)
- You may ONLY state facts that are present in the DATA block of the user message.
- Never invent win rates, match counts, player names, event names, or dates.
- If you want to make a comparative claim ("X is rising"), you may only do so if the DATA supports it numerically. Otherwise frame it as a static snapshot ("X leads with N players").
- The DATA is a point-in-time snapshot from a community knowledge graph. Treat it as "tracked community data", not official tournament results. Hedge appropriately ("among tracked players...").
- Do not fabricate quotes. The "quote" block, if used, must be your own editorial pull-quote summarizing a data point — not attributed to anyone.

STRUCTURE (use your judgment, but a good report usually has):
1. A heading + opening paragraph framing the week's meta (lead with the most-played hero).
2. A "By the numbers" section — a list block of the top heroes with player counts.
3. A spotlight section on the single most-played hero: its matchup spread, who's piloting it well.
4. A "Matchups to watch" section drawn from the biggest matchups in the data.
5. A short closing read.
Use heading blocks (level 2) for sections, level 3 sparingly. Use one callout (tone "tip" or "note") for a single sharp takeaway. Use divider blocks between major sections if it helps.

OUTPUT CONTRACT
- Respond with structured JSON matching the provided schema. No prose outside the JSON.
- "title": punchy, includes the week label.
- "excerpt": one sentence, ~140 chars, for SEO meta description + social.
- "heroTags": the hero names you actually discuss, exactly as spelled in the DATA (used to link the article into the knowledge graph).
- "blocks": the article body. Do NOT include id fields — they are assigned downstream.
- Allowed block types only: paragraph, heading, list, quote, callout, divider. No images or embeds.`;

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Build the volatile user turn — the KG snapshot the article must be grounded in. */
function buildDataBlock(insights: MetaInsights): string {
  return [
    `Generate the Weekly Meta Report for ${insights.weekLabel}.`,
    "",
    "DATA (the only facts you may use):",
    "```json",
    JSON.stringify(insights, null, 2),
    "```",
  ].join("\n");
}

export async function generateMetaArticle(
  insights: MetaInsights,
): Promise<GeneratedArticle> {
  const stream = anthropic().messages.stream({
    model: ARTICLE_MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    // effort + structured-output format share the one output_config object.
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: ARTICLE_SCHEMA },
    },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        // Static prefix → cache it. Only the user turn changes weekly.
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildDataBlock(insights) }],
  });

  const message = await stream.finalMessage();

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text block in model response");
  }
  let parsed: GenOutput;
  try {
    parsed = JSON.parse(textBlock.text) as GenOutput;
  } catch {
    throw new Error(`Model did not return valid JSON: ${textBlock.text.slice(0, 200)}`);
  }

  const contentBlocks: ArticleBlock[] = parsed.blocks.map((b) => ({
    ...b,
    id: genId(),
  })) as ArticleBlock[];

  // Players we can safely say the article references: spotlight pilots whose
  // name appears in the rendered text.
  const bodyText = JSON.stringify(parsed.blocks).toLowerCase();
  const mentionedPlayerUsernames = insights.spotlightPilots
    .filter(
      (p) =>
        bodyText.includes(p.displayName.toLowerCase()) ||
        bodyText.includes(p.username.toLowerCase()),
    )
    .map((p) => p.username)
    .filter(Boolean);

  return {
    title: parsed.title,
    excerpt: parsed.excerpt,
    heroTags: parsed.heroTags ?? [],
    contentBlocks,
    mentionedPlayerUsernames,
    model: message.model,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
      cacheCreationTokens: message.usage.cache_creation_input_tokens ?? 0,
    },
  };
}

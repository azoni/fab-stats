/**
 * Auto-generated player bio.
 *
 * Same architecture as the article generator: STATIC cached system prompt +
 * volatile player data in the user turn, structured JSON output, hard
 * grounding to the retrieved facts. Output is short, so a single non-streamed
 * call is fine (well under any timeout).
 */
import type { PlayerBioInsights } from "./player-profile-insights";
import { anthropic, CONTENT_MODEL } from "./anthropic-client";

export interface GeneratedBio {
  headline: string;
  bio: string;
  highlights: string[];
  model: string;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
}

const BIO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "bio", "highlights"],
  properties: {
    headline: { type: "string" },
    bio: { type: "string" },
    highlights: { type: "array", items: { type: "string" } },
  },
} as const;

const SYSTEM_PROMPT = `You write short scouting-style bios for competitive Flesh and Blood (FaB) players on fabstats.net. Each bio appears at the top of that player's public profile.

VOICE
- Third person, present tense, confident, concise. Like a tournament commentator's pre-game read.
- No hype, no filler, no emoji. Specific over generic.

HARD GROUNDING RULES (non-negotiable)
- Use ONLY facts in the DATA block of the user message. Never invent win rates, hero names, opponents, events, or teammates.
- The DATA is community-tracked stats, not official results — phrase as "tracked play", hedge appropriately.
- "playstyleCard" is a pre-computed scouting sentence; you may paraphrase it but not contradict it.
- If a field is empty/null, omit any claim about it. Do not speculate.
- Comparative claims ("strong against X") must be backed by the matchup numbers in DATA.

OUTPUT (structured JSON, no prose outside it)
- "headline": <=70 chars, e.g. "Verdance specialist with an elite tournament record".
- "bio": 2-4 sentences. Lead with who they are (main hero + volume + win rate), then one sharp insight (their best/worst matchup, or playstyle), then optionally how they compare to similar pilots.
- "highlights": 2-4 short stat bullets, each <=60 chars (e.g. "74.7% win rate over 1,533 matches"). Pull straight from DATA.`;

function buildDataBlock(insights: PlayerBioInsights): string {
  return [
    `Write the profile bio for ${insights.displayName}.`,
    "",
    "DATA (the only facts you may use):",
    "```json",
    JSON.stringify(insights, null, 2),
    "```",
  ].join("\n");
}

export async function generatePlayerBio(
  insights: PlayerBioInsights,
): Promise<GeneratedBio> {
  if (!insights.found) throw new Error("Player not found in KG");

  const message = await anthropic().messages.create({
    model: CONTENT_MODEL,
    max_tokens: 1200,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: BIO_SCHEMA },
    },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildDataBlock(insights) }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text block in model response");
  }
  let parsed: { headline: string; bio: string; highlights: string[] };
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error(`Bad JSON from model: ${textBlock.text.slice(0, 160)}`);
  }

  return {
    headline: parsed.headline,
    bio: parsed.bio,
    highlights: parsed.highlights ?? [],
    model: message.model,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
    },
  };
}

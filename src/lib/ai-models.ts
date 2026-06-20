/**
 * AI model registry — shared by the admin UI (model switcher + cost estimates)
 * and the serverless functions (validation + the model the agent runs).
 * Pure data; safe to import in client and server.
 */
export interface AiModelOption {
  id: string;
  label: string;
  blurb: string;
  /** USD per 1M tokens. */
  inPerM: number;
  outPerM: number;
}

export const AI_MODELS: AiModelOption[] = [
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", blurb: "Cheapest + fastest. Default — great for grounded lookups.", inPerM: 1, outPerM: 5 },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", blurb: "Balanced — stronger reasoning at ~5x the cost.", inPerM: 3, outPerM: 15 },
  { id: "claude-opus-4-7", label: "Opus 4.7", blurb: "Most capable, most expensive.", inPerM: 15, outPerM: 75 },
];

export const DEFAULT_AI_MODEL = "claude-haiku-4-5-20251001";

export function getModel(id: string | undefined | null): AiModelOption | undefined {
  return AI_MODELS.find((m) => m.id === id);
}

/** Estimated $/query at a typical token mix (multi-tool grounded answer). */
export function estPerQueryUsd(m: AiModelOption, inTok = 4000, outTok = 400): number {
  return (inTok / 1_000_000) * m.inPerM + (outTok / 1_000_000) * m.outPerM;
}

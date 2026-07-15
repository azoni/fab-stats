/**
 * Total, defensive parsers for the previewValue mini-DSL. A cosmetic renders as a
 * pure function of (previewKind, previewValue), so equipped ids on ANY player's
 * public profile resolve without reading private data. Every parser CLAMPS bad
 * input to a legal value and never throws — a stale or tampered equipped-id can
 * only ever produce a valid, if plain, render on a stranger's profile.
 *
 * previewValue grammar (pipe-delimited, positional):
 *   avatarFrame  pattern|material|tier[|finish]
 *   companion    sigil|material|backing[|finish]
 *   aura         motif|material|intensity[|finish]
 *   nameplate    shape|material|pattern[|finish]
 * Material is written EXPLICITLY (redundant with rarity) so render never needs a
 * rarity/theme lookup; rarity independently drives price + shop chrome + gacha.
 */
import { RARITY_VISUALS } from "@/lib/badge-tiers";
import type { Material } from "@/components/cosmetics/materials";
import type { CosmeticRarity } from "@/lib/cosmetics/catalog";

export type Finish = "engraved" | "inlaid";

const MATERIALS = new Set<Material>(["bronze", "silver", "gold", "mythic"]);

/** Always returns n trimmed tokens (missing → ""), so parsers destructure safely. */
export function splitVal(v: string, n: number): string[] {
  const p = (v ?? "").split("|");
  return Array.from({ length: n }, (_, i) => (p[i] ?? "").trim());
}
export function asMaterial(s: string, fallback: Material = "gold"): Material {
  return MATERIALS.has(s as Material) ? (s as Material) : fallback;
}
export function asInt(s: string, min: number, max: number, fb: number): number {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
}
export function asFinish(s: string): Finish {
  return s === "inlaid" ? "inlaid" : "engraved";
}

/** Default rarity→material spine (from RARITY_VISUALS). Used for shop chrome, NOT render. */
export function materialForRarity(r: CosmeticRarity): Material {
  return (RARITY_VISUALS[r]?.material as Material) ?? "gold";
}

export interface FrameParams {
  pattern: string;
  material: Material;
  tier: number;
  finish: Finish;
}
export function parseFrame(v: string): FrameParams {
  const [p, m, t, f] = splitVal(v, 4);
  return { pattern: p || "keyline", material: asMaterial(m), tier: asInt(t, 1, 4, 1), finish: asFinish(f) };
}

export interface CompanionParams {
  sigil: string;
  material: Material;
  backing: string;
  finish: Finish;
}
export function parseCompanion(v: string): CompanionParams {
  const [s, m, b, f] = splitVal(v, 4);
  return { sigil: s || "fleur", material: asMaterial(m), backing: b || "roundel", finish: asFinish(f) };
}

export interface AuraParams {
  motif: string;
  material: Material;
  intensity: number;
  finish: Finish;
}
export function parseAura(v: string): AuraParams {
  const [mo, m, i, f] = splitVal(v, 4);
  return { motif: mo || "halo", material: asMaterial(m), intensity: asInt(i, 1, 3, 1), finish: asFinish(f) };
}

export interface NameplateParams {
  shape: string;
  material: Material;
  pattern: string;
  finish: Finish;
}
export function parseNameplate(v: string): NameplateParams {
  const [sh, m, p, f] = splitVal(v, 4);
  return { shape: sh || "plate", material: asMaterial(m), pattern: p || "plain", finish: asFinish(f) };
}

/**
 * Heraldic material system — the single source of truth that replaces the old
 * neon-glow color identities with engraved-metal "materials".
 *
 * The redesign principle is "engraved metal, not emitted light": tiers are
 * distinguished by richer material + more ornament, never by bigger glows. Each
 * material is a 3–5 stop gradient with real midtones (dark edge → midtone →
 * specular → midtone → dark edge) so it reads as a rounded, bevelled metal — not
 * a flat oversaturated hex.
 *
 * Theme note: these are plain colors used inside SVG gradients (no box-shadow,
 * no animation), so they degrade cleanly under every live theme (rosetta's flat
 * monochrome, daylight's light surface, leyline's blue glass). Motion + glow are
 * deliberately NOT part of the material — they're opt-in elsewhere and gated.
 */

export type Material = "bronze" | "silver" | "gold" | "mythic";

export interface MaterialSpec {
  /** dark edge → midtone → specular → midtone → dark edge */
  stops: [string, string, string, string, string];
  edge: string; // darkest — used for the card's chiselled rim
  mid: string; // midtone — used for inner keylines
  specular: string; // brightest highlight — used for jewels/accents
  ink: string; // engraving stroke on dark surfaces
  inkLight: string; // engraving stroke on light surfaces (daylight)
  /** optional event hue tint layered over the metal so events stay distinct */
  accent?: string;
}

export const MATERIALS: Record<Material, MaterialSpec> = {
  bronze: {
    stops: ["#4a2f17", "#9b6a32", "#e7c08c", "#9b6a32", "#3c2613"],
    edge: "#5a3a1c",
    mid: "#a9712f",
    specular: "#f0d3a6",
    ink: "#caa06a",
    inkLight: "#6e4a1f",
  },
  silver: {
    stops: ["#4a505a", "#8b95a4", "#eef2f7", "#8b95a4", "#3d424b"],
    edge: "#5b626e",
    mid: "#9aa3b1",
    specular: "#f4f7fb",
    ink: "#cfd6e0",
    inkLight: "#525a66",
  },
  gold: {
    stops: ["#5a4413", "#b9852b", "#f7e6ab", "#b9852b", "#4a3710"],
    edge: "#6e5418",
    mid: "#c2902f",
    specular: "#fbeec0",
    ink: "#e6c878",
    inkLight: "#735312",
  },
  mythic: {
    stops: ["#2e2156", "#6f55b8", "#dccaff", "#6f55b8", "#241a45"],
    edge: "#3a2a6e",
    mid: "#7b5fc8",
    specular: "#e7dcff",
    ink: "#c9b8ff",
    inkLight: "#473488",
  },
};

// ── Mappings from the existing color identities ──

/** Major-event border tiers (mirrors TIER_STYLE in CardBorderWrapper). */
const EVENT_MATERIAL: Record<string, { material: Material; accent?: string }> = {
  "Battle Hardened": { material: "bronze" },
  "The Calling": { material: "silver", accent: "#7fb2ff" },
  Nationals: { material: "silver", accent: "#ff9a9a" },
  "Pro Tour": { material: "mythic" },
  Worlds: { material: "gold" },
};

/** The rgb strings the old configs carry, mapped back to a material — covers
 *  both major-event borders and minor-event underlines. */
const RGB_MATERIAL: Record<string, Material> = {
  // major-event borders
  "205,127,50": "bronze",
  "96,165,250": "silver",
  "248,113,113": "silver",
  "167,139,250": "mythic",
  "251,191,36": "gold",
  // minor-event underlines
  "212,151,90": "bronze", // Armory
  "147,197,253": "silver", // Skirmish
  "252,165,165": "silver", // Road to Nationals
  "196,181,253": "mythic", // ProQuest
};

export function materialForEvent(eventType: string): Material {
  return EVENT_MATERIAL[eventType]?.material ?? "gold";
}

export function accentForEvent(eventType: string): string | undefined {
  return EVENT_MATERIAL[eventType]?.accent;
}

export function materialForRgb(rgb?: string): Material {
  return (rgb && RGB_MATERIAL[rgb]) || "gold";
}

export function spec(material: Material): MaterialSpec {
  return MATERIALS[material];
}

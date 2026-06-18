import { HERO_REQUIRED_CUTOFF } from "./constants";

/** One match queued for import, reduced to just what the hero-missing gate needs. */
export interface HeroGateItem {
  /** Match date as an ISO `YYYY-MM-DD` string, compared against HERO_REQUIRED_CUTOFF. */
  date: string;
  /** Effective hero after all import overrides are applied ("Unknown" if none). */
  heroPlayed: string;
  /**
   * Whether the user explicitly resolved this match's event — either by choosing a
   * hero or by selecting "No hero (clear)". Resolved events never block the import,
   * even though a cleared event keeps heroPlayed === "Unknown".
   */
  resolved: boolean;
}

export interface HeroGateResult {
  /** Any unresolved match still missing a hero → soft warning. */
  hasAnyMissing: boolean;
  /** An unresolved post-cutoff match missing a hero → hard block (hero required). */
  hasPostCutoffMissing: boolean;
}

/**
 * Decide whether the "Heroes Missing!" warning should fire for a batch of matches
 * about to be imported, and whether it must be the hard (post-cutoff) variant.
 *
 * A match only counts as missing when its event is unresolved AND its effective
 * hero is still "Unknown". Events the user cleared with "No hero (clear)" are
 * marked resolved, so clearing every post-cutoff event lets the import proceed
 * instead of getting stuck on a contradictory "0 events need a hero" hard block.
 */
export function computeHeroGate(items: HeroGateItem[]): HeroGateResult {
  let hasAnyMissing = false;
  let hasPostCutoffMissing = false;
  for (const item of items) {
    if (item.resolved || item.heroPlayed !== "Unknown") continue;
    hasAnyMissing = true;
    if (item.date >= HERO_REQUIRED_CUTOFF) hasPostCutoffMissing = true;
  }
  return { hasAnyMissing, hasPostCutoffMissing };
}

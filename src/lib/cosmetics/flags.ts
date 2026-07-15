/**
 * Master feature flag for the cosmetics gamification system (coins / shop /
 * gacha / avatar decorations). While OFF, the whole system is dormant: no coins
 * are minted, no wallet docs are created, and no cosmetics UI renders — so it
 * ships with zero user impact. Flip `NEXT_PUBLIC_FEATURE_COSMETICS=true` (env)
 * to reveal it; the server grant is retroactive, so users get their full owed
 * balance on their next load once enabled.
 */
export const COSMETICS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_COSMETICS === "true";

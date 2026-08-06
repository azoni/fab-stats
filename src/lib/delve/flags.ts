/**
 * The Understack (delve) feature flag. Mirrors the cosmetics flag pattern:
 * set NEXT_PUBLIC_FEATURE_DELVE="true" in netlify.toml (or .env.local for dev)
 * to enable; anything else renders the coming-soon null state.
 */
export const DELVE_ENABLED = process.env.NEXT_PUBLIC_FEATURE_DELVE === "true";

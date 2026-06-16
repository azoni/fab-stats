/**
 * Hard-blocked user IDs — test/spam accounts that must never appear on any
 * public surface (leaderboard, discover, spotlight, store rosters, etc.).
 * Filtered centrally in sanitizeEntries() and selectFeaturedProfiles(), and
 * mirrored in the store-aggregator Netlify function.
 */
export const BLOCKED_USER_IDS = new Set<string>([
  "L7Vd2uSxm8dKW2TSwo9Rd8ZFEYB3", // username "testtest" / display "agentazoni" — test account
]);

export function isBlockedUser(userId?: string | null): boolean {
  return !!userId && BLOCKED_USER_IDS.has(userId);
}

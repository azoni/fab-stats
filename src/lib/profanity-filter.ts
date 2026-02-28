/**
 * Client-side profanity filter with leet-speak normalization.
 * Not exhaustive, but catches the obvious stuff.
 * Admin users bypass the filter.
 */

// Leet-speak / common substitution map
const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  "$": "s",
  "!": "i",
  "+": "t",
};

/** Normalize text: lowercase, strip leet substitutions, collapse repeated chars */
function normalize(text: string): string {
  let result = text.toLowerCase();
  // Replace leet characters
  result = result.replace(/[013457@$!+]/g, (ch) => LEET_MAP[ch] || ch);
  // Collapse repeated characters (e.g., "fuuuck" → "fuck")
  result = result.replace(/(.)\1{2,}/g, "$1$1");
  // Strip non-alphanumeric (except spaces) so "f.u.c.k" → "fuck"
  result = result.replace(/[^a-z0-9\s]/g, "");
  return result;
}

// Curated word list — whole words only.
// Kept intentionally conservative to avoid false positives.
// Words that are substrings of common words (e.g., "ass" in "assessment") are NOT included
// unless they're standalone profanity that rarely appears in legitimate context.
const PROFANITY_SET = new Set([
  // Strong profanity
  "fuck", "fucker", "fuckers", "fucking", "fucked", "fucks", "motherfucker", "motherfucking",
  "shit", "shits", "shitty", "bullshit", "shitting", "shitstorm",
  "bitch", "bitches", "bitching", "bitchy",
  "cunt", "cunts",
  "dick", "dicks", "dickhead", "dickheads",
  "cock", "cocks", "cocksucker", "cocksuckers",
  "pussy", "pussies",
  "asshole", "assholes", "arsehole", "arseholes",
  "bastard", "bastards",
  "whore", "whores",
  "slut", "sluts", "slutty",
  "damn", "damned", "damnit", "goddamn", "goddamnit",
  "piss", "pissed", "pissing",
  "wanker", "wankers", "tosser", "tossers",
  "twat", "twats",
  "bollocks",
  "arse",
  "fag", "fags", "faggot", "faggots",

  // Slurs (zero tolerance)
  "nigger", "niggers", "nigga", "niggas",
  "kike", "kikes",
  "spic", "spics",
  "chink", "chinks",
  "wetback", "wetbacks",
  "beaner", "beaners",
  "gook", "gooks",
  "jap", "japs",
  "tranny", "trannies",
  "retard", "retards", "retarded",

  // Sexual
  "porn", "porno", "pornography",
  "hentai",
  "dildo", "dildos",
  "blowjob", "blowjobs",
  "handjob", "handjobs",
  "jizz", "jizzed",
  "cumshot",
  "orgasm",
  "masturbate", "masturbating", "masturbation",
  "ejaculate", "ejaculating",

  // Threats / violence
  "kys",
  "killurself",
  "killyourself",

  // Misc offensive
  "stfu", "gtfo",
]);

/**
 * Check if text contains profanity.
 * Uses whole-word boundary matching on normalized text to avoid false positives.
 */
export function containsProfanity(text: string): boolean {
  const normalized = normalize(text);
  const words = normalized.split(/\s+/);

  for (const word of words) {
    if (PROFANITY_SET.has(word)) return true;
  }

  // Also check the full normalized string for multi-word patterns
  // and phrases that might be split oddly
  for (const bad of PROFANITY_SET) {
    // Only check longer words (4+ chars) as substrings to catch "f u c k" style evasion
    if (bad.length >= 4) {
      // Check if the bad word appears as a substring after stripping spaces
      const stripped = normalized.replace(/\s/g, "");
      if (stripped.includes(bad)) return true;
    }
  }

  return false;
}

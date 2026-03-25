export type SlideType =
  | "title"
  | "section"
  | "content"
  | "diagram"
  | "code"
  | "split";

export interface BulletItem {
  text: string;
  sub?: string[];
}

export type Bullet = string | BulletItem;

export interface Slide {
  id: string;
  type: SlideType;
  section?: string;
  title: string;
  subtitle?: string;
  bullets?: Bullet[];
  code?: { snippet: string; language: string; highlightLines?: number[] };
  diagram?: "architecture" | "data-flow";
  left?: { title: string; bullets: string[] };
  right?: { title: string; bullets: string[] };
  notes?: string[];
  /** Path relative to /public, e.g. "/deck/fabdoku.png" */
  image?: { src: string; alt: string; caption?: string };
}

export const SLIDES: Slide[] = [
  // ── Opening ──────────────────────────────────────────────
  {
    id: "title",
    type: "title",
    title: "FaB Stats: Engineering Deep Dive",
    subtitle: "fabstats.net — Charlton — XPathLabs Interview",
    notes: [
      "Intro: 'Thanks for having me. I'm going to walk through FaB Stats — a project I built and shipped end-to-end as a solo developer.'",
      "This presentation itself is built inside the project — it's a Next.js page at /deck using the same stack, theme system, and framer-motion animations.",
      "If they ask why you built the presentation this way: 'I wanted to demonstrate the stack rather than just talk about it. This slide deck is a React component deployed on the same Netlify CDN.'",
    ],
  },
  {
    id: "overview",
    type: "content",
    section: "Overview",
    title: "What is FaB Stats?",
    // Screenshot: homepage dashboard showing stats overview + game launchers
    image: { src: "/deck/homepage.png", alt: "FaB Stats homepage dashboard", caption: "fabstats.net — homepage dashboard" },
    bullets: [
      "Flesh and Blood TCG match tracker + daily minigame platform",
      "Built as a player — I needed better stats than what existed",
      "1 month, 1,167 commits, 65K lines of TypeScript across 446 files",
      "12+ daily games, 158 achievements, browser extension, serverless OG images",
      "Solo full-stack: Next.js 16, Firebase, Netlify, Manifest V3 extension",
    ],
    notes: [
      "Flesh and Blood is a trading card game by Legend Story Studios — think Magic: The Gathering but newer, growing competitive scene.",
      "GEM is the official tournament platform — it tracks matches but has no stats, no win rates, no matchup data. Players were literally using spreadsheets.",
      "The 1,167 commits in 1 month is real — I was shipping features daily using Claude Code. Average ~38 commits/day.",
      "The 65K lines includes: 446 TypeScript/TSX files, 60+ Next.js routes, Firestore security rules, Netlify serverless functions, and a Manifest V3 browser extension.",
      "If asked 'why solo?': 'This is a community project I built for myself and other players. The velocity was possible because of Claude Code — I'll cover that workflow later.'",
    ],
  },

  // ── Section 1: Project Walkthrough ───────────────────────
  {
    id: "walkthrough-divider",
    type: "section",
    title: "Project Walkthrough",
    notes: [
      "This section maps to: problem statement, what you owned, architecture, testing, deployment, and production issues.",
      "Keep each slide to ~2 minutes. Leave room for questions — they'll likely dig into one or two areas.",
    ],
  },
  {
    id: "problem",
    type: "content",
    section: "Problem",
    title: "Problem Statement",
    // Screenshot: GEM tournament platform showing the lack of stats
    image: { src: "/deck/gem-history.png", alt: "GEM tournament history page", caption: "GEM — no stats, no API, just match lists" },
    bullets: [
      "FaB community had no centralized stats platform — players tracked results in spreadsheets",
      "GEM (official tournament platform) has no public API — had to reverse-engineer scraping",
      "No standard data format for match records across events and formats",
      "Daily games needed global sync — puzzles must reset at the same time for all players worldwide",
      "Card data from @flesh-and-blood/cards has inconsistencies (e.g. 'Go again' vs 'Go Again', generic cards)",
    ],
    notes: [
      "GEM scraping: The extension uses a Manifest V3 content script that runs on gem.fabtcg.com. It parses HTML tables, extracts match data (hero, opponent, result, format, event), and serializes it with LZ compression into a URL that opens fabstats.net/import.",
      "Why no GEM API: Legend Story Studios doesn't provide one. I reverse-engineered the DOM structure. If they change their HTML, the extension breaks — this is a known fragility I accepted.",
      "Ambiguity on data format: GEM doesn't distinguish between formats consistently. I built a guessEventType() function that uses regex matching on event names (e.g., 'ProQuest', 'Armory', 'Battle Hardened') to infer the tier.",
      "Global sync problem: If player A in UTC+12 and player B in UTC-8 generate puzzles at the same wall-clock time, they could get different dates. Solution: all game dates use UTC, puzzles reset at UTC midnight.",
      "Card data: The @flesh-and-blood/cards npm package has ~4,200 cards. 'Go again' is lowercase in their data but often written 'Go Again' in community materials. Generic cards (cardClass 601) are excluded from class-based puzzle categories to prevent trivial answers.",
    ],
  },
  {
    id: "ownership",
    type: "content",
    section: "Ownership",
    title: "Full-Stack Solo Dev",
    bullets: [
      {
        text: "Frontend",
        sub: [
          "Next.js 16 with App Router, React 19, Tailwind CSS v4, 60+ routes",
        ],
      },
      {
        text: "Backend",
        sub: [
          "Firebase Auth, Firestore with security rules, dual-layer public/private data",
        ],
      },
      {
        text: "Infrastructure",
        sub: [
          "Netlify static export + edge functions + serverless OG image generation",
        ],
      },
      {
        text: "Browser Extension",
        sub: [
          "Manifest V3 content script that scrapes GEM tournament data",
        ],
      },
      {
        text: "Data Pipeline — 5 Import Methods",
        sub: [
          "Browser extension (one-click GEM scrape), bookmarklet (mobile-friendly), copy-paste, CSV/JSON upload, admin auto-sync",
          "Dual-hash fingerprinting for dedup, cross-player match linking",
        ],
      },
    ],
    notes: [
      "Frontend: 60+ routes includes game pages, player profiles ([username] dynamic routes), leaderboards, admin dashboard, docs, changelog, and more. All using the App Router with a mix of server and client components.",
      "Backend — dual-layer pattern: Public stats (leaderboard, player profiles) live in top-level Firestore collections for fast reads without auth. Private data (match details, game history) lives in user subcollections behind auth rules. This separation means the OG image function can fetch public data without admin SDK credentials.",
      "Fingerprinting: Each match gets a deterministic fingerprint using dual 32-bit FNV hashes (FNV-1a + MurmurHash-inspired). Heroes are sorted alphabetically before hashing so both players produce the same fingerprint. This enables cross-player match linking — if two players both import the same match, we can detect the overlap.",
      "OG images: Netlify serverless function uses satori (by Vercel) to render React JSX to SVG, then resvg-js to convert SVG to PNG. Fonts are bundled as WOFF files (satori doesn't support WOFF2). The function calls Firestore REST API directly — no admin SDK needed because it only reads public collections.",
      "5 import methods — each solves a different user constraint:",
      "  1. Browser Extension: Best experience. Content script on gem.fabtcg.com scrapes match tables, auto-detects hero played, LZ-compresses data, opens fabstats.net/import with payload in URL hash. One click.",
      "  2. Bookmarklet: For mobile users who can't install extensions. JavaScript bookmarklet redirects to GEM History, then scrapes on second tap. Works on iOS/Android browsers.",
      "  3. Copy-Paste: Zero install. User selects all on GEM history page, pastes raw HTML into a textarea. parseGemPaste() in gem-paste-import.ts extracts matches from the HTML. Limitation: can't auto-detect hero played.",
      "  4. CSV/JSON Upload: For users of the FaB History Scraper userscript or large extension exports. Drag-and-drop file upload with format auto-detection.",
      "  5. Admin Auto-Sync: Netlify serverless function logs into GEM with stored (encrypted) credentials and syncs daily. Admin-only feature for power users.",
      "All 5 methods feed into the same importMatchesFirestore() function. Fingerprint-based dedup means you can import from multiple methods without duplicates.",
      "If asked 'what was hardest?': 'The browser extension. Manifest V3 removed background pages, so everything runs as a content script. Pagination handling, date parsing across locales, and graceful failure when GEM changes their DOM structure.'",
    ],
  },
  {
    id: "architecture",
    type: "diagram",
    section: "Architecture",
    title: "System Architecture",
    diagram: "architecture",
    notes: [
      "Walk through left-to-right, top-to-bottom. Start with the extension scraping GEM, then show how data flows into the client app.",
      "Key insight: There is NO traditional server. The Next.js app is statically exported — every page is pre-rendered HTML served from Netlify's CDN. The only server-side code is Netlify edge functions (for OG image rewrites) and one serverless function (for OG image generation).",
      "Firebase handles auth and data without a custom backend. Firestore security rules act as the 'server-side validation layer' — they enforce field types, string lengths, admin permissions, and data visibility.",
      "The edge functions (og-rewrite.ts and og-rewrite-meta.ts) intercept requests to player profile URLs and inject dynamic OpenGraph meta tags, so sharing a profile link on Discord/Twitter shows the player's stats card.",
      "If asked about scaling: 'Static export means the app itself scales infinitely on CDN. Firestore auto-scales reads. The bottleneck would be Firestore write throughput during high-activity periods (e.g., daily puzzle reset), but we're nowhere near those limits.'",
    ],
  },
  {
    id: "data-flow",
    type: "diagram",
    section: "Data Flow",
    title: "Data Flow",
    diagram: "data-flow",
    notes: [
      "This shows the lifecycle of a single game play session through the entire system.",
      "localStorage first: Game state is persisted locally immediately so the user never loses progress, even if their network drops. This is critical for mobile players on spotty connections.",
      "Firestore writes happen after game completion: results (the player's final state) and picks (which answers they chose) go to separate collections. Picks are aggregated across all players for 'uniqueness scoring' — if 80% of players made the same choice, your score for that cell is 80 (lower = more unique = better).",
      "Leaderboard aggregation: A client-side computation reads the user's match data and game stats to compute aggregate stats (win rate, streaks, achievements). These are written to a public leaderboard collection.",
      "OG image is generated on-demand: When someone shares their profile URL, the edge function intercepts the request, and the serverless function renders a PNG with the player's stats. The image is cached with a 1-day TTL + 7-day stale-while-revalidate.",
      "If asked about consistency: 'Firestore provides strong consistency for single-document reads and eventual consistency for queries. Since each player's data is in their own subcollection, there are no cross-user consistency concerns. The uniqueness scoring uses increment() for atomic counter updates.'",
    ],
  },
  {
    id: "testing",
    type: "split",
    section: "Testing",
    title: "Testing Strategy",
    left: {
      title: "What I Test",
      bullets: [
        "TypeScript strict mode as first line of defense",
        "Deterministic seeded RNG — same date always produces same puzzle",
        "Firestore security rules tested with emulator",
        "Manual QA on daily puzzle generation and game flows",
        "Build verification: npx tsc --noEmit + npm run build on every change",
      ],
    },
    right: {
      title: "What I Don't (and Why)",
      bullets: [
        "No unit test suite — velocity tradeoff as solo dev on a 1-month-old project",
        "No E2E tests — manual flows are fast enough at current scale",
        "Plan: add Vitest for critical paths (puzzle generators, fingerprinting) as project stabilizes",
      ],
    },
    notes: [
      "TypeScript strict catches a LOT. With strict: true, noUncheckedIndexedAccess, and exhaustive type checking on discriminated unions (like SlideType or feed event types), the compiler catches most logic errors before runtime.",
      "Deterministic seeded RNG is inherently testable: dateToSeed('2026-03-25') always returns the same number, which always generates the same puzzle. You can 'snapshot test' this by running the generator for a date and checking the output. I do this manually but it would be the first thing to automate.",
      "Firestore emulator: Firebase provides a local emulator suite. I test security rules by writing rule unit tests that verify: unauthenticated users can't write, users can only read their own private data, admin-only fields are protected, string length limits are enforced.",
      "Why no unit tests yet: 'It's a deliberate tradeoff. The project is 1 month old and I'm the only developer. The cost of a test suite is high upfront, and the cost of bugs is low (I can hotfix in minutes). As the project stabilizes and onboards contributors, tests become essential. Vitest is my planned framework — it's fast, ESM-native, and works well with React.'",
      "If challenged: 'I know this is a risk. The puzzle generator bug (slide 12) is exactly the kind of thing a test would have caught. That's why it's the first thing I'd add — a test that validates every generated puzzle has at least 3 valid answers per cell.'",
    ],
  },
  {
    id: "deployment",
    type: "content",
    section: "Deploy",
    title: "Deployment Pipeline",
    bullets: [
      "Git push → Netlify auto-build → static export to global CDN",
      "Zero server runtime — output: 'export' means every page is pre-rendered HTML",
      "Edge functions handle dynamic OG images (satori + resvg-js → PNG)",
      "Immutable asset hashing: JS/CSS get 1-year cache, images get 1-day + 7-day stale",
      "Monitoring: Netlify deploy logs, Firebase console, Discord bot health pings",
      "Branch workflow: feature/* and fix/* branches → PR → merge to main → auto-deploy",
    ],
    notes: [
      "Static export: next build with output: 'export' in next.config.ts. This generates an out/ directory with static HTML for every route. No Node.js server needed at runtime. Netlify serves these files from edge locations worldwide.",
      "Cache strategy: netlify.toml sets Cache-Control headers. JS/CSS bundles have content hashes in filenames (immutable, 1-year cache). HTML pages get no-cache so updates propagate immediately. OG images get 1-day cache + 7-day stale-while-revalidate so social previews don't hammer the serverless function.",
      "Build process: npm run build first runs a custom script (scripts/zip-extension.mjs) that zips the browser extension (implementing ZIP format manually to avoid dependencies), then runs next build. The extension zip is placed in public/ so it's served as a static asset.",
      "netlify.toml included_files: The OG image function needs font files and resvg-js native binaries at runtime. These must be explicitly listed in included_files or they won't be available in the Lambda environment.",
      "Monitoring: No formal APM tool. I monitor via: Netlify deploy logs (build success/failure), Firebase Console (Firestore reads/writes, auth events, error rates), and a Discord bot that pings on errors.",
      "The entire deploy is ~45 seconds from push to live. There's no staging environment — I test locally, push to a feature branch, verify the Netlify deploy preview, then merge to main.",
    ],
  },
  {
    id: "prod-utc",
    type: "code",
    section: "Prod Issue #1",
    title: "Bug: Players Seeing Different Puzzles",
    code: {
      snippet: `// ❌ Before — uses local timezone
function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return \`\${y}-\${m}-\${d}\`;
}

// ✅ After — uses UTC for global consistency
function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return \`\${y}-\${m}-\${d}\`;
}`,
      language: "typescript",
      highlightLines: [3, 4, 5, 11, 12, 13],
    },
    bullets: [
      "Players in different timezones saw different daily puzzles",
      "Root cause: getMonth() returns local time, not UTC",
      "Fix: standardized ALL game dates to UTC — 21 files changed",
      "Prevention: added UTC rule to CLAUDE.md so Claude Code never repeats this",
    ],
    notes: [
      "How I discovered it: A player in New Zealand reported seeing a different puzzle than a player in the US, even though both were playing 'today's' puzzle. The NZ player was already in the next UTC day.",
      "Technical root cause: JavaScript's Date object returns local-time values by default. getMonth() returns the month in the user's local timezone. At UTC+12, after noon, getMonth() returns tomorrow's month. This means the seed was different, so the puzzle was different.",
      "The fix touched 21 files: every file that generated a date string for game logic. I did a project-wide search for getFullYear, getMonth, getDate and replaced every instance with UTC variants.",
      "Why 21 files? Each game has its own puzzle generator, localStorage keys, and Firestore collection references that embed the date string. Plus countdown timers, feed events, and the achievement system all used dates.",
      "Prevention: Added to CLAUDE.md: 'All games use UTC dates so puzzles reset at UTC midnight for all players. Countdown timers target UTC midnight. Never use local-time date methods (getFullYear, getMonth, getDate) for game dates — always use UTC variants.' Claude Code now follows this rule automatically in every new context window.",
      "This is a great example of how CLAUDE.md acts as institutional memory — the mistake happened once, the rule was added, and it never happened again.",
    ],
  },
  {
    id: "prod-hooks",
    type: "code",
    section: "Prod Issue #2",
    title: "Bug: Profile Pages Crashing",
    code: {
      snippet: `// ❌ Before — hook after early return
function PlayerProfile({ data }) {
  if (!data) return <Loading />;

  // React error: "rendered more hooks
  // than previous render"
  const stats = useMemo(() =>
    computeStats(data), [data]);
  return <Profile stats={stats} />;
}

// ✅ After — IIFE instead of hook
function PlayerProfile({ data }) {
  if (!data) return <Loading />;

  const stats = (() => computeStats(data))();
  return <Profile stats={stats} />;
}`,
      language: "tsx",
      highlightLines: [7, 8, 16],
    },
    bullets: [
      "Profile pages crashing: 'rendered more hooks than previous render'",
      "Root cause: useMemo called after an early return statement",
      "Fix: replaced useMemo with IIFE — no hook needed for simple derivation",
      "Lesson: hooks must be called unconditionally before any early returns",
    ],
    notes: [
      "React's Rules of Hooks: Hooks must be called in the same order every render. If you return early before a hook, React sees fewer hooks on that render than the previous one and throws.",
      "Why useMemo was there in the first place: It was a premature optimization. The computation (computeStats) was simple enough that memoization wasn't needed. An IIFE (() => computeStats(data))() computes the value inline without registering a hook.",
      "Alternative fix: Could have moved the useMemo above the early return and given it a fallback value. But since memoization wasn't needed, removing the hook entirely was the cleaner solution.",
      "How I caught it: The error appeared in the browser console on a player profile page. React's error message ('rendered more hooks than previous render') pointed directly to the issue. The fix was a 1-line change.",
      "If asked about React 19 specifics: React 19 didn't change the Rules of Hooks. The same constraint applies. The React Compiler (which React 19 introduces) can auto-memoize, but it still can't fix hooks-after-returns because that's a fundamental invariant of the reconciler.",
    ],
  },
  {
    id: "prod-puzzles",
    type: "content",
    section: "Prod Issue #3",
    title: "Bug: Impossible FaBdoku Grids",
    // Screenshot: FaBdoku grid showing the 3x3 puzzle
    image: { src: "/deck/fabdoku.png", alt: "FaBdoku daily puzzle grid", caption: "FaBdoku — 3×3 hero matching puzzle" },
    bullets: [
      "Puzzle generator sometimes created grids with no valid solution",
      "Root cause: random category pairs could produce cells with zero valid heroes",
      "Fix: added backtracking validation — every cell must have ≥3 valid answers",
      "Added fallback cascade: retry with different category pairs if validation fails",
      "Lesson: generative algorithms need constraint validation, not just randomness",
    ],
    notes: [
      "How FaBdoku works: It's a 3×3 grid where rows and columns are FaB categories (class, talent, age, stat, format). Each cell is the intersection of a row category and column category. Players must name a hero that satisfies both.",
      "The bug: The puzzle generator picks random category pairs (e.g., class × talent) and random values within each category. Some combinations produce cells with zero valid heroes. For example: 'Mechanologist' (class) × 'Ice' (talent) — no hero has both.",
      "Why ≥3 answers? With only 1-2 valid answers, the puzzle feels unfair — players who don't know those specific heroes are stuck. 3+ valid answers makes it challenging but solvable. This threshold was tuned based on player feedback.",
      "The fallback cascade: 1) Try the randomly selected categories. 2) If any cell has <3 valid heroes, reshuffle the category values. 3) If still invalid, try a different axis pair (e.g., switch from class×talent to class×age). 4) If all axis pairs fail for this date, use a known-good fallback configuration.",
      "The fix also avoids repeating the same axis pair as yesterday — so players get variety across consecutive days.",
      "If asked about the hero data: There are ~136 heroes in the pool. Each hero has properties like class (Warrior, Wizard, etc.), talent (Shadow, Ice, etc.), age (Young, Adult), stats (Life, Intellect thresholds), and format legality. The puzzle generator filters heroes against category predicates.",
    ],
  },

  // ── Section 2: Tradeoffs ─────────────────────────────────
  {
    id: "tradeoffs-divider",
    type: "section",
    title: "Tradeoffs & Decisions",
    notes: [
      "This section is where they'll dig deepest. Be ready for follow-up questions on any decision.",
      "Frame every tradeoff as: 'I chose X because of constraint Y, knowing I was accepting cost Z.'",
    ],
  },
  {
    id: "decisions",
    type: "split",
    section: "Decisions",
    title: "Options I Considered",
    left: {
      title: "Chose",
      bullets: [
        "Static export (Next.js output: 'export')",
        "Firebase (Auth + Firestore)",
        "Netlify (free tier + edge functions)",
        "Client-side rendering for games",
      ],
    },
    right: {
      title: "Over",
      bullets: [
        "SSR/ISR — adds server cost, complexity for a content app",
        "Supabase/Postgres — Firebase gives auth + realtime for free",
        "Vercel — Netlify edge functions better fit for OG images",
        "Server components — games need localStorage + interactivity",
      ],
    },
    notes: [
      "Static export vs SSR: The app is primarily a client-side interactive experience. There's no user-specific server rendering needed. Static export gives us: zero server costs, instant global CDN distribution, and deploy previews for every branch. The tradeoff: no server-side rendering for SEO on dynamic pages (player profiles). Solved with edge functions that inject OG meta tags.",
      "Firebase vs Supabase: Firebase won because of: (1) Firebase Auth is battle-tested with Google OAuth, anonymous auth, and token-based custom claims out of the box; (2) Firestore's real-time listeners enable live features (activity feed, chat) without WebSocket infrastructure; (3) Firestore security rules replace a traditional API layer. The downside: Firestore can't do JOINs or complex aggregations. I work around this with denormalized data and client-side computation.",
      "Netlify vs Vercel: Both support static hosting. I chose Netlify because: (1) Edge functions run at the CDN layer for OG image URL rewriting; (2) Serverless functions with bundled binary dependencies (resvg-js native bindings) work well with Netlify's included_files config; (3) Free tier is generous for a community project.",
      "Client-side rendering: Games need localStorage for state persistence and heavy interactivity (click handlers, animations, timers). Server components can't use hooks or browser APIs. So all game pages are 'use client' components rendered inside server component layouts (which just set metadata).",
      "If asked about cost: 'The entire project runs on free tiers. Firebase Spark plan (free), Netlify free tier. The only cost is the domain name.'",
    ],
  },
  {
    id: "seeded-random",
    type: "code",
    section: "Tradeoffs",
    title: "Two Hash Functions That Must Coexist",
    code: {
      snippet: `// Legacy — FaBdoku (cannot change, breaks history)
function dateToSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const ch = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return hash;
}

// Modern — newer games (Fibonacci hashing)
function dateToSeed(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const raw = y * 367 + m * 31 + d;
  return Math.imul(raw, 2654435761) | 0;
}`,
      language: "typescript",
      highlightLines: [6, 15],
    },
    bullets: [
      "Legacy Java hash: ((hash << 5) - hash + ch) | 0 — used by FaBdoku since day one",
      "Fibonacci hash: Math.imul(raw, 2654435761) — better distribution for newer games",
      "Can't migrate: changing FaBdoku's hash would break all historical puzzles and scores",
      "Accepted tradeoff: maintain two implementations forever, documented in CLAUDE.md",
    ],
    notes: [
      "The legacy hash is Java's String.hashCode() algorithm: ((hash << 5) - hash + ch) | 0. The '| 0' forces 32-bit integer truncation. This was the first hash I used and all FaBdoku puzzle data (picks, scores, uniqueness percentages) is keyed by date strings hashed with this function.",
      "Why it can't change: If I change the hash, the seed for '2026-03-25' changes, which changes the puzzle. But players have already submitted results for that puzzle. Their scores, picks, and uniqueness data would no longer match the regenerated puzzle. Historical data becomes meaningless.",
      "Fibonacci hashing: 2654435761 is the golden ratio × 2^32 (≈ 0.618 × 4294967296). Math.imul does a full 32-bit multiply. This spreads consecutive inputs far apart in the output space. Consecutive dates like '2026-03-24' and '2026-03-25' produce very different seeds, so puzzles feel fresh day-to-day.",
      "The legacy hash has a weakness: consecutive date strings like '2026-03-24' and '2026-03-25' produce similar hashes (only the last character differs). This means consecutive days' puzzles can feel similar. The Fibonacci hash was introduced for newer games to fix this.",
      "Both functions live in separate files: src/lib/fabdoku/seeded-random.ts (legacy) and src/lib/games/seeded-random.ts (modern). CLAUDE.md explicitly documents: 'Do NOT change the FaBdoku hash — it would break all historical puzzles.'",
      "The PRNG itself is Mulberry32 — a fast 32-bit PRNG that takes the seed and produces a stream of pseudo-random numbers. Both hash functions feed into the same Mulberry32 PRNG.",
    ],
  },
  {
    id: "tech-debt",
    type: "content",
    section: "Tech Debt",
    title: "Debt I Accepted (and the Paydown Plan)",
    bullets: [
      {
        text: "No test suite",
        sub: [
          "Velocity tradeoff for 1-month-old project",
          "Plan: add Vitest for puzzle generators and fingerprinting first",
        ],
      },
      {
        text: "Some oversized components",
        sub: [
          "Progressive extraction as features stabilize",
          "Claude Code makes refactoring cheap",
        ],
      },
      {
        text: "Dual seeded random implementations",
        sub: [
          "Permanent — can't consolidate without breaking historical data",
          "Documented as a rule in CLAUDE.md",
        ],
      },
      {
        text: "Firestore query limitations",
        sub: [
          "No complex aggregations",
          "Workaround: dual-layer public stats + client-side computation",
        ],
      },
    ],
    notes: [
      "No test suite — deeper context: The project ships features daily. Writing tests for a rapidly evolving codebase means tests break constantly as interfaces change. Once the core features stabilize, the ROI of tests goes up dramatically. First targets: puzzle generators (deterministic, easy to snapshot) and match fingerprinting (correctness is critical for dedup).",
      "Oversized components: Some page components are 500+ lines. They're 'working but messy.' Claude Code makes extraction cheap — I can prompt 'extract the stats section into a separate component' and get a clean refactor in one pass. The risk of doing it too early is creating abstractions that don't fit as the feature evolves.",
      "Firestore limitations: No GROUP BY, no COUNT, no JOINs. For the leaderboard, I denormalize: when a user's stats change, I write a summary doc to a top-level 'leaderboard' collection. For complex analytics (matchup matrix, hero win rates), I load the user's matches client-side and compute in the browser. This works fine at current scale (~hundreds of active users) but wouldn't scale to millions.",
      "If asked 'what would you test first?': 'The puzzle generator. It's deterministic — given a date, it always produces the same puzzle. I'd write snapshot tests that verify known dates produce known puzzles. If a code change accidentally modifies the generator, the snapshot fails. This is the highest-risk, lowest-effort test to add.'",
    ],
  },
  {
    id: "security",
    type: "content",
    section: "Security",
    title: "Security Model",
    // Screenshot: Firestore rules or Firebase console
    image: { src: "/deck/firestore-rules.png", alt: "Firestore security rules", caption: "Firestore rules — field-level validation" },
    bullets: [
      "Firebase Auth for identity — Google OAuth + anonymous guest mode",
      "Firestore rules: field-level validation, string length limits, admin config via token claims + email + UID lists",
      "Dual-layer data: public stats in top-level collection, private data in user subcollections",
      "Browser extension: content script isolation, no credential storage, data passed via URL params",
      "Secrets: environment variables only, never in client bundle. CSP headers whitelist Firebase + Google APIs",
    ],
    notes: [
      "Firebase Auth: Supports Google OAuth for real accounts and anonymous auth for guest mode. Guest users can play games and see their stats locally, but data isn't persisted to Firestore until they upgrade to a real account. Custom claims are used for admin roles (token.admin == true).",
      "Firestore rules example: The isAdmin() function checks three layers: (1) custom claim on the auth token, (2) email in an admin email list, (3) UID in an admin UID list. This redundancy means I can grant admin access via any of these mechanisms.",
      "Field validation: maxLen(field, 256) prevents users from writing arbitrarily long strings. Profile fields like displayName and bio have specific limits. This prevents abuse and keeps Firestore document sizes reasonable.",
      "Dual-layer data: The 'leaderboard' collection is publicly readable — anyone (including the OG image function) can read it. But 'users/{uid}/matches' is only readable by the authenticated user. This means the OG image serverless function doesn't need admin credentials — it reads from the public collection via the REST API.",
      "Extension security: The content script runs in an isolated world on gem.fabtcg.com. It never handles user credentials. Match data is serialized, LZ-compressed, and passed via URL parameters to fabstats.net/import. The import page decompresses and validates the data before writing to Firestore.",
      "CSP headers in netlify.toml: script-src, connect-src, and frame-src are locked down to Firebase, Google APIs, and the FaB card image CDN. X-Frame-Options: DENY prevents clickjacking.",
    ],
  },
  {
    id: "hindsight",
    type: "content",
    section: "Hindsight",
    title: "If I Rebuilt It Today",
    bullets: [
      {
        text: "Stay focused on the core product",
        sub: [
          "It's a stats app — but I got excited and added 12 games, an AI chatbot, and features nobody asked for",
          "Had to remove the chatbot and rein in scope after feedback made it clear users wanted better stats, not more games",
          "Lesson: build what users need, not what's fun to develop",
        ],
      },
      "Start with a test framework from day one — even minimal coverage catches regressions",
      "Use Supabase/Postgres for relational queries — Firestore struggles with complex aggregations",
      "Design achievements with event sourcing — current check functions re-evaluate every time",
      "Abstract the game data layer earlier — each new game repeats 8 isolation steps",
    ],
    notes: [
      "Scope creep story: I built an AI chatbot (using Claude API) that could answer questions about your stats. It was cool tech but nobody asked for it. Meanwhile, users were submitting feedback asking for better filtering on the stats page and more detailed match breakdowns. I was building what excited me, not what users needed.",
      "How I caught it: The daily feedback triage with Claude. I'd review new user submissions and Claude would help prioritize. After a week of feedback all asking for core stats improvements and zero asking for chat features, the pattern was obvious. I removed the chatbot entirely.",
      "Supabase/Postgres: Firestore is great for real-time and simple queries, but when you need: 'show me my win rate against Warrior class heroes in Blitz format over the last 3 months' — that's a SQL query. In Firestore, I load all matches client-side and filter in JavaScript. It works, but it's wasteful and doesn't scale.",
      "Event sourcing for achievements: Currently, achievement check functions re-run every time the profile loads. They iterate over matches and game stats to determine which achievements are earned. With event sourcing, each action (win, loss, game completion) would emit an event, and achievements would be computed incrementally. Much more efficient at scale.",
      "Game data layer abstraction: Each new game requires creating: puzzle generator, localStorage keys, Firestore collections (results + picks), stats subcollection, public stats collection, feed event type, activity action, and achievements. That's 8 isolated layers. A framework or factory pattern would reduce this to a configuration object.",
    ],
  },

  // ── Section 3: Claude Code Workflow ──────────────────────
  {
    id: "claude-divider",
    type: "section",
    title: "Working with Claude Code",
    notes: [
      "This section is unique to the interview — they specifically want to understand your AI-assisted workflow.",
      "Be honest about both benefits and limitations. They want to see you're a critical thinker, not just a prompt-and-accept developer.",
    ],
  },
  {
    id: "workflow",
    type: "content",
    section: "Workflow",
    title: "How I Work with Claude Code Day-to-Day",
    bullets: [
      "1. Prompt with context — file paths, constraints, reference to CLAUDE.md rules",
      "2. Claude edits files — I review every diff before accepting",
      {
        text: "3. Validate correctness at three levels:",
        sub: [
          "npx tsc --noEmit — catches type errors immediately",
          "npm run build — verifies static export succeeds, no runtime issues",
          "Manual QA — test the feature in browser, check edge cases across devices",
        ],
      },
      "4. Iterate: refine with follow-up prompts scoped to specific issues",
      "5. Daily feedback triage: review user submissions with Claude in plan mode to course-correct",
    ],
    notes: [
      "Context in prompts is key: Instead of 'add a new game', I say 'add a new Connections game. See the FaBdoku implementation in src/lib/fabdoku/ for the pattern. Follow the data isolation table in CLAUDE.md. Use the Fibonacci hash from src/lib/games/seeded-random.ts, not the legacy FaBdoku hash.' Specificity prevents mistakes.",
      "Diff review: I read every line Claude changes before accepting. This is where I catch issues like the UTC bug. Claude is fast and usually correct, but domain-specific constraints need human verification.",
      "TypeScript as a guardrail: tsc --noEmit runs in ~5 seconds and catches most logic errors. If Claude produces code that doesn't type-check, I immediately know something's wrong. The strict config catches: null safety issues, missing return types, exhaustive switch cases, and incorrect property access.",
      "npm run build goes further: It catches runtime import errors, circular dependencies, and issues that only surface during static generation (like trying to access window during SSR).",
      "The feedback triage loop: Every day I open Claude in plan mode, point it at the Firestore feedback collection, and ask 'what are users asking for? prioritize by frequency and impact.' Claude reads the submissions, groups them by theme, and suggests a prioritized list. This is how I decide what to build each day.",
      "If asked 'do you ever work without Claude?': 'Yes — for debugging production issues, I often read the code directly because I need to understand the full context. Claude is best for implementation (writing code to a spec) and worst for debugging subtle state issues where the full picture matters.'",
    ],
  },
  {
    id: "claude-md",
    type: "content",
    section: "CLAUDE.md",
    title: "CLAUDE.md + Feedback-Driven Development",
    bullets: [
      "Encodes domain rules Claude can't infer — UTC dates, seeded random compatibility, data isolation patterns",
      "Prevents recurring mistakes — after the UTC bug, added the rule so it never happens again",
      "Acts as onboarding doc — new context windows pick up project conventions instantly",
      {
        text: "Daily feedback triage with Claude",
        sub: [
          "Built a feedback button — users submit suggestions directly to Firestore",
          "Each day, review new feedback with Claude in plan mode — it reads from Firestore and helps prioritize",
          "This loop is what caught the scope creep — users wanted core stats improvements, not more games",
        ],
      },
      "Git workflow rules: never commit to main, feature branches, focused PRs",
    ],
    notes: [
      "CLAUDE.md is loaded into every new Claude Code context window automatically. It's the first thing Claude 'reads' when starting a session. This means every conversation starts with the project's conventions, constraints, and rules already understood.",
      "What's in our CLAUDE.md: Stack description (Next.js 16, Firebase, Tailwind v4), build commands, path aliases, the UTC rule, the seeded random rule, the FaBdoku dual-mode isolation table (8 layers), card data gotchas, OG image system details, and the git workflow (never commit to main, feature branches, focused PRs).",
      "Why it's better than comments: Comments are local to a file. CLAUDE.md is global — every file Claude touches benefits from the rules. And unlike docs that humans forget to read, Claude reads CLAUDE.md automatically every time.",
      "Feedback collection: Users tap a feedback button in the app, type their suggestion, and it writes to a Firestore 'feedback' collection. In plan mode, I ask Claude to read recent submissions and categorize them. This surfaces patterns I might miss reading individual submissions.",
      "The git workflow rule is important: Without it, Claude sometimes commits directly to main or creates overly large commits. The CLAUDE.md rule says 'NEVER commit directly to main. Create feature branches (feature/description) or fix branches (fix/description). Keep PRs focused — one feature or fix per branch.'",
    ],
  },
  {
    id: "diffs",
    type: "content",
    section: "Diffs",
    title: "Keeping Changes Manageable",
    bullets: [
      "One feature per branch — 70+ feature branches, 70+ fix branches in this repo",
      "Scope prompts narrowly: 'add UTC validation to this function' not 'fix all date handling'",
      "Review each change before prompting the next — don't let Claude chain unchecked edits",
      "CLAUDE.md prevents scope creep — Claude knows the boundaries and conventions",
      "Result: 1,167 commits that are each small, focused, and reviewable",
    ],
    notes: [
      "Branch naming convention: feature/* for new features, fix/* for bug fixes, perf/* for performance, style/* for UI changes. We have 140+ branches total, showing a disciplined branching strategy.",
      "Narrow prompts are critical: If I say 'fix all date handling', Claude might touch 30 files and introduce regressions. If I say 'change getMonth() to getUTCMonth() in src/lib/fabdoku/puzzle-generator.ts', I get a precise 1-line change I can verify in seconds.",
      "Serial review: I don't batch prompt. I make one change, verify it works (tsc, build, manual check), then prompt the next change. This keeps each change small and means I can git bisect to find regressions easily.",
      "CLAUDE.md prevents scope creep in Claude's output too: Without it, Claude might 'helpfully' refactor nearby code or add error handling that isn't needed. The conventions in CLAUDE.md keep Claude focused on the task.",
      "If asked about PR review: 'Since I'm the only developer, there's no formal code review. But the branch → PR → merge workflow still adds value: it creates a record of each change, Netlify builds a deploy preview, and I can roll back by reverting a PR merge if something breaks.'",
    ],
  },
  {
    id: "catching-errors",
    type: "code",
    section: "Catching Errors",
    title: "When Claude Gets It Wrong",
    code: {
      snippet: `// Claude generated this for a new game feature:
const today = new Date();
const dateStr = \`\${today.getFullYear()}-\${
  today.getMonth() + 1}-\${today.getDate()}\`;

// ❌ Violates CLAUDE.md rule:
// "Never use local-time date methods
//  for game dates — always use UTC"

// I caught it in manual testing:
// different puzzle in UTC+12 vs UTC-8

// Corrected to:
const dateStr = getTodayDateStr();
// Uses getUTCFullYear/Month/Date internally`,
      language: "typescript",
      highlightLines: [2, 3, 4, 14],
    },
    bullets: [
      "Claude used getMonth() instead of getUTCMonth() for game date logic",
      "Violated the UTC rule documented in CLAUDE.md",
      "Caught by: manual testing showed different puzzles in different timezones",
      "Fix: corrected the code + strengthened the CLAUDE.md rule",
      "Lesson: domain-specific rules in CLAUDE.md are essential — Claude follows them on subsequent prompts",
    ],
    notes: [
      "This happened early in the project, before the UTC rule was in CLAUDE.md. Claude used the standard JavaScript Date methods because that's the most common pattern in codebases — there was nothing telling it to use UTC.",
      "How I caught it: I was testing the new game by changing my system timezone to UTC+12. The puzzle was different from what I saw in UTC-5. That's when I realized the date string was timezone-dependent.",
      "After the fix: I added the explicit UTC rule to CLAUDE.md. In every subsequent session, Claude uses getTodayDateStr() or UTC methods for game dates. The rule has prevented this class of bug from recurring across all 12+ games added since.",
      "Key insight for the interviewer: Claude is only as good as the context you give it. Without CLAUDE.md, Claude applies general best practices. With CLAUDE.md, it applies YOUR project's specific rules. This is the difference between a useful tool and a reliable teammate.",
      "If asked 'does Claude always follow CLAUDE.md?': 'Almost always. Occasionally it'll miss a rule if the prompt is very long and pushes CLAUDE.md out of the context window. That's rare with Claude Opus's 200K context. When it does happen, I catch it in review and reinforce the rule.'",
    ],
  },
  {
    id: "large-changes",
    type: "content",
    section: "Large Changes",
    title: "Breaking Down Big Features",
    bullets: [
      "Phase approach: data layer first → components → integration → polish",
      "Example: FaBdoku card mode required 8 isolated layers",
      {
        text: "Each layer added separately:",
        sub: [
          "Seed offset (+1,000,003)",
          "localStorage keys (fabdoku-card-{date})",
          "Firestore collections (fabdoku-card-results, fabdoku-card-picks)",
          "Stats subcollection, public stats, feed event type, activity action",
        ],
      },
      "Documented the pattern in CLAUDE.md so future game modes follow the same isolation checklist",
    ],
    notes: [
      "Why phase approach: Claude works best with clear, bounded tasks. 'Build the entire card mode' would produce a massive diff that's hard to review. 'Add the Firestore collections for card mode results and picks' is a small, verifiable change.",
      "The 8 isolation layers explained: (1) Seed offset: card mode adds 1,000,003 to the date seed so it produces a completely different puzzle than hero mode on the same day. (2) localStorage: separate keys prevent card mode from overwriting hero mode state. (3-4) Firestore: separate collections so card mode has its own results and picks (for uniqueness scoring). (5) Stats subcollection: per-user game stats stored separately. (6) Public stats: separate collection for the leaderboard. (7) Feed events: different event type so the activity feed shows 'completed card FaBdoku' vs 'completed FaBdoku'. (8) Activity action: separate action type for analytics tracking.",
      "Why 1,000,003? It's a prime number large enough that there's no overlap between hero mode seeds and card mode seeds for any realistic date range. Using a prime avoids periodic collisions that could occur with a round number offset.",
      "The CLAUDE.md table: There's a literal table in CLAUDE.md showing all 8 layers for hero mode vs card mode. When I add a third mode (e.g., equipment mode), I just add a column to the table and Claude knows exactly what to create.",
      "If asked about the PR: 'The FaBdoku card mode was shipped in one bundled PR because splitting 8 tightly-coupled layers across multiple PRs would create intermediate states where some layers exist but others don't. Better to ship it all at once and test the complete feature.'",
    ],
  },

  // ── Closing ──────────────────────────────────────────────
  {
    id: "takeaways",
    type: "content",
    section: "Takeaways",
    title: "Key Takeaways",
    bullets: [
      "Solo-dev velocity is real with AI tooling — 65K lines in a month, shipping daily",
      "Production-grade patterns matter: UTC-first, data isolation, static-first architecture",
      "CLAUDE.md is the most underrated feature — it turns Claude from a tool into a teammate",
      "Pragmatic tradeoffs with clear documentation beat perfect architecture",
      "The presentation you're looking at is built with the same stack — Next.js, Tailwind, framer-motion",
    ],
    notes: [
      "The 65K lines number: This isn't generated boilerplate. It's 446 TypeScript files with meaningful business logic — puzzle generators, achievement systems, data pipelines, real-time features.",
      "UTC-first is a philosophy: Once you decide all dates are UTC, every new feature inherits that constraint. It's a one-time architectural decision that prevents an entire class of bugs.",
      "CLAUDE.md as a concept: Even if you're not using Claude Code, the idea of a 'machine-readable project convention file' is powerful. It could work with any LLM-powered tool. The key insight is: encode the rules that aren't obvious from the code itself.",
      "Static-first architecture: Zero server costs, instant global CDN, and the simplest possible deployment. Add server-side capabilities only when static export can't solve the problem (like dynamic OG images).",
      "The meta point: This slide deck is a Next.js page component at /deck. It uses the same Tailwind theme tokens, framer-motion animations, and deployment pipeline as the rest of the app. Building the presentation inside the project wasn't just clever — it saved time by reusing existing infrastructure.",
    ],
  },
  {
    id: "demo",
    type: "content",
    section: "Demo",
    title: "Want to See It Live?",
    // Screenshot: player profile page with achievements, stats, share card
    image: { src: "/deck/profile.png", alt: "Player profile with stats and achievements", caption: "Player profile — stats, achievements, OG share card" },
    bullets: [
      "fabstats.net — try the daily FaBdoku, Crossword, Connections",
      "Player profiles with 158 achievements, leaderboards, activity feed",
      "Browser extension imports matches from GEM in one click",
      "Happy to walk through any part of the codebase",
    ],
    notes: [
      "If they want a live demo: Navigate to fabstats.net, show the daily FaBdoku, complete a puzzle, show the share card, show the leaderboard.",
      "If they want to see code: Open the repo and walk through src/lib/fabdoku/puzzle-generator.ts (the generator), src/lib/achievements.ts (the achievement system), or firestore.rules (the security rules).",
      "If they want to see the extension: Show the extension popup on gem.fabtcg.com, run an import, show how matches appear on the site.",
      "Good closing: 'I'm happy to dive into any part of the codebase — the puzzle generation, the achievement system, the security rules, the OG image pipeline, or the extension. What interests you most?'",
    ],
  },
  {
    id: "thanks",
    type: "title",
    title: "Thanks — Questions?",
    subtitle: "fabstats.net | Charlton",
    notes: [
      "Common follow-up questions and answers:",
      "Q: 'How do you handle conflicts between Claude's suggestions and your own ideas?' A: 'I treat Claude as a very fast junior developer. It writes code, I review it. If I disagree with an approach, I explain why in the next prompt. CLAUDE.md encodes the patterns I want followed so I don't have to re-explain every session.'",
      "Q: 'What's your biggest concern about AI-assisted development?' A: 'Over-reliance. It's easy to accept code without fully understanding it. I combat this by always reading the diff and running the type checker. If I can't explain why a change works, I don't merge it.'",
      "Q: 'How would this project change with a team?' A: 'First: add tests. Second: formalize the data layer abstractions so new games are configuration, not code. Third: split the monorepo into packages (games, core, extension). Fourth: add CI/CD with test gates on PRs.'",
      "Q: 'What's the hardest technical challenge you solved?' A: 'The puzzle generation validation. Making sure every randomly generated grid is solvable while maintaining variety across consecutive days, with backward-compatible seeded randomness, is a non-trivial constraint satisfaction problem.'",
    ],
  },
];

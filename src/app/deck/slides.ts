export type SlideType =
  | "title"
  | "section"
  | "hero"
  | "stats"
  | "cards"
  | "timeline"
  | "content"
  | "code"
  | "split"
  | "diagram";

export interface BulletItem {
  text: string;
  sub?: string[];
}

export type Bullet = string | BulletItem;

export interface StatItem {
  value: number;
  suffix?: string;
  label: string;
}

export interface CardItem {
  icon: string;
  title: string;
  description: string;
  mono?: string;
}

export interface TimelineStep {
  label: string;
  description: string;
}

export interface Slide {
  id: string;
  type: SlideType;
  section?: string;
  sectionNumber?: string;
  title: string;
  subtitle?: string;
  bullets?: Bullet[];
  code?: {
    snippet: string;
    language: string;
    highlightLines?: number[];
    filename?: string;
  };
  diagram?: "architecture" | "data-flow";
  left?: { title: string; bullets: string[] };
  right?: { title: string; bullets: string[] };
  notes?: string[];
  stats?: StatItem[];
  cards?: CardItem[];
  timelineSteps?: TimelineStep[];
}

export const SLIDES: Slide[] = [
  // ── Opening ──────────────────────────────────────────────
  {
    id: "title",
    type: "title",
    title: "FaB Stats",
    subtitle: "Engineering Deep Dive — Charlton — XPathLabs",
    notes: [
      "Intro: 'Thanks for having me. I'm going to walk through FaB Stats — a project I built and shipped end-to-end as a solo developer.'",
      "This presentation itself is built inside the project — it's a Next.js page at /deck using the same stack, theme system, and framer-motion animations.",
      "If they ask why you built the presentation this way: 'I wanted to demonstrate the stack rather than just talk about it. This slide deck is a React component deployed on the same Netlify CDN.'",
    ],
  },
  {
    id: "hero-intro",
    type: "hero",
    title:
      "A Flesh and Blood TCG stats platform built end-to-end by one developer in one month.",
    notes: [
      "Flesh and Blood is a trading card game by Legend Story Studios — think Magic: The Gathering but newer, growing competitive scene.",
      "GEM is the official tournament platform — it tracks matches but has no stats, no win rates, no matchup data. Players were literally using spreadsheets.",
      "If asked 'why solo?': 'This is a community project I built for myself and other players. The velocity was possible because of Claude Code — I'll cover that workflow later.'",
    ],
  },
  {
    id: "stats-overview",
    type: "stats",
    title: "By the Numbers",
    stats: [
      { value: 65, suffix: "K", label: "Lines of TypeScript" },
      { value: 1167, label: "Commits in 1 Month" },
      { value: 12, suffix: "+", label: "Daily Minigames" },
      { value: 0, suffix: "", label: "Server Cost" },
    ],
    notes: [
      "The 1,167 commits in 1 month is real — I was shipping features daily using Claude Code. Average ~38 commits/day.",
      "The 65K lines includes: 446 TypeScript/TSX files, 60+ Next.js routes, Firestore security rules, Netlify serverless functions, and a Manifest V3 browser extension.",
      "$0 server cost: Firebase Spark plan (free), Netlify free tier. The only cost is the domain name.",
    ],
  },

  // ── Section 1: Project Walkthrough ───────────────────────
  {
    id: "walkthrough-divider",
    type: "section",
    sectionNumber: "01",
    title: "Project Walkthrough",
    subtitle: "Problem → Architecture → Testing → Deploy → Production Issues",
    notes: [
      "This section maps to: problem statement, what you owned, architecture, testing, deployment, and production issues.",
      "Keep each slide to ~2 minutes. Leave room for questions — they'll likely dig into one or two areas.",
    ],
  },
  {
    id: "hero-problem",
    type: "hero",
    title: "No API. No stats. Just spreadsheets.",
    notes: [
      "This is the one-liner hook. Let it land, then expand: 'GEM, the official tournament platform, tracks matches but gives players no way to analyze their performance. People were literally copy-pasting results into Google Sheets.'",
    ],
  },
  {
    id: "problem-cards",
    type: "cards",
    section: "Problem",
    title: "What Made This Hard",
    cards: [
      {
        icon: "🔒",
        title: "No GEM API",
        description:
          "Had to reverse-engineer scraping via a Manifest V3 browser extension",
        mono: "content.js",
      },
      {
        icon: "📋",
        title: "No Standard Format",
        description:
          "Matches lack consistent format identifiers — built guessEventType() with regex",
        mono: "gem-paste-import.ts",
      },
      {
        icon: "🌍",
        title: "Global Puzzle Sync",
        description:
          "Daily games must reset at the same time for all players worldwide — UTC only",
        mono: "getTodayDateStr()",
      },
      {
        icon: "🃏",
        title: "Card Data Gaps",
        description:
          "4,200+ cards with inconsistencies: 'Go again' vs 'Go Again', generic card exclusions",
        mono: "@flesh-and-blood/cards",
      },
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
    id: "ownership-cards",
    type: "cards",
    section: "Ownership",
    title: "Full-Stack Solo Dev",
    cards: [
      {
        icon: "⚛️",
        title: "Frontend",
        description: "60+ routes, App Router, React 19, Tailwind v4",
        mono: "Next.js 16",
      },
      {
        icon: "🔥",
        title: "Backend",
        description:
          "Auth, Firestore, security rules, dual-layer public/private data",
        mono: "Firebase",
      },
      {
        icon: "🌐",
        title: "Infrastructure",
        description:
          "Static export + edge functions + serverless OG image generation",
        mono: "Netlify",
      },
      {
        icon: "🧩",
        title: "Browser Extension",
        description:
          "Content script scrapes GEM tournament data with LZ compression",
        mono: "Manifest V3",
      },
      {
        icon: "📊",
        title: "Data Pipeline",
        description:
          "5 import methods, dual-hash fingerprinting, cross-player match linking",
        mono: "importMatches()",
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
        "Deterministic seeded RNG — same date = same puzzle",
        "Firestore security rules with emulator",
        "Manual QA on daily puzzles and game flows",
        "Build verification on every change",
      ],
    },
    right: {
      title: "What I Don't (Yet)",
      bullets: [
        "No unit test suite — velocity tradeoff at 1 month old",
        "No E2E — manual flows fast enough at current scale",
        "Plan: Vitest for puzzle generators and fingerprinting",
      ],
    },
    notes: [
      "TypeScript strict catches a LOT. With strict: true, noUncheckedIndexedAccess, and exhaustive type checking on discriminated unions (like SlideType or feed event types), the compiler catches most logic errors before runtime.",
      "Deterministic seeded RNG is inherently testable: dateToSeed('2026-03-25') always returns the same number, which always generates the same puzzle. You can 'snapshot test' this by running the generator for a date and checking the output. I do this manually but it would be the first thing to automate.",
      "Firestore emulator: Firebase provides a local emulator suite. I test security rules by writing rule unit tests that verify: unauthenticated users can't write, users can only read their own private data, admin-only fields are protected, string length limits are enforced.",
      "Why no unit tests yet: 'It's a deliberate tradeoff. The project is 1 month old and I'm the only developer. The cost of a test suite is high upfront, and the cost of bugs is low (I can hotfix in minutes). As the project stabilizes and onboards contributors, tests become essential. Vitest is my planned framework — it's fast, ESM-native, and works well with React.'",
      "If challenged: 'I know this is a risk. The puzzle generator bug is exactly the kind of thing a test would have caught. That's why it's the first thing I'd add — a test that validates every generated puzzle has at least 3 valid answers per cell.'",
    ],
  },
  {
    id: "deployment",
    type: "timeline",
    section: "Deploy",
    title: "Deployment Pipeline",
    timelineSteps: [
      { label: "Git Push", description: "Feature branch → PR → merge to main" },
      {
        label: "Netlify Build",
        description: "Auto-build, static export, zip extension",
      },
      {
        label: "CDN Deploy",
        description: "Pre-rendered HTML to global edge",
      },
      {
        label: "Edge Functions",
        description: "OG image rewrites + serverless rendering",
      },
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
    id: "hero-bugs",
    type: "hero",
    title: "Three production bugs. Three different lessons.",
    notes: [
      "Pause here. Let the statement land. Then say: 'Let me walk through each one — they each taught me something different about building production software.'",
      "The unsolvable FaBdoku puzzles bug: Puzzle generator sometimes created grids with no valid solution. Root cause: random category pairs could produce cells with zero valid heroes. Fix: added backtracking validation — every cell must have ≥3 valid answers. Added fallback cascade: retry with different category pairs if validation fails. Lesson: generative algorithms need constraint validation, not just randomness.",
      "How FaBdoku works: It's a 3×3 grid where rows and columns are FaB categories (class, talent, age, stat, format). Each cell is the intersection of a row category and column category. Players must name a hero that satisfies both.",
    ],
  },
  {
    id: "prod-utc",
    type: "code",
    section: "Prod Issue",
    title: "Players Seeing Different Puzzles",
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
      filename: "puzzle-generator.ts",
    },
    bullets: [
      "Root cause: getMonth() returns local time, not UTC",
      "Fix: standardized ALL game dates to UTC — 21 files changed",
      "Added UTC rule to CLAUDE.md — never happened again",
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
    section: "Prod Issue",
    title: "Profile Pages Crashing",
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
      filename: "PlayerProfile.tsx",
    },
    bullets: [
      "useMemo called after early return → React hook order violation",
      "Fix: replaced with IIFE — no hook needed for simple derivation",
      "Lesson: hooks must be called unconditionally before returns",
    ],
    notes: [
      "React's Rules of Hooks: Hooks must be called in the same order every render. If you return early before a hook, React sees fewer hooks on that render than the previous one and throws.",
      "Why useMemo was there in the first place: It was a premature optimization. The computation (computeStats) was simple enough that memoization wasn't needed. An IIFE (() => computeStats(data))() computes the value inline without registering a hook.",
      "Alternative fix: Could have moved the useMemo above the early return and given it a fallback value. But since memoization wasn't needed, removing the hook entirely was the cleaner solution.",
      "How I caught it: The error appeared in the browser console on a player profile page. React's error message ('rendered more hooks than previous render') pointed directly to the issue. The fix was a 1-line change.",
      "If asked about React 19 specifics: React 19 didn't change the Rules of Hooks. The same constraint applies. The React Compiler (which React 19 introduces) can auto-memoize, but it still can't fix hooks-after-returns because that's a fundamental invariant of the reconciler.",
    ],
  },

  // ── Section 2: Tradeoffs ─────────────────────────────────
  {
    id: "tradeoffs-divider",
    type: "section",
    sectionNumber: "02",
    title: "Tradeoffs & Decisions",
    subtitle:
      "Architecture choices → Performance vs simplicity → Tech debt → Security",
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
        "SSR/ISR — server cost + complexity",
        "Supabase — Firebase gives auth + realtime free",
        "Vercel — Netlify edge better for OG images",
        "Server components — games need localStorage",
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
      filename: "seeded-random.ts",
    },
    bullets: [
      "Legacy Java hash — FaBdoku since day one, can't change",
      "Fibonacci hash — better distribution for newer games",
      "Permanent tradeoff: two implementations forever, documented in CLAUDE.md",
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
    id: "hero-debt",
    type: "hero",
    title: "Some debt is permanent. Document it.",
    notes: [
      "This refers to the dual seeded random implementations. You can't pay down all debt — some is structural and permanent. The key is documentation so everyone (including AI tools) knows about it.",
    ],
  },
  {
    id: "tech-debt-cards",
    type: "cards",
    section: "Tech Debt",
    title: "Debt I Accepted",
    cards: [
      {
        icon: "🧪",
        title: "No Test Suite",
        description:
          "Velocity tradeoff — plan to add Vitest for puzzle generators first",
        mono: "vitest",
      },
      {
        icon: "📦",
        title: "Large Components",
        description:
          "Some pages are 500+ lines — progressive extraction as features stabilize",
        mono: "refactor",
      },
      {
        icon: "#️⃣",
        title: "Dual Hashing",
        description:
          "Permanent — can't consolidate without breaking historical puzzle data",
        mono: "seeded-random.ts",
      },
      {
        icon: "🔍",
        title: "Firestore Limits",
        description:
          "No JOINs or aggregations — workaround with denormalized data + client compute",
        mono: "Firestore",
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
    id: "security-cards",
    type: "cards",
    section: "Security",
    title: "Security Model",
    cards: [
      {
        icon: "🔐",
        title: "Firebase Auth",
        description:
          "Google OAuth + anonymous guest mode, custom claims for admin roles",
        mono: "auth",
      },
      {
        icon: "🛡️",
        title: "Firestore Rules",
        description:
          "Field-level validation, string limits, admin config via token claims",
        mono: "firestore.rules",
      },
      {
        icon: "📊",
        title: "Dual-Layer Data",
        description:
          "Public stats for OG images, private data in user subcollections",
        mono: "leaderboard",
      },
      {
        icon: "🧩",
        title: "Extension Isolation",
        description:
          "Content script isolation, no credentials stored, LZ-compressed URL params",
        mono: "content.js",
      },
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
    id: "hero-users",
    type: "hero",
    title: "Build what users need, not what's fun to develop.",
    notes: [
      "Scope creep story: I built an AI chatbot (using Claude API) that could answer questions about your stats. It was cool tech but nobody asked for it. Meanwhile, users were submitting feedback asking for better filtering on the stats page and more detailed match breakdowns. I was building what excited me, not what users needed.",
      "How I caught it: The daily feedback triage with Claude. I'd review new user submissions and Claude would help prioritize. After a week of feedback all asking for core stats improvements and zero asking for chat features, the pattern was obvious. I removed the chatbot entirely.",
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
          "Added 12 games, an AI chatbot, and features nobody asked for",
          "Feedback loop caught it — removed chatbot, refocused on stats",
        ],
      },
      "Start with a test framework from day one",
      "Use Supabase/Postgres for relational queries",
      "Design achievements with event sourcing",
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
    sectionNumber: "03",
    title: "Working with Claude Code",
    subtitle: "Workflow → CLAUDE.md → Small diffs → Catching errors → Large changes",
    notes: [
      "This section is unique to the interview — they specifically want to understand your AI-assisted workflow.",
      "Be honest about both benefits and limitations. They want to see you're a critical thinker, not just a prompt-and-accept developer.",
    ],
  },
  {
    id: "workflow",
    type: "timeline",
    section: "Workflow",
    title: "Day-to-Day Workflow",
    timelineSteps: [
      {
        label: "Prompt",
        description: "File paths, constraints, CLAUDE.md rules",
      },
      {
        label: "Edit",
        description: "Claude writes code, I review every diff",
      },
      {
        label: "Verify",
        description: "tsc --noEmit → build → manual QA",
      },
      {
        label: "Iterate",
        description: "Scoped follow-ups, one change at a time",
      },
      {
        label: "Triage",
        description: "Daily feedback review in plan mode",
      },
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
    id: "claude-md-cards",
    type: "cards",
    section: "CLAUDE.md",
    title: "CLAUDE.md — Project Memory",
    cards: [
      {
        icon: "📜",
        title: "Domain Rules",
        description:
          "UTC dates, seeded random compat, data isolation — rules Claude can't infer from code",
        mono: "CLAUDE.md",
      },
      {
        icon: "🚫",
        title: "Mistake Prevention",
        description:
          "After the UTC bug, added the rule — it never happened again across 12+ games",
        mono: "UTC rule",
      },
      {
        icon: "🚀",
        title: "Instant Onboarding",
        description:
          "New context windows pick up conventions instantly — no re-explaining",
        mono: "auto-loaded",
      },
      {
        icon: "📬",
        title: "Feedback Loop",
        description:
          "Users submit to Firestore, Claude triages daily — caught the scope creep",
        mono: "plan mode",
      },
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
    id: "hero-diffs",
    type: "hero",
    title: "Scope prompts narrowly. Review before the next.",
    notes: [
      "Branch naming convention: feature/* for new features, fix/* for bug fixes, perf/* for performance, style/* for UI changes. We have 140+ branches total, showing a disciplined branching strategy.",
      "Narrow prompts are critical: If I say 'fix all date handling', Claude might touch 30 files and introduce regressions. If I say 'change getMonth() to getUTCMonth() in src/lib/fabdoku/puzzle-generator.ts', I get a precise 1-line change I can verify in seconds.",
      "Serial review: I don't batch prompt. I make one change, verify it works (tsc, build, manual check), then prompt the next change. This keeps each change small and means I can git bisect to find regressions easily.",
      "CLAUDE.md prevents scope creep in Claude's output too: Without it, Claude might 'helpfully' refactor nearby code or add error handling that isn't needed. The conventions in CLAUDE.md keep Claude focused on the task.",
      "If asked about PR review: 'Since I'm the only developer, there's no formal code review. But the branch → PR → merge workflow still adds value: it creates a record of each change, Netlify builds a deploy preview, and I can roll back by reverting a PR merge if something breaks.'",
      "Result: 1,167 commits that are each small, focused, and reviewable. 70+ feature branches, 70+ fix branches.",
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
      filename: "new-game.ts",
    },
    bullets: [
      "Claude used getMonth() — violates CLAUDE.md UTC rule",
      "Caught in manual testing: different puzzle per timezone",
      "Strengthened the rule — Claude follows it every session since",
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
    id: "large-changes-cards",
    type: "cards",
    section: "Large Changes",
    title: "FaBdoku Card Mode — 8 Isolated Layers",
    cards: [
      {
        icon: "🎲",
        title: "Seed Offset",
        description:
          "+1,000,003 prime offset for completely different puzzles",
        mono: "dateToSeed()",
      },
      {
        icon: "💾",
        title: "localStorage",
        description:
          "Separate keys: fabdoku-card-{date} vs fabdoku-{date}",
        mono: "localStorage",
      },
      {
        icon: "🔥",
        title: "Firestore Collections",
        description:
          "Separate results + picks collections for uniqueness scoring",
        mono: "fabdoku-card-*",
      },
      {
        icon: "📡",
        title: "Stats + Feed + Activity",
        description:
          "Subcollection, public stats, feed event type, activity action",
        mono: "4 more layers",
      },
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
    id: "hero-velocity",
    type: "hero",
    title: "Solo-dev velocity is real with AI tooling.",
    notes: [
      "The 65K lines number: This isn't generated boilerplate. It's 446 TypeScript files with meaningful business logic — puzzle generators, achievement systems, data pipelines, real-time features.",
      "CLAUDE.md as a concept: Even if you're not using Claude Code, the idea of a 'machine-readable project convention file' is powerful. It could work with any LLM-powered tool. The key insight is: encode the rules that aren't obvious from the code itself.",
    ],
  },
  {
    id: "takeaways-cards",
    type: "cards",
    section: "Takeaways",
    title: "Key Takeaways",
    cards: [
      {
        icon: "⚡",
        title: "AI-Powered Velocity",
        description:
          "65K lines in one month — shipping features daily with Claude Code",
        mono: "1,167 commits",
      },
      {
        icon: "🏗️",
        title: "Production Patterns",
        description:
          "UTC-first, data isolation, static-first architecture, deterministic seeding",
        mono: "patterns",
      },
      {
        icon: "📋",
        title: "CLAUDE.md is Key",
        description:
          "Turns Claude from a general tool into a project-aware teammate",
        mono: "CLAUDE.md",
      },
      {
        icon: "⚖️",
        title: "Pragmatic Tradeoffs",
        description:
          "Clear documentation beats perfect architecture — know what you're accepting",
        mono: "tradeoffs",
      },
    ],
    notes: [
      "UTC-first is a philosophy: Once you decide all dates are UTC, every new feature inherits that constraint. It's a one-time architectural decision that prevents an entire class of bugs.",
      "Static-first architecture: Zero server costs, instant global CDN, and the simplest possible deployment. Add server-side capabilities only when static export can't solve the problem (like dynamic OG images).",
      "The meta point: This slide deck is a Next.js page component at /deck. It uses the same Tailwind theme tokens, framer-motion animations, and deployment pipeline as the rest of the app. Building the presentation inside the project wasn't just clever — it saved time by reusing existing infrastructure.",
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
      "If they want a live demo: Navigate to fabstats.net, show the daily FaBdoku, complete a puzzle, show the share card, show the leaderboard.",
      "If they want to see code: Open the repo and walk through src/lib/fabdoku/puzzle-generator.ts (the generator), src/lib/achievements.ts (the achievement system), or firestore.rules (the security rules).",
      "Good closing: 'I'm happy to dive into any part of the codebase — the puzzle generation, the achievement system, the security rules, the OG image pipeline, or the extension. What interests you most?'",
    ],
  },
];

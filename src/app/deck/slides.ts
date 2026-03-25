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
}

export const SLIDES: Slide[] = [
  // ── Opening ──────────────────────────────────────────────
  {
    id: "title",
    type: "title",
    title: "FaB Stats: Engineering Deep Dive",
    subtitle: "fabstats.net — Charlton — XPathLabs Interview",
  },
  {
    id: "overview",
    type: "content",
    section: "Overview",
    title: "What is FaB Stats?",
    bullets: [
      "Flesh and Blood TCG match tracker + daily minigame platform",
      "Built as a player — I needed better stats than what existed",
      "1 month, 1,167 commits, 65K lines of TypeScript across 446 files",
      "12+ daily games, 158 achievements, browser extension, serverless OG images",
      "Solo full-stack: Next.js 16, Firebase, Netlify, Manifest V3 extension",
    ],
  },

  // ── Section 1: Project Walkthrough ───────────────────────
  {
    id: "walkthrough-divider",
    type: "section",
    title: "Project Walkthrough",
  },
  {
    id: "problem",
    type: "content",
    section: "Problem",
    title: "Problem Statement",
    bullets: [
      "FaB community had no centralized stats platform — players tracked results in spreadsheets",
      "GEM (official tournament platform) has no public API — had to reverse-engineer scraping",
      "No standard data format for match records across events and formats",
      "Daily games needed global sync — puzzles must reset at the same time for all players worldwide",
      "Card data from @flesh-and-blood/cards has inconsistencies (e.g. 'Go again' vs 'Go Again', generic cards)",
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
        text: "Data Pipeline",
        sub: [
          "Match import, deduplication via dual-hash fingerprinting, cross-player linking",
        ],
      },
    ],
  },
  {
    id: "architecture",
    type: "diagram",
    section: "Architecture",
    title: "System Architecture",
    diagram: "architecture",
  },
  {
    id: "data-flow",
    type: "diagram",
    section: "Data Flow",
    title: "Data Flow",
    diagram: "data-flow",
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
  },
  {
    id: "prod-puzzles",
    type: "content",
    section: "Prod Issue #3",
    title: "Bug: Impossible FaBdoku Grids",
    bullets: [
      "Puzzle generator sometimes created grids with no valid solution",
      "Root cause: random category pairs could produce cells with zero valid heroes",
      "Fix: added backtracking validation — every cell must have ≥3 valid answers",
      "Added fallback cascade: retry with different category pairs if validation fails",
      "Lesson: generative algorithms need constraint validation, not just randomness",
    ],
  },

  // ── Section 2: Tradeoffs ─────────────────────────────────
  {
    id: "tradeoffs-divider",
    type: "section",
    title: "Tradeoffs & Decisions",
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
  },
  {
    id: "security",
    type: "content",
    section: "Security",
    title: "Security Model",
    bullets: [
      "Firebase Auth for identity — Google OAuth + anonymous guest mode",
      "Firestore rules: field-level validation, string length limits, admin config via token claims + email + UID lists",
      "Dual-layer data: public stats in top-level collection, private data in user subcollections",
      "Browser extension: content script isolation, no credential storage, data passed via URL params",
      "Secrets: environment variables only, never in client bundle. CSP headers whitelist Firebase + Google APIs",
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
  },

  // ── Section 3: Claude Code Workflow ──────────────────────
  {
    id: "claude-divider",
    type: "section",
    title: "Working with Claude Code",
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
  },
  {
    id: "demo",
    type: "content",
    section: "Demo",
    title: "Want to See It Live?",
    bullets: [
      "fabstats.net — try the daily FaBdoku, Crossword, Connections",
      "Player profiles with 158 achievements, leaderboards, activity feed",
      "Browser extension imports matches from GEM in one click",
      "Happy to walk through any part of the codebase",
    ],
  },
  {
    id: "thanks",
    type: "title",
    title: "Thanks — Questions?",
    subtitle: "fabstats.net | Charlton",
  },
];

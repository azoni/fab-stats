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

  // ══════════════════════════════════════════════
  //  OPENING
  // ══════════════════════════════════════════════

  {
    id: "title",
    type: "title",
    title: "FaB Stats",
    subtitle: "Engineering Deep Dive — Charlton — XPathLabs",
    notes: [
      "'Thanks for having me. I'll walk through FaB Stats — a community stats platform I built end-to-end.'",
      "This slide deck is itself a Next.js page at /deck inside the project — same stack, same deploy pipeline.",
    ],
  },
  {
    id: "hero-intro",
    type: "hero",
    title: "A Flesh and Blood TCG stats platform — built end-to-end in five weeks.",
    notes: [
      "Flesh and Blood is a competitive TCG (like Magic: The Gathering). GEM is the official tournament platform — tracks matches but has zero analytics.",
      "Players had no win rates, no matchup data, no leaderboards. I built fabstats.net to solve that.",
    ],
  },
  {
    id: "stats-overview",
    type: "stats",
    title: "By the Numbers",
    stats: [
      { value: 106, suffix: "K", label: "Lines of TypeScript" },
      { value: 1318, label: "Commits in 5 Weeks" },
      { value: 241, label: "Merged PRs" },
      { value: 0, suffix: "", label: "Server Cost" },
    ],
    notes: [
      "106K lines, 492 files, 60+ routes. Firebase Spark (free) + Netlify free tier. Only cost is the domain.",
      "All through feature/fix branches → PRs → merge to main. ~37 commits/day, ~6.7 PRs/day.",
    ],
  },

  // ══════════════════════════════════════════════
  //  SECTION 1: PROJECT WALKTHROUGH
  // ══════════════════════════════════════════════

  {
    id: "walkthrough-divider",
    type: "section",
    sectionNumber: "01",
    title: "Project Walkthrough",
    subtitle: "Problem → Ownership → Architecture → Deploy → Production Issues",
  },
  {
    id: "problem",
    type: "content",
    section: "Problem",
    title: "No API. No Stats. Just Spreadsheets.",
    bullets: [
      "GEM (official tournament platform) tracks matches but has zero analytics",
      "No win rates, no matchup data, no opponent records, no leaderboards",
      "No public API — had to reverse-engineer data extraction via browser extension",
      "Ambiguous data: event types, formats, and hero names aren't standardized",
    ],
    notes: [
      "The 'no API' constraint shaped everything — forced a Manifest V3 content script, a paste-parser with 20+ regex heuristics, and CSV import as fallback.",
    ],
  },
  {
    id: "ownership",
    type: "content",
    section: "Ownership",
    title: "What I Owned — Everything",
    bullets: [
      { text: "Frontend: Next.js 16 with React 19, Tailwind v4, 60+ routes", sub: ["Player profiles, leaderboards, match history, team/group pages, admin dashboard"] },
      { text: "Backend: Firebase Auth + Firestore with granular security rules", sub: ["Dual-layer data model — public leaderboard + private match subcollections"] },
      { text: "Infrastructure: Netlify static export + edge functions + serverless OG images", sub: ["Edge rewrites inject dynamic meta tags for social sharing"] },
      { text: "Data Pipeline: Chrome extension, paste parser, CSV import, Discord bot", sub: ["5 import methods all feed into fingerprint-based dedup"] },
    ],
    notes: [
      "Full-stack solo dev. The Chrome extension scrapes GEM's DOM. The paste parser handles copy-paste from GEM history (messy, heuristic-based). All 5 import methods feed into the same importMatches function with dual-hash fingerprinting for dedup.",
      "Also built a companion Discord bot (discord.js 14) with slash commands, community digests, and meta snapshots.",
    ],
  },
  {
    id: "architecture",
    type: "diagram",
    section: "Architecture",
    title: "System Architecture",
    diagram: "architecture",
    notes: [
      "Key insight: NO traditional server. Static HTML from CDN + Firebase handles auth/data + Netlify edge/serverless for OG images.",
      "Firestore security rules act as the server-side validation layer — field types, string lengths, admin permissions, data visibility.",
      "If asked about scaling: 'Static export scales infinitely on CDN. Firestore auto-scales reads. Bottleneck would be write throughput at daily puzzle reset, but we're nowhere near those limits.'",
    ],
  },
  {
    id: "data-flow",
    type: "diagram",
    section: "Data Flow",
    title: "Data Flow",
    diagram: "data-flow",
    notes: [
      "Import → parse + validate → Firestore (matches + profile) → leaderboard recomputation → feed events → OG image generated on-demand.",
      "OG images: Edge function intercepts /player/:username, serverless function renders PNG via satori + resvg-js. Cached 1 day + 7-day stale-while-revalidate.",
    ],
  },

  // ══════════════════════════════════════════════
  //  TESTING & DEPLOY
  // ══════════════════════════════════════════════

  {
    id: "testing",
    type: "split",
    section: "Testing",
    title: "Testing Strategy",
    left: {
      title: "What I Test",
      bullets: [
        "TypeScript strict mode — first line of defense",
        "tsc --noEmit on every change (~5 sec)",
        "ESLint exhaustive-deps as deploy blocker",
        "Manual QA on mobile viewports",
        "Admin dashboard monitors real-time usage",
      ],
    },
    right: {
      title: "What I Don't (Yet)",
      bullets: [
        "No unit test suite — velocity tradeoff at 5 weeks old",
        "No E2E — manual flows fast enough at current scale",
        "Plan: Vitest for import parsing + stat computation",
      ],
    },
    notes: [
      "Deliberate tradeoff: project is 5 weeks old, sole developer. Cost of test suite is high upfront; cost of bugs is low (hotfix in minutes).",
      "First test targets would be: import parsing (correctness-critical, deterministic), leaderboard computation (aggregation bugs are subtle), and Firestore security rules (emulator-based).",
    ],
  },
  {
    id: "deployment",
    type: "content",
    section: "Deploy",
    title: "Deployment Pipeline",
    bullets: [
      "Git push → feature branch → PR → merge to main → Netlify auto-build (~45s to live)",
      "CI: GitHub Actions runs tsc --noEmit on PRs (full build needs Firebase secrets — gap I'd fix)",
      "Cache strategy: hashed JS/CSS 1yr immutable, images 1d stale-while-revalidate, HTML no-cache",
      "Monitoring: admin dashboard with real-time online count, import methods, user growth, support clicks",
    ],
    notes: [
      "No staging environment — test locally, verify Netlify deploy preview, merge. This works at solo-dev scale.",
      "Known gap: CI doesn't run full build. Caught me once when a build-only import error slipped through. Would add Firebase secrets to GitHub Actions if starting over.",
    ],
  },

  // ══════════════════════════════════════════════
  //  PRODUCTION ISSUES
  // ══════════════════════════════════════════════

  {
    id: "bugs-divider",
    type: "section",
    sectionNumber: "02",
    title: "Production Issues",
    subtitle: "Real bugs I shipped, debugged, and fixed",
  },
  {
    id: "bug-architecture",
    type: "content",
    section: "Prod Issue",
    title: "Architecture-Level Bugs",
    bullets: [
      { text: "Firestore batch ordering crash on team creation", sub: [
        "Security rules use get() which sees pre-batch state — team doc must exist before member doc",
        "Required splitting a single batch into setDoc() then batch — 5 commits to get the permission model right",
      ] },
      { text: "Performance death spiral on homepage", sub: [
        "14 game-stat Firestore reads fired on every page load, blocking auth init",
        "Fix: parallelized auth, deferred game reads to browser idle, added skeleton UI (PRs #180-182)",
      ] },
      { text: "OG images broken by CSP", sub: [
        "Profile photos served from Firebase Storage were blocked by Content-Security-Policy",
        "Had to add storage bucket to CSP connect-src and img-src in netlify.toml",
      ] },
    ],
    notes: [
      "Team creation permission cascade is the best architecture story: Firestore rules evaluate get() against the database state BEFORE the batch executes. If the team doc doesn't exist yet, the rule that checks 'is this user the team owner' fails. I had to split the operation: create team doc first (await), then batch the rest.",
      "Performance: auth init was serialized with 14 Firestore reads. Users saw a blank page for 2-3 seconds. Fix: auth starts immediately, game stats deferred to requestIdleCallback, skeleton UI shows instantly.",
    ],
  },
  {
    id: "bug-data",
    type: "content",
    section: "Prod Issue",
    title: "Data Integrity Bugs",
    bullets: [
      { text: "Team top 8 count inflated 2x", sub: [
        "Summing two overlapping breakdown maps — caught by comparing trophy case to stats card on same page",
      ] },
      { text: "Qualifier events classified as major tournaments", sub: [
        "'World Championship Qualifier' → Nationals. GEM set the type, our code trusted it without checking the name",
        "Required fixes at two layers: event name classification AND eventType fallback (PRs #238, #244)",
      ] },
      { text: "updateTeam silently dropping fields on slug change", sub: [
        "Early return before field assignments — found during code audit, same bug propagated to groups",
      ] },
      { text: "Discord bot digests silently failing", sub: [
        "markDigestPosted() outside try/catch — failed sends marked as completed, never retried",
      ] },
    ],
    notes: [
      "Qualifier bug is the best 'external data' story: first fix caught names with competitive keywords. But this event's name DIDN'T match — GEM just set eventType='Nationals' directly. Had to add a second check layer.",
      "updateTeam bug: existed for weeks, found only when building Groups (copied the same code). Lesson: mirrored code inherits existing bugs.",
    ],
  },

  // ══════════════════════════════════════════════
  //  SECTION 2: TRADEOFFS & DECISIONS
  // ══════════════════════════════════════════════

  {
    id: "tradeoffs-divider",
    type: "section",
    sectionNumber: "03",
    title: "Tradeoffs & Decisions",
    subtitle: "What I chose, what I rejected, what I'd change",
  },
  {
    id: "decisions",
    type: "split",
    section: "Decisions",
    title: "Architecture Choices",
    left: {
      title: "Chose",
      bullets: [
        "Static export (Next.js output: 'export')",
        "Firebase Auth + Firestore",
        "Netlify (free tier + edge functions)",
        "Client-side stats computation",
      ],
    },
    right: {
      title: "Over",
      bullets: [
        "SSR — server cost + complexity for a free project",
        "Supabase — Firebase gives auth + realtime free",
        "Vercel — Netlify edge better for OG image rewrites",
        "Server aggregation — Firestore can't JOIN/GROUP BY",
      ],
    },
    notes: [
      "Static export: zero server cost, instant CDN distribution, deploy previews. Tradeoff: can't generate player pages on-demand — mitigated with edge function meta rewriting and SPA fallback redirects.",
      "Firebase vs Supabase: Firestore's real-time listeners enable live features (feeds, chat) without WebSocket infra. Downside: no JOINs, so I denormalize data and compute client-side.",
      "Client-side computation: leaderboard is fully recomputed on each import. Works fine at hundreds of users. Would need event-sourcing/CQRS at scale.",
    ],
  },
  {
    id: "tech-debt",
    type: "content",
    section: "Tech Debt",
    title: "Debt I Accepted",
    bullets: [
      { text: "No test suite", sub: ["Velocity tradeoff — first targets would be import parsing and stat computation"] },
      { text: "Full leaderboard recomputation on every import", sub: ["No incremental updates — works at current scale, wouldn't scale to millions"] },
      { text: "CI doesn't run full build", sub: ["Only tsc --noEmit — build errors caught at Netlify deploy time, not PR time"] },
      { text: "Heuristic import parsing", sub: ["20+ regex patterns for GEM paste — high false-positive rate, no public API alternative"] },
    ],
    notes: [
      "Every tradeoff was conscious: 'I chose X because of constraint Y, accepting cost Z.'",
      "The import parser is the most fragile piece — if GEM changes their HTML, the extension and paste parser break. Accepted because the alternative is no import at all.",
    ],
  },
  {
    id: "security",
    type: "content",
    section: "Security",
    title: "Security Model",
    bullets: [
      "Firebase Auth for identity (Google OAuth + anonymous guest mode)",
      "Firestore rules as server-side validation: field types, string lengths, ownership checks",
      "Dual-layer data: public leaderboard (OG images read without auth) + private match subcollections",
      "Team/group role-based permissions: owner > admin > member, enforced in both client + rules",
      "Extension isolation: content script, no stored credentials, LZ-compressed URL params",
    ],
    notes: [
      "Admin elevation via 3 paths: custom claim on auth token, email in admin list, UID in admin list. Redundancy = flexibility.",
      "No rate limiting in Firestore rules (not supported) — relies on Firebase quotas.",
      "Firebase config is public by design — all security enforced server-side via rules.",
    ],
  },
  {
    id: "hindsight",
    type: "content",
    section: "Hindsight",
    title: "What I'd Do Differently",
    bullets: [
      "Add error tracking (Sentry) from day one — too many silent catches",
      "Start with a test framework — at least for import parsing and stat computation",
      "Build proper CI that runs full build with Firebase secrets",
      "Incremental leaderboard updates instead of full recomputation",
      "Scope discipline — built features nobody asked for (AI chatbot), caught it via user feedback triage, removed it",
    ],
    notes: [
      "The chatbot story: built an AI chat feature (Claude API) for answering stats questions. Cool tech, zero user demand. Meanwhile, feedback was all about better filtering and match breakdowns. Removed the chatbot entirely.",
      "Lesson: build what users need, not what's fun to develop. The feedback triage loop (daily review with Claude in plan mode) is how I caught the scope creep.",
    ],
  },

  // ══════════════════════════════════════════════
  //  SECTION 3: CLAUDE CODE WORKFLOW
  // ══════════════════════════════════════════════

  {
    id: "claude-divider",
    type: "section",
    sectionNumber: "04",
    title: "Working with Claude Code",
    subtitle: "Workflow → CLAUDE.md → Catching errors → Large changes",
  },
  {
    id: "workflow",
    type: "content",
    section: "Workflow",
    title: "Day-to-Day Workflow",
    bullets: [
      { text: "Prompt with context", sub: ["File paths, constraints, CLAUDE.md rules. Specific > generic."] },
      { text: "Review every diff", sub: ["I read every line before accepting. Domain-specific constraints need human verification."] },
      { text: "Verify immediately", sub: ["tsc --noEmit (~5s) + manual QA. If it doesn't type-check, something's wrong."] },
      { text: "One change at a time", sub: ["Serial review — make a change, verify, then prompt the next. Keeps diffs small and git-bisectable."] },
    ],
    notes: [
      "Narrow prompts are critical: 'fix all date handling' → Claude touches 30 files with regressions. 'change getMonth() to getUTCMonth() in puzzle-generator.ts' → precise 1-line change.",
      "CLAUDE.md is loaded into every context window automatically — project conventions, constraints, and rules understood from the start.",
    ],
  },
  {
    id: "claude-md",
    type: "content",
    section: "CLAUDE.md",
    title: "CLAUDE.md — Project Memory",
    bullets: [
      { text: "Domain rules Claude can't infer from code", sub: ["UTC dates for all game logic, seeded random compatibility, data isolation patterns"] },
      { text: "Mistake prevention", sub: ["After the UTC timezone bug, added the rule — it never happened again across 12+ new features"] },
      { text: "Git workflow enforcement", sub: ["'Never commit to main, feature branches, focused PRs' — prevents Claude from making large unfocused changes"] },
      { text: "Instant onboarding for every session", sub: ["New context windows pick up conventions immediately — no re-explaining"] },
    ],
    notes: [
      "CLAUDE.md is better than code comments because it's global — every file Claude touches benefits. And unlike docs humans forget to read, Claude reads it automatically every time.",
      "Key insight for the interviewer: Claude is only as good as the context you give it. CLAUDE.md turns it from a general tool into a project-aware teammate.",
    ],
  },
  {
    id: "catching-errors",
    type: "content",
    section: "Errors",
    title: "When Claude Gets It Wrong",
    bullets: [
      { text: "Top 8 double-counting bug", sub: ["Claude generated code that summed two overlapping maps. Caught by comparing trophy case count vs stats card on the same page."] },
      { text: "updateTeam early-return bug", sub: ["Field assignments after early return — found during code audit when building Groups feature. Same bug existed in the original code Claude was mirroring."] },
      { text: "Firestore batch overflow", sub: ["Claude used chunk size 450 but each member needed 2 operations = 900 ops. Firestore limit is 500. Caught by audit agent."] },
      { text: "Missing Netlify redirects", sub: ["Group pages showed home page — static export needs explicit redirect rules. Caught in production testing."] },
    ],
    notes: [
      "Pattern: Claude is fast and usually correct, but domain-specific constraints and cross-cutting concerns are where it fails. Type checker catches syntax issues; human review catches logic issues.",
      "I treat Claude as a fast junior dev — it writes code, I review it. If I can't explain why a change works, I don't merge it.",
    ],
  },
  {
    id: "large-changes",
    type: "content",
    section: "Large Changes",
    title: "Groups Feature — 16 Files, 3,400 Lines",
    bullets: [
      { text: "Plan mode first", sub: ["Explored the teams codebase → designed data model → asked 4 clarifying questions → approved plan"] },
      { text: "Parallel agents", sub: ["3 agents built lib, hooks, and components simultaneously"] },
      { text: "Systematic audit before merge", sub: ["2 audit agents found 5 bugs: batch overflow, early-return field loss, sort mutation, stale closure, missing membership check"] },
      { text: "4 PRs to ship (#238-241)", sub: ["Initial feature → routing fix → manage links → inline management UI"] },
    ],
    notes: [
      "This is the strongest example of the Claude Code workflow at scale. Plan → parallel implement → type check → audit → fix bugs → merge.",
      "The audit caught bugs that would have been production issues. The post-merge fixes (routing, UX) show the value of real user testing even after code review.",
    ],
  },

  // ══════════════════════════════════════════════
  //  CLOSING
  // ══════════════════════════════════════════════

  {
    id: "takeaways",
    type: "content",
    section: "Takeaways",
    title: "Key Takeaways",
    bullets: [
      { text: "AI-powered velocity is real", sub: ["106K lines, 241 PRs in 5 weeks — but every diff is human-reviewed"] },
      { text: "CLAUDE.md is the force multiplier", sub: ["Encode rules that aren't obvious from code. Prevents entire classes of bugs."] },
      { text: "Pragmatic tradeoffs over perfect architecture", sub: ["Clear documentation beats premature abstraction. Know what debt you're accepting and why."] },
      { text: "Build what users need", sub: ["Feedback triage caught scope creep. Removed features nobody asked for."] },
    ],
    notes: [
      "The meta point: this slide deck is a React component at /deck using the same Tailwind theme and deploy pipeline. Building the presentation inside the project demonstrates the stack rather than just talking about it.",
    ],
  },
  {
    id: "thanks",
    type: "title",
    title: "Thanks — Questions?",
    subtitle: "fabstats.net | Charlton",
    notes: [
      "Likely follow-ups and answers:",
      "'How do you handle conflicts with Claude?' → I treat it as a fast junior dev. I review every diff. CLAUDE.md encodes the rules.",
      "'Biggest concern about AI-assisted dev?' → Over-reliance. If I can't explain why a change works, I don't merge it.",
      "'How would this change with a team?' → Tests first, formalize data layer abstractions, split monorepo into packages, CI/CD with test gates.",
      "'What's the hardest technical challenge?' → The import pipeline. Parsing ambiguous data from a platform with no API, handling edge cases across languages and event formats.",
      "If they want a live demo: fabstats.net — show a player profile, the leaderboard, team page, import flow.",
    ],
  },
];

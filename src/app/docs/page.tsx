import type { Metadata } from "next";
import Link from "next/link";
import { DocsSearch } from "./DocsSearch";
import { BookIcon } from "@/components/icons/NavIcons";

export const metadata: Metadata = {
  title: "Docs",
  description: "How FaB Stats works — importing, Best Finish, Hero Mastery, Achievements, and more.",
};

const TOC = [
  { id: "about", label: "About" },
  { id: "tech-stack", label: "Tech Stack" },
  { id: "architecture", label: "Architecture" },
  { id: "getting-started", label: "Getting Started" },
  { id: "chrome-extension", label: "Chrome Extension" },
  { id: "win-rate", label: "Win Rate & Record" },
  { id: "streaks", label: "Streaks" },
  { id: "best-finish", label: "Best Finish" },
  { id: "event-detection", label: "Event Detection" },
  { id: "hero-mastery", label: "Hero Mastery" },
  { id: "achievements", label: "Achievements" },
  { id: "hero-shield", label: "Hero Data Shield" },
  { id: "formats", label: "Supported Formats" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "weekly-monthly", label: "Weekly & Monthly" },
  { id: "versus", label: "Versus" },
  { id: "nemesis", label: "Nemesis & Best Friend" },
  { id: "activity-feed", label: "Activity Feed" },
  { id: "friends", label: "Friends" },
  { id: "kudos", label: "Kudos" },
  { id: "fabdoku", label: "FaBdoku" },
  { id: "discord-bot", label: "Discord Bot" },
  { id: "showcase", label: "Showcase & Pinned" },
  { id: "on-this-day", label: "On This Day" },
  { id: "community-meta", label: "Community Meta" },
  { id: "tournaments", label: "Tournaments" },
  { id: "privacy", label: "Privacy" },
  { id: "roadmap", label: "Roadmap" },
];

export default function DocsPage() {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center ring-1 ring-inset ring-violet-500/20">
            <BookIcon className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-fab-text leading-tight">Documentation</h1>
            <p className="text-xs text-fab-muted leading-tight">Everything you need to know about FaB Stats</p>
          </div>
        </div>
        <DocsSearch toc={TOC} />
      </div>

      <div className="max-w-5xl mx-auto flex gap-10">
      {/* Sidebar TOC */}
      <nav className="hidden lg:block shrink-0 w-48 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
        <p className="text-xs font-semibold text-fab-muted uppercase tracking-wider mb-3">On this page</p>
        <ul className="space-y-1">
          {TOC.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="block text-sm text-fab-muted hover:text-fab-text transition-colors py-0.5"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="space-y-14">
          {/* ─── About ─── */}
          <section id="about">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">About</h2>
            <p className="text-sm text-fab-muted mb-3">
              FaB Stats is a community-built match tracker and analytics platform for Flesh and Blood.
              It was created by <span className="font-medium text-fab-text">azoni</span> as a passion project
              to give FaB players a way to track their competitive journey, analyze their performance,
              and connect with the community.
            </p>
            <p className="text-sm text-fab-muted">
              The project is independent and community-driven — not affiliated with Legend Story Studios.
            </p>
          </section>

          {/* ─── Tech Stack ─── */}
          <section id="tech-stack">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Tech Stack</h2>
            <p className="text-sm text-fab-muted mb-4">
              FaB Stats is built with modern web technologies, optimized for speed and static deployment.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ["Next.js", "React framework with static export for fast page loads"],
                ["React 19", "UI library powering all interactive components"],
                ["Firebase / Firestore", "Real-time database for player data, leaderboards, and feeds"],
                ["Tailwind CSS", "Utility-first styling for a consistent dark theme"],
                ["Netlify", "Hosting with edge functions for OG image generation and meta tags"],
                ["Chrome Extension", "Browser extension for one-click GEM data export"],
              ].map(([name, desc]) => (
                <div key={name} className="p-3 rounded-lg bg-fab-surface border border-fab-border">
                  <div className="text-sm font-medium text-fab-text">{name}</div>
                  <div className="text-xs text-fab-muted mt-1">{desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ─── Architecture ─── */}
          <section id="architecture">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Technical Architecture</h2>
            <p className="text-sm text-fab-muted mb-6">
              A deeper look at the engineering decisions, trade-offs, and patterns behind FaB Stats.
            </p>

            {/* Static export + client data */}
            <h3 className="text-sm font-semibold text-fab-text mb-2">Static Export with Client-Side Data</h3>
            <p className="text-sm text-fab-muted mb-3">
              FaB Stats uses Next.js with <code className="text-fab-text bg-fab-surface px-1 rounded">output: &apos;export&apos;</code> in
              production, generating a fully static site of pre-rendered HTML shells. All user data is fetched
              at runtime by the browser via the Firebase JS SDK — there is no server-side rendering of user content.
            </p>
            <div className="space-y-2 text-sm text-fab-muted mb-4">
              <p>
                <span className="font-medium text-fab-text">Why static?</span> — Zero server cost, globally
                CDN-cached pages, instant TTFB, and no cold start latency. The entire site is served from
                Netlify&apos;s edge network.
              </p>
              <p>
                <span className="font-medium text-fab-text">Offline-capable caching</span> — Firestore is
                initialized with <code className="text-fab-text bg-fab-surface px-1 rounded">persistentLocalCache</code> using
                a multi-tab IndexedDB manager. Data survives page reloads, works across browser tabs without
                conflicts, and provides near-instant subsequent page loads from cache.
              </p>
              <p>
                <span className="font-medium text-fab-text">Dynamic routing trick</span> — Since static export
                can&apos;t produce truly dynamic routes, the build generates a single <code className="text-fab-text bg-fab-surface px-1 rounded">player/_.html</code> shell.
                Netlify&apos;s routing rules rewrite every <code className="text-fab-text bg-fab-surface px-1 rounded">/player/*</code> URL
                to this shell with a 200 status. The client reads the username from the URL path and fetches the
                player&apos;s data from Firestore at runtime.
              </p>
              <p>
                <span className="font-medium text-fab-text">Trade-off</span> — Crawlers only see an empty HTML shell,
                which is why the edge function system (below) exists to inject real meta tags at the CDN edge.
              </p>
            </div>

            {/* OG image pipeline */}
            <h3 className="text-sm font-semibold text-fab-text mt-6 mb-2">OG Image Generation Pipeline</h3>
            <p className="text-sm text-fab-muted mb-3">
              Social sharing (Twitter, Discord, Slack) requires per-player Open Graph images. FaB Stats generates
              these dynamically with a three-layer pipeline:
            </p>
            <div className="space-y-2 text-sm text-fab-muted mb-4">
              <p>
                <span className="font-medium text-fab-text">Layer 1 — Clean URL proxy</span> — Netlify
                rewrites <code className="text-fab-text bg-fab-surface px-1 rounded">/og/player/username.png</code> to
                a serverless function, so crawlers and CDNs see a clean, cacheable image URL.
              </p>
              <p>
                <span className="font-medium text-fab-text">Layer 2 — PNG generation (Lambda)</span> — A Node.js
                serverless function uses satori (JSX → SVG) and resvg-js (SVG → PNG) to render a 1200&times;630
                player card. It queries Firestore via the REST API directly (avoiding bundling the full Firebase SDK)
                and bundles WOFF font files from disk. Images are cached at the CDN edge for 1 hour with 24-hour
                stale-while-revalidate.
              </p>
              <p>
                <span className="font-medium text-fab-text">Layer 3 — Edge meta tag injection (Deno)</span> — Netlify
                edge functions intercept HTML responses at the CDN edge. For player pages, the edge function fetches
                the static HTML shell, queries Firestore REST for the player&apos;s stats, and rewrites the
                {" "}<code className="text-fab-text bg-fab-surface px-1 rounded">&lt;title&gt;</code>,{" "}
                <code className="text-fab-text bg-fab-surface px-1 rounded">og:title</code>,{" "}
                <code className="text-fab-text bg-fab-surface px-1 rounded">og:image</code>, and description
                tags in-place before returning the response to the crawler.
              </p>
              <p>
                <span className="font-medium text-fab-text">Domain constraint</span> — All OG image URLs
                must use <code className="text-fab-text bg-fab-surface px-1 rounded">www.fabstats.net</code> because
                the bare domain 301-redirects to www, and Twitter&apos;s crawler does not follow redirects when
                fetching card images.
              </p>
            </div>

            {/* Firestore data model */}
            <h3 className="text-sm font-semibold text-fab-text mt-6 mb-2">Firestore Data Model</h3>
            <p className="text-sm text-fab-muted mb-3">
              The database is structured around a few core collections with denormalized aggregates for read performance:
            </p>
            <div className="overflow-hidden rounded-lg border border-fab-border mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-fab-surface">
                    <th className="text-left px-3 py-2 text-fab-muted font-medium">Collection</th>
                    <th className="text-left px-3 py-2 text-fab-muted font-medium">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fab-border">
                  {[
                    ["users/{uid}/matches/*", "Per-user match subcollection — each doc is a match record"],
                    ["users/{uid}/profile/main", "Singleton profile document with display name, settings, visibility"],
                    ["usernames/{username}", "Username reservation — maps username to userId, enables prefix search"],
                    ["leaderboard/{uid}", "Denormalized aggregate stats, rebuilt on every match save"],
                    ["feedEvents/{id}", "Global activity feed — imports, placements, achievements, FaBdoku"],
                    ["friendships/{id}", "Bidirectional friend pairs with participants array"],
                    ["kudos/{id}", "Individual kudos records between giver and recipient"],
                    ["kudosCounts/{uid}", "Aggregated kudos received per player"],
                  ].map(([col, desc]) => (
                    <tr key={col as string} className="text-fab-muted">
                      <td className="px-3 py-1.5 font-mono text-xs text-fab-dim whitespace-nowrap">{col}</td>
                      <td className="px-3 py-1.5 text-xs">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 text-sm text-fab-muted mb-4">
              <p>
                <span className="font-medium text-fab-text">Atomic username reservation</span> — Profile creation
                uses a Firestore transaction to claim the username document and create the profile simultaneously,
                preventing race conditions where two users register the same username.
              </p>
              <p>
                <span className="font-medium text-fab-text">Prefix search</span> — Player search uses range queries
                on the usernames collection (e.g. &quot;biggs&quot; → range [&quot;biggs&quot;, &quot;biggt&quot;)).
                A parallel reversed-word query handles &quot;First Last&quot; vs &quot;Last First&quot; matching,
                with results deduped by Set.
              </p>
              <p>
                <span className="font-medium text-fab-text">Denormalized leaderboard</span> — Rather than querying
                every user&apos;s matches to build rankings, each user&apos;s aggregate stats (~30 fields including
                hero breakdowns, weekly/monthly windows, and playoff finishes) are precomputed and stored in a
                flat leaderboard collection. This trades storage for read speed — the leaderboard page fetches one
                collection instead of thousands.
              </p>
            </div>

            {/* Import pipeline */}
            <h3 className="text-sm font-semibold text-fab-text mt-6 mb-2">Import Pipeline</h3>
            <p className="text-sm text-fab-muted mb-3">
              Getting match data from GEM into FaB Stats involves parsing noisy, semi-structured text:
            </p>
            <div className="space-y-2 text-sm text-fab-muted mb-4">
              <p>
                <span className="font-medium text-fab-text">GEM paste parser</span> — Parses raw copied text from
                the GEM website. The text contains navigation links, copyright notices, rating changes, and partial
                metadata intermixed with match rows. A regex noise filter discards ~20 categories of irrelevant lines
                before structured extraction begins.
              </p>
              <p>
                <span className="font-medium text-fab-text">Event boundary detection</span> — Date lines serve as
                event boundary markers. The parser collects context lines (format, venue, rated status, event type)
                between date markers to associate metadata with match groups.
              </p>
              <p>
                <span className="font-medium text-fab-text">Playoff detection</span> — Round names are pattern-matched
                (Top 8, Semifinals, Finals, Round P#, Quarter) to automatically detect playoff sections and infer
                Best Finish results.
              </p>
              <p>
                <span className="font-medium text-fab-text">Fingerprint deduplication</span> — Before writing,
                all existing matches are loaded and fingerprinted (date + opponent + notes + result). Only truly new
                matches are written, using Firestore batch writes in 500-document chunks.
              </p>
              <p>
                <span className="font-medium text-fab-text">Extension vs paste</span> — The Chrome extension produces
                structured JSON with GEM event IDs for reliable grouping. The paste parser uses heuristic date/name
                matching. Both converge on the same internal format before write.
              </p>
            </div>

            {/* Leaderboard ranking */}
            <h3 className="text-sm font-semibold text-fab-text mt-6 mb-2">Leaderboard &amp; Ranking System</h3>
            <div className="space-y-2 text-sm text-fab-muted mb-4">
              <p>
                <span className="font-medium text-fab-text">34 ranking tabs</span> — Each tab is defined with a
                filter predicate and sort comparator. Rankings are computed client-side by filtering and sorting
                the full leaderboard snapshot. This avoids 34 separate Firestore queries.
              </p>
              <p>
                <span className="font-medium text-fab-text">Bulk-import pollution guard</span> — If more than 80%
                of a player&apos;s matches fall within the current weekly window and they have 30+ total matches,
                the weekly stats are zeroed out. This prevents bulk imports of old matches with incorrect dates
                from dominating the weekly leaderboard.
              </p>
              <p>
                <span className="font-medium text-fab-text">Client-side caching</span> — The leaderboard snapshot
                is cached in-memory for 15 minutes. Real-time subscriptions are not used here — the data is
                fetched once per session to minimize Firestore reads.
              </p>
              <p>
                <span className="font-medium text-fab-text">Ranked borders</span> — A player&apos;s &quot;best
                rank&quot; across all 34 tabs determines their avatar glow tier (Grandmaster through Bronze for
                top 5). Event prestige tiers are separate — players with top-8 finishes at high-tier events
                receive card border colors reflecting their best event tier.
              </p>
            </div>

            {/* Share image system */}
            <h3 className="text-sm font-semibold text-fab-text mt-6 mb-2">Share Image System</h3>
            <div className="space-y-2 text-sm text-fab-muted mb-4">
              <p>
                <span className="font-medium text-fab-text">DOM-to-PNG capture</span> — Share cards are rendered as
                real React DOM elements off-screen, then captured as PNG blobs using html-to-image at 2&times; pixel
                density (1.5&times; on mobile to stay within share sheet limits).
              </p>
              <p>
                <span className="font-medium text-fab-text">Platform-adaptive sharing</span> — The share function
                implements a waterfall: mobile native share sheet (navigator.share with file) → desktop clipboard
                image (ClipboardItem) → text URL fallback. Each strategy returns a typed result so the UI can show
                accurate feedback.
              </p>
              <p>
                <span className="font-medium text-fab-text">CORS retry</span> — If a profile card embeds an external
                avatar image that triggers a CORS error during capture, the function automatically retries with
                a filter that strips all images from the capture tree.
              </p>
            </div>

            {/* Achievement system */}
            <h3 className="text-sm font-semibold text-fab-text mt-6 mb-2">Achievement Detection</h3>
            <div className="space-y-2 text-sm text-fab-muted mb-4">
              <p>
                <span className="font-medium text-fab-text">Pure function evaluation</span> — Each achievement
                is a static definition with a <code className="text-fab-text bg-fab-surface px-1 rounded">check(ctx)</code> predicate
                and optional <code className="text-fab-text bg-fab-surface px-1 rounded">progress(ctx)</code> function.
                Evaluation is a single filter over the definitions array against a pre-computed stats context —
                no database queries during evaluation.
              </p>
              <p>
                <span className="font-medium text-fab-text">Tiered groups</span> — 130+ achievements are organized
                into groups with up to 11 tiers. Only the highest earned tier in each group is typically displayed,
                keeping profiles clean while rewarding long-term progression.
              </p>
              <p>
                <span className="font-medium text-fab-text">New achievement detection</span> — When a player imports
                matches, achievements are evaluated twice (before and after) and the difference is used to trigger
                feed events and notifications for newly unlocked badges.
              </p>
            </div>

            {/* Chrome extension */}
            <h3 className="text-sm font-semibold text-fab-text mt-6 mb-2">Chrome Extension Architecture</h3>
            <div className="space-y-2 text-sm text-fab-muted mb-4">
              <p>
                <span className="font-medium text-fab-text">Manifest V3 content script</span> — The extension
                injects a single content script into GEM pages. No background worker, no popup, no remote API
                calls. It&apos;s entirely self-contained.
              </p>
              <p>
                <span className="font-medium text-fab-text">DOM scraping</span> — On click, the extension
                expands all collapsed event sections, waits for AJAX-loaded tables, then walks the DOM upward
                from each match table to find the nearest heading and extract event metadata (date, format,
                venue, event type, hero from decklists).
              </p>
              <p>
                <span className="font-medium text-fab-text">Multi-page state</span> — GEM paginates match history.
                The extension serializes its accumulated state to sessionStorage, navigates to the next page, and
                the re-injected script detects saved state and resumes automatically.
              </p>
              <p>
                <span className="font-medium text-fab-text">Data transfer</span> — Scraped JSON is Base64 URL-encoded
                and appended as a hash fragment to the import page URL. For larger exports (&gt;1MB), users download
                a JSON file and upload manually.
              </p>
            </div>

            {/* Optimistic UI */}
            <h3 className="text-sm font-semibold text-fab-text mt-6 mb-2">Optimistic UI Updates</h3>
            <div className="space-y-2 text-sm text-fab-muted mb-4">
              <p>
                Interactive features like kudos, reactions, and friend requests use optimistic UI — the interface
                updates immediately on click while the Firestore write happens in the background. If the write
                fails, the UI state is already consistent because the next page load will fetch the true state.
                This makes interactions feel instant despite the round-trip to Firestore.
              </p>
            </div>

            {/* Self-healing data */}
            <h3 className="text-sm font-semibold text-fab-text mt-6 mb-2">Self-Healing Data</h3>
            <div className="space-y-2 text-sm text-fab-muted mb-4">
              <p>
                Several features use a self-healing pattern: when reading data, if the canonical source
                (a user&apos;s private subcollection) has data but the public denormalized copy is missing,
                the read function automatically backfills the public collection. This recovers from silent
                write failures (e.g. Firestore rule misconfigurations) without requiring manual migration scripts.
              </p>
            </div>
          </section>

          {/* ─── Getting Started ─── */}
          <section id="getting-started">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Getting Started</h2>
            <p className="text-sm text-fab-muted mb-3">
              FaB Stats imports your match history from the official GEM (Game Event Manager) system.
              There are three ways to get your data in:
            </p>
            <div className="space-y-2 text-sm text-fab-muted">
              <div className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-fab-gold/15 text-fab-gold">Extension</span>
                <span>Install the Chrome Extension, visit your GEM match history, and click &quot;Export to FaB Stats&quot;. Automatic hero detection and one-click import.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-fab-gold/15 text-fab-gold">Paste</span>
                <span>Copy your match history directly from the GEM History page and paste it into the import box. Works on any browser.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-fab-gold/15 text-fab-gold">CSV</span>
                <span>Upload a CSV file from FaB History Scraper or other compatible tools.</span>
              </div>
            </div>
          </section>

          {/* ─── Chrome Extension ─── */}
          <section id="chrome-extension">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Chrome Extension</h2>
            <p className="text-sm text-fab-muted mb-3">
              The FaB Stats Chrome Extension adds a one-click export button to your GEM match history page.
              It automatically detects heroes played in each event using the card data on the page.
            </p>
            <div className="space-y-1.5 text-sm text-fab-muted">
              <p>1. Install from the{" "}
                <a href="https://chromewebstore.google.com/detail/fab-stats-gem-exporter/kcaaaibikofempdbphoeeljdbjakhmjh" target="_blank" rel="noopener noreferrer" className="text-fab-gold hover:underline">Chrome Web Store</a>
              </p>
              <p>2. Go to your GEM match history at gem.fabtcg.com</p>
              <p>3. Click the &quot;Export to FaB Stats&quot; button that appears</p>
              <p>4. Your matches are copied to clipboard — paste them on the Import page</p>
            </div>
            <p className="text-xs text-fab-dim mt-2">
              Each import tracks which extension version was used and whether data came from the extension,
              copy-paste, or CSV upload.
            </p>
          </section>

          {/* ─── Win Rate & Record ─── */}
          <section id="win-rate">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Win Rate &amp; Record</h2>
            <p className="text-sm text-fab-muted mb-3">
              Win rate is calculated as <span className="font-medium text-fab-text">wins / total matches</span>.
              All match results count toward the total — wins, losses, draws, and byes are all included
              in the denominator. This means byes and draws will slightly lower your win rate percentage.
            </p>
            <p className="text-xs text-fab-dim">
              Example: 80 wins, 15 losses, 5 byes = 80/100 = 80.0% win rate, not 80/95.
            </p>
          </section>

          {/* ─── Streaks ─── */}
          <section id="streaks">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Streaks</h2>
            <p className="text-sm text-fab-muted mb-3">
              Streaks track consecutive wins or losses. Only wins extend a win streak and only losses
              extend a loss streak.
            </p>
            <div className="space-y-2 text-sm text-fab-muted">
              <p>
                <span className="font-medium text-fab-text">Draws break streaks</span> — A draw resets both
                your win streak and loss streak to zero.
              </p>
              <p>
                <span className="font-medium text-fab-text">Byes are ignored</span> — Byes don&apos;t count
                as a win and don&apos;t break your streak. They&apos;re skipped entirely in streak calculations.
              </p>
            </div>
            <p className="text-xs text-fab-dim mt-2">
              Matches are sorted chronologically to determine streak order. Your current streak shows
              the most recent consecutive result.
            </p>
          </section>

          {/* ─── Best Finish ─── */}
          <section id="best-finish">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Best Finish</h2>
            <p className="text-sm text-fab-muted mb-3">
              Your Best Finish is determined by your top playoff result across all competitive events.
              Playoff rounds are detected automatically from GEM round data using pattern matching
              on round names (Top 8, Semifinals, Finals, Round P#, Quarter, etc.).
            </p>
            <p className="text-sm text-fab-muted mb-3">
              Finishes are ranked in this order:
            </p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {(["Champion", "Finalist", "Top 4", "Top 8"] as const).map((f, i) => (
                <div key={f} className="text-center py-2 rounded bg-fab-surface border border-fab-border">
                  <div className="text-xs text-fab-dim mb-0.5">#{i + 1}</div>
                  <div className="text-sm font-semibold text-fab-text">{f}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-fab-muted mb-2">
              How finish type is determined:
            </p>
            <div className="space-y-1 text-sm text-fab-muted mb-4">
              <p><span className="font-medium text-fab-text">Champion</span> — No losses in playoff rounds</p>
              <p><span className="font-medium text-fab-text">Finalist</span> — Played in the finals but lost</p>
              <p><span className="font-medium text-fab-text">Top 4</span> — Played in semifinals but not finals</p>
              <p><span className="font-medium text-fab-text">Top 8</span> — Entered playoffs but eliminated before semis</p>
            </div>
            <p className="text-sm text-fab-muted mb-3">
              When you have multiple finishes of the same type, the more prestigious event wins.
              Event prestige tiers:
            </p>
            <div className="overflow-hidden rounded-lg border border-fab-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-fab-surface">
                    <th className="text-left px-3 py-2 text-fab-muted font-medium">Event Type</th>
                    <th className="text-right px-3 py-2 text-fab-muted font-medium">Prestige</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fab-border">
                  {[
                    ["Worlds", 10], ["Pro Tour", 9], ["The Calling", 8], ["Nationals", 7],
                    ["Battle Hardened", 6], ["Road to Nationals", 5], ["ProQuest", 4],
                    ["Championship", 3], ["Skirmish", 2], ["On Demand", 1],
                  ].map(([name, tier]) => (
                    <tr key={name as string} className="text-fab-muted">
                      <td className="px-3 py-1.5">{name}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-fab-dim">{tier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-fab-dim mt-2">
              Armory, Pre-Release, and unrecognized event types are excluded from Best Finish calculations.
            </p>
          </section>

          {/* ─── Event Detection ─── */}
          <section id="event-detection">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Event Detection</h2>
            <p className="text-sm text-fab-muted mb-3">
              Events are grouped from your match data by event name, date, and venue. Matches from the
              same event are combined into a single event entry on your Events page.
            </p>
            <div className="space-y-2 text-sm text-fab-muted">
              <p>
                <span className="font-medium text-fab-text">Multi-format events</span> — Major tournaments
                like Nationals, Pro Tour, and Worlds combine all formats (e.g. CC + Draft) into a single event,
                rather than splitting them.
              </p>
              <p>
                <span className="font-medium text-fab-text">Event type classification</span> — Event types
                are refined from the event name using pattern matching. Common abbreviations are recognized
                (BH for Battle Hardened, PQ for ProQuest, RTN for Road to Nationals). If the event name
                contains a known type, it overrides the default GEM classification.
              </p>
              <p>
                <span className="font-medium text-fab-text">Rated events</span> — Some events are flagged
                as &quot;rated&quot; based on GEM data. Rated match stats are tracked separately and have
                their own leaderboard tab with a minimum of 5 rated matches to appear.
              </p>
            </div>
          </section>

          {/* ─── Hero Mastery ─── */}
          <section id="hero-mastery">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Hero Mastery</h2>
            <p className="text-sm text-fab-muted mb-3">
              Play matches with a hero to progress through 8 mastery tiers. Each tier unlocks at a
              specific match count threshold with that hero.
            </p>
            <div className="overflow-hidden rounded-lg border border-fab-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-fab-surface">
                    <th className="text-left px-3 py-2 text-fab-muted font-medium">Tier</th>
                    <th className="text-right px-3 py-2 text-fab-muted font-medium">Matches Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fab-border">
                  {[
                    ["Novice", 1, "text-zinc-400"],
                    ["Apprentice", 5, "text-green-400"],
                    ["Skilled", 15, "text-blue-400"],
                    ["Expert", 30, "text-purple-400"],
                    ["Master", 50, "text-fab-gold"],
                    ["Grandmaster", 75, "text-fuchsia-400"],
                    ["Legend", 100, "text-sky-400"],
                    ["Mythic", 150, "text-red-400"],
                  ].map(([name, matches, color]) => (
                    <tr key={name as string}>
                      <td className={`px-3 py-1.5 font-medium ${color}`}>{name}</td>
                      <td className="px-3 py-1.5 text-right text-fab-muted">{matches}+</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ─── Achievements ─── */}
          <section id="achievements">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Achievements</h2>
            <p className="text-sm text-fab-muted mb-3">
              Earn badges by hitting milestones, building streaks, mastering heroes, and exploring the game.
              There are 30 achievements across 5 categories:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {[
                ["Milestone", "Match and win count targets"],
                ["Streak", "Consecutive win achievements"],
                ["Mastery", "Hero dedication and skill"],
                ["Exploration", "Try new heroes, formats, venues"],
                ["Fun", "Unique and quirky accomplishments"],
              ].map(([name, desc]) => (
                <div key={name} className="p-2.5 rounded-lg bg-fab-surface border border-fab-border">
                  <div className="text-sm font-medium text-fab-text">{name}</div>
                  <div className="text-xs text-fab-dim mt-0.5">{desc}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-fab-muted mb-2">
              Each achievement has a rarity level:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                ["Common", "text-amber-200 bg-amber-200/10"],
                ["Uncommon", "text-green-400 bg-green-400/10"],
                ["Rare", "text-blue-400 bg-blue-400/10"],
                ["Epic", "text-purple-400 bg-purple-400/10"],
                ["Legendary", "text-fab-gold bg-fab-gold/10"],
              ].map(([name, classes]) => (
                <span key={name} className={`px-2.5 py-1 rounded-full text-xs font-medium ${classes}`}>
                  {name}
                </span>
              ))}
            </div>
          </section>

          {/* ─── Hero Data Shield ─── */}
          <section id="hero-shield">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Hero Data Shield</h2>
            <p className="text-sm text-fab-muted mb-3">
              The shield badge next to your name shows how complete your hero data is across all matches.
              When you import matches, each match can have a hero attached. The more matches with hero data,
              the higher your shield tier. The badge appears everywhere your name shows: profile, leaderboard,
              activity feed, and share cards.
            </p>
            <p className="text-sm text-fab-muted mb-3">
              Starting February 24, 2026, new imports require hero selection. You can always choose
              &quot;Unknown&quot; if you don&apos;t remember, but you must make the choice explicitly.
            </p>
            <div className="space-y-2 mb-4">
              {[
                ["100%", "#fbbf24", "Gold", "Worlds-tier — every match has hero data"],
                ["90%+", "#a78bfa", "Purple", "Pro Tour-tier"],
                ["75%+", "#f87171", "Red", "Nationals-tier"],
                ["50%+", "#60a5fa", "Blue", "Calling-tier"],
                ["35%+", "#cd7f32", "Bronze", "Battle Hardened-tier"],
              ].map(([pct, color, label, desc]) => (
                <div key={label} className="flex items-center gap-3 p-2.5 rounded-lg bg-fab-surface border border-fab-border">
                  <svg className="w-5 h-5 shrink-0" style={{ color }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.5 13.5l-3.5-3.5 1.41-1.41L10.5 11.67l5.09-5.09L17 8l-6.5 6.5z" />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-fab-text">{label} <span className="text-fab-dim font-normal">({pct})</span></div>
                    <div className="text-xs text-fab-dim">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-fab-muted">
              Below 35% completion no badge is shown. Import more matches with heroes or edit existing matches
              to increase your completion percentage.
            </p>
          </section>

          {/* ─── Supported Formats ─── */}
          <section id="formats">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Supported Formats</h2>
            <p className="text-sm text-fab-muted mb-3">
              Formats are detected automatically from your GEM event data. FaB Stats tracks:
            </p>
            <div className="flex flex-wrap gap-2">
              {["Blitz", "Classic Constructed", "Draft", "Sealed", "Clash", "Ultimate Pit Fight", "Other"].map((f) => (
                <span key={f} className="px-2.5 py-1 rounded-full text-xs font-medium bg-fab-surface border border-fab-border text-fab-text">
                  {f}
                </span>
              ))}
            </div>
          </section>

          {/* ─── Leaderboard ─── */}
          <section id="leaderboard">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Leaderboard</h2>
            <p className="text-sm text-fab-muted mb-3">
              The leaderboard ranks all public players across multiple categories. Players need a minimum
              number of matches to appear on most tabs.
            </p>
            <div className="space-y-1 text-sm text-fab-muted">
              {[
                ["Win Rate", "Highest win percentage (min 10 matches)"],
                ["Most Matches", "Total matches played"],
                ["Most Wins", "Total wins"],
                ["Win Streak", "Longest consecutive wins"],
                ["Weekly", "Matches and wins in the last 7 days"],
                ["Monthly", "Matches, wins, and win rate in the last 30 days"],
                ["Rated", "Rated match win rate and streaks (min 5 rated)"],
                ["Events", "Tournament events played"],
                ["Draws", "Most drawn matches"],
                ["Byes", "Most byes received"],
                ["Nemesis", "Worst head-to-head record against any opponent"],
                ["Armory", "Armory-specific stats and win rates"],
                ["Earnings", "Lifetime prize money earned"],
                ["Top 8s", "Playoff finishes by event type"],
              ].map(([name, desc]) => (
                <div key={name} className="flex items-start gap-2 py-1">
                  <span className="shrink-0 font-medium text-fab-text w-28">{name}</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-fab-text mt-6 mb-2">Ranked Borders</h3>
            <p className="text-sm text-fab-muted mb-2">
              The top 5 players on each tab receive a ranked border on their card:
            </p>
            <div className="space-y-1 text-sm text-fab-muted">
              {[
                ["1st", "Grandmaster", "Prismatic animated gradient"],
                ["2nd", "Diamond", "Cyan glow"],
                ["3rd", "Gold", "Gold border"],
                ["4th", "Silver", "Silver border"],
                ["5th", "Bronze", "Bronze border"],
              ].map(([rank, name, desc]) => (
                <div key={rank} className="flex items-center gap-2 py-0.5">
                  <span className="shrink-0 font-mono text-fab-dim w-8 text-right">{rank}</span>
                  <span className="shrink-0 font-medium text-fab-text w-28">{name}</span>
                  <span className="text-fab-dim">{desc}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-fab-dim mt-2">
              If you rank top 5 on multiple tabs, your profile shows the border from your highest rank.
            </p>

            <h3 className="text-sm font-semibold text-fab-text mt-6 mb-2">Where Borders Appear</h3>
            <div className="space-y-2 text-sm text-fab-muted">
              <p>
                <span className="font-medium text-fab-text">Leaderboard cards</span> — Each leaderboard
                entry shows the ranked border for that tab&apos;s top 5.
              </p>
              <p>
                <span className="font-medium text-fab-text">Homepage profile card</span> — Your profile
                card on the homepage displays the border from your highest overall rank, along with your
                match count, win rate, events, and top hero.
              </p>
              <p>
                <span className="font-medium text-fab-text">Shareable profile card</span> — When you
                capture your profile as an image, the card includes your ranked border, tier ring around
                your avatar, trophy case, and armory garden.
              </p>
              <p>
                <span className="font-medium text-fab-text">Player Spotlight</span> — Featured players
                on the homepage show their ranked borders on spotlight cards.
              </p>
            </div>
          </section>

          {/* ─── Weekly & Monthly ─── */}
          <section id="weekly-monthly">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Weekly &amp; Monthly Stats</h2>
            <p className="text-sm text-fab-muted mb-3">
              Weekly and monthly leaderboard tabs track recent activity:
            </p>
            <div className="space-y-2 text-sm text-fab-muted">
              <p>
                <span className="font-medium text-fab-text">Weekly</span> — Rolling 7-day window.
                Shows matches played and wins from the last 7 days.
              </p>
              <p>
                <span className="font-medium text-fab-text">Monthly</span> — Rolling 30-day window.
                Shows matches, wins, and win rate from the last 30 days.
              </p>
            </div>
            <p className="text-xs text-fab-dim mt-2">
              Bulk imports with incorrect dates are automatically detected and excluded from weekly/monthly
              stats to prevent inflated numbers. If the majority of a player&apos;s matches appear to land
              in the current period, the stats are reset to zero.
            </p>
          </section>

          {/* ─── Versus ─── */}
          <section id="versus">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Versus</h2>
            <p className="text-sm text-fab-muted mb-3">
              Compare your stats head-to-head against any other player. The Versus page locks you in as
              Player 1 and lets you pick an opponent — or choose from common opponents you&apos;ve both faced.
            </p>

            <h3 className="text-sm font-semibold text-fab-text mt-5 mb-2">Power Level</h3>
            <p className="text-sm text-fab-muted mb-3">
              Each player gets a composite score from 0&ndash;99 based on their overall stats. The formula
              combines seven weighted components, each measuring a different aspect of competitive strength:
            </p>
            <div className="overflow-hidden rounded-lg border border-fab-border mb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-fab-surface">
                    <th className="text-left px-3 py-2 text-fab-muted font-medium">Component</th>
                    <th className="text-right px-3 py-2 text-fab-muted font-medium">Max Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fab-border">
                  {[
                    ["Win Rate", "30", "Scales with match count — full weight at 20+ matches"],
                    ["Match Volume", "15", "Log scale, caps at 500 matches"],
                    ["Event Success", "20", "Event wins (10), top 8 finishes (6), events played (4)"],
                    ["Streaks", "10", "Longest win streak (7), current win streak (3)"],
                    ["Hero Mastery", "10", "Unique heroes played (5), top hero depth (5)"],
                    ["Rated Performance", "10", "Rated win rate — requires 5+ rated matches"],
                    ["Earnings", "5", "Log scale — rewards any prize money earned"],
                  ].map(([name, pts, desc]) => (
                    <tr key={name as string}>
                      <td className="px-3 py-1.5">
                        <span className="font-medium text-fab-text">{name}</span>
                        <span className="block text-[11px] text-fab-dim mt-0.5">{desc}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right text-fab-muted font-mono align-top">{pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-fab-dim mb-4">
              Total possible: 100 points, displayed as 0&ndash;99. A new player with few matches will have a
              low volume and streak score, while a veteran with many events and hero variety scores higher
              across the board.
            </p>

            <div className="overflow-hidden rounded-lg border border-fab-border mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-fab-surface">
                    <th className="text-left px-3 py-2 text-fab-muted font-medium">Tier</th>
                    <th className="text-right px-3 py-2 text-fab-muted font-medium">Power Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fab-border">
                  {[
                    ["Grandmaster", "80–99", "text-fuchsia-400"],
                    ["Diamond", "65–79", "text-sky-400"],
                    ["Gold", "50–64", "text-yellow-400"],
                    ["Silver", "35–49", "text-zinc-400"],
                    ["Bronze", "0–34", "text-amber-600"],
                  ].map(([name, range, color]) => (
                    <tr key={name as string}>
                      <td className={`px-3 py-1.5 font-medium ${color}`}>{name}</td>
                      <td className="px-3 py-1.5 text-right text-fab-muted">{range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-semibold text-fab-text mt-5 mb-2">Dominance Score</h3>
            <p className="text-sm text-fab-muted mb-2">
              The dominance score determines the overall winner. Each stat category has a weight, and for
              every weighted stat, both players&apos; raw values are compared proportionally:
            </p>
            <div className="p-3 rounded-lg bg-fab-surface border border-fab-border mb-3">
              <p className="text-sm text-fab-text font-mono text-center">
                points = (your value / combined total) &times; 10 &times; weight
              </p>
            </div>
            <div className="space-y-1 text-sm text-fab-muted mb-3">
              {[
                ["Win Rate", "3"],
                ["Event Wins", "3"],
                ["Top 8 Finishes", "2.5"],
                ["Longest Win Streak", "2"],
                ["Earnings", "2"],
                ["Rated Win Rate", "2"],
                ["Current Streak", "1.5"],
                ["Monthly Win Rate", "1.5"],
                ["Armory Win Rate", "1.5"],
                ["Total Matches", "1"],
                ["Events Played", "1"],
                ["Unique Heroes", "1"],
                ["H2H Record", "4"],
              ].map(([name, weight]) => (
                <div key={name} className="flex items-center gap-2 py-0.5">
                  <span className="font-medium text-fab-text w-40">{name}</span>
                  <span className="text-fab-dim font-mono">&times;{weight}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-fab-dim mb-4">
              The head-to-head record carries the most weight (&times;4) when available, reflecting the
              importance of the direct matchup. Categories with missing data (e.g. no rated matches) are
              excluded rather than penalized.
            </p>

            <h3 className="text-sm font-semibold text-fab-text mt-5 mb-2">Common Opponents</h3>
            <div className="space-y-2 text-sm text-fab-muted mb-4">
              <p>
                Shows every opponent both players have faced, sorted by total combined games. For each shared
                opponent, win/loss records are compared side-by-side.
              </p>
              <p>
                <span className="font-medium text-fab-text">Edge detection</span> — An &quot;edge&quot; is when one
                player has a winning record (&ge;50%) against an opponent while the other has a losing record
                (&lt;50%). The Opponent Network summary counts how many edges each player has, giving a
                transitive comparison even when no direct head-to-head exists.
              </p>
            </div>

            <h3 className="text-sm font-semibold text-fab-text mt-5 mb-2">Verdict</h3>
            <p className="text-sm text-fab-muted mb-2">
              The verdict uses personality-driven language based on how wide the dominance gap is:
            </p>
            <div className="space-y-1 text-sm text-fab-muted mb-3">
              {[
                [">20% margin", "\"OBLITERATES\" — playing in a different league"],
                [">12% margin", "\"FLEXES\" — convincing dominance"],
                [">5% margin", "\"Edges it out\" — slim advantage"],
                ["<5% margin", "\"TOO CLOSE TO CALL!\" — rivalry is heating up"],
                ["<1% margin", "\"MIRROR MATCH!\" — carbon copies"],
              ].map(([threshold, desc]) => (
                <div key={threshold} className="flex items-start gap-2 py-0.5">
                  <span className="shrink-0 font-mono text-fab-dim w-24 text-right">{threshold}</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm text-fab-muted mt-4">
              <p>
                <span className="font-medium text-fab-text">H2H record</span> — If both players have faced each
                other, their direct head-to-head record is shown in a dedicated arena section with a visual
                win-rate bar.
              </p>
              <p>
                <span className="font-medium text-fab-text">Hero roster</span> — Side-by-side comparison of each
                player&apos;s top 5 heroes with match counts and win rates.
              </p>
              <p>
                <span className="font-medium text-fab-text">Share card</span> — Generate a shareable image of
                the showdown with power level tier icons, key stats, opponent network edges, and the verdict.
              </p>
            </div>
          </section>

          {/* ─── Nemesis & Best Friend ─── */}
          <section id="nemesis">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Nemesis &amp; Best Friend</h2>
            <p className="text-sm text-fab-muted mb-3">
              Your profile highlights two special opponents:
            </p>
            <div className="space-y-3 text-sm text-fab-muted">
              <div className="p-3 rounded-lg bg-fab-surface border border-fab-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-fab-loss font-semibold">Nemesis</span>
                </div>
                <p>
                  The opponent you struggle against the most. Calculated as the opponent with the
                  <span className="font-medium text-fab-text"> lowest win rate</span> against you,
                  with a minimum of 3 matches. &quot;Unknown&quot; opponents are excluded.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-fab-surface border border-fab-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-fab-text font-semibold">Best Friend</span>
                </div>
                <p>
                  The opponent you&apos;ve played the most. Calculated as the opponent with the
                  <span className="font-medium text-fab-text"> highest total match count</span> against you,
                  regardless of win rate.
                </p>
              </div>
            </div>
            <p className="text-xs text-fab-dim mt-2">
              The Nemesis leaderboard tab ranks all public players by who has the worst win rate against any single opponent (min 3 matches).
            </p>
          </section>

          {/* ─── Activity Feed ─── */}
          <section id="activity-feed">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Activity Feed</h2>
            <p className="text-sm text-fab-muted mb-3">
              The Activity Feed on the homepage shows what the community is up to — match imports,
              achievement unlocks, and tournament placements.
            </p>
            <div className="space-y-2 text-sm text-fab-muted">
              <p>
                <span className="font-medium text-fab-text">Type filters</span> — Filter by All, Imports,
                Achievements, or Placements. Your filter preference is saved between visits.
              </p>
              <p>
                <span className="font-medium text-fab-text">Community vs Friends</span> — Toggle between
                seeing all public activity or just activity from your friends and favorited players.
              </p>
              <p>
                <span className="font-medium text-fab-text">Search page</span> — The full paginated
                activity feed is available on the Search page alongside player search.
              </p>
            </div>
          </section>

          {/* ─── Friends ─── */}
          <section id="friends">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Friends</h2>
            <p className="text-sm text-fab-muted mb-3">
              Add other players as friends to see their activity in your feed and quickly access their profiles.
            </p>
            <div className="space-y-2 text-sm text-fab-muted">
              <p>
                <span className="font-medium text-fab-text">Friend requests</span> — Send a request from any
                player&apos;s profile. They&apos;ll see it in their notifications and can accept or decline.
              </p>
              <p>
                <span className="font-medium text-fab-text">Favorites</span> — Star any player from the
                Opponents page to add them as a favorite. Favorites appear in the Friends activity filter
                alongside accepted friends.
              </p>
              <p>
                <span className="font-medium text-fab-text">Friends-only profiles</span> — Players can set their
                profile visibility to &quot;Friends&quot; in Settings so only accepted friends can view their stats.
                Non-friends will see a locked profile message.
              </p>
            </div>
          </section>

          {/* ─── Kudos ─── */}
          <section id="kudos">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Kudos</h2>
            <p className="text-sm text-fab-muted mb-3">
              Give kudos to other players to recognize their gameplay and sportsmanship.
              Kudos appear on player profiles and are tracked on the Leaderboard.
            </p>
            <div className="space-y-2 text-sm text-fab-muted">
              <p>
                <span className="font-medium text-fab-text">Types</span> — There are four kudos types:
                Props (general), Good Sport (sportsmanship), Skilled (gameplay), and Helpful (community).
                Each appears as a button on player profiles.
              </p>
              <p>
                <span className="font-medium text-fab-text">Limits</span> — You can give up to 10 kudos per day
                across all types. Each player can receive at most one of each type from you. After revoking a
                non-Props kudos, there&apos;s a 7-day cooldown before you can re-give the same type to that player.
              </p>
              <p>
                <span className="font-medium text-fab-text">Admin endorsement</span> — When the site admin gives
                kudos to a player, those boxes display a subtle glowing border to highlight the endorsement.
              </p>
              <p>
                <span className="font-medium text-fab-text">Leaderboard</span> — Kudos received and given are
                tracked on the Rankings page with separate leaderboards for each type and a total category.
              </p>
            </div>
          </section>

          {/* ─── FaBdoku ─── */}
          <section id="fabdoku">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">FaBdoku</h2>
            <p className="text-sm text-fab-muted mb-3">
              FaBdoku is a daily puzzle game where you fill a 3&times;3 grid with Flesh and Blood heroes.
              Each hero must satisfy both its row and column constraints (class, talent, cost, set, etc.).
            </p>
            <div className="space-y-2 text-sm text-fab-muted">
              <p>
                <span className="font-medium text-fab-text">Scoring</span> — Each correct cell earns 1 point
                (max 9/9). Your score and number of games played appear as a badge on your profile card.
              </p>
              <p>
                <span className="font-medium text-fab-text">Streaks</span> — Win streaks are tracked across
                consecutive days. Your current streak and best streak are shown in your FaBdoku stats.
              </p>
              <p>
                <span className="font-medium text-fab-text">Uniqueness</span> — After completing the puzzle,
                you can see how common each of your picks was compared to other players. Lower percentages
                mean more unique choices.
              </p>
            </div>
          </section>

          {/* ─── Discord Bot ─── */}
          <section id="discord-bot">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Discord Bot</h2>
            <p className="text-sm text-fab-muted mb-3">
              The FaB Stats Discord bot lets you look up player stats, leaderboards, hero data, and more directly
              from any Discord server.{" "}
              <a
                href="https://discord.com/oauth2/authorize?client_id=1478583612537573479&permissions=0&scope=bot+applications.commands"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fab-gold hover:underline"
              >
                Add to your server
              </a>
              {" · "}
              <a
                href="https://discord.gg/WPP5aqCUHY"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fab-gold hover:underline"
              >
                Join the Discord
              </a>
            </p>

            <h3 className="text-sm font-semibold text-fab-text mt-4 mb-2">Player Lookup</h3>
            <div className="space-y-1.5 text-sm text-fab-muted">
              <p><code className="text-fab-gold">/stats &lt;username&gt;</code> — Overall record, win rate, power level, streaks, top hero, and events played.</p>
              <p><code className="text-fab-gold">/hero &lt;username&gt; &lt;hero&gt;</code> — Stats with a specific hero: W/L/D, win rate, and matchup breakdown.</p>
              <p><code className="text-fab-gold">/recent &lt;username&gt;</code> — Last 10 matches with results, heroes, and opponents.</p>
              <p><code className="text-fab-gold">/event &lt;username&gt; [name]</code> — Most recent event (or search by name): round-by-round results, format, and record.</p>
              <p><code className="text-fab-gold">/opponents &lt;username&gt;</code> — Top 10 most-played opponents with W/L records.</p>
            </div>

            <h3 className="text-sm font-semibold text-fab-text mt-4 mb-2">Comparison</h3>
            <div className="space-y-1.5 text-sm text-fab-muted">
              <p><code className="text-fab-gold">/compare &lt;player1&gt; &lt;player2&gt;</code> — Side-by-side comparison of two players&apos; stats.</p>
              <p><code className="text-fab-gold">/h2h &lt;opponent&gt;</code> — Your head-to-head record vs an opponent (requires <code>/link</code>).</p>
              <p><code className="text-fab-gold">/matchup &lt;your_hero&gt; &lt;vs_hero&gt;</code> — Your personal record in a specific hero matchup (requires <code>/link</code>).</p>
            </div>

            <h3 className="text-sm font-semibold text-fab-text mt-4 mb-2">Community</h3>
            <div className="space-y-1.5 text-sm text-fab-muted">
              <p><code className="text-fab-gold">/leaderboard [category] [sort]</code> — Community leaderboard with 34+ ranking categories. Supports autocomplete search.</p>
              <p><code className="text-fab-gold">/meta</code> — Current season&apos;s Top 8 hero breakdown across the community.</p>
              <p><code className="text-fab-gold">/herolist [sort]</code> — Community hero tier list sorted by matches, win rate, or players.</p>
              <p><code className="text-fab-gold">/community-matchup &lt;hero1&gt; &lt;hero2&gt; [format]</code> — Community win rates for a hero matchup across all FaB Stats players. Supports autocomplete.</p>
            </div>

            <h3 className="text-sm font-semibold text-fab-text mt-4 mb-2">Weekly Armory Recaps</h3>
            <div className="space-y-1.5 text-sm text-fab-muted">
              <p><code className="text-fab-gold">/armory-subscribe</code> — Opt in (or out) of weekly armory stat recaps for your server. Requires <code>/link</code> first.</p>
              <p><code className="text-fab-gold">/armory-channel</code> — Set the current channel as the destination for weekly armory recap posts (requires Manage Channels).</p>
            </div>
            <p className="text-xs text-fab-dim mt-2">
              Every Sunday at 6 PM, the bot automatically posts a recap showing each subscriber&apos;s armory win-loss
              record and heroes for the week. Players who didn&apos;t play that week are silently omitted. Results are
              pulled from your FaB Stats match data — just import your matches as usual and the bot picks them up automatically.
            </p>

            <h3 className="text-sm font-semibold text-fab-text mt-4 mb-2">Account</h3>
            <div className="space-y-1.5 text-sm text-fab-muted">
              <p><code className="text-fab-gold">/link &lt;username&gt;</code> — Link your Discord account to your FaB Stats profile. Required for <code>/h2h</code>, <code>/matchup</code>, and <code>/armory-subscribe</code>.</p>
              <p><code className="text-fab-gold">/unlink</code> — Remove the link between your Discord and FaB Stats accounts.</p>
              <p><code className="text-fab-gold">/manage-link @user [action] [username]</code> — View, set, or remove a player&apos;s Discord–FaB Stats link. Requires Manage Server permission or bot owner.</p>
            </div>

            <h3 className="text-sm font-semibold text-fab-text mt-4 mb-2">Utility</h3>
            <div className="space-y-1.5 text-sm text-fab-muted">
              <p><code className="text-fab-gold">/help</code> — List all available commands.</p>
              <p><code className="text-fab-gold">/invite</code> — Get the bot invite link to add it to another server.</p>
              <p><code className="text-fab-gold">/botstats</code> — Bot info: server count, uptime, and ping.</p>
            </div>
          </section>

          {/* ─── Showcase & Pinned ─── */}
          <section id="showcase">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Showcase & Pinned</h2>
            <p className="text-sm text-fab-muted mb-3">
              Customize your profile with two configurable sections: Pinned (top) and Showcase (below).
              Each section has a budget of 12 points — most cards cost 1 point (half-width), achievements cost 2 (full-width).
            </p>
            <div className="space-y-2 text-sm text-fab-muted">
              <p>
                <span className="font-medium text-fab-text">Card types</span> — Featured Match, Hero Spotlight,
                Best Finish, Rivalry, Event Recap, Achievements, Stat Highlight, Format Mastery, Event Types,
                Streaks, Recent Form, and Rankings.
              </p>
              <p>
                <span className="font-medium text-fab-text">Rankings card</span> — Shows your current leaderboard
                positions (top 8). If you drop off a leaderboard, that position automatically disappears from the card.
              </p>
              <p>
                <span className="font-medium text-fab-text">Editing</span> — Click Edit to rearrange, add, or
                remove cards. Changes save automatically. Each card type can be configured — pick a specific
                match, hero, event, or stat to highlight.
              </p>
            </div>
          </section>

          {/* ─── On This Day ─── */}
          <section id="on-this-day">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">On This Day</h2>
            <p className="text-sm text-fab-muted mb-3">
              The On This Day widget shows matches you played on today&apos;s date in previous years.
              See your record, opponents, heroes, and events from past years at a glance.
            </p>
            <div className="space-y-2 text-sm text-fab-muted">
              <p>
                <span className="font-medium text-fab-text">Placement detection</span> — If you made
                a top-cut at an event, On This Day automatically detects your placement (Champion,
                Finalist, Top 4, or Top 8) and shows a badge on the card. The badge appears in the
                collapsed header too.
              </p>
              <p>
                <span className="font-medium text-fab-text">Round ordering</span> — Rounds are sorted
                in natural order: swiss rounds first (R1, R2, …), then playoffs (QF, SF, F).
                Playoff rounds are highlighted in purple so they stand out.
              </p>
              <p>
                <span className="font-medium text-fab-text">Shareable</span> — Capture your On This Day
                memories as an image to share on social media. The share card includes your record and
                match details for each year.
              </p>
            </div>
          </section>

          {/* ─── Community Meta ─── */}
          <section id="community-meta">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Community Meta</h2>
            <p className="text-sm text-fab-muted">
              The Meta page aggregates data across all public players to show which heroes are most
              played and have the highest win rates. Filter by format and event type to see how the
              meta shifts across different competitive tiers. Data updates as players import matches.
            </p>
          </section>

          {/* ─── Tournaments ─── */}
          <section id="tournaments">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Tournaments</h2>
            <p className="text-sm text-fab-muted">
              The Tournaments page showcases recent featured tournaments with top-8 results.
              Player names link to their profiles when they have an account on FaB Stats.
              Use the format filter to narrow results to a specific format. The homepage
              shows the two most recent tournaments with a link to view all.
            </p>
          </section>

          {/* ─── Privacy ─── */}
          <section id="privacy">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Privacy</h2>
            <p className="text-sm text-fab-muted mb-3">
              Your profile is private by default. You can make it public from the Settings page to appear
              on the Leaderboard and let others find you via Search.
            </p>
            <div className="space-y-2 text-sm text-fab-muted">
              <p>
                <span className="font-medium text-fab-text">Public profiles</span> — Your stats, hero breakdown, and events are visible to anyone.
                Opponent names are hidden on public profiles to protect their privacy. If an opponent has
                opted in via &quot;Show name on profiles&quot; in their settings, their name will be visible.
              </p>
              <p>
                <span className="font-medium text-fab-text">Friends-only</span> — A middle ground between public and private. Only accepted friends can see your stats.
                Non-friends see a locked profile message.
              </p>
              <p>
                <span className="font-medium text-fab-text">Private profiles</span> — Only you can see your data. You won&apos;t appear on the Leaderboard or in search results.
              </p>
              <p>
                <span className="font-medium text-fab-text">Hide from Guests</span> — An optional toggle in
                Settings that hides your profile, search results, and leaderboard entry from visitors who
                aren&apos;t logged in. Disabled by default.
              </p>
            </div>
          </section>

          {/* ─── Roadmap ─── */}
          <section id="roadmap">
            <h2 className="text-xl font-semibold text-fab-text mb-3 pb-2 border-b border-fab-border">Roadmap</h2>
            <p className="text-sm text-fab-muted">
              Check out the <Link href="/roadmap" className="text-fab-gold hover:underline">Roadmap</Link> page
              for a public list of planned features, improvements, and fixes. Items are added and removed as
              development progresses.
            </p>
          </section>
        </div>

        {/* Back to top */}
        <div className="mt-14 pt-6 border-t border-fab-border text-center">
          <a href="#" className="text-xs text-fab-muted hover:text-fab-text transition-colors">
            Back to top
          </a>
        </div>
      </div>
      </div>
    </div>
  );
}

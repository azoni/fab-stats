import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs",
  description: "How FaB Stats works — importing, Best Finish, Hero Mastery, Achievements, and more.",
};

export default function DocsPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-fab-gold mb-2">Documentation</h1>
      <p className="text-sm text-fab-muted mb-10">
        Everything you need to know about how FaB Stats works.
      </p>

      <div className="space-y-10">
        {/* Getting Started */}
        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-3">Getting Started</h2>
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

        {/* Win Rate & Record */}
        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-3">Win Rate &amp; Record</h2>
          <p className="text-sm text-fab-muted mb-3">
            Win rate is calculated as <span className="font-medium text-fab-text">wins / total matches</span>.
            All match results count toward the total — wins, losses, draws, and byes are all included
            in the denominator. This means byes and draws will slightly lower your win rate percentage.
          </p>
          <p className="text-xs text-fab-dim">
            Example: 80 wins, 15 losses, 5 byes = 80/100 = 80.0% win rate, not 80/95.
          </p>
        </section>

        {/* Streaks */}
        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-3">Streaks</h2>
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
              <span className="font-medium text-fab-text">Byes break streaks</span> — Byes are treated
              the same as draws for streak purposes. They do not extend a win streak.
            </p>
          </div>
          <p className="text-xs text-fab-dim mt-2">
            Matches are sorted chronologically to determine streak order. Your current streak shows
            the most recent consecutive result.
          </p>
        </section>

        {/* Best Finish */}
        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-3">Best Finish</h2>
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

        {/* Event Detection */}
        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-3">Event Detection</h2>
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

        {/* Nemesis & Best Friend */}
        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-3">Nemesis &amp; Best Friend</h2>
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

        {/* Hero Mastery */}
        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-3">Hero Mastery</h2>
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

        {/* Achievements */}
        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-3">Achievements</h2>
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

        {/* Leaderboard */}
        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-3">Leaderboard</h2>
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
              ["Weekly", "Matches and wins this week (resets Monday)"],
              ["Monthly", "Matches, wins, and win rate this month"],
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
          <p className="text-sm text-fab-muted mt-4 mb-2">
            <span className="font-medium text-fab-text">Ranked borders</span> — The top 5 players on
            each tab receive a ranked border on their card:
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
        </section>

        {/* Weekly & Monthly Stats */}
        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-3">Weekly &amp; Monthly Stats</h2>
          <p className="text-sm text-fab-muted mb-3">
            Weekly and monthly leaderboard tabs track recent activity:
          </p>
          <div className="space-y-2 text-sm text-fab-muted">
            <p>
              <span className="font-medium text-fab-text">Weekly</span> — Resets every Monday.
              Shows matches played and wins for the current week.
            </p>
            <p>
              <span className="font-medium text-fab-text">Monthly</span> — Resets on the 1st of
              each month. Shows matches, wins, and win rate.
            </p>
          </div>
          <p className="text-xs text-fab-dim mt-2">
            Bulk imports with incorrect dates are automatically detected and excluded from weekly/monthly
            stats to prevent inflated numbers. If the majority of a player&apos;s matches appear to land
            in the current period, the stats are reset to zero.
          </p>
        </section>

        {/* Formats */}
        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-3">Supported Formats</h2>
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

        {/* Privacy */}
        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-3">Privacy</h2>
          <p className="text-sm text-fab-muted mb-3">
            Your profile is private by default. You can make it public from the Settings page to appear
            on the Leaderboard and let others find you via Discover.
          </p>
          <div className="space-y-2 text-sm text-fab-muted">
            <p>
              <span className="font-medium text-fab-text">Public profiles</span> — Your stats, hero breakdown, and events are visible to anyone.
              Opponent names are hidden on public profiles to protect their privacy. If an opponent has
              opted in via &quot;Show name on profiles&quot; in their settings, their name will be visible.
            </p>
            <p>
              <span className="font-medium text-fab-text">Private profiles</span> — Only you can see your data. You won&apos;t appear on the Leaderboard or in search results.
            </p>
          </div>
        </section>

        {/* Chrome Extension */}
        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-3">Chrome Extension</h2>
          <p className="text-sm text-fab-muted mb-3">
            The FaB Stats Chrome Extension adds a one-click export button to your GEM match history page.
            It automatically detects heroes played in each event using the card data on the page.
          </p>
          <div className="space-y-1.5 text-sm text-fab-muted">
            <p>1. Install the extension from your browser</p>
            <p>2. Go to your GEM match history at gem.fabtcg.com</p>
            <p>3. Click the &quot;Export to FaB Stats&quot; button that appears</p>
            <p>4. Your matches are copied to clipboard — paste them on the Import page</p>
          </div>
          <p className="text-xs text-fab-dim mt-2">
            Each import tracks which extension version was used and whether data came from the extension,
            copy-paste, or CSV upload.
          </p>
        </section>

        {/* Community Meta */}
        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-3">Community Meta</h2>
          <p className="text-sm text-fab-muted">
            The Meta page aggregates data across all public players to show which heroes are most
            played and have the highest win rates. Filter by format and event type to see how the
            meta shifts across different competitive tiers. Data updates as players import matches.
          </p>
        </section>
      </div>
    </div>
  );
}

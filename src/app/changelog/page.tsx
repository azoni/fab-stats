import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
  description: "FaB Stats changelog — see what's new, improved, and fixed.",
};

type ChangeType = "new" | "improved" | "fixed";

interface Change {
  type: ChangeType;
  text: string;
}

interface Entry {
  date: string;
  changes: Change[];
}

const badgeStyles: Record<ChangeType, string> = {
  new: "bg-fab-win/15 text-fab-win",
  improved: "bg-fab-gold/15 text-fab-gold",
  fixed: "bg-fab-loss/15 text-fab-loss",
};

const badgeLabels: Record<ChangeType, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

const changelog: Entry[] = [
  {
    date: "March 1, 2026",
    changes: [
      { type: "new", text: "Player Spotlight back on homepage — 6 community standouts in a responsive grid, refreshed each page load" },
      { type: "new", text: "On This Day placement detection — infers QF/SF/F from unnumbered playoff matches, shows Champion, Finalist, Top 4, or Top 8 badges" },
      { type: "new", text: "Profile card stats — homepage profile card now shows match count, win rate, events, and top hero at a glance" },
      { type: "improved", text: "Navbar profile button — clicking your avatar now goes directly to your profile; separate chevron opens the account menu" },
      { type: "improved", text: "On This Day rounds sorted correctly by round number — swiss first, then playoffs in order (QF, SF, F)" },
      { type: "improved", text: "Playoff rounds labeled as QF, SF, F instead of showing the format name, highlighted in purple" },
      { type: "improved", text: "On This Day collapsed view shows placement badge alongside match count" },
      { type: "improved", text: "Homepage visual warmth — subtle gradient glows on welcome card and profile card" },
      { type: "improved", text: "Quick nav buttons redesigned — larger tiles with themed gradients, icon containers, colored accents, and hover lift" },
      { type: "improved", text: "Versus removed from quick nav (already in the main navbar)" },
      { type: "fixed", text: "Activity feed items no longer disappear at midnight — replaced 24-hour import cutoff with per-type caps (10 imports, 15 achievements, 20 placements)" },
      { type: "fixed", text: "Community Meta 'This Month' showing empty — fixed timezone bug in month start date calculation" },
    ],
  },
  {
    date: "February 27, 2026",
    changes: [
      { type: "new", text: "Versus page — redesigned Compare into a head-to-head showdown with weighted dominance scoring, H2H record, and shareable verdict cards" },
      { type: "new", text: "Activity Feed on homepage — achievements, placements, and imports with type filters, community/friends toggle, and pagination" },
      { type: "new", text: "Player Spotlight — 6 featured profiles using 9 spotlight algorithms, shown alongside the Activity Feed" },
      { type: "new", text: "Friends system — add friends, send requests, filter the Activity Feed to friends and favorites" },
      { type: "new", text: "On This Day widget — collapsible, shareable match memories with horizontal card layout" },
      { type: "new", text: "Quick Nav buttons on dashboard — fast access to Import, Compare, Events, and more" },
      { type: "new", text: "Armory Garden on profile — flowers that grow as you attend armories, with watering can tiers and interactive effects" },
      { type: "new", text: "Trophy Case on profile — marble icons for Champion, Finalist, Top 4, Top 8, and Other finishes by event type" },
      { type: "new", text: "Shareable profile cards — capture your stats as an image with tier borders, rank rings, trophies, and armory garden" },
      { type: "new", text: "Community Polls — vote on community questions with results history" },
      { type: "new", text: "Bulk tournament import — admin tool to import tournament results with auto player-linking" },
      { type: "new", text: "Hide from Guests privacy toggle — opt-in to hide your profile from visitors who aren't logged in" },
      { type: "new", text: "Clear all match data — delete all your imported matches from Settings" },
      { type: "new", text: "Beta GEM extension — structured CSS-selector parsing with Quick Sync button" },
      { type: "new", text: "Paginated Discover page — browse the full community activity feed with type filtering and infinite scroll" },
      { type: "improved", text: "Navbar redesigned — consolidated icon buttons into a user avatar dropdown with chevron indicator" },
      { type: "improved", text: "Byes excluded from match counts and win rate calculations for more accurate stats" },
      { type: "improved", text: "Performance — cached activity feed, trimmed leaderboard documents" },
      { type: "improved", text: "Security hardened — auth on serverless functions, tighter Firestore rules, improved CSP headers" },
      { type: "improved", text: "Profile page streamlined — collapsible sections, quick nav, event dates on placement cards" },
      { type: "improved", text: "Opponents tab redesigned with rivalry highlights and improved layout" },
      { type: "improved", text: "Spotlight and Activity Feed hidden from guests for a cleaner landing page" },
      { type: "fixed", text: "H2H comparisons now use bidirectional matching with GEM ID and name fallback" },
      { type: "fixed", text: "Hero no longer bleeds across events during import" },
      { type: "fixed", text: "Private profile owner view now works correctly" },
      { type: "fixed", text: "Photo upload CSP violation resolved" },
      { type: "fixed", text: "Paste import now detects playoff sections and extracts hero from decklists" },
    ],
  },
  {
    date: "February 26, 2026",
    changes: [
      { type: "new", text: "Favorite players — star any player to keep them at the top of your Opponents list" },
      { type: "new", text: "Quick Match Log — log a single match result after it happens without a full import" },
      { type: "new", text: "Shareable H2H rivalry cards — share your head-to-head record from the Opponents page" },
      { type: "new", text: "Monthly leaderboard categories — Monthly Matches, Monthly Wins, and Monthly Win Rate tabs" },
      { type: "new", text: "Community Meta page (beta) — see the most popular and best-performing heroes across all players" },
      { type: "new", text: "Hero Mastery expanded to 8 tiers — Grandmaster, Legend, and Mythic for dedicated hero mains" },
      { type: "new", text: "Edit hero on your matches — expand any event and set the hero you played" },
      { type: "new", text: "BYEs tracked as a separate result type — imported from GEM instead of being skipped, with a Byes leaderboard tab" },
      { type: "new", text: "Tournaments page — browse all featured tournaments with format filtering" },
      { type: "new", text: "Shareable best finish cards — share your top event placement from your homepage" },
      { type: "new", text: "Nemesis and best friend cards now show active filters (format, rated, hero)" },
      { type: "improved", text: "Homepage redesign — cleaner welcome card, recent tournaments, your event history, and meta snapshot" },
      { type: "improved", text: "Featured tournaments now visible to all visitors, not just logged-in users" },
      { type: "improved", text: "Cleaner event match tables — hero column only shows when you played multiple heroes in an event" },
      { type: "fixed", text: "Weekly and monthly leaderboard stats no longer inflated by bulk imports with incorrect dates" },
      { type: "fixed", text: "World Premiere events no longer misclassified as Worlds" },
      { type: "fixed", text: "Streak leaderboard sort is now stable when matches share the same date" },
      { type: "fixed", text: "Venue parsing no longer picks up days of the week or prize descriptions as venue names" },
    ],
  },
  {
    date: "February 25, 2026",
    changes: [
      { type: "new", text: "Weekly Matches and Weekly Wins leaderboard tabs — see who's grinding this week" },
      { type: "new", text: "5-tier ranked border system — Grandmaster (prismatic), Diamond (cyan), Gold, Silver, Bronze for top 5 on every leaderboard" },
      { type: "new", text: "Creator crown on azoni's profile — site admin/creator badge" },
      { type: "new", text: "Clickable opponent names — tap any opponent to find their profile" },
      { type: "improved", text: "Opponents tab promoted to main navbar on desktop and mobile" },
      { type: "improved", text: "Leaderboard card borders now have animated rotating gradients for top 5 ranks" },
      { type: "fixed", text: "Messaging permission errors when starting a new conversation" },
      { type: "fixed", text: "SEO: corrected domain across robots.txt and sitemap, added page metadata" },
    ],
  },
  {
    date: "February 23, 2026",
    changes: [
      { type: "new", text: "Public/private profile toggle in Settings — control who can see your profile" },
      { type: "new", text: "Hero selection per event during import — set your hero before importing" },
      { type: "new", text: "Head-to-head record badges on Leaderboard — see your record vs other players" },
      { type: "new", text: "Changelog page — you're looking at it" },
      { type: "fixed", text: "Better error message when importing events with no match results (e.g. teaching events)" },
      { type: "improved", text: "Opponents page accepts deep links from Leaderboard H2H badges" },
    ],
  },
  {
    date: "February 22, 2026",
    changes: [
      { type: "new", text: "Achievement system — 30 unlockable badges across 5 categories with custom icons" },
      { type: "new", text: "Hero Mastery tiers — track your progression from Novice to Master for each hero" },
      { type: "improved", text: "Navbar consolidated into 4 core links + More dropdown for cleaner navigation" },
      { type: "improved", text: "Dashboard renamed to Profile with avatar header and achievement badges" },
      { type: "improved", text: "Achievements and Hero Mastery sections default to collapsed" },
      { type: "improved", text: "Admin panel users table is now collapsible" },
    ],
  },
  {
    date: "February 21, 2026",
    changes: [
      { type: "new", text: "Feedback system — submit bug reports and feature requests from Settings or the navbar" },
      { type: "new", text: "Featured Creators section — discover FaB content creators" },
      { type: "new", text: "Opponent name obfuscation on public profiles — protect opponent privacy" },
      { type: "improved", text: "Admin panel with feedback review, status filters, and creator management" },
    ],
  },
  {
    date: "Earlier updates",
    changes: [
      { type: "new", text: "Year in Review / Wrapped pages — see your annual stats summary" },
      { type: "new", text: "Opponent stats with head-to-head breakdowns, streaks, and match history" },
      { type: "new", text: "Chrome Extension for one-click GEM import with automatic hero detection" },
      { type: "new", text: "Activity feed showing recent imports across the community" },
      { type: "new", text: "Leaderboard with Win Rate, Most Matches, Streaks, Draws, Events, Rated, and Nemesis tabs" },
      { type: "new", text: "Event tracking with format detection, venue parsing, and rated/unrated filtering" },
      { type: "new", text: "CSV import support for FaB History Scraper users" },
      { type: "new", text: "Copy & paste import from GEM History page with bookmarklet helper" },
      { type: "new", text: "Player search and public profiles" },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-fab-gold mb-2">Changelog</h1>
      <p className="text-sm text-fab-muted mb-8">See what&apos;s new, improved, and fixed in FaB Stats.</p>

      <div className="space-y-8">
        {changelog.map((entry) => (
          <div key={entry.date}>
            <h2 className="text-lg font-semibold text-fab-text mb-3">{entry.date}</h2>
            <div className="space-y-2">
              {entry.changes.map((change, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`shrink-0 mt-0.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${badgeStyles[change.type]}`}>
                    {badgeLabels[change.type]}
                  </span>
                  <span className="text-sm text-fab-muted">{change.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

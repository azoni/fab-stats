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
    date: "February 26, 2026",
    changes: [
      { type: "new", text: "Monthly leaderboard categories — Monthly Matches, Monthly Wins, and Monthly Win Rate tabs" },
      { type: "new", text: "Community Meta page (beta) — see the most popular and best-performing heroes across all players" },
      { type: "new", text: "Hero Mastery expanded to 8 tiers — Grandmaster, Legend, and Mythic for dedicated hero mains" },
      { type: "new", text: "Edit hero on your matches — expand any event and set the hero you played" },
      { type: "improved", text: "Cleaner event match tables — hero column only shows when you played multiple heroes in an event" },
      { type: "fixed", text: "Weekly and monthly leaderboard stats no longer inflated by bulk imports with incorrect dates" },
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

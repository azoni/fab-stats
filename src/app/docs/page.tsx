import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { DocsSearch } from "./DocsSearch";
import { BookIcon } from "@/components/icons/NavIcons";

export const metadata: Metadata = {
  title: "Docs",
  description: "How FaB Stats works: imports, match tracking, meta data, teams, friends, daily games, achievements, and support.",
};

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "navigation", label: "Navigation" },
  { id: "imports", label: "Importing Matches" },
  { id: "dashboard", label: "Home Dashboard" },
  { id: "profiles", label: "Profiles" },
  { id: "meta", label: "Meta" },
  { id: "community", label: "Community" },
  { id: "extras", label: "Extras" },
  { id: "achievements", label: "Achievements" },
  { id: "support", label: "Support" },
  { id: "privacy", label: "Privacy" },
  { id: "settings", label: "Settings" },
  { id: "discord-bot", label: "Discord Bot" },
  { id: "technical-notes", label: "Technical Notes" },
];

const navGroups = [
  ["Home", "Your match history, events, opponents, trends, and tournament stats."],
  ["Meta", "Community hero data, rankings, and matchup matrix."],
  ["Community", "Teams, friends, public profiles, and player discovery."],
  ["Support", "Discord, Discord bot, X, affiliate shop links, and feedback."],
  ["Extras", "Daily games, achievements, Versus, docs, and changelog."],
];

const importMethods = [
  ["Chrome extension", "Best for regular use. Pulls structured GEM history into FaB Stats with less cleanup."],
  ["Paste import", "Copy match history from GEM and paste it into the import page when the extension is not available."],
  ["Quick match", "Log a single match or event manually when you need to capture something fast."],
  ["CSV/history tools", "Legacy import paths are still supported where available for older workflows."],
];

const gameLinks = [
  ["/fabdoku", "FaBdoku"],
  ["/crossword", "Crossword"],
  ["/heroguesser", "Hero Guesser"],
  ["/matchupmania", "Matchup Mania"],
  ["/connections", "Connections"],
  ["/timeline", "Timeline"],
  ["/trivia", "Trivia"],
  ["/rhinarsrampage", "Rhinar's Rampage"],
  ["/kayosknockout", "Kayo's Knockout"],
  ["/brutebrawl", "Brute Brawl"],
  ["/ninjacombo", "Katsu's Combo"],
  ["/shadowstrike", "Shadow Strike"],
  ["/bladedash", "Blade Dash"],
];

export default function DocsPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-inset ring-violet-500/20">
            <BookIcon className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-fab-text">Documentation</h1>
            <p className="text-xs leading-tight text-fab-muted">Current guide to FaB Stats features and navigation</p>
          </div>
        </div>
        <DocsSearch toc={TOC} />
      </div>

      <div className="mx-auto flex max-w-5xl gap-10">
        <nav className="hidden max-h-[calc(100vh-6rem)] w-48 shrink-0 self-start overflow-y-auto lg:sticky lg:top-20 lg:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-fab-muted">On this page</p>
          <ul className="space-y-1">
            {TOC.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="block py-0.5 text-sm text-fab-muted transition-colors hover:text-fab-text">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">
          <div className="space-y-12">
            <DocSection id="overview" title="Overview">
              <p>
                FaB Stats is a Flesh and Blood match tracker built around real player history. It helps you import GEM results,
                review your record, understand your hero and matchup performance, compare against community trends, and share
                polished profile or event cards.
              </p>
              <p>
                The app is independent and community-run. It is not affiliated with or endorsed by Legend Story Studios.
              </p>
            </DocSection>

            <DocSection id="navigation" title="Navigation">
              <p>
                The desktop app uses a left sidebar. On smaller desktop screens, child links collapse out of the sidebar and
                appear in the section navigation at the top of the page. The section labels still navigate to their default pages.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {navGroups.map(([name, description]) => (
                  <div key={name} className="rounded-lg border border-fab-border bg-fab-surface p-3">
                    <h3 className="text-sm font-bold text-fab-text">{name}</h3>
                    <p className="mt-1 text-xs leading-5 text-fab-muted">{description}</p>
                  </div>
                ))}
              </div>
            </DocSection>

            <DocSection id="imports" title="Importing Matches">
              <p>
                Imports are the core of the site. Once matches are saved, FaB Stats recalculates dashboard stats, event summaries,
                hero data completion, achievements, profile cards, leaderboard entries, and feed activity.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {importMethods.map(([name, description]) => (
                  <div key={name} className="rounded-lg border border-fab-border bg-fab-surface p-3">
                    <h3 className="text-sm font-bold text-fab-text">{name}</h3>
                    <p className="mt-1 text-xs leading-5 text-fab-muted">{description}</p>
                  </div>
                ))}
              </div>
              <p>
                GEM ID is expected on player profiles so imports and player matching can stay reliable over time. Hero data is
                tracked explicitly, and unknown hero values are treated as something to clean up rather than silently ignored.
              </p>
            </DocSection>

            <DocSection id="dashboard" title="Home Dashboard">
              <p>
                Home is the player workspace. It summarizes win rate, record, matches, events, best finishes, recent form,
                tournament performance, On This Day memories, recent events, opponents, and dashboard filters.
              </p>
              <p>
                The Home section also links to Matches, Events, Opponents, Trends, and Tournament Stats for deeper review.
              </p>
            </DocSection>

            <DocSection id="profiles" title="Profiles">
              <p>
                Player profiles show public stats, profile photo, team badge, hero shield, kudos, trophies, armory garden,
                leaderboard placements, pinned cards, showcase cards, and achievements. Owners can customize profile details,
                badge strip selections, visibility, card borders, and social links from Settings or the profile editor.
              </p>
              <p>
                Share cards let players turn profile stats, best finishes, placement results, tournament stats, Versus results,
                and game results into images for Discord, X, or local download.
              </p>
            </DocSection>

            <DocSection id="meta" title="Meta">
              <p>
                Meta aggregates public player data to show hero play rate, win rate, event performance, and matchup trends.
                Rankings provide community leaderboards across match volume, wins, win rate, streaks, byes, kudos, events,
                hero completion, and time-windowed performance.
              </p>
              <p>
                Matchup Matrix focuses on hero-vs-hero performance. Use it to find broad trends, then use your own dashboard
                and Versus tools to compare personal results.
              </p>
            </DocSection>

            <DocSection id="community" title="Community">
              <p>
                Community contains teams and friends. Teams can show aggregate stats, roster information, team icons, trophy
                cases, recent accomplishments, and shareable team cards. Friends make it easier to revisit profiles and follow
                activity from players you care about.
              </p>
              <p>
                Player search is available in the sidebar and mobile header, so the Community section no longer needs a separate
                search link.
              </p>
            </DocSection>

            <DocSection id="extras" title="Extras">
              <p>
                Extras contains the useful tools that do not belong to the main tracking flow: Daily Games, Achievements,
                Versus, Docs, and Changelog.
              </p>
              <div className="flex flex-wrap gap-2">
                {gameLinks.map(([href, label]) => (
                  <Link key={href} href={href} className="rounded-lg border border-fab-border bg-fab-surface px-3 py-1.5 text-xs font-semibold text-fab-muted transition-colors hover:border-fab-gold/30 hover:text-fab-text">
                    {label}
                  </Link>
                ))}
              </div>
            </DocSection>

            <DocSection id="achievements" title="Achievements">
              <p>
                Achievements unlock from match volume, wins, streaks, hero mastery, hero exploration, event results, kudos,
                daily games, and special site moments. They appear on player profiles and can be pinned as profile badges.
              </p>
              <p>
                The <Link href="/achievements" className="text-fab-gold hover:underline">Achievements page</Link> lists the
                catalog so players can see what exists before they unlock it.
              </p>
            </DocSection>

            <DocSection id="support" title="Support">
              <p>
                Support now owns the outward-facing community and help links: Join Discord, Add Discord Bot, Follow on X,
                Shop Amazon, Shop TCGplayer, and Send Feedback. The old standalone Social section was removed to keep the
                sidebar clearer.
              </p>
              <p>
                Shopping links may use affiliate tags. They are optional and are grouped under Support because they help fund
                the site without changing any core feature.
              </p>
            </DocSection>

            <DocSection id="privacy" title="Privacy">
              <p>
                Profiles can be public, friends-only, or private. Public profiles can appear in search, rankings, and community
                surfaces. Friends-only profiles are visible to accepted friends. Private profiles are visible only to the owner.
              </p>
              <p>
                Opponent names are handled carefully. Public profile views avoid exposing private opponent data unless that
                opponent has opted into visibility.
              </p>
            </DocSection>

            <DocSection id="settings" title="Settings">
              <p>
                Settings contains profile photo, profile info, GEM ID, appearance, privacy, feedback, changelog access, data
                export, match data clearing, account deletion, and sign out. Appearance currently supports Rosetta, Daylight,
                and Leyline, with Rosetta as the default app skin.
              </p>
            </DocSection>

            <DocSection id="discord-bot" title="Discord Bot">
              <p>
                The Discord bot can look up player stats, recent matches, hero records, opponents, leaderboards, community meta,
                and comparison views from Discord. Server owners can also use weekly armory recap features.
              </p>
              <div className="flex flex-wrap gap-2">
                <a href="https://discord.com/oauth2/authorize?client_id=1478583612537573479&permissions=0&scope=bot+applications.commands" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-fab-border bg-fab-surface px-3 py-1.5 text-xs font-semibold text-fab-muted transition-colors hover:border-fab-gold/30 hover:text-fab-text">
                  Add Discord Bot
                </a>
                <a href="https://discord.gg/WPP5aqCUHY" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-fab-border bg-fab-surface px-3 py-1.5 text-xs font-semibold text-fab-muted transition-colors hover:border-fab-gold/30 hover:text-fab-text">
                  Join Discord
                </a>
              </div>
            </DocSection>

            <DocSection id="technical-notes" title="Technical Notes">
              <p>
                FaB Stats is a static Next.js app backed by Firebase and Firestore. User data loads client-side, leaderboard
                aggregates are denormalized for faster reads, and the extension zip is generated during the production build.
              </p>
              <p>
                Dynamic profile and team routes use static shells with client-side data loading, while share and social preview
                systems generate richer images and metadata for external platforms.
              </p>
            </DocSection>
          </div>

          <div className="mt-14 border-t border-fab-border pt-6 text-center">
            <a href="#" className="text-xs text-fab-muted transition-colors hover:text-fab-text">
              Back to top
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-3 border-b border-fab-border pb-2 text-xl font-semibold text-fab-text">{title}</h2>
      <div className="space-y-3 text-sm leading-6 text-fab-muted">{children}</div>
    </section>
  );
}

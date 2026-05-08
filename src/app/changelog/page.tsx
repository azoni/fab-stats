import type { Metadata } from "next";
import { SparklesIcon } from "@/components/icons/NavIcons";

export const metadata: Metadata = {
  title: "Changelog",
  description: "FaB Stats changelog with recent navigation, design, feature, and cleanup updates.",
};

type ChangeType = "new" | "improved" | "fixed";

interface Change {
  type: ChangeType;
  text: string;
}

interface Entry {
  date: string;
  id: string;
  changes: Change[];
}

const badgeStyles: Record<ChangeType, { bg: string; dot: string }> = {
  new: { bg: "bg-fab-win/15 text-fab-win", dot: "bg-fab-win" },
  improved: { bg: "bg-fab-gold/15 text-fab-gold", dot: "bg-fab-gold" },
  fixed: { bg: "bg-fab-loss/15 text-fab-loss", dot: "bg-fab-loss" },
};

const badgeLabels: Record<ChangeType, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

const changelog: Entry[] = [
  {
    date: "May 2026",
    id: "may-2026",
    changes: [
      { type: "improved", text: "Sidebar navigation simplified into Home, Meta, Community, Support, and Extras." },
      { type: "improved", text: "Social links moved into Support above the shop links to make the sidebar less confusing." },
      { type: "new", text: "Extras now contains Daily Games, Achievements, Versus, Docs, and Changelog." },
      { type: "new", text: "Achievements catalog page added so players can browse match, mastery, game, kudos, and special badges." },
      { type: "improved", text: "Profile menu cleaned up by removing Import, Daily Games, and Sign Out. Sign out remains in Settings." },
      { type: "improved", text: "Docs refreshed to match the current site structure and explain what each section offers." },
      { type: "improved", text: "Rosetta is the default visual direction, Grimoire was removed from appearance options, and Daylight readability was repaired." },
      { type: "improved", text: "Compact desktop sidebar now hides child links on tighter screens and uses the section subnav instead." },
    ],
  },
  {
    date: "Spring 2026",
    id: "spring-2026",
    changes: [
      { type: "new", text: "Friends page and profile menu access added so players can view friends, requests, and favorites more easily." },
      { type: "new", text: "Support page added with feedback, affiliate links, Discord, Discord bot, and X links." },
      { type: "improved", text: "Dashboard and public home received a visual polish pass with warmer Rosetta colors and cleaner card styling." },
      { type: "improved", text: "Profile background handling adjusted for the sidebar layout so profile art fills the content area more naturally." },
      { type: "improved", text: "Search results now support richer player and team rows, including profile images where available." },
      { type: "improved", text: "Settings were simplified by removing teams/groups settings, profile background chooser, extra themes, featured creators, and redundant data actions." },
      { type: "fixed", text: "Admin page performance improved by removing unused activity, poll, social, sitemap, and showcase management sections." },
    ],
  },
  {
    date: "March 2026",
    id: "march-2026",
    changes: [
      { type: "new", text: "Teams added with public team pages, roster stats, icons, backgrounds, roles, trophy cases, and shareable team cards." },
      { type: "new", text: "Hero Data Shield badges added to show how complete a player's hero data is." },
      { type: "new", text: "Kudos, friends-only profiles, profile showcase cards, and docs search added." },
      { type: "new", text: "Daily game suite expanded with FaBdoku, Crossword, Hero Guesser, Matchup Mania, Connections, Timeline, Trivia, Brute games, Ninja games, and word games." },
      { type: "improved", text: "Performance improved through memoized dashboard components, lazy listeners, lighter assets, and more focused admin queries." },
      { type: "fixed", text: "Share card capture, profile images, achievement tooltips, and game puzzle validation received stability fixes." },
    ],
  },
  {
    date: "February 2026",
    id: "february-2026",
    changes: [
      { type: "new", text: "Core match tracking launched with GEM imports, match history, event tracking, opponent records, profile pages, and leaderboards." },
      { type: "new", text: "Achievements, hero mastery, best finish cards, On This Day, trophy case, armory garden, and profile share cards added." },
      { type: "new", text: "Versus page, rivalry cards, activity feed, favorite players, public/private profiles, and Discord bot features added." },
      { type: "improved", text: "Byes, playoff detection, event type detection, venue parsing, and weekly/monthly rankings were refined." },
      { type: "fixed", text: "Import parsing, public profile permissions, social preview metadata, and timezone handling received early fixes." },
    ],
  },
];

function countByType(changes: Change[], type: ChangeType): number {
  return changes.filter((change) => change.type === type).length;
}

export default function ChangelogPage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-inset ring-amber-500/20">
          <SparklesIcon className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight text-fab-text">Changelog</h1>
          <p className="text-xs leading-tight text-fab-muted">Current and recent changes in FaB Stats</p>
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl gap-10">
        <nav className="hidden max-h-[calc(100vh-6rem)] w-48 shrink-0 self-start overflow-y-auto lg:sticky lg:top-20 lg:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-fab-muted">Releases</p>
          <ul className="space-y-1">
            {changelog.map((entry) => (
              <li key={entry.id}>
                <a href={`#${entry.id}`} className="block py-0.5 text-sm text-fab-muted transition-colors hover:text-fab-text">
                  {entry.date}
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-fab-border pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fab-muted">Legend</p>
            <div className="space-y-1.5">
              {(["new", "improved", "fixed"] as ChangeType[]).map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${badgeStyles[type].dot}`} />
                  <span className="text-xs text-fab-dim">{badgeLabels[type]}</span>
                </div>
              ))}
            </div>
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          <div>
            {changelog.map((entry, entryIdx) => {
              const newCount = countByType(entry.changes, "new");
              const improvedCount = countByType(entry.changes, "improved");
              const fixedCount = countByType(entry.changes, "fixed");

              return (
                <section key={entry.id} id={entry.id} className="relative pb-10">
                  {entryIdx < changelog.length - 1 && (
                    <div className="absolute bottom-0 left-[7px] top-[28px] hidden w-px bg-fab-border sm:block" />
                  )}

                  <div className="mb-4 flex items-start gap-4">
                    <div className="z-10 mt-1 hidden h-[15px] w-[15px] shrink-0 rounded-full border-2 border-fab-gold bg-fab-bg sm:flex" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <h2 className="text-xl font-semibold text-fab-text">{entry.date}</h2>
                        <div className="flex gap-1.5">
                          {newCount > 0 && <SummaryPill type="new" count={newCount} />}
                          {improvedCount > 0 && <SummaryPill type="improved" count={improvedCount} />}
                          {fixedCount > 0 && <SummaryPill type="fixed" count={fixedCount} />}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sm:ml-[31px]">
                    <div className="overflow-hidden rounded-lg border border-fab-border bg-fab-surface">
                      <div className="divide-y divide-fab-border">
                        {entry.changes.map((change, index) => (
                          <div key={index} className="flex items-start gap-3 px-4 py-2.5">
                            <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${badgeStyles[change.type].bg}`}>
                              {badgeLabels[change.type]}
                            </span>
                            <span className="text-sm leading-relaxed text-fab-muted">{change.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <div className="mt-4 border-t border-fab-border pt-6 text-center">
            <a href="#" className="text-xs text-fab-muted transition-colors hover:text-fab-text">
              Back to top
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryPill({ type, count }: { type: ChangeType; count: number }) {
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badgeStyles[type].bg}`}>
      {count} {type}
    </span>
  );
}

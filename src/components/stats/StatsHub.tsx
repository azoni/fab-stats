"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { MatchesTab } from "./MatchesTab";
import { EventsTab } from "./EventsTab";
import { OpponentsTab } from "./OpponentsTab";
import { SwordsIcon, CalendarIcon, OpponentsIcon } from "@/components/icons/NavIcons";

const TABS = [
  { id: "matches" as const, label: "Matches", path: "/matches", Icon: SwordsIcon, color: "red" },
  { id: "events" as const, label: "Events", path: "/events", Icon: CalendarIcon, color: "blue" },
  { id: "opponents" as const, label: "Opponents", path: "/opponents", Icon: OpponentsIcon, color: "purple" },
];

interface StatsHubProps {
  defaultTab: "matches" | "events" | "opponents";
  showTabs?: boolean;
}

export function StatsHub({ defaultTab, showTabs = true }: StatsHubProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { matches, isLoaded, updateMatch, deleteMatch, refreshMatches, batchUpdateHero, batchUpdateFormat, batchUpdateEventType, batchUpdateDay2, batchDeleteMatches } = useMatches();
  const { user, profile } = useAuth();
  const [hideOpponentNames, setHideOpponentNames] = useState(false);
  const [privacyPrefLoaded, setPrivacyPrefLoaded] = useState(false);

  // Determine active tab from current pathname (handles direct navigation)
  const activeTab = TABS.find((t) => t.path === pathname)?.id ?? defaultTab;
  const showPrivacyToggle = activeTab === "matches" || activeTab === "events";
  const privacyControl: ReactNode = showPrivacyToggle && matches.length > 0 ? (
    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-fab-border/80 bg-fab-surface/80 px-3 text-xs font-semibold text-fab-muted transition-colors hover:border-fab-gold/40 hover:text-fab-text">
      <input
        type="checkbox"
        checked={hideOpponentNames}
        onChange={(e) => setHideOpponentNames(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-fab-border bg-fab-bg accent-fab-gold"
      />
      Hide opponent names
    </label>
  ) : null;

  useEffect(() => {
    setHideOpponentNames(window.localStorage.getItem("fab-stats-hide-opponent-names") === "true");
    setPrivacyPrefLoaded(true);
  }, []);

  useEffect(() => {
    if (!privacyPrefLoaded) return;
    window.localStorage.setItem("fab-stats-hide-opponent-names", String(hideOpponentNames));
  }, [hideOpponentNames, privacyPrefLoaded]);

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        {/* Tab bar skeleton */}
        <div className="flex gap-1 bg-fab-surface/50 border border-fab-border rounded-lg p-1">
          {TABS.map((tab) => (
            <div key={tab.id} className={`flex-1 h-9 rounded-md ${tab.id === defaultTab ? "bg-fab-surface" : ""} animate-pulse`} />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-fab-surface rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Tab bar */}
      {showTabs && <div className="flex gap-1 bg-fab-surface/50 border border-fab-border rounded-lg p-1 mb-6">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (!isActive) router.push(tab.path);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-fab-surface text-fab-text shadow-sm"
                  : "text-fab-muted hover:text-fab-text"
              }`}
            >
              <tab.Icon className={`w-3.5 h-3.5 ${isActive ? `text-${tab.color}-400` : ""}`} />
              {tab.label}
            </button>
          );
        })}
      </div>}

      {/* Tab content */}
      {activeTab === "matches" && (
        <MatchesTab matches={matches} user={user} profile={profile} updateMatch={updateMatch} deleteMatch={deleteMatch} hideOpponentNames={hideOpponentNames} privacyControl={privacyControl} />
      )}
      {activeTab === "events" && (
        <EventsTab
          matches={matches}
          user={user}
          profile={profile}
          updateMatch={updateMatch}
          deleteMatch={deleteMatch}
          refreshMatches={refreshMatches}
          batchUpdateHero={batchUpdateHero}
          batchUpdateFormat={batchUpdateFormat}
          batchUpdateEventType={batchUpdateEventType}
          batchUpdateDay2={batchUpdateDay2}
          batchDeleteMatches={batchDeleteMatches}
          hideOpponentNames={hideOpponentNames}
          privacyControl={privacyControl}
        />
      )}
      {activeTab === "opponents" && (
        <OpponentsTab matches={matches} user={user} profile={profile} updateMatch={updateMatch} deleteMatch={deleteMatch} />
      )}
    </div>
  );
}

"use client";
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
}

export function StatsHub({ defaultTab }: StatsHubProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { matches, isLoaded, updateMatch, refreshMatches, batchUpdateHero, batchUpdateFormat, batchUpdateEventType, batchDeleteMatches } = useMatches();
  const { user, profile } = useAuth();

  // Determine active tab from current pathname (handles direct navigation)
  const activeTab = TABS.find((t) => t.path === pathname)?.id ?? defaultTab;

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
      <div className="flex gap-1 bg-fab-surface/50 border border-fab-border rounded-lg p-1 mb-6">
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
      </div>

      {/* Tab content */}
      {activeTab === "matches" && (
        <MatchesTab matches={matches} user={user} profile={profile} updateMatch={updateMatch} />
      )}
      {activeTab === "events" && (
        <EventsTab
          matches={matches}
          user={user}
          profile={profile}
          updateMatch={updateMatch}
          refreshMatches={refreshMatches}
          batchUpdateHero={batchUpdateHero}
          batchUpdateFormat={batchUpdateFormat}
          batchUpdateEventType={batchUpdateEventType}
          batchDeleteMatches={batchDeleteMatches}
        />
      )}
      {activeTab === "opponents" && (
        <OpponentsTab matches={matches} user={user} profile={profile} updateMatch={updateMatch} />
      )}
    </div>
  );
}

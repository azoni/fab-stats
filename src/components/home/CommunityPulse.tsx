"use client";

interface CommunityPulseProps {
  userCount: number;
  matchCount: number;
  activeThisWeek: number;
}

export function CommunityPulse({ userCount, matchCount, activeThisWeek }: CommunityPulseProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4 text-center">
        <p className="text-2xl font-bold text-fab-text">{userCount.toLocaleString()}</p>
        <p className="text-xs text-fab-muted mt-1">Players</p>
      </div>
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4 text-center">
        <p className="text-2xl font-bold text-fab-text">{matchCount.toLocaleString()}</p>
        <p className="text-xs text-fab-muted mt-1">Matches Tracked</p>
      </div>
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4 text-center">
        <p className="text-2xl font-bold text-fab-text">{activeThisWeek.toLocaleString()}</p>
        <p className="text-xs text-fab-muted mt-1">Active This Week</p>
      </div>
    </div>
  );
}

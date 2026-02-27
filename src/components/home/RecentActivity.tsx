"use client";
import Link from "next/link";
import { GroupedFeedCard, groupConsecutiveEvents } from "@/components/feed/FeedCard";
import type { FeedEvent } from "@/types";

interface RecentActivityProps {
  events: FeedEvent[];
}

export function RecentActivity({ events }: RecentActivityProps) {
  if (events.length === 0) return null;

  const groups = groupConsecutiveEvents(events).slice(0, 4);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="section-header flex-1">
          <h2 className="text-lg font-semibold text-fab-text">Recent Activity</h2>
        </div>
        <Link href="/search" className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors ml-3">
          View All
        </Link>
      </div>
      <div className="space-y-1.5">
        {groups.map((group) => (
          <GroupedFeedCard key={group.events[0].id} group={group} compact />
        ))}
      </div>
    </div>
  );
}

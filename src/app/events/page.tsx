"use client";
import { HomeTabs } from "@/components/home/HomeTabs";
import { StatsHub } from "@/components/stats/StatsHub";

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <HomeTabs />
      <StatsHub defaultTab="events" showTabs={false} />
    </div>
  );
}

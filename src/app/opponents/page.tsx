"use client";
import { HomeTabs } from "@/components/home/HomeTabs";
import { StatsHub } from "@/components/stats/StatsHub";

export default function OpponentsPage() {
  return (
    <div className="space-y-6">
      <HomeTabs />
      <StatsHub defaultTab="opponents" showTabs={false} />
    </div>
  );
}

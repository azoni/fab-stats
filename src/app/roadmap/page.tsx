import type { Metadata } from "next";
import { MapIcon } from "@/components/icons/NavIcons";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "Planned features, improvements, and fixes for FaB Stats.",
};

type Status = "planned" | "in-progress" | "done";

interface RoadmapItem {
  title: string;
  description?: string;
  status: Status;
}

const items: RoadmapItem[] = [
  {
    title: "Hero Data Shield badges",
    description: "5-tier shield badge (Gold/Purple/Red/Blue/Bronze) next to player names everywhere, showing hero data completion percentage. Required hero selection for imports from Feb 24, 2026 onward.",
    status: "done",
  },
  {
    title: "Sitewide performance optimization",
    description: "Single-pass stats, batched Firebase writes, lazy listeners, React.memo, WebP assets, CSS animations replacing framer-motion. ~38MB asset savings.",
    status: "done",
  },
  {
    title: "Visual data overhaul — charts across all pages",
    description: "WinRateRing, MiniDonut, SegmentedBar, SparkLine, and RadarChart components added to Dashboard, Meta, Matches, Leaderboard, Tier List, Versus, Goals, and Share Stats pages.",
    status: "done",
  },
  {
    title: "Player profile visual upgrade",
    description: "Add win rate ring, hero distribution donut, and W/L/D segmented bar to public player profiles.",
    status: "planned",
  },
  {
    title: "Import page visual summary",
    description: "Pre-import W/L/D donut and post-import session win rate ring for import batches.",
    status: "planned",
  },
  {
    title: "Tournaments page hero distribution",
    description: "MiniDonut showing hero distribution in each tournament's top 8 results.",
    status: "planned",
  },
];

const statusConfig: Record<Status, { label: string; color: string; bg: string }> = {
  planned: { label: "Planned", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/25" },
  "in-progress": { label: "In Progress", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/25" },
  done: { label: "Done", color: "text-green-400", bg: "bg-green-400/10 border-green-400/25" },
};

export default function RoadmapPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center ring-1 ring-inset ring-blue-500/20">
          <MapIcon className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-fab-text leading-tight">Roadmap</h1>
          <p className="text-xs text-fab-muted leading-tight">Planned features, improvements, and fixes</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const cfg = statusConfig[item.status];
          return (
            <div
              key={item.title}
              className="p-4 rounded-lg bg-fab-surface border border-fab-border"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fab-text">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-fab-muted mt-1">{item.description}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg}`}
                >
                  {cfg.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {items.filter((i) => i.status === "done").length === 0 && items.length > 0 && (
        <p className="text-xs text-fab-dim mt-8 text-center">
          No completed items yet — check back soon!
        </p>
      )}
    </div>
  );
}

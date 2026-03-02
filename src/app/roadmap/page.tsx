import type { Metadata } from "next";

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
    title: "Improve hero detection for non-extension imports",
    description: "Better hero matching when importing via paste or CSV without the Chrome Extension.",
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
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-fab-gold mb-2">Roadmap</h1>
      <p className="text-sm text-fab-muted mb-10">
        Planned features, improvements, and fixes. Items are added and removed as development progresses.
      </p>

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

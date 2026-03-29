"use client";
import { TROPHY_DESIGNS, isDesignUnlocked, getSelectedDesign } from "@/lib/trophy-designs";
import { renderTrophyDesign } from "./TrophyCase";
import { Lock } from "lucide-react";

interface TrophyDesignPickerProps {
  trophyDesigns?: Record<string, number>;
  isAdmin?: boolean;
  onSelect: (eventType: string, index: number) => void;
  onClose: () => void;
  highlightEventType?: string | null;
}

const EVENT_ORDER = [
  "Worlds", "Pro Tour", "Nationals", "The Calling", "Battle Hardened",
  "Showdown", "Battlegrounds",
  "ProQuest", "Road to Nationals", "Skirmish",
  "Championship", "Other",
];

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  "Worlds": { label: "Professional", color: "text-amber-400" },
  "Showdown": { label: "Competitive", color: "text-blue-400" },
  "ProQuest": { label: "Qualifier", color: "text-emerald-400" },
  "Championship": { label: "Other", color: "text-fab-dim" },
};

const TIER_BREAKS = new Set(["Worlds", "Showdown", "ProQuest", "Championship"]);

export function TrophyDesignPicker({ trophyDesigns, isAdmin, onSelect, onClose, highlightEventType }: TrophyDesignPickerProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl max-w-2xl w-full mx-4 p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-fab-text">Customize Trophy Designs</h3>
          <button onClick={onClose} className="text-fab-dim hover:text-fab-muted transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {EVENT_ORDER.map((eventType) => {
            const designs = TROPHY_DESIGNS[eventType];
            if (!designs) return null;
            const selectedIndex = getSelectedDesign(eventType, trophyDesigns);
            const tierLabel = TIER_BREAKS.has(eventType) ? TIER_LABELS[eventType] : null;

            return (
              <div key={eventType}>
                {tierLabel && (
                  <div className="flex items-center gap-2 mb-2 mt-1">
                    <span className={`text-[9px] font-semibold uppercase tracking-wider ${tierLabel.color}`}>{tierLabel.label}</span>
                    <div className="flex-1 h-px bg-fab-border" />
                  </div>
                )}
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    highlightEventType === eventType ? "border-fab-gold/40 bg-fab-gold/5" : "border-fab-border bg-fab-bg/50"
                  }`}
                  id={`trophy-pick-${eventType}`}
                >
                  {/* Event name */}
                  <div className="w-28 shrink-0">
                    <p className="text-xs font-semibold text-fab-text">{eventType}</p>
                  </div>

                  {/* 3 design options */}
                  <div className="flex gap-2 flex-1">
                    {designs.map((design) => {
                      const unlocked = isDesignUnlocked(design.index, isAdmin);
                      const isSelected = selectedIndex === design.index;

                      return (
                        <button
                          key={design.id}
                          onClick={() => { if (unlocked) onSelect(eventType, design.index); }}
                          className={`relative flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all flex-1 min-w-0 ${
                            isSelected
                              ? "border-fab-gold ring-1 ring-fab-gold/30 bg-fab-gold/5"
                              : unlocked
                                ? "border-fab-border hover:border-fab-muted bg-fab-bg"
                                : "border-fab-border bg-fab-bg cursor-not-allowed"
                          }`}
                        >
                          <div className={`flex items-center justify-center h-12 ${!unlocked ? "filter blur-[3px] brightness-75" : ""}`}>
                            {renderTrophyDesign(eventType, design.index, "champion", `picker-${design.id}`, 0)}
                          </div>

                          {!unlocked && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg">
                              <div className="w-6 h-6 rounded-full bg-fab-bg/80 border border-fab-border flex items-center justify-center">
                                <Lock className="w-3 h-3 text-fab-dim" />
                              </div>
                            </div>
                          )}

                          <span className={`text-[9px] font-medium truncate w-full text-center ${isSelected ? "text-fab-gold" : unlocked ? "text-fab-muted" : "text-fab-dim"}`}>
                            {design.label}
                          </span>

                          {isSelected && (
                            <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-fab-gold flex items-center justify-center">
                              <svg className="w-2 h-2 text-fab-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-fab-dim text-center mt-4">
          Additional designs can be unlocked through achievements
        </p>
      </div>
    </div>
  );
}

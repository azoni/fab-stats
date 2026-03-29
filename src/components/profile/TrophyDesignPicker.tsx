"use client";
import { TROPHY_DESIGNS, isDesignUnlocked } from "@/lib/trophy-designs";
import { renderTrophyDesign } from "./TrophyCase";
import { Lock } from "lucide-react";

interface TrophyDesignPickerProps {
  eventType: string;
  selectedIndex: number;
  isAdmin?: boolean;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export function TrophyDesignPicker({ eventType, selectedIndex, isAdmin, onSelect, onClose }: TrophyDesignPickerProps) {
  const designs = TROPHY_DESIGNS[eventType];
  if (!designs) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl max-w-sm w-full mx-4 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-fab-text">{eventType} Trophy Design</h3>
          <button onClick={onClose} className="text-fab-dim hover:text-fab-muted transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {designs.map((design) => {
            const unlocked = isDesignUnlocked(design.index, isAdmin);
            const isSelected = selectedIndex === design.index;

            return (
              <button
                key={design.id}
                onClick={() => { if (unlocked) onSelect(design.index); }}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                  isSelected
                    ? "border-fab-gold ring-1 ring-fab-gold/30 bg-fab-gold/5"
                    : unlocked
                      ? "border-fab-border hover:border-fab-muted bg-fab-bg"
                      : "border-fab-border bg-fab-bg cursor-not-allowed"
                }`}
              >
                {/* Trophy preview */}
                <div className={`flex items-center justify-center h-16 ${!unlocked ? "filter blur-[3px] brightness-75" : ""}`}>
                  {renderTrophyDesign(eventType, design.index, "champion", `picker-${design.id}`, 0)}
                </div>

                {/* Lock overlay */}
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-fab-bg/80 border border-fab-border flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5 text-fab-dim" />
                    </div>
                  </div>
                )}

                {/* Label */}
                <span className={`text-[10px] font-medium ${isSelected ? "text-fab-gold" : unlocked ? "text-fab-muted" : "text-fab-dim"}`}>
                  {design.label}
                </span>

                {isSelected && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-fab-gold flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-fab-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-fab-dim text-center mt-3">
          Additional designs can be unlocked through achievements
        </p>
      </div>
    </div>
  );
}

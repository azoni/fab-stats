"use client";
import { useState } from "react";
import { EMBLEMS } from "@/lib/emblems";
import { EMBLEM_COMPONENTS, EMBLEM_COLORS } from "./EmblemIcons";

interface EmblemPickerProps {
  currentEmblemId?: string | null;
  onSelect: (emblemId: string | null) => Promise<void>;
  onClose: () => void;
}

export function EmblemPicker({ currentEmblemId, onSelect, onClose }: EmblemPickerProps) {
  const [selected, setSelected] = useState<string | null>(currentEmblemId || null);
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-lg p-5 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-fab-gold">Choose Your Emblem</h2>
          <button onClick={onClose} className="text-fab-dim hover:text-fab-text transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {EMBLEMS.map((emblem) => {
            const EmblemIcon = EMBLEM_COMPONENTS[emblem.id];
            const colors = EMBLEM_COLORS[emblem.id];
            if (!EmblemIcon) return null;
            return (
              <button
                key={emblem.id}
                onClick={() => setSelected(emblem.id)}
                className={`p-3 rounded-lg border text-center transition-all ${
                  selected === emblem.id
                    ? "border-fab-gold bg-fab-gold/10 shadow-[0_0_12px_rgba(201,168,76,0.15)]"
                    : "border-fab-border hover:border-fab-muted"
                }`}
              >
                <div className={`flex justify-center mb-2 ${colors?.text || ""}`}>
                  <EmblemIcon className="w-12 h-12" />
                </div>
                <p className="text-xs font-semibold text-fab-text">{emblem.name}</p>
                <p className="text-[10px] text-fab-dim leading-tight mt-0.5">{emblem.description}</p>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setSelected(null)}
            className={`text-xs transition-colors ${selected === null ? "text-fab-muted" : "text-fab-dim hover:text-fab-muted"}`}
          >
            Remove Emblem
          </button>
          <button
            onClick={async () => {
              setSaving(true);
              await onSelect(selected);
              onClose();
            }}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

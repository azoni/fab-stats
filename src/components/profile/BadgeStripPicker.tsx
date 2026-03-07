"use client";
import { useState, useMemo } from "react";
import { AchievementIcon } from "@/components/gamification/AchievementIcons";
import { rarityColors } from "@/lib/achievements";
import { RARITY_VISUALS } from "@/lib/badge-tiers";
import { BadgeTierWrapper } from "./BadgeTierWrapper";
import { Ban } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import type { Achievement } from "@/types";

interface BadgeStripPickerProps {
  earnedAchievements: Achievement[];
  currentSelectedIds: string[];
  onSave: (ids: string[]) => Promise<void>;
  onClose: () => void;
}

const RARITY_ORDER: Record<string, number> = {
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

export function BadgeStripPicker({ earnedAchievements, currentSelectedIds, onSave, onClose }: BadgeStripPickerProps) {
  const [selected, setSelected] = useState<string[]>([...currentSelectedIds]);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => {
    return [...earnedAchievements].sort((a, b) => {
      const ra = RARITY_ORDER[a.rarity] ?? 0;
      const rb = RARITY_ORDER[b.rarity] ?? 0;
      if (ra !== rb) return rb - ra;
      return a.name.localeCompare(b.name);
    });
  }, [earnedAchievements]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function clearAll() {
    setSelected([]);
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }} title="Select Badges" description={`${selected.length} badge${selected.length !== 1 ? "s" : ""} selected`} className="max-w-lg">
      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[55vh] overflow-y-auto pr-1">
        {/* Clear all option */}
        <button
          onClick={clearAll}
          className={`p-2 rounded-lg border text-center transition-all ${
            selected.length === 0
              ? "border-fab-gold bg-fab-gold/10"
              : "border-fab-border hover:border-fab-muted"
          }`}
        >
          <div className="flex justify-center mb-1 text-fab-dim">
            <Ban className="w-8 h-8" />
          </div>
          <p className="text-[10px] font-semibold text-fab-dim leading-tight">Clear All</p>
        </button>

        {sorted.map((ach) => {
          const isSelected = selected.includes(ach.id);
          const colors = rarityColors[ach.rarity];
          const visual = RARITY_VISUALS[ach.rarity] || RARITY_VISUALS.common;

          return (
            <button
              key={ach.id}
              onClick={() => toggle(ach.id)}
              className={`p-2 rounded-lg border text-center transition-all ${
                isSelected
                  ? "border-fab-gold bg-fab-gold/10 shadow-[0_0_12px_rgba(201,168,76,0.15)]"
                  : `${colors.border} hover:border-fab-muted`
              }`}
            >
              <div className="flex justify-center mb-1">
                <BadgeTierWrapper visual={visual} size="md">
                  <div style={{ color: visual.ringColor }}>
                    <AchievementIcon icon={ach.icon} className="w-6 h-6" />
                  </div>
                </BadgeTierWrapper>
              </div>
              <p className={`text-[10px] font-semibold leading-tight truncate ${isSelected ? "text-fab-gold" : colors.text}`}>
                {ach.name}
              </p>
              <p className="text-[8px] text-fab-dim truncate">{ach.description}</p>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-sm text-fab-dim hover:text-fab-text transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            setSaving(true);
            await onSave(selected);
            onClose();
          }}
          disabled={saving}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </Dialog>
  );
}

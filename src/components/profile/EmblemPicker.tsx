"use client";
import { useState } from "react";
import { TALENT_EMBLEMS, CLASS_EMBLEMS } from "@/lib/emblems";
import { EMBLEM_COMPONENTS, EMBLEM_COLORS } from "./EmblemIcons";
import { Ban } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

interface EmblemPickerProps {
  mode: "talent" | "class";
  currentEmblemId?: string | null;
  onSelect: (emblemId: string | null) => Promise<void>;
  onClose: () => void;
}

export function EmblemPicker({ mode, currentEmblemId, onSelect, onClose }: EmblemPickerProps) {
  const [selected, setSelected] = useState<string | null>(currentEmblemId || null);
  const [saving, setSaving] = useState(false);

  const emblems = mode === "talent" ? TALENT_EMBLEMS : CLASS_EMBLEMS;
  const title = mode === "talent" ? "Choose Talent Emblem" : "Choose Class Emblem";

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }} title={title}>
      {/* Grid */}
      <div className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto pr-1">
        {/* None / clear option */}
        <button
          onClick={() => setSelected(null)}
          className={`p-2 rounded-lg border text-center transition-all ${
            selected === null
              ? "border-fab-gold bg-fab-gold/10 shadow-[0_0_12px_rgba(201,168,76,0.15)]"
              : "border-fab-border hover:border-fab-muted"
          }`}
        >
          <div className="flex justify-center mb-1 text-fab-dim">
            <Ban className="w-10 h-10" />
          </div>
          <p className="text-[10px] font-semibold text-fab-dim leading-tight">None</p>
        </button>
        {emblems.map((emblem) => {
          const EmblemIcon = EMBLEM_COMPONENTS[emblem.id];
          const colors = EMBLEM_COLORS[emblem.id];
          if (!EmblemIcon) return null;
          return (
            <button
              key={emblem.id}
              onClick={() => setSelected(emblem.id)}
              className={`p-2 rounded-lg border text-center transition-all ${
                selected === emblem.id
                  ? "border-fab-gold bg-fab-gold/10 shadow-[0_0_12px_rgba(201,168,76,0.15)]"
                  : "border-fab-border hover:border-fab-muted"
              }`}
            >
              <div className={`flex justify-center mb-1 ${colors?.text || ""}`}>
                <EmblemIcon className="w-10 h-10" />
              </div>
              <p className="text-[10px] font-semibold text-fab-text leading-tight">{emblem.name}</p>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end mt-4">
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
    </Dialog>
  );
}

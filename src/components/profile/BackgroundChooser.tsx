"use client";
import { buildOptimizedImageUrl, getProfileBackgroundOptions, NONE_BACKGROUND_ID } from "@/lib/profile-backgrounds";

interface BackgroundChooserProps {
  selectedId?: string;
  isAdmin: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function BackgroundChooser({ selectedId, isAdmin, onSelect, disabled }: BackgroundChooserProps) {
  const selected = selectedId || NONE_BACKGROUND_ID;
  const options = getProfileBackgroundOptions(isAdmin);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <button
        type="button"
        onClick={() => onSelect(NONE_BACKGROUND_ID)}
        disabled={disabled}
        className={`rounded-lg p-2 text-left transition-all border ${
          selected === NONE_BACKGROUND_ID
            ? "border-fab-gold ring-1 ring-fab-gold/30"
            : "border-fab-border hover:border-fab-muted"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <div className="h-14 rounded-md overflow-hidden border border-white/10 mb-1.5 relative bg-fab-bg">
          <div className="absolute inset-0 bg-gradient-to-br from-fab-bg via-fab-surface to-fab-bg" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-fab-gold/70" />
        </div>
        <p className="text-[10px] text-fab-muted leading-tight">Default Theme</p>
      </button>

      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onSelect(opt.id)}
          disabled={disabled}
          className={`rounded-lg p-2 text-left transition-all border ${
            selected === opt.id
              ? "border-fab-gold ring-1 ring-fab-gold/30"
              : "border-fab-border hover:border-fab-muted"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          title={opt.label}
        >
          <div className="h-14 rounded-md overflow-hidden border border-white/10 mb-1.5 relative">
            <img
              src={buildOptimizedImageUrl(opt.imageUrl, 320, 46)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              crossOrigin="anonymous"
            />
            <div className="absolute inset-0 bg-black/35" />
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-fab-gold/70" />
          </div>
          <p className="text-[10px] text-fab-muted leading-tight">{opt.label}</p>
        </button>
      ))}
    </div>
  );
}

"use client";
import { EMBLEM_COMPONENTS, EMBLEM_COLORS } from "./EmblemIcons";

interface EmblemDisplayProps {
  emblemId?: string | null;
  isOwner?: boolean;
  onClick?: () => void;
}

export function EmblemDisplay({ emblemId, isOwner, onClick }: EmblemDisplayProps) {
  const EmblemIcon = emblemId ? EMBLEM_COMPONENTS[emblemId] : null;
  const colors = emblemId ? EMBLEM_COLORS[emblemId] : null;

  if (!EmblemIcon && !isOwner) return null;

  if (!EmblemIcon && isOwner) {
    return (
      <button
        onClick={onClick}
        className="w-12 h-12 rounded-full border-2 border-dashed border-fab-border flex items-center justify-center text-fab-dim hover:border-fab-gold/50 hover:text-fab-gold/70 transition-all shrink-0"
        title="Choose an emblem"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    );
  }

  if (!EmblemIcon) return null;

  const content = (
    <div className={`${colors?.text || ""} ${isOwner ? `cursor-pointer ${colors?.glow || ""}` : ""} transition-all shrink-0`}>
      <EmblemIcon className="w-11 h-11" />
    </div>
  );

  if (isOwner) {
    return (
      <button onClick={onClick} title="Change emblem">
        {content}
      </button>
    );
  }

  return content;
}

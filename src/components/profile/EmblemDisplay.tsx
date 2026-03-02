"use client";
import { EMBLEM_COMPONENTS, EMBLEM_COLORS } from "./EmblemIcons";

interface EmblemDisplayProps {
  talentEmblemId?: string | null;
  classEmblemId?: string | null;
  isOwner?: boolean;
  onClick?: () => void;
}

function SingleEmblem({ emblemId, isOwner, onClick }: { emblemId?: string | null; isOwner?: boolean; onClick?: () => void }) {
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

export function EmblemDisplay({ talentEmblemId, classEmblemId, isOwner, onClick }: EmblemDisplayProps) {
  const hasTalent = !!talentEmblemId && !!EMBLEM_COMPONENTS[talentEmblemId];
  const hasClass = !!classEmblemId && !!EMBLEM_COMPONENTS[classEmblemId];

  // Non-owner with no emblems: show nothing
  if (!isOwner && !hasTalent && !hasClass) return null;

  return (
    <div className="flex items-center gap-1 shrink-0">
      <SingleEmblem emblemId={talentEmblemId} isOwner={isOwner} onClick={onClick} />
      <SingleEmblem emblemId={classEmblemId} isOwner={isOwner} onClick={onClick} />
    </div>
  );
}

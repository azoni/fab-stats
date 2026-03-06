/** Inline SVG icons for ninja-combo card types — replaces emoji fallbacks. */

function Kick({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {/* Boot / kick icon */}
      <path d="M4 18h5l3-3 4 1 4-4" />
      <path d="M16 12l-2-6-3 1-2-4" />
      <circle cx="9" cy="4" r="2" />
    </svg>
  );
}

function Punch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {/* Fist icon */}
      <path d="M18 11V6a2 2 0 00-4 0v1" />
      <path d="M14 10V4a2 2 0 00-4 0v2" />
      <path d="M10 10.5V6a2 2 0 00-4 0v8" />
      <path d="M18 8a2 2 0 014 0v6a8 8 0 01-8 8H8a8 8 0 01-2-1" />
    </svg>
  );
}

function Kunai({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {/* Dagger / kunai */}
      <path d="M14.5 3.5L20.5 9.5 10 20l-6-6z" />
      <path d="M8 16l-3.5 3.5" />
      <path d="M15 4l5 5" />
      <path d="M2 22l4-4" />
    </svg>
  );
}

function Special({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      {/* Lightning bolt */}
      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
    </svg>
  );
}

const CARD_TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  kick: Kick,
  punch: Punch,
  kunai: Kunai,
  special: Special,
};

export function CardTypeIcon({ type, className = "w-5 h-5" }: { type: string; className?: string }) {
  const Icon = CARD_TYPE_ICONS[type];
  if (!Icon) return <span>{type}</span>;
  return <Icon className={className} />;
}

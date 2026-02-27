import type { ReactNode } from "react";

const s = "w-full h-full";

const icons: Record<string, ReactNode> = {
  drop: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),
  list: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  ),
  chart: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1" fill="currentColor" fillOpacity="0.15" />
      <rect x="10" y="7" width="4" height="14" rx="1" fill="currentColor" fillOpacity="0.15" />
      <rect x="17" y="3" width="4" height="18" rx="1" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),
  badge: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="7" fill="currentColor" fillOpacity="0.15" />
      <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
      <path d="M12 7v3M10.5 10h3" />
    </svg>
  ),
  medal: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.21 15L2.66 7.14a2 2 0 01.13-2.2L4.4 2.8A2 2 0 016 2h12a2 2 0 011.6.8l1.6 2.14a2 2 0 01.14 2.2L16.79 15" />
      <circle cx="12" cy="17" r="5" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 14l1.12 2.26 2.5.36-1.81 1.76.43 2.49L12 19.77l-2.24 1.1.43-2.49-1.81-1.76 2.5-.36z" fill="currentColor" fillOpacity="0.3" />
    </svg>
  ),
  pillar: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h12M6 20h12" />
      <rect x="8" y="4" width="3" height="16" fill="currentColor" fillOpacity="0.15" />
      <rect x="13" y="4" width="3" height="16" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),
  check: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.15" />
      <path d="M8 12l3 3 5-5" />
    </svg>
  ),
  flame: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c.5 4-3 6-3 10a5 5 0 0010 0c0-4-3.5-6-3-10" fill="currentColor" fillOpacity="0.15" />
      <path d="M10 16a2 2 0 004 0c0-2-2-3-2-5s-2 3-2 5z" fill="currentColor" fillOpacity="0.2" />
    </svg>
  ),
  swords: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6M16 16l4 4" />
      <path d="M9.5 17.5L21 6V3h-3L6.5 14.5" />
      <path d="M11 19l-6-6M8 16l-4 4" />
    </svg>
  ),
  crown: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8l4 12h12l4-12-5 4-5-8-5 8-5-4z" fill="currentColor" fillOpacity="0.15" />
      <circle cx="12" cy="4" r="1" fill="currentColor" />
    </svg>
  ),
  star: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),
  bolt: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),
  gem: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l4 7-10 12L2 10z" fill="currentColor" fillOpacity="0.15" />
      <path d="M2 10h20M12 22L6 3M12 22l6-15M8 10l4-7 4 7" />
    </svg>
  ),
  shield: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L4 7v5c0 5.55 3.41 10.74 8 12 4.59-1.26 8-6.45 8-12V7l-8-5z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),
  target: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
  trophy: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2" />
      <path d="M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2" />
      <path d="M6 3h12v7a6 6 0 01-12 0V3z" fill="currentColor" fillOpacity="0.15" />
      <path d="M9 21h6M12 16v5" />
    </svg>
  ),
  compass: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),
  masks: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8c0-3.5 3.5-5 7-5s7 1.5 7 5-3.5 7-7 7S3 11.5 3 8z" fill="currentColor" fillOpacity="0.1" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
      <path d="M8 11c1 1.5 3 1.5 4 0" />
      <path d="M14 16c0-3.5 3.5-5 7-5" />
      <path d="M14 16c0 3.5 3.5 5 7 5s3-1.5 3-5" />
    </svg>
  ),
  cards: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="12" height="16" rx="2" fill="currentColor" fillOpacity="0.15" />
      <rect x="8" y="2" width="12" height="16" rx="2" fill="currentColor" fillOpacity="0.1" />
      <path d="M6 12l2 2 4-4" />
    </svg>
  ),
  shuffle: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
    </svg>
  ),
  people: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <path d="M17 11a4 4 0 014 4v2" />
    </svg>
  ),
  globe: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
  handshake: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 14l4-4 4 2 4-4 4 2 4-4" />
      <path d="M6 10V4M18 6v6" />
      <path d="M10 16l2 2 4-4" />
    </svg>
  ),
  dove: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8c-3 0-5 2-6 5l-3 1 4 3c2 1 5 0 7-2l4-4c1-1 3-1 4 0" fill="currentColor" fillOpacity="0.1" />
      <path d="M18 4c-2 0-4 2-3 4l1 2" />
    </svg>
  ),
  trending: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  hammer: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 12l-8.5 8.5a2.12 2.12 0 01-3-3L12 9" />
      <path d="M17.64 4.36a4 4 0 00-5.66 0L9 7.34l7.66 7.66 2.98-2.98a4 4 0 000-5.66z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),
  versus: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4l4 8-4 8M18 4l-4 8 4 8" />
      <circle cx="12" cy="12" r="2" fill="currentColor" fillOpacity="0.3" />
    </svg>
  ),
  sword: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6M16 16l4 4" />
    </svg>
  ),
  "star-badge": (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6l1.85 3.76 4.15.6-3 2.93.71 4.14L12 15.4l-3.71 2.03.71-4.14-3-2.93 4.15-.6z" fill="currentColor" fillOpacity="0.2" />
    </svg>
  ),
  infinity: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 100 8c2 0 4-1.33 6-4zm0 0c2 2.67 4 4 6 4a4 4 0 000-8c-2 0-4 1.33-6 4z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),
  horn: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17V7l10 3v4L3 17z" fill="currentColor" fillOpacity="0.15" />
      <path d="M13 10l5-2a2 2 0 012 2v4a2 2 0 01-2 2l-5-2" />
      <circle cx="3" cy="12" r="2" fill="currentColor" fillOpacity="0.2" />
    </svg>
  ),
  flag: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="currentColor" fillOpacity="0.15" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  ),
  // Section header icons
  "section-achievements": (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="7" fill="currentColor" fillOpacity="0.15" />
      <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
      <path d="M12 6l1.12 2.26 2.5.36-1.81 1.76.43 2.49L12 11.77l-2.24 1.1.43-2.49-1.81-1.76 2.5-.36z" fill="currentColor" fillOpacity="0.3" />
    </svg>
  ),
  "section-mastery": (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6M16 16l4 4" />
      <path d="M9.5 17.5L21 6V3h-3L6.5 14.5" />
      <path d="M11 19l-6-6M8 16l-4 4" />
    </svg>
  ),
};

export function AchievementIcon({ icon, className = "w-6 h-6" }: { icon: string; className?: string }) {
  const svg = icons[icon];
  if (!svg) return <div className={className} />;
  return <div className={className}>{svg}</div>;
}

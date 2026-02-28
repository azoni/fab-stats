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
  rocket: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11.5L12 15z" fill="currentColor" fillOpacity="0.15" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  ),
  seedling: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 20h10" />
      <path d="M12 20v-8" />
      <path d="M12 12C12 8 8 4.5 3 5c0 5 3.5 7 9 7z" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 12c0-4 4-7.5 9-7 0 5-3.5 7-9 7z" fill="currentColor" fillOpacity="0.1" />
    </svg>
  ),
  bug: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="6" width="8" height="14" rx="4" fill="currentColor" fillOpacity="0.15" />
      <path d="M8 2l1.88 1.88M16 2l-1.88 1.88M9 6.06A8 8 0 0112 5a8 8 0 013 1.06" />
      <path d="M5 10h2M17 10h2M5 14h2M17 14h2M5 18h2M17 18h2" />
      <path d="M12 6v14" />
    </svg>
  ),
  lightbulb: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 22h4" />
      <path d="M12 2a7 7 0 00-4 12.73V17h8v-2.27A7 7 0 0012 2z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),
  book: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" fill="currentColor" fillOpacity="0.15" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" fill="currentColor" fillOpacity="0.1" />
    </svg>
  ),
  megaphone: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 01-6 6H5l-3-3V5l3-3h7a6 6 0 016 6z" fill="currentColor" fillOpacity="0.15" />
      <path d="M18 8a6 6 0 010 0M21 5c1.5 1.5 1.5 5.5 0 7" />
      <path d="M5 14v4a2 2 0 002 2h1a2 2 0 002-2v-3" />
    </svg>
  ),
  wave: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 11l-1.5-1.5a1.5 1.5 0 012.12-2.12l6.38 6.38a3 3 0 004.24-4.24L14 5.5a1.5 1.5 0 012.12-2.12l3 3a7 7 0 01-9.9 9.9L7 14" fill="currentColor" fillOpacity="0.1" />
      <path d="M4.5 13.5a1.5 1.5 0 010-2.12L7 9M9.5 8.5L7.38 6.38a1.5 1.5 0 012.12-2.12L12 6.76" />
    </svg>
  ),
  butterfly: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12C9 8 4 7 3 11s3 7 9 5" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 12c3-4 8-5 9-1s-3 7-9 5" fill="currentColor" fillOpacity="0.1" />
      <path d="M12 12v8M10 4c1 2 2 4 2 8M14 4c-1 2-2 4-2 8" />
    </svg>
  ),
  horse: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 3c-1 0-3 1-4 3l-1 2-3 1c-2 0-4 2-4 5v5h3v-3l5 3h3v-3c2 0 3-2 3-4V6c0-2-1-3-2-3z" fill="currentColor" fillOpacity="0.15" />
      <circle cx="15" cy="8" r="0.5" fill="currentColor" />
    </svg>
  ),
  scroll: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h12a2 2 0 002-2v-2H10v2a2 2 0 01-2 2zm0 0a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2v12" fill="currentColor" fillOpacity="0.1" />
      <path d="M10 9h8M10 13h6" />
    </svg>
  ),
  lotus: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20c-4-4-8-8-6-14 2 2 4 4 6 7 2-3 4-5 6-7 2 6-2 10-6 14z" fill="currentColor" fillOpacity="0.15" />
      <path d="M8 18c-3-1-5-3-6-6 3 0 5 2 6 4M16 18c3-1 5-3 6-6-3 0-5 2-6 4" />
    </svg>
  ),
  flask: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M10 3v6l-5 8a2 2 0 001.7 3h10.6a2 2 0 001.7-3L14 9V3" />
      <path d="M5.7 17L14 9V3H10v6L5.7 17h12.6" fill="currentColor" fillOpacity="0.1" />
      <circle cx="10" cy="14" r="0.5" fill="currentColor" />
      <circle cx="13" cy="16" r="0.5" fill="currentColor" />
    </svg>
  ),
  chat: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="currentColor" fillOpacity="0.15" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  ),
  snowflake: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07l14.14-14.14" />
      <path d="M12 5l-2 2 2 2 2-2-2-2M12 17l-2 2 2 2 2-2-2-2M5 12l-2-2 2-2 2 2-2 2M17 12l2-2 2 2-2 2-2-2" />
    </svg>
  ),
  cake: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 14h18v6a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="currentColor" fillOpacity="0.15" />
      <path d="M3 14c0-2 1-3 3-3h12c2 0 3 1 3 3" fill="currentColor" fillOpacity="0.1" />
      <path d="M12 2v4M8 6v5M16 6v5" />
      <circle cx="12" cy="2" r="1" fill="currentColor" fillOpacity="0.3" />
    </svg>
  ),
  salt: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3h8l1 4H7z" fill="currentColor" fillOpacity="0.1" />
      <rect x="7" y="7" width="10" height="14" rx="1" fill="currentColor" fillOpacity="0.15" />
      <path d="M10 3v4M14 3v4M12 10v1M10 13v1M14 13v1" />
    </svg>
  ),
  jester: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c-5 0-8-3-8-7h16c0 4-3 7-8 7z" fill="currentColor" fillOpacity="0.15" />
      <path d="M4 15c0-6 2-8 4-11l4 5 4-5c2 3 4 5 4 11" />
      <circle cx="8" cy="4" r="1.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="16" cy="4" r="1.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="12" cy="9" r="1.5" fill="currentColor" fillOpacity="0.2" />
    </svg>
  ),
  moon: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor" fillOpacity="0.15" />
      <circle cx="18" cy="5" r="0.5" fill="currentColor" />
      <circle cx="20" cy="8" r="0.5" fill="currentColor" />
    </svg>
  ),
  clover: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8a3 3 0 10-3-3c0 1.5 1 3 3 3z" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 8a3 3 0 113 -3c0 1.5-1 3-3 3z" fill="currentColor" fillOpacity="0.1" />
      <path d="M8 12a3 3 0 103 3c-1.5 0-3-1-3-3z" fill="currentColor" fillOpacity="0.15" />
      <path d="M16 12a3 3 0 10-3 3c1.5 0 3-1 3-3z" fill="currentColor" fillOpacity="0.1" />
      <path d="M12 15v6" />
    </svg>
  ),
  oracle: (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="7" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 7v0M10 10a2.5 2.5 0 014 0" />
      <path d="M8 20h8M9 17h6" />
      <path d="M9 17c-1-2-3-4-3-7a6 6 0 1112 0c0 3-2 5-3 7" fill="currentColor" fillOpacity="0.08" />
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

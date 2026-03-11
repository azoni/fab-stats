import Link from "next/link";

const features = [
  {
    href: "/meta",
    label: "Community Meta",
    desc: "Hero popularity & win rates across the community",
    color: "teal",
    icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    desc: "See where you rank against other players",
    color: "amber",
    icon: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.704 6.023 6.023 0 01-2.77-.704",
  },
  {
    href: "/compare",
    label: "Head to Head",
    desc: "Compare your stats against any player",
    color: "violet",
    icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
  },
  {
    href: "/games",
    label: "Mini Games",
    desc: "FaBdoku, Hero Guesser, Trivia & more",
    color: "rose",
    icon: "M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.421 48.421 0 01-4.185-.428.636.636 0 00-.685.367 6.014 6.014 0 00-.315.655.636.636 0 00.437.83c1.357.386 2.755.672 4.186.854a.638.638 0 00.713-.559 5.25 5.25 0 01.512-1.62.636.636 0 01.544-.373h.003a.636.636 0 01.544.374c.2.472.335.983.392 1.52a.64.64 0 00.637.576h.001a.637.637 0 00.637-.574c.057-.54.193-1.053.393-1.526a.636.636 0 01.544-.373h.002a.636.636 0 01.544.374c.178.377.314.79.392 1.22a.64.64 0 00.714.558 47.97 47.97 0 004.186-.853.636.636 0 00.437-.83 5.994 5.994 0 00-.316-.656.636.636 0 00-.685-.366 48.457 48.457 0 01-4.185.428.64.64 0 01-.657-.643v0z",
  },
  {
    href: "/tournaments",
    label: "Tournaments",
    desc: "Browse results from events worldwide",
    color: "sky",
    icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z",
  },
];

const colorMap: Record<string, { bg: string; ring: string; text: string; hoverBorder: string }> = {
  teal:   { bg: "bg-teal-500/10",   ring: "ring-teal-500/20",   text: "text-teal-400",   hoverBorder: "hover:border-teal-500/30" },
  amber:  { bg: "bg-amber-500/10",  ring: "ring-amber-500/20",  text: "text-amber-400",  hoverBorder: "hover:border-amber-500/30" },
  violet: { bg: "bg-violet-500/10", ring: "ring-violet-500/20", text: "text-violet-400", hoverBorder: "hover:border-violet-500/30" },
  rose:   { bg: "bg-rose-500/10",   ring: "ring-rose-500/20",   text: "text-rose-400",   hoverBorder: "hover:border-rose-500/30" },
  sky:    { bg: "bg-sky-500/10",    ring: "ring-sky-500/20",    text: "text-sky-400",    hoverBorder: "hover:border-sky-500/30" },
};

export function ExploreCTA() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-medium text-fab-muted tracking-wide uppercase">Explore More</h2>
        <div className="flex-1 h-px bg-fab-border/50" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {features.map((f) => {
          const c = colorMap[f.color];
          return (
            <Link
              key={f.href}
              href={f.href}
              className={`group rounded-lg bg-fab-surface border border-fab-border p-3 transition-colors ${c.hoverBorder}`}
            >
              <div className={`w-7 h-7 rounded-md ${c.bg} flex items-center justify-center ring-1 ring-inset ${c.ring} mb-2`}>
                <svg className={`w-3.5 h-3.5 ${c.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                </svg>
              </div>
              <p className="text-sm font-medium text-fab-text leading-tight mb-0.5">{f.label}</p>
              <p className="text-[10px] text-fab-dim leading-snug">{f.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

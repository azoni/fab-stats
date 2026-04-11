import Link from "next/link";

const features = [
  {
    href: "/tools",
    label: "Player Tools",
    desc: "Matchup matrix, tournament prep & notes",
    color: "amber",
    icon: "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085",
  },
  {
    href: "/compare",
    label: "Head to Head",
    desc: "Compare your stats against any player",
    color: "violet",
    icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
  },
  {
    href: "/matchups",
    label: "Matchup Matrix",
    desc: "Hero vs hero community win rates",
    color: "teal",
    icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z",
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
  {
    href: "/articles",
    label: "Articles",
    desc: "Reads from the community — write your own",
    color: "emerald",
    icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  },
];

const colorMap: Record<string, { bg: string; ring: string; text: string; hoverBorder: string }> = {
  teal:    { bg: "bg-teal-500/10",    ring: "ring-teal-500/20",    text: "text-teal-400",    hoverBorder: "hover:border-teal-500/30" },
  amber:   { bg: "bg-amber-500/10",   ring: "ring-amber-500/20",   text: "text-amber-400",   hoverBorder: "hover:border-amber-500/30" },
  violet:  { bg: "bg-violet-500/10",  ring: "ring-violet-500/20",  text: "text-violet-400",  hoverBorder: "hover:border-violet-500/30" },
  rose:    { bg: "bg-rose-500/10",    ring: "ring-rose-500/20",    text: "text-rose-400",    hoverBorder: "hover:border-rose-500/30" },
  sky:     { bg: "bg-sky-500/10",     ring: "ring-sky-500/20",     text: "text-sky-400",     hoverBorder: "hover:border-sky-500/30" },
  emerald: { bg: "bg-emerald-500/10", ring: "ring-emerald-500/20", text: "text-emerald-400", hoverBorder: "hover:border-emerald-500/30" },
};

export function ExploreCTA() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-medium text-fab-muted tracking-wide uppercase">Explore More</h2>
        <div className="flex-1 h-px bg-fab-border/50" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
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

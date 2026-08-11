"use client";
/**
 * One-time "what's new" popup. Shown once per WHATS_NEW_VERSION (dismiss stores
 * the version in localStorage; bump the constant to announce again). Reads
 * localStorage only after mount — static export, so the server render and the
 * first client render must agree (both closed).
 */
import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { trackSupportClick } from "@/lib/analytics";
import { Trophy, EyeOff, Activity, Zap } from "lucide-react";

// "b": re-announce once — v1 dismissed itself when a link was clicked, so
// early viewers lost the popup mid-read.
const WHATS_NEW_VERSION = "2026-08b";
const LS_KEY = "fab-whatsnew-seen";

const DISCORD_URL = "https://discord.gg/WPP5aqCUHY";

export function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY) === WHATS_NEW_VERSION) return;
    } catch {
      return; // storage unavailable — would re-show every visit, so skip
    }
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, []);

  const dismiss = (next: boolean) => {
    if (next) return;
    setOpen(false);
    try {
      localStorage.setItem(LS_KEY, WHATS_NEW_VERSION);
    } catch {
      /* ignore */
    }
  };

  if (!open) return null;

  // Links open in a NEW TAB and leave the popup up — navigating in place would
  // lose the popup mid-read (owner hit exactly that), and it only ever shows
  // once per version.
  const go = (href: string, children: React.ReactNode) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-bold text-fab-gold hover:underline">
      {children}
    </a>
  );

  const rows: { icon: React.ReactNode; title: string; body: React.ReactNode }[] = [
    {
      icon: <Trophy className="h-4 w-4" />,
      title: "Leagues",
      body: (
        <>
          Community leagues are live — standings build from the matches you already import, with
          seasons, recaps, and medals for podium finishes.{" "}
          {go("/leagues/fab-santiago-temporada-0?season=latest", "FaB Santiago just wrapped its first season")}, and
          anyone can {go("/leagues", "start or join one")}.
        </>
      ),
    },
    {
      icon: <EyeOff className="h-4 w-4" />,
      title: "Hide opponent names",
      body: (
        <>
          Streaming or recording an event recap? Flip &ldquo;Hide opponent names&rdquo; on your{" "}
          {go("/matches", "Matches")} or Events page and opponents stay anonymous on screen.
        </>
      ),
    },
    {
      icon: <Activity className="h-4 w-4" />,
      title: "Activity feed",
      body: (
        <>
          The {go("/activity", "Activity feed")} got a refresh — comments, reactions, and filters.
          Top-8 placements can now include your decklist link.
        </>
      ),
    },
    {
      icon: <Zap className="h-4 w-4" />,
      title: "Faster GEM sync",
      body: (
        <>
          The browser extension syncs faster: Quick Sync grabs just your newest GEM events, or
          everything since a date you pick. Not using it yet?{" "}
          {go(
            "https://chromewebstore.google.com/detail/fab-stats-gem-exporter/kcaaaibikofempdbphoeeljdbjakhmjh",
            "Get it on the Chrome Web Store",
          )}{" "}
          — importing your matches takes one click.
        </>
      ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={dismiss} title="What's new on FaB Stats" className="max-w-lg">
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.title} className="flex gap-3 rounded-lg border border-fab-border/60 bg-fab-bg/40 p-3">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-fab-gold/10 text-fab-gold">
              {row.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-fab-text">{row.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-fab-muted">{row.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-fab-gold/30 bg-fab-gold/[0.06] p-3 text-center">
        <p className="text-xs text-fab-muted">
          Help grow the community and weigh in on what gets built next.
        </p>
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackSupportClick("discord")}
          className="mt-2 inline-flex items-center gap-2 rounded-md bg-fab-gold px-4 py-2 text-sm font-bold text-black transition-all hover:bg-fab-gold/85 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          Join the Discord
        </a>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <a href="/changelog" target="_blank" rel="noopener noreferrer" className="text-[11px] text-fab-dim hover:text-fab-gold">
          Full changelog
        </a>
        <button
          type="button"
          onClick={() => dismiss(false)}
          className="rounded-md border border-fab-border px-4 py-1.5 text-sm font-bold text-fab-text transition-colors hover:border-fab-gold/50 hover:text-fab-gold"
        >
          Got it
        </button>
      </div>
    </Dialog>
  );
}

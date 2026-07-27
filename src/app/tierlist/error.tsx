"use client";

/** Route error boundary: if the Tier List Maker throws while rendering, show a recovery
 *  screen instead of a blank page. The board autosaves to localStorage as you edit, so
 *  "Try again" remounts the maker and restores your unsaved work. */
export default function TierListError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <h1 className="text-2xl font-bold text-fab-text">Something went wrong</h1>
      <p className="mt-2 text-sm text-fab-muted">
        Your tier list autosaves as you edit — try again to pick up where you left off. If it keeps
        happening, a very large pasted image may be the cause; remove it after restoring.
      </p>
      <div className="mt-5 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-fab-gold px-4 py-2 text-sm font-bold text-black hover:bg-fab-gold/80"
        >
          Try again
        </button>
        <a
          href="/tierlist"
          className="rounded-lg border border-fab-border px-4 py-2 text-sm font-bold text-fab-text hover:border-fab-gold/40"
        >
          All tier lists
        </a>
      </div>
    </div>
  );
}

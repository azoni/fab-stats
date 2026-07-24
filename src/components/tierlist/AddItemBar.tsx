"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Search, X } from "lucide-react";
import {
  searchItems,
  suggestionToItem,
  makeCustomItem,
  type TierItem,
  type ItemSuggestion,
} from "@/lib/tierlists";

export function AddItemBar({ onAdd }: { onAdd: (item: TierItem) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [custom, setCustom] = useState(false);
  const [cLabel, setCLabel] = useState("");
  const [cUrl, setCUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo<ItemSuggestion[]>(() => (q.trim() ? searchItems(q) : []), [q]);

  useEffect(() => setActive(0), [q]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function addSuggestion(s: ItemSuggestion) {
    onAdd(suggestionToItem(s));
    setQ("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      addSuggestion(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function addCustom() {
    if (!cUrl.trim() && !cLabel.trim()) return;
    onAdd(makeCustomItem(cLabel || "Item", cUrl));
    setCLabel("");
    setCUrl("");
  }

  return (
    <div className="rounded-xl border border-fab-border bg-fab-surface p-3">
      <div ref={boxRef} className="relative">
        <div className="flex items-center gap-2 rounded-lg border border-fab-border bg-fab-bg px-3 py-2 focus-within:border-fab-gold/60">
          <Search className="h-4 w-4 shrink-0 text-fab-dim" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => q && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search heroes & cards to add…"
            className="w-full bg-transparent text-sm text-fab-text placeholder:text-fab-dim focus:outline-none"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} className="text-fab-dim hover:text-fab-text">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {open && results.length > 0 && (
          <div className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-fab-border bg-fab-surface shadow-2xl">
            {results.map((s, i) => (
              <button
                key={s.refId}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => addSuggestion(s)}
                className={`flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left ${
                  i === active ? "bg-fab-gold/15" : "hover:bg-fab-bg/60"
                }`}
              >
                {s.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.imageUrl} alt="" className="h-9 w-7 shrink-0 rounded border border-fab-border object-cover" />
                ) : (
                  <div className="h-9 w-7 shrink-0 rounded border border-fab-border bg-fab-bg" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-fab-text">{s.label}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-fab-dim">{s.sub}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-[11px] text-fab-dim">Type to add. Not in the DB yet (spoilers)? Add a custom image.</p>
        <button
          type="button"
          onClick={() => setCustom((v) => !v)}
          className="text-[11px] font-bold text-fab-muted hover:text-fab-gold"
        >
          {custom ? "Hide custom" : "+ Custom item"}
        </button>
      </div>

      {custom && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-fab-border/70 bg-fab-bg/40 p-2">
          <input
            value={cLabel}
            onChange={(e) => setCLabel(e.target.value)}
            placeholder="Label (e.g. card name)"
            className="min-w-[140px] flex-1 rounded-md border border-fab-border bg-fab-bg px-2 py-1.5 text-xs text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none"
          />
          <input
            value={cUrl}
            onChange={(e) => setCUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            placeholder="Image URL (https://…)"
            className="min-w-[180px] flex-[2] rounded-md border border-fab-border bg-fab-bg px-2 py-1.5 text-xs text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustom}
            className="inline-flex items-center gap-1 rounded-md bg-fab-gold px-3 py-1.5 text-xs font-bold text-black hover:bg-fab-gold/80"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      )}
    </div>
  );
}

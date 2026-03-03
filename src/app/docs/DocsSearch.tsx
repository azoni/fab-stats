"use client";
import { useState, useRef, useEffect } from "react";

interface DocsSearchProps {
  toc: { id: string; label: string }[];
}

export function DocsSearch({ toc }: DocsSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? toc.filter((t) => t.label.toLowerCase().includes(query.toLowerCase()))
    : [];

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-fab-surface border border-fab-border text-fab-dim hover:text-fab-muted hover:border-fab-muted transition-colors"
        title="Search docs"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <span className="text-xs font-medium">Search</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-fab-surface border border-fab-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setOpen(false); setQuery(""); }
                if (e.key === "Enter" && filtered.length > 0) {
                  document.getElementById(filtered[0].id)?.scrollIntoView({ behavior: "smooth" });
                  setOpen(false);
                  setQuery("");
                }
              }}
              placeholder="Search sections..."
              className="w-full px-2.5 py-1.5 bg-fab-bg border border-fab-border rounded-md text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/40"
            />
          </div>
          {query.trim() && (
            <div className="max-h-60 overflow-y-auto border-t border-fab-border">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-xs text-fab-dim">No results</p>
              ) : (
                filtered.map((t) => (
                  <a
                    key={t.id}
                    href={`#${t.id}`}
                    onClick={() => { setOpen(false); setQuery(""); }}
                    className="block px-3 py-1.5 text-sm text-fab-muted hover:text-fab-text hover:bg-fab-bg transition-colors"
                  >
                    {t.label}
                  </a>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

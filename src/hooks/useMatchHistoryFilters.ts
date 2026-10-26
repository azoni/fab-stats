"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_MATCH_FILTERS,
  readMatchFilters,
  writeMatchFilters,
  type MatchHistoryFilters,
} from "@/lib/match-history";

/** The URL owns the view: reloads, copied links and Back restore the same matches. */
export function useMatchHistoryFilters() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const filters = useMemo(() => readMatchFilters(new URLSearchParams(queryString)), [queryString]);
  const editingSearch = useRef(false);

  useEffect(() => {
    const finishSearch = () => {
      editingSearch.current = false;
    };
    window.addEventListener("popstate", finishSearch);
    return () => window.removeEventListener("popstate", finishSearch);
  }, []);

  function updateFilters(patch: Partial<MatchHistoryFilters>, replace = false) {
    const url = new URL(window.location.href);
    // Read the current URL, so successive inputs cannot overwrite one another
    // while Next is rendering the previous history update.
    const current = readMatchFilters(url.searchParams);
    const next = { ...current, page: 1, ...patch };
    url.search = writeMatchFilters(next, url.searchParams).toString();
    if (url.href === window.location.href) return;
    window.history[replace ? "replaceState" : "pushState"](null, "", url);
  }

  function setFilters(patch: Partial<MatchHistoryFilters>) {
    editingSearch.current = false;
    updateFilters(patch);
  }

  function setQuery(query: string) {
    // One history entry per search, rather than one per keystroke.
    updateFilters({ query }, editingSearch.current);
    editingSearch.current = true;
  }

  return {
    filters,
    setFilters,
    setQuery,
    finishSearch: () => {
      editingSearch.current = false;
    },
    clearFilters: () => setFilters({ ...DEFAULT_MATCH_FILTERS, sort: filters.sort }),
  };
}

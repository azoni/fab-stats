"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_MATCHUP_FILTERS,
  readMatchupFilters,
  writeMatchupFilters,
  type MatchupFilters,
} from "@/lib/personal-matchups";

export function useMatchupFilters() {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const filters = useMemo(() => readMatchupFilters(new URLSearchParams(query)), [query]);

  function setFilters(patch: Partial<MatchupFilters>) {
    const url = new URL(window.location.href);
    const next = { ...readMatchupFilters(url.searchParams), ...patch };
    const params = writeMatchupFilters(next, url.searchParams);
    params.set("scope", "personal");
    url.search = params.toString();
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
  }

  return {
    filters,
    setFilters,
    clearFilters: () => setFilters({ ...DEFAULT_MATCHUP_FILTERS, view: filters.view, order: filters.order }),
  };
}

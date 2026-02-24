"use client";
import { useMemo } from "react";
import { allHeroes, searchHeroes, getHeroByName } from "@/lib/heroes";
import type { HeroInfo } from "@/types";

export function useHeroes(query?: string) {
  const heroes: HeroInfo[] = useMemo(() => {
    if (query && query.trim()) {
      return searchHeroes(query);
    }
    return allHeroes;
  }, [query]);

  return { heroes, getHeroByName };
}

"use client";
import { useState, useEffect } from "react";
import { getSeasons } from "@/lib/seasons";
import type { Season } from "@/types";

export function useSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSeasons()
      .then((data) => {
        setSeasons(data);
      })
      .catch((e) => {
        console.error("Failed to load seasons:", e);
        setError("Failed to load seasons");
      })
      .finally(() => setLoading(false));
  }, []);

  return { seasons, loading, error };
}

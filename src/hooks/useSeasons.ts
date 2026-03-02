"use client";
import { useState, useEffect } from "react";
import { getSeasons } from "@/lib/seasons";
import type { Season } from "@/types";

export function useSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSeasons().then((data) => {
      setSeasons(data);
      setLoading(false);
    });
  }, []);

  return { seasons, loading };
}

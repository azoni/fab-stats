import { useState, useEffect } from "react";
import { getCreators } from "@/lib/creators";
import type { Creator } from "@/types";

export function useCreators() {
  const [creators, setCreators] = useState<Creator[]>([]);

  useEffect(() => {
    getCreators().then(setCreators).catch(() => {});
  }, []);

  return creators;
}

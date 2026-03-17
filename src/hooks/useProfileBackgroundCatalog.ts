"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProfileBackgroundOption } from "@/lib/profile-backgrounds";
import { getCachedProfileBackgroundCatalog, loadProfileBackgroundCatalog } from "@/lib/profile-background-catalog";

interface UseProfileBackgroundCatalogResult {
  options: ProfileBackgroundOption[];
  allOptions: ProfileBackgroundOption[];
  loading: boolean;
  refreshCatalog: () => Promise<void>;
}

export function useProfileBackgroundCatalog(isAdmin: boolean): UseProfileBackgroundCatalogResult {
  const [allOptions, setAllOptions] = useState<ProfileBackgroundOption[]>(
    () => getCachedProfileBackgroundCatalog({ includeAdmin: isAdmin }),
  );
  const [loading, setLoading] = useState(true);

  const refreshCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const catalog = await loadProfileBackgroundCatalog({ includeAdmin: isAdmin, forceRefresh: true });
      setAllOptions(catalog);
    } catch {
      setAllOptions(getCachedProfileBackgroundCatalog({ includeAdmin: isAdmin }));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    let active = true;

    loadProfileBackgroundCatalog({ includeAdmin: isAdmin, forceRefresh: true })
      .then((catalog) => {
        if (!active) return;
        setAllOptions(catalog);
      })
      .catch(() => {
        if (!active) return;
        setAllOptions(getCachedProfileBackgroundCatalog({ includeAdmin: isAdmin }));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAdmin]);

  const options = useMemo(
    () => allOptions.filter((opt) => opt.isActive !== false && (isAdmin || !opt.adminOnly) && (isAdmin || !opt.unlockType)),
    [allOptions, isAdmin],
  );

  return { options, allOptions, loading, refreshCatalog };
}

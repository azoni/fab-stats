"use client";

import { useEffect } from "react";
import { logToEcosystem } from "@/lib/mcp-webhook";
import { getDailyPageViewTrend } from "@/lib/analytics";

export function PageVisitTracker() {
  useEffect(() => {
    if (!sessionStorage.getItem("_av")) {
      sessionStorage.setItem("_av", "1");
      logToEcosystem("site_visit", "Site visit");

      // Send today's page view total as a summary event
      getDailyPageViewTrend(1)
        .then(([today]) => {
          if (today && today.total > 0) {
            logToEcosystem("page_view_summary", `${today.total} page views today`, `date:${today.date}`);
          }
        })
        .catch(() => {});
    }
  }, []);

  return null;
}

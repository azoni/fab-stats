"use client";

import { useEffect } from "react";
import { logToEcosystem } from "@/lib/mcp-webhook";

export function PageVisitTracker() {
  useEffect(() => {
    if (!sessionStorage.getItem("_av")) {
      sessionStorage.setItem("_av", "1");
      logToEcosystem("site_visit", "Site visit");
    }
  }, []);

  return null;
}

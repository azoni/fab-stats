"use client";

import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { KgGraph } from "@/components/kg/KgGraph";

export default function KgVisualizerPage() {
  return (
    <RequireAdmin>
      <KgGraph />
    </RequireAdmin>
  );
}

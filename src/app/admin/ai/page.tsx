"use client";

import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { AiAdmin } from "@/components/admin/AiAdmin";

export default function AdminAiPage() {
  return (
    <RequireAdmin>
      <AiAdmin />
    </RequireAdmin>
  );
}

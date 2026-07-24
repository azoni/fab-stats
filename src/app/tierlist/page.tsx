"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ListOrdered } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { TierListMaker } from "@/components/tierlist/TierListMaker";
import { getTierList, type TierListDoc } from "@/lib/tierlists";

type LoadState = { status: "loading" | "ready" | "notfound"; doc: TierListDoc | null };

function TierListInner() {
  const params = useSearchParams();
  // Capture the id ONCE. Saving a new list updates the URL to ?id=…; reading the
  // id reactively there would remount + re-fetch the live board, so we don't.
  const [initialId] = useState(() => params.get("id"));
  const [state, setState] = useState<LoadState>(
    initialId ? { status: "loading", doc: null } : { status: "ready", doc: null },
  );

  useEffect(() => {
    if (!initialId) return;
    let cancelled = false;
    getTierList(initialId)
      .then((d) => !cancelled && setState({ status: d ? "ready" : "notfound", doc: d }))
      .catch(() => !cancelled && setState({ status: "notfound", doc: null }));
    return () => {
      cancelled = true;
    };
  }, [initialId]);

  if (state.status === "loading") {
    return <p className="py-10 text-center text-sm text-fab-dim">Loading tier list…</p>;
  }
  if (state.status === "notfound") {
    return (
      <div className="rounded-xl border border-fab-border bg-fab-surface p-8 text-center">
        <p className="text-sm text-fab-muted">This tier list couldn&apos;t be loaded — it may have been deleted or the link is wrong.</p>
        <Link href="/tierlist" className="mt-3 inline-block rounded-lg bg-fab-gold px-4 py-2 text-sm font-bold text-black hover:bg-fab-gold/80">
          Start a new tier list →
        </Link>
      </div>
    );
  }
  return <TierListMaker initial={state.doc || undefined} />;
}

export default function TierListPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHero
        eyebrow="Extras"
        title="Tier List Maker"
        description="Rank anything in Flesh and Blood — search heroes & cards (or add spoiler images), drag them into tiers, then save and share."
        icon={<ListOrdered className="h-5 w-5" />}
      />
      <Suspense fallback={<p className="py-10 text-center text-sm text-fab-dim">Loading…</p>}>
        <TierListInner />
      </Suspense>
    </div>
  );
}

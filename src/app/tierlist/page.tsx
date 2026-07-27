"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ListOrdered } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { TierListMaker } from "@/components/tierlist/TierListMaker";
import { TierListDirectory } from "@/components/tierlist/TierListDirectory";
import { getTierList, type TierListDoc } from "@/lib/tierlists";

type LoadState = { status: "loading" | "ready" | "notfound"; doc: TierListDoc | null };

function BackLink() {
  return (
    <Link href="/tierlist" className="inline-flex items-center gap-1 text-xs font-bold text-fab-dim hover:text-fab-gold">
      <ChevronLeft className="h-3.5 w-3.5" /> All tier lists
    </Link>
  );
}

function MakerById({ id }: { id: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading", doc: null });
  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", doc: null });
    getTierList(id)
      .then((d) => !cancelled && setState({ status: d ? "ready" : "notfound", doc: d }))
      .catch(() => !cancelled && setState({ status: "notfound", doc: null }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "loading") return <p className="py-10 text-center text-sm text-fab-dim">Loading tier list…</p>;
  if (state.status === "notfound") {
    return (
      <div className="rounded-xl border border-fab-border bg-fab-surface p-8 text-center">
        <p className="text-sm text-fab-muted">This tier list couldn&apos;t be loaded — it may have been deleted or the link is wrong.</p>
        <Link href="/tierlist" className="mt-3 inline-block rounded-lg bg-fab-gold px-4 py-2 text-sm font-bold text-black hover:bg-fab-gold/80">
          Browse tier lists →
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <BackLink />
      <TierListMaker key={id} initial={state.doc || undefined} />
    </div>
  );
}

function TierListInner() {
  const params = useSearchParams();
  const id = params.get("id");
  const isNew = params.get("new");

  if (!id && !isNew) return <TierListDirectory />;
  if (!id) {
    return (
      <div className="space-y-2">
        <BackLink />
        <TierListMaker />
      </div>
    );
  }
  return <MakerById id={id} />;
}

export default function TierListPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHero
        eyebrow="Extras"
        title="Tier List Maker"
        description="Rank anything in Flesh and Blood — search heroes & cards (or drag in spoiler images from another tab), sort them into tiers, then save & share."
        icon={<ListOrdered className="h-5 w-5" />}
      />
      <Suspense fallback={<p className="py-10 text-center text-sm text-fab-dim">Loading…</p>}>
        <TierListInner />
      </Suspense>
    </div>
  );
}

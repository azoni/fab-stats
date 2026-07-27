"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Eye, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  listPublicTierLists,
  listMyTierLists,
  deleteTierList,
  tierListItemCount,
  tierListPreviewImages,
  type TierListDoc,
} from "@/lib/tierlists";

/** Thumbnail that falls back to alternate art (newest sets) then a blank tile. */
function PreviewThumb({ srcs }: { srcs: string[] }) {
  const [i, setI] = useState(0);
  const src = srcs[i];
  if (!src) return <div className="h-16 w-11 shrink-0 rounded border border-fab-border bg-fab-bg" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" onError={() => setI((n) => n + 1)} className="h-16 w-11 shrink-0 rounded border border-fab-border object-cover object-top" />
  );
}

function TierCard({ list, mine, onDeleted }: { list: TierListDoc; mine: boolean; onDeleted: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const preview = tierListPreviewImages(list, 6);
  const count = tierListItemCount(list);

  async function del(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm(`Delete "${list.title}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await deleteTierList(list.id);
      toast.success("Deleted.");
      onDeleted(list.id);
    } catch {
      toast.error("Failed to delete.");
      setBusy(false);
    }
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-fab-border bg-fab-surface transition-colors hover:border-fab-gold/40">
      {mine && !list.isPublic && (
        <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-fab-muted backdrop-blur-sm">
          <Lock className="h-2.5 w-2.5" /> Private
        </span>
      )}
      <Link href={`/tierlist?id=${list.id}`} className="block">
        <div className="flex h-20 items-center gap-1 overflow-hidden border-b border-fab-border/60 bg-fab-bg px-2">
          {preview.length === 0 ? (
            <span className="w-full text-center text-xs text-fab-dim">Empty tier list</span>
          ) : (
            preview.map((p, i) => <PreviewThumb key={i} srcs={[p.src, p.fallback].filter(Boolean) as string[]} />)
          )}
        </div>
        <div className="p-3">
          <p className="truncate font-bold text-fab-text group-hover:text-fab-gold">{list.title}</p>
          <p className="mt-0.5 truncate text-[11px] text-fab-dim">
            {list.ownerName ? `by ${list.ownerName}` : "—"} · {count} item{count === 1 ? "" : "s"}
          </p>
          {list.description && <p className="mt-1 line-clamp-2 text-xs text-fab-muted">{list.description}</p>}
        </div>
      </Link>
      <div className="flex items-center gap-1.5 border-t border-fab-border/60 px-3 py-2">
        <Link
          href={`/tierlist?id=${list.id}`}
          className="inline-flex items-center gap-1 rounded-md border border-fab-border px-2 py-1 text-[11px] font-bold text-fab-muted hover:text-fab-gold"
        >
          {mine ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {mine ? "Edit" : "View"}
        </Link>
        {mine && (
          <button
            type="button"
            onClick={del}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md border border-fab-border px-2 py-1 text-[11px] font-bold text-fab-dim hover:text-rose-400 disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        )}
      </div>
    </div>
  );
}

export function TierListDirectory() {
  const { user } = useAuth();
  const [lists, setLists] = useState<TierListDoc[] | null>(null);
  const [mine, setMine] = useState<TierListDoc[]>([]);

  useEffect(() => {
    listPublicTierLists()
      .then(setLists)
      .catch(() => setLists([]));
  }, []);

  // Fetch the user's own lists directly so they always appear, even if they're not
  // among the newest community lists.
  useEffect(() => {
    if (!user) {
      setMine([]);
      return;
    }
    let cancelled = false;
    listMyTierLists(user.uid)
      .then((m) => !cancelled && setMine(m))
      .catch(() => !cancelled && setMine([]));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const onDeleted = useCallback((id: string) => {
    setLists((prev) => (prev ? prev.filter((l) => l.id !== id) : prev));
    setMine((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const mineIds = new Set(mine.map((l) => l.id));
  const others = lists ? lists.filter((l) => !mineIds.has(l.id)) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-fab-muted">Community tier lists — or make your own.</p>
        <Link
          href="/tierlist?new=1"
          className="inline-flex items-center gap-1.5 rounded-lg bg-fab-gold px-3.5 py-2 text-sm font-bold text-black hover:bg-fab-gold/80"
        >
          <Plus className="h-4 w-4" /> New tier list
        </Link>
      </div>

      {lists === null ? (
        <p className="py-10 text-center text-sm text-fab-dim">Loading tier lists…</p>
      ) : (
        <>
          {mine.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-fab-dim">Your tier lists</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mine.map((l) => (
                  <TierCard key={l.id} list={l} mine onDeleted={onDeleted} />
                ))}
              </div>
            </section>
          )}
          <section>
            {mine.length > 0 && <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-fab-dim">Community</h2>}
            {others.length === 0 ? (
              <p className="rounded-xl border border-fab-border bg-fab-surface p-6 text-center text-sm text-fab-dim">
                No tier lists yet — be the first to make one.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((l) => (
                  <TierCard key={l.id} list={l} mine={false} onDeleted={onDeleted} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

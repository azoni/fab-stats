"use client";
import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  rectIntersection,
  closestCenter,
  getFirstCollision,
  type CollisionDetection,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { Link2, Save, Share2, Copy, Plus, Trash2, ChevronUp, ChevronDown, RotateCcw, Globe, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { captureCardBlob } from "@/lib/share-image";
import {
  DEFAULT_TIERS,
  TIER_COLORS,
  POOL_ID,
  makeTier,
  newTierListId,
  saveTierList,
  deleteTierList,
  itemsFromTransfer,
  itemFromFile,
  collectImageFiles,
  type Tier,
  type TierItem,
  type TierListDoc,
} from "@/lib/tierlists";
import { SortableItem, ItemTile } from "@/components/tierlist/tier-item";
import { AddItemBar } from "@/components/tierlist/AddItemBar";

type Placement = Record<string, string[]>;

function initFrom(initial?: TierListDoc) {
  if (!initial) {
    const placement: Placement = { [POOL_ID]: [] };
    for (const t of DEFAULT_TIERS) placement[t.id] = [];
    return { id: "", title: "My FaB Tier List", description: "", tiers: DEFAULT_TIERS, items: {} as Record<string, TierItem>, placement };
  }
  // Sanitize a saved/shared doc: every container gets an array; drop ids with no
  // item; keep each id in only one place; any unplaced item falls back to the pool.
  const items = initial.items || {};
  const tiers = initial.tiers?.length ? initial.tiers : DEFAULT_TIERS;
  const placement: Placement = {};
  const seen = new Set<string>();
  for (const c of [POOL_ID, ...tiers.map((t) => t.id)]) {
    const arr = (initial.placement?.[c] || []).filter((id) => items[id] && !seen.has(id));
    arr.forEach((id) => seen.add(id));
    placement[c] = arr;
  }
  for (const id of Object.keys(items)) if (!seen.has(id)) placement[POOL_ID].push(id);
  return { id: initial.id, title: initial.title || "Tier List", description: initial.description || "", tiers, items, placement };
}

/** A droppable container (a tier row's items area or the pool). */
function DroppableArea({ id, itemIds, className, children }: { id: string; itemIds: string[]; className: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <SortableContext id={id} items={itemIds} strategy={rectSortingStrategy}>
      <div
        ref={setNodeRef}
        className={`${className} rounded-md transition-colors ${isOver ? "bg-fab-gold/15 outline-dashed outline-2 -outline-offset-2 outline-fab-gold/70" : ""}`}
      >
        {children}
      </div>
    </SortableContext>
  );
}

export function TierListMaker({ initial }: { initial?: TierListDoc }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const start = initFrom(initial);

  const [docId, setDocId] = useState(start.id);
  const [title, setTitle] = useState(start.title);
  const [description, setDescription] = useState(start.description);
  const [tiers, setTiers] = useState<Tier[]>(start.tiers);
  const [items, setItems] = useState<Record<string, TierItem>>(start.items);
  const [placement, setPlacement] = useState<Placement>(start.placement);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const createdAtRef = useRef(initial?.createdAt || "");
  // Current placement for the collision detector (a stable [] useCallback can't
  // close over the live state).
  const placementRef = useRef(placement);
  placementRef.current = placement;
  // Per-list localStorage draft key + a once-guard for restore-on-mount.
  const draftKeyRef = useRef(`fab-tl-draft:${initial?.id || "new"}`);
  const restoredRef = useRef(false);

  const ownsList = !!user && (!initial || initial.ownerUid === user.uid);
  const readOnly = !!initial && !ownsList;

  // ── Crash-safe autosave ──────────────────────────────────────────────────
  // The live board is only in React state until you hit Save, so a crash or an
  // accidental reload loses everything. Debounce-write the working list to
  // localStorage and restore it on mount, so nothing is lost between saves.
  useEffect(() => {
    if (readOnly) return;
    const t = window.setTimeout(() => {
      try {
        const json = JSON.stringify({ id: docId, title, description, tiers, items, placement, isPublic, at: Date.now() });
        // Skip drafts too big for localStorage (>~2.5MB); those can't be saved anyway.
        if (json.length < 2_500_000) localStorage.setItem(draftKeyRef.current, json);
      } catch {
        /* quota / private-mode — nothing we can do, skip */
      }
    }, 700);
    return () => window.clearTimeout(t);
  }, [readOnly, docId, title, description, tiers, items, placement, isPublic]);

  useEffect(() => {
    if (readOnly || restoredRef.current) return;
    restoredRef.current = true;
    let draft: { id?: string; title?: string; description?: string; tiers?: Tier[]; items?: Record<string, TierItem>; placement?: Placement; isPublic?: boolean; at?: number } | null = null;
    try {
      const raw = localStorage.getItem(draftKeyRef.current);
      if (raw) draft = JSON.parse(raw);
    } catch {
      return;
    }
    if (!draft || !Array.isArray(draft.tiers) || !draft.items || !draft.placement) return;
    // Only restore when the draft genuinely differs from the freshly-loaded state.
    // A plain load (or a Discard) also autosaves, so a timestamp check would misfire
    // and re-toast a no-op "restore" on every reload. Compare content instead.
    const norm = (t?: string, d?: string, ti?: unknown, it?: unknown, pl?: unknown, pub?: boolean) =>
      JSON.stringify([t ?? "", d ?? "", ti, it, pl, pub ?? true]);
    const draftSig = norm(draft.title, draft.description, draft.tiers, draft.items, draft.placement, draft.isPublic);
    const startSig = norm(start.title, start.description, start.tiers, start.items, start.placement, initial?.isPublic ?? true);
    if (draftSig === startSig) return;
    if (draft.id) setDocId(draft.id);
    if (typeof draft.title === "string") setTitle(draft.title);
    setDescription(draft.description ?? "");
    setTiers(draft.tiers);
    setItems(draft.items);
    setPlacement(draft.placement);
    if (typeof draft.isPublic === "boolean") setIsPublic(draft.isPublic);
    toast("Restored your unsaved changes.", {
      action: {
        label: "Discard",
        onClick: () => {
          try { localStorage.removeItem(draftKeyRef.current); } catch {}
          setDocId(start.id);
          setTitle(start.title);
          setDescription(start.description);
          setTiers(start.tiers);
          setItems(start.items);
          setPlacement(start.placement);
          setIsPublic(initial?.isPublic ?? true);
        },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  // Mouse drags on a small move; touch needs a short press-hold so a swipe still
  // scrolls the page (tiles have no touch-action:none). Keyboard for a11y.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // "Drop where the pointer is": prefer droppables under the pointer (steadier than
  // closest-corner while rows reflow mid-drag), falling back to rectangle overlap
  // when the pointer is off every container. When the hit is a *container* (a tier
  // or the tray) that has cards, retarget to the closest card inside it — otherwise
  // releasing in a tier's gap/trailing space resolves to the whole container, which
  // gives no make-room preview and drops nothing on release.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointer = pointerWithin(args);
    const collisions = pointer.length ? pointer : rectIntersection(args);
    const overId = getFirstCollision(collisions, "id");
    if (overId == null) return collisions;
    const pl = placementRef.current;
    if (typeof overId === "string" && overId in pl && (pl[overId]?.length ?? 0) > 0) {
      const childIds = pl[overId];
      const closest = closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (c) => c.id !== overId && childIds.includes(String(c.id)),
        ),
      });
      const closestId = getFirstCollision(closest, "id");
      if (closestId != null) return [{ id: closestId }];
    }
    return [{ id: overId }];
  }, []);

  const findContainer = useCallback(
    (id: string): string | undefined => {
      if (id in placement) return id;
      return Object.keys(placement).find((k) => placement[k].includes(id));
    },
    [placement],
  );

  function onDragStart(e: DragStartEvent) {
    if (readOnly) return;
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    if (readOnly) return;
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = findContainer(activeId);
    const to = findContainer(overId);
    if (!from || !to || from === to) return;
    setPlacement((prev) => {
      const fromItems = prev[from];
      const toItems = prev[to];
      const overIndex = toItems.indexOf(overId);
      const insertAt = overId in prev ? toItems.length : overIndex >= 0 ? overIndex : toItems.length;
      return {
        ...prev,
        [from]: fromItems.filter((i) => i !== activeId),
        [to]: [...toItems.slice(0, insertAt), activeId, ...toItems.slice(insertAt)],
      };
    });
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (readOnly) return;
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = findContainer(activeId);
    const to = findContainer(overId);
    if (from && to && from === to && activeId !== overId) {
      setPlacement((prev) => {
        const arr = prev[from];
        const oldIndex = arr.indexOf(activeId);
        if (oldIndex < 0) return prev;
        const overIndex = arr.indexOf(overId);
        // over === the container (released in empty/trailing space) → move to the end.
        const newIndex = overIndex >= 0 ? overIndex : arr.length - 1;
        return { ...prev, [from]: arrayMove(arr, oldIndex, newIndex) };
      });
    }
  }

  // ── Item + tier mutations ──
  const addItem = useCallback((item: TierItem) => {
    setItems((prev) => ({ ...prev, [item.id]: item }));
    setPlacement((prev) => ({ ...prev, [POOL_ID]: [...prev[POOL_ID], item.id] }));
  }, []);

  const renameItem = useCallback((id: string, label: string) => {
    setItems((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], label } } : prev));
  }, []);

  // Accept card images dragged in from another tab (spoilers), or pasted images/URLs.
  const addFromTransfer = useCallback(
    (dt: DataTransfer | null) => {
      if (!dt || readOnly) return false;
      // Prefer the actual image bytes when the browser provides them (dragging from a
      // tab in Chrome/Edge, or any pasted/OS image) — embedding always displays, even
      // when the source blocks hotlinking so its URL can't load in an <img>. Falls back
      // to the source URL only when no bytes are available.
      const files = collectImageFiles(dt);
      if (files.length) {
        // allSettled, not all: one undecodable image (HEIC, corrupt, over-size) must
        // not discard the whole batch — add every image that reads, warn about the rest.
        Promise.allSettled(files.map(itemFromFile)).then((results) => {
          const added = results.filter((r): r is PromiseFulfilledResult<TierItem> => r.status === "fulfilled").map((r) => r.value);
          added.forEach(addItem);
          const failed = results.length - added.length;
          if (added.length) toast.success(`Added ${added.length} image${added.length === 1 ? "" : "s"}.`);
          if (failed) toast.error(`Couldn't read ${failed} image${failed === 1 ? "" : "s"}.`);
        });
        return true;
      }
      const items = itemsFromTransfer(dt);
      if (items.length) {
        items.forEach(addItem);
        toast.success(`Added ${items.length} image${items.length === 1 ? "" : "s"}.`);
        return true;
      }
      return false;
    },
    [addItem, readOnly],
  );

  // Paste an image or image URL anywhere on the page (unless typing in a field).
  useEffect(() => {
    if (readOnly) return;
    const onPaste = (e: ClipboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (addFromTransfer(e.clipboardData)) e.preventDefault();
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [readOnly, addFromTransfer]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPlacement((prev) => {
      const next: Placement = {};
      for (const k of Object.keys(prev)) next[k] = prev[k].filter((i) => i !== id);
      return next;
    });
  }, []);

  function updateTier(id: string, patch: Partial<Tier>) {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function addTier() {
    const t = makeTier("New");
    setTiers((prev) => [...prev, t]);
    setPlacement((prev) => ({ ...prev, [t.id]: [] }));
  }

  function removeTier(id: string) {
    setTiers((prev) => prev.filter((t) => t.id !== id));
    setPlacement((prev) => {
      const moved = prev[id] || [];
      const next: Placement = { ...prev, [POOL_ID]: [...prev[POOL_ID], ...moved] };
      delete next[id];
      return next;
    });
  }

  function moveTier(id: string, dir: -1 | 1) {
    setTiers((prev) => {
      const i = prev.findIndex((t) => t.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      return arrayMove(prev, i, j);
    });
  }

  function clearBoard() {
    if (!confirm("Move every ranked item back to the tray?")) return;
    setPlacement((prev) => {
      const pooled = [...prev[POOL_ID]];
      const next: Placement = { [POOL_ID]: pooled };
      for (const t of tiers) {
        next[POOL_ID].push(...(prev[t.id] || []));
        next[t.id] = [];
      }
      return next;
    });
  }

  // ── Share (a branded image) / save / copy link ──
  async function shareImage() {
    if (!captureRef.current) return;
    setExporting(true); // renders the FaB Stats footer + hides the per-tile remove ×
    try {
      await new Promise((r) => setTimeout(r, 30)); // let the export chrome settle
      const blob = await captureCardBlob(captureRef.current, { backgroundColor: "#0a0a0b", pixelRatio: 2 });
      if (!blob) {
        toast.error("Could not build the image.");
        return;
      }
      const fileName = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "tier-list"}-fabstats.png`;
      const text = `${title.trim() || "My FaB tier list"} — made on fabstats.net`;
      const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      // Mobile only: the native share sheet actually lists X / Instagram / Messages.
      // On desktop it's the OS sheet (Phone Link, Outlook…) with no X, so we skip it.
      if (isMobile && navigator.share) {
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ title: title.trim() || "FaB Tier List", text, files: [file] });
            return;
          } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") return; // user cancelled
          }
        }
      }

      // Desktop: copy the branded image to the clipboard (while our tab still has focus),
      // then open an X compose window to paste it into. Works for Discord too — paste
      // anywhere. Clipboard blocked → fall back to a download.
      let copied = false;
      if (navigator.clipboard && "write" in navigator.clipboard && typeof ClipboardItem !== "undefined") {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": Promise.resolve(blob) })]);
          copied = true;
        } catch {
          /* clipboard blocked — download below */
        }
      }
      if (copied) {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
        toast.success("Image copied — paste it into your post with Ctrl/⌘+V.");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
        toast.success("Image downloaded — attach it to your post.");
      }
    } catch {
      toast.error("Share failed — custom images from other sites can block the export (CORS).");
    } finally {
      setExporting(false);
    }
  }

  /** Persist and return the (possibly newly-minted) id, or null on failure. */
  async function save(): Promise<string | null> {
    if (!user || !profile) {
      toast.error("Sign in to save your tier list.");
      return null;
    }
    if (savingRef.current) return docId || null; // in-flight lock (no double-create)
    savingRef.current = true;
    setSaving(true);
    try {
      const id = docId || newTierListId();
      const now = new Date().toISOString();
      if (!createdAtRef.current) createdAtRef.current = now; // stable across re-saves
      const list: TierListDoc = {
        id,
        title: title.trim() || "Untitled Tier List",
        description: description.trim(),
        tiers,
        placement,
        items,
        ownerUid: user.uid,
        ownerName: profile.displayName || profile.username,
        isPublic,
        createdAt: createdAtRef.current,
        updatedAt: now,
      };
      // Firestore caps a doc at ~1MB. Pasted local images (data URLs) are the only
      // way to get near it; surface a clear message instead of a generic failure.
      if (JSON.stringify(list).length > 950_000) {
        toast.error("This list has too many embedded images to save — remove some pasted/dragged images, or add cards with the search bar (those stay small).");
        return null;
      }
      await saveTierList(list);
      // Keep the id in component state only — we deliberately don't rewrite the URL,
      // so saving never remounts/reloads the live board. Share copies the link from
      // this id, and the saved list appears in the Discover directory.
      if (!docId) {
        setDocId(id);
        // A brand-new list autosaves under the shared "fab-tl-draft:new" key. Once it
        // has a real id, move future autosaves onto that id — otherwise the NEXT
        // brand-new list would restore this one's content (and its docId) and could
        // overwrite it on save.
        draftKeyRef.current = `fab-tl-draft:${id}`;
        try { localStorage.removeItem("fab-tl-draft:new"); } catch {}
      }
      // The saved doc is now the source of truth — drop the crash-recovery draft
      // (the next edit re-creates it, under the id-specific key).
      try { localStorage.removeItem(draftKeyRef.current); } catch {}
      toast.success("Tier list saved.");
      return id;
    } catch {
      toast.error("Failed to save.");
      return null;
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }

  /** Duplicate this list (yours or someone else's) into a new list you own, then open it. */
  async function copy() {
    if (!user || !profile) {
      toast.error("Sign in to make a copy.");
      return;
    }
    if (copying) return;
    setCopying(true);
    try {
      const newId = newTierListId();
      const now = new Date().toISOString();
      const dup: TierListDoc = {
        id: newId,
        title: `${title.trim() || "Tier List"} (Copy)`.slice(0, 120),
        description: description.trim(),
        // Deep-clone so the new doc never shares references with the live board.
        tiers: JSON.parse(JSON.stringify(tiers)),
        placement: JSON.parse(JSON.stringify(placement)),
        items: JSON.parse(JSON.stringify(items)),
        ownerUid: user.uid,
        ownerName: profile.displayName || profile.username,
        isPublic,
        createdAt: now,
        updatedAt: now,
      };
      if (JSON.stringify(dup).length > 950_000) {
        toast.error("This list has too many embedded images to copy — remove some first.");
        return;
      }
      await saveTierList(dup);
      toast.success("Copied to your tier lists.");
      router.push(`/tierlist?id=${newId}`);
    } catch {
      toast.error("Failed to copy.");
    } finally {
      setCopying(false);
    }
  }

  async function share() {
    // Always persist first so the link reflects what's on screen — the visibility
    // toggle only lives in state until a save, so sharing without saving could hand
    // out a link that's actually Private (or mislabel a Public one).
    const id = await save();
    if (!id) return;
    const url = `${window.location.origin}/tierlist?id=${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(
        isPublic
          ? "Share link copied."
          : "Link copied — but this list is Private, so only you can open it. Switch it to Public to share.",
      );
    } catch {
      toast.info(url);
    }
  }

  async function remove() {
    if (!docId || !ownsList) return;
    if (!confirm("Delete this tier list? This can't be undone.")) return;
    setDeleting(true);
    try {
      await deleteTierList(docId);
      try { localStorage.removeItem(draftKeyRef.current); } catch {}
      toast.success("Tier list deleted.");
      router.push("/tierlist");
    } catch {
      toast.error("Failed to delete.");
      setDeleting(false);
    }
  }

  const activeItem = activeId ? items[activeId] : null;

  return (
    <div
      className={`space-y-4 rounded-xl transition-[outline] ${dropActive ? "outline-dashed outline-2 outline-offset-4 outline-fab-gold" : ""}`}
      onDragOver={(e) => {
        // dnd-kit's own drag is pointer-based and fires no native drag events, so a
        // native dragover here is always something coming from outside. Call
        // preventDefault on any external drag so the drop is actually accepted —
        // sniffing dataTransfer.types during dragover is unreliable across browsers,
        // and skipping it silently drops the drop. Let real inputs keep native
        // text-drop behavior, but ALWAYS grab file drops (else dropping a file on the
        // title input navigates the tab to the file and loses the unsaved list).
        if (readOnly || e.dataTransfer.types.length === 0) return;
        const isFile = e.dataTransfer.types.includes("Files");
        const tag = (e.target as HTMLElement)?.tagName;
        if (!isFile && (tag === "INPUT" || tag === "TEXTAREA")) return;
        e.preventDefault();
        setDropActive(true);
      }}
      onDragLeave={(e) => {
        // Only clear when the pointer actually leaves the board, not when it crosses
        // between child elements (relatedTarget still inside) — otherwise it flickers.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropActive(false);
      }}
      onDrop={(e) => {
        setDropActive(false); // always clear — the drop bubbles here even from an input
        if (readOnly) return;
        const isFile = e.dataTransfer.types.includes("Files");
        const tag = (e.target as HTMLElement)?.tagName;
        if (!isFile && (tag === "INPUT" || tag === "TEXTAREA")) return;
        if (e.dataTransfer.types.length) {
          e.preventDefault();
          addFromTransfer(e.dataTransfer);
        }
      }}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={readOnly}
          className="min-w-[200px] flex-1 rounded-lg border border-fab-border bg-fab-bg px-3 py-2 text-lg font-bold text-fab-text focus:border-fab-gold/60 focus:outline-none disabled:opacity-70"
          placeholder="Tier list title"
        />
        {!readOnly && (
          <>
            <button
              type="button"
              onClick={() => setIsPublic((v) => !v)}
              title={
                isPublic
                  ? "Public — shows in Discover and anyone with the link can view. Tap to make private."
                  : "Private — only you can see it (hidden from Discover, share link won't open for others). Tap to make public."
              }
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                isPublic
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-500/70"
                  : "border-fab-border bg-fab-bg text-fab-muted hover:text-fab-text"
              }`}
            >
              {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {isPublic ? "Public" : "Private"}
            </button>
            <ToolbarBtn onClick={save} disabled={saving} icon={<Save className="h-4 w-4" />} label={saving ? "Saving…" : "Save"} />
            <ToolbarBtn onClick={share} icon={<Link2 className="h-4 w-4" />} label="Link" />
          </>
        )}
        {user && (
          <ToolbarBtn onClick={copy} disabled={copying} icon={<Copy className="h-4 w-4" />} label={copying ? "Copying…" : "Copy"} />
        )}
        <ToolbarBtn onClick={shareImage} disabled={exporting} icon={<Share2 className="h-4 w-4" />} label={exporting ? "…" : "Share"} />
        {!readOnly && docId && ownsList && (
          <ToolbarBtn onClick={remove} disabled={deleting} icon={<Trash2 className="h-4 w-4" />} label={deleting ? "…" : "Delete"} />
        )}
      </div>

      {/* Description — shown on the Discover card before someone opens the list. */}
      {!readOnly ? (
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 300))}
          rows={2}
          placeholder="Add a description (shown in Discover before people open it)…"
          className="w-full resize-none rounded-lg border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none"
        />
      ) : (
        description && <p className="text-sm text-fab-muted">{description}</p>
      )}

      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        {/* Capture area: title + tier rows */}
        <div ref={captureRef} className="overflow-hidden rounded-xl border border-fab-border bg-fab-bg">
          <div className="border-b border-fab-border bg-fab-surface px-4 py-2.5 text-center text-base font-black tracking-wide text-fab-text">
            {title || "Tier List"}
          </div>
          {tiers.map((tier, idx) => (
            <div key={tier.id} className="group/row relative flex items-stretch border-b border-fab-border last:border-b-0">
              {/* Tier label */}
              <div className="relative flex w-12 shrink-0 items-center justify-center sm:w-[72px]" style={{ backgroundColor: tier.color }}>
                <input
                  value={tier.label}
                  onChange={(e) => updateTier(tier.id, { label: e.target.value })}
                  disabled={readOnly}
                  className="w-full bg-transparent px-1 py-3 text-center text-lg font-black text-black/85 focus:outline-none sm:text-xl"
                  style={{ minWidth: 0 }}
                />
              </div>
              {/* Items */}
              <DroppableArea id={tier.id} itemIds={placement[tier.id] || []} className="flex min-h-[88px] flex-1 flex-wrap content-start gap-1 p-1.5">
                {(placement[tier.id] || []).map((iid) =>
                  items[iid] ? <SortableItem key={iid} item={items[iid]} onRemove={readOnly ? undefined : removeItem} onRename={readOnly ? undefined : renameItem} disabled={readOnly} hideRemove={exporting} /> : null,
                )}
              </DroppableArea>
              {/* Row controls (hidden during PNG export for a clean image) */}
              {!readOnly && !exporting && (
                <div className="flex w-8 shrink-0 flex-col items-center justify-center gap-0.5 border-l border-fab-border/60 bg-fab-surface opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100">
                  <button type="button" title="Color" onClick={() => setColorPickerFor(colorPickerFor === tier.id ? null : tier.id)} className="h-4 w-4 rounded-full border border-black/20" style={{ backgroundColor: tier.color }} />
                  <button type="button" title="Move up" onClick={() => moveTier(tier.id, -1)} disabled={idx === 0} className="text-fab-dim hover:text-fab-text disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button type="button" title="Move down" onClick={() => moveTier(tier.id, 1)} disabled={idx === tiers.length - 1} className="text-fab-dim hover:text-fab-text disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                  <button type="button" title="Delete row" onClick={() => removeTier(tier.id)} className="text-fab-dim hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
              {colorPickerFor === tier.id && !readOnly && !exporting && (
                <div className="absolute right-8 z-30 mt-1 flex max-w-[160px] flex-wrap gap-1 rounded-md border border-fab-border bg-fab-surface p-1.5 shadow-xl">
                  {TIER_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => { updateTier(tier.id, { color: c }); setColorPickerFor(null); }} className="h-5 w-5 rounded border border-black/20" style={{ backgroundColor: c }} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {/* FaB Stats branding — only in the shared/exported image, not the live editor. */}
          {exporting && (
            <div className="flex items-center justify-center gap-2 border-t border-fab-border bg-fab-surface px-4 py-2.5 text-xs font-black tracking-wide">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="5" y="2" width="14" height="20" rx="2" stroke="#D9A05B" strokeWidth="2" />
                <rect x="7.5" y="13" width="2" height="3" fill="#E53935" />
                <rect x="11" y="10" width="2" height="6" fill="#FBC02D" />
                <rect x="14.5" y="6" width="2" height="10" fill="#1E88E5" />
              </svg>
              <span className="text-fab-gold">FaB Stats</span>
              <span className="font-bold text-fab-dim">· make your own at fabstats.net/tierlist</span>
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <ToolbarBtn onClick={addTier} icon={<Plus className="h-4 w-4" />} label="Add row" />
            <ToolbarBtn onClick={clearBoard} icon={<RotateCcw className="h-4 w-4" />} label="Clear board" />
          </div>
        )}

        {/* Unranked tray */}
        <div className="rounded-xl border border-fab-border bg-fab-surface p-2">
          <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-fab-dim">{readOnly ? "Unranked" : "Tray — drag into tiers"}</p>
          <DroppableArea id={POOL_ID} itemIds={placement[POOL_ID] || []} className="flex min-h-[92px] flex-wrap content-start gap-1">
            {(placement[POOL_ID] || []).length === 0 ? (
              <p className="px-1 py-6 text-xs text-fab-dim">{readOnly ? "No unranked items." : "Search below to add heroes & cards, then drag them up."}</p>
            ) : (
              (placement[POOL_ID] || []).map((iid) =>
                items[iid] ? <SortableItem key={iid} item={items[iid]} onRemove={readOnly ? undefined : removeItem} onRename={readOnly ? undefined : renameItem} disabled={readOnly} hideRemove={exporting} /> : null,
              )
            )}
          </DroppableArea>
        </div>

        <DragOverlay>{activeItem ? <ItemTile item={activeItem} dragging /> : null}</DragOverlay>
      </DndContext>

      {!readOnly && <AddItemBar onAdd={addItem} />}
      {readOnly && (
        <p className="text-center text-xs text-fab-dim">
          Viewing {initial?.ownerName ? `${initial.ownerName}'s` : "a shared"} tier list. Sign in and make your own.
        </p>
      )}
    </div>
  );
}

function ToolbarBtn({ onClick, icon, label, disabled }: { onClick: () => void; icon: ReactNode; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg border border-fab-border bg-fab-bg px-3 py-2 text-sm font-bold text-fab-text hover:border-fab-gold/50 hover:text-fab-gold disabled:opacity-40"
    >
      {icon}
      {label}
    </button>
  );
}

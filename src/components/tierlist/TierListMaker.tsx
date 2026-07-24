"use client";
import { useState, useRef, useCallback, type ReactNode } from "react";
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
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Download, Save, Share2, Plus, Trash2, ChevronUp, ChevronDown, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { downloadCardImage } from "@/lib/share-image";
import {
  DEFAULT_TIERS,
  TIER_COLORS,
  POOL_ID,
  makeTier,
  newTierListId,
  saveTierList,
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
    return { id: "", title: "My FaB Tier List", tiers: DEFAULT_TIERS, items: {} as Record<string, TierItem>, placement };
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
  return { id: initial.id, title: initial.title || "Tier List", tiers, items, placement };
}

/** A droppable container (a tier row's items area or the pool). */
function DroppableArea({ id, itemIds, className, children }: { id: string; itemIds: string[]; className: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <SortableContext id={id} items={itemIds} strategy={rectSortingStrategy}>
      <div ref={setNodeRef} className={`${className} ${isOver ? "bg-fab-gold/5" : ""}`}>
        {children}
      </div>
    </SortableContext>
  );
}

export function TierListMaker({ initial }: { initial?: TierListDoc }) {
  const { user, profile, isGuest } = useAuth();
  const start = initFrom(initial);

  const [docId, setDocId] = useState(start.id);
  const [title, setTitle] = useState(start.title);
  const [tiers, setTiers] = useState<Tier[]>(start.tiers);
  const [items, setItems] = useState<Record<string, TierItem>>(start.items);
  const [placement, setPlacement] = useState<Placement>(start.placement);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);

  const ownsList = !!user && (!initial || initial.ownerUid === user.uid);
  const readOnly = !!initial && !ownsList;

  // Mouse drags on a small move; touch needs a short press-hold so a swipe still
  // scrolls the page (tiles have no touch-action:none). Keyboard for a11y.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
        const newIndex = arr.indexOf(overId);
        if (oldIndex < 0 || newIndex < 0) return prev;
        return { ...prev, [from]: arrayMove(arr, oldIndex, newIndex) };
      });
    }
  }

  // ── Item + tier mutations ──
  const addItem = useCallback((item: TierItem) => {
    setItems((prev) => ({ ...prev, [item.id]: item }));
    setPlacement((prev) => ({ ...prev, [POOL_ID]: [...prev[POOL_ID], item.id] }));
  }, []);

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

  // ── Export / save / share ──
  async function exportPng() {
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 30)); // let the export chrome settle
      const ok = await downloadCardImage(captureRef.current, {
        fileName: `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "tier-list"}.png`,
        backgroundColor: "#0a0a0b",
        pixelRatio: 2,
      });
      if (!ok) toast.error("Could not build the image.");
    } catch {
      toast.error("Export failed — custom images from other sites can block it (CORS).");
    }
    setExporting(false);
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
      const list: TierListDoc = {
        id,
        title: title.trim() || "Untitled Tier List",
        tiers,
        placement,
        items,
        ownerUid: user.uid,
        ownerName: profile.displayName || profile.username,
        isPublic: true,
        createdAt: initial?.createdAt || now,
        updatedAt: now,
      };
      await saveTierList(list);
      if (!docId) {
        setDocId(id);
        // Update the URL for sharing without a router re-fetch (the page reads the
        // id once on mount), so saving never remounts or reloads the live board.
        window.history.replaceState(null, "", `/tierlist?id=${id}`);
      }
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

  async function share() {
    const id = docId || (await save()); // use the id save() returns — not stale state
    if (!id) return;
    const url = `${window.location.origin}/tierlist?id=${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied.");
    } catch {
      toast.info(url);
    }
  }

  const activeItem = activeId ? items[activeId] : null;

  return (
    <div className="space-y-4">
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
            <ToolbarBtn onClick={save} disabled={saving || isGuest} icon={<Save className="h-4 w-4" />} label={saving ? "Saving…" : "Save"} />
            <ToolbarBtn onClick={share} icon={<Share2 className="h-4 w-4" />} label="Share" />
          </>
        )}
        <ToolbarBtn onClick={exportPng} disabled={exporting} icon={<Download className="h-4 w-4" />} label={exporting ? "…" : "PNG"} />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        {/* Capture area: title + tier rows */}
        <div ref={captureRef} className="overflow-hidden rounded-xl border border-fab-border bg-fab-bg">
          <div className="border-b border-fab-border bg-fab-surface px-4 py-2.5 text-center text-base font-black tracking-wide text-fab-text">
            {title || "Tier List"}
          </div>
          {tiers.map((tier, idx) => (
            <div key={tier.id} className="group/row flex items-stretch border-b border-fab-border last:border-b-0">
              {/* Tier label */}
              <div className="relative flex w-[72px] shrink-0 items-center justify-center" style={{ backgroundColor: tier.color }}>
                <input
                  value={tier.label}
                  onChange={(e) => updateTier(tier.id, { label: e.target.value })}
                  disabled={readOnly}
                  className="w-full bg-transparent px-1 py-3 text-center text-xl font-black text-black/85 focus:outline-none"
                  style={{ minWidth: 0 }}
                />
              </div>
              {/* Items */}
              <DroppableArea id={tier.id} itemIds={placement[tier.id] || []} className="flex min-h-[88px] flex-1 flex-wrap content-start gap-1 p-1.5">
                {(placement[tier.id] || []).map((iid) =>
                  items[iid] ? <SortableItem key={iid} item={items[iid]} onRemove={readOnly ? undefined : removeItem} disabled={readOnly} /> : null,
                )}
              </DroppableArea>
              {/* Row controls (hover) */}
              {!readOnly && (
                <div className="flex w-8 shrink-0 flex-col items-center justify-center gap-0.5 border-l border-fab-border/60 bg-fab-surface opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100">
                  <button type="button" title="Color" onClick={() => setColorPickerFor(colorPickerFor === tier.id ? null : tier.id)} className="h-4 w-4 rounded-full border border-black/20" style={{ backgroundColor: tier.color }} />
                  <button type="button" title="Move up" onClick={() => moveTier(tier.id, -1)} disabled={idx === 0} className="text-fab-dim hover:text-fab-text disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button type="button" title="Move down" onClick={() => moveTier(tier.id, 1)} disabled={idx === tiers.length - 1} className="text-fab-dim hover:text-fab-text disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                  <button type="button" title="Delete row" onClick={() => removeTier(tier.id)} className="text-fab-dim hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
              {colorPickerFor === tier.id && !readOnly && (
                <div className="absolute right-8 z-30 mt-1 flex max-w-[160px] flex-wrap gap-1 rounded-md border border-fab-border bg-fab-surface p-1.5 shadow-xl">
                  {TIER_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => { updateTier(tier.id, { color: c }); setColorPickerFor(null); }} className="h-5 w-5 rounded border border-black/20" style={{ backgroundColor: c }} />
                  ))}
                </div>
              )}
            </div>
          ))}
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
                items[iid] ? <SortableItem key={iid} item={items[iid]} onRemove={readOnly ? undefined : removeItem} disabled={readOnly} /> : null,
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

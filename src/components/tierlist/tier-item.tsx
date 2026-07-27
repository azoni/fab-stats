"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { itemImageSources, type TierItem } from "@/lib/tierlists";

/** Pure visual tile — used for placed items and the drag overlay. Big enough to
 *  recognize the card, with the name always shown beneath it. Walks the item's image
 *  sources (CDN render → TCGplayer scan, re-derived from the card DB) on load error,
 *  then a clean name box — so a card the community CDN hasn't published never shows a
 *  broken-image icon. No cross-tile failure cache, so a transient error self-heals on
 *  the next mount instead of hiding the image for the whole session. */
export function ItemTile({ item, dragging, onRename }: { item: TierItem; dragging?: boolean; onRename?: (id: string, label: string) => void }) {
  const sources = itemImageSources(item);
  const [srcIdx, setSrcIdx] = useState(0);
  const [editingLabel, setEditingLabel] = useState(false);
  const [draftLabel, setDraftLabel] = useState(item.label);
  function commitLabel() {
    const v = draftLabel.trim();
    if (v && v !== item.label) onRename?.(item.id, v);
    setEditingLabel(false);
  }
  // Restart from the best source when the tile is reused for a different item
  // (the drag overlay) or the item's image changes.
  useEffect(() => setSrcIdx(0), [item.id, item.imageUrl, item.imageUrlFallback, item.refId]);
  const src = sources[srcIdx];

  // Hover-zoom: the tiles stay small (many per tier), but hovering one shows the full
  // card large + crisp in a fixed-position preview portaled to <body>, so it escapes
  // the maker's overflow-hidden clipping. Desktop (hover) only.
  const [zoom, setZoom] = useState<{ left: number; top: number; align: "left" | "right" } | null>(null);
  function openZoom(e: React.MouseEvent<HTMLDivElement>) {
    if (!src || dragging) return;
    if (typeof window === "undefined" || !window.matchMedia("(hover: hover)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const W = 310;
    const align: "left" | "right" = r.right + W <= window.innerWidth ? "right" : "left";
    setZoom({
      left: align === "right" ? r.right + 10 : r.left - 10,
      top: Math.min(Math.max(r.top + r.height / 2, 12), window.innerHeight - 12),
      align,
    });
  }
  const closeZoom = () => setZoom(null);

  return (
    <div
      className="w-[96px] shrink-0 select-none sm:w-[112px]"
      onMouseEnter={openZoom}
      onMouseLeave={closeZoom}
      onPointerDown={closeZoom}
    >
      <div
        className={`relative h-[134px] w-full overflow-hidden rounded-md border border-fab-border bg-fab-bg sm:h-[157px] ${
          dragging ? "shadow-2xl ring-2 ring-fab-gold" : "shadow-sm"
        }`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={item.label}
            draggable={false}
            loading="lazy"
            onError={() => setSrcIdx((i) => i + 1)}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-1 text-center text-[11px] font-bold text-fab-dim">
            {item.label}
          </div>
        )}
      </div>
      {onRename && editingLabel ? (
        <input
          autoFocus
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          // The board uses MouseSensor/TouchSensor (not PointerSensor), so stop those
          // exact streams — otherwise click-dragging to select the text picks the tile up.
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            // Keep keys (esp. Space) from bubbling to dnd-kit's KeyboardSensor, which
            // would otherwise pick the tile up for a keyboard drag while you're typing.
            e.stopPropagation();
            if (e.key === "Enter") { e.preventDefault(); commitLabel(); }
            else if (e.key === "Escape") { setDraftLabel(item.label); setEditingLabel(false); }
          }}
          className="mt-1 w-full rounded bg-fab-bg px-1 py-0.5 text-center text-[10px] font-medium text-fab-text outline-none ring-1 ring-fab-gold/60 sm:text-[11px]"
        />
      ) : (
        <div
          className={`mt-1 line-clamp-2 text-center text-[10px] font-medium leading-[1.15] text-fab-text sm:text-[11px] ${onRename ? "cursor-text hover:text-fab-gold" : ""}`}
          title={onRename ? "Click to rename" : item.label}
          onClick={onRename ? (e) => { e.stopPropagation(); setDraftLabel(item.label); setEditingLabel(true); } : undefined}
        >
          {item.label}
        </div>
      )}

      {zoom && src && typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: zoom.left,
              top: zoom.top,
              transform: `translate(${zoom.align === "right" ? "0" : "-100%"}, -50%)`,
              zIndex: 9999,
            }}
            className="pointer-events-none rounded-lg border border-fab-gold/40 bg-fab-bg p-1.5 shadow-2xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="block w-[288px] rounded-md" />
            <p className="mt-1 w-[288px] truncate text-center text-xs font-semibold text-fab-text">{item.label}</p>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Sortable, draggable item. `disabled` stops dragging (read-only shared view);
 *  `hideRemove` hides the × for a clean PNG export. */
export function SortableItem({
  item,
  onRemove,
  onRename,
  disabled,
  hideRemove,
}: {
  item: TierItem;
  onRemove?: (id: string) => void;
  onRename?: (id: string, label: string) => void;
  disabled?: boolean;
  hideRemove?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`}
    >
      <ItemTile item={item} onRename={onRename} />
      {onRemove && !hideRemove && (
        <button
          type="button"
          aria-label={`Remove ${item.label}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          // Always tappable on touch (no hover); hover-reveal on mouse devices.
          className="absolute right-0.5 top-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/75 text-xs leading-none text-white hover:bg-rose-600 [@media(hover:hover)]:hidden [@media(hover:hover)]:group-hover:flex"
        >
          ×
        </button>
      )}
    </div>
  );
}

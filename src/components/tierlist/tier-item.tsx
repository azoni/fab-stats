"use client";
import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TierItem } from "@/lib/tierlists";

/** Image URLs already known to 404 this session, so a remounted tile (e.g. the drag
 *  overlay) starts from the known-good source instead of re-flashing the broken one. */
const failedSrc = new Set<string>();

/** Pure visual tile — used for placed items and the drag overlay. Big enough to
 *  read the card art, with the name always shown beneath it. Tries the primary CDN
 *  image, then a TCGplayer fallback (newest sets), then a clean name box — so a
 *  card the community CDN hasn't published never shows a broken-image icon. */
export function ItemTile({ item, dragging }: { item: TierItem; dragging?: boolean }) {
  const sources = [item.imageUrl, item.imageUrlFallback].filter(Boolean) as string[];
  const firstOk = (srcs: string[]) => {
    let i = 0;
    while (i < srcs.length && failedSrc.has(srcs[i])) i++;
    return i;
  };
  const [srcIdx, setSrcIdx] = useState(() => firstOk(sources));
  // Re-resolve when the tile is reused for a different item (the drag overlay),
  // skipping sources already known to have failed this session.
  useEffect(() => {
    setSrcIdx(firstOk([item.imageUrl, item.imageUrlFallback].filter(Boolean) as string[]));
  }, [item.imageUrl, item.imageUrlFallback]);
  const src = sources[srcIdx];

  return (
    <div className="w-[88px] shrink-0 select-none">
      <div
        className={`relative h-[124px] w-full overflow-hidden rounded-md border border-fab-border bg-fab-bg ${
          dragging ? "shadow-2xl ring-2 ring-fab-gold" : "shadow-sm"
        }`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={item.label}
            draggable={false}
            onError={() => {
              failedSrc.add(src);
              setSrcIdx((i) => i + 1);
            }}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-1 text-center text-[10px] font-bold text-fab-dim">
            {item.label}
          </div>
        )}
      </div>
      <div className="mt-0.5 line-clamp-2 text-center text-[10px] font-medium leading-[1.15] text-fab-text" title={item.label}>
        {item.label}
      </div>
    </div>
  );
}

/** Sortable, draggable item. `disabled` stops dragging (read-only shared view);
 *  `hideRemove` hides the × for a clean PNG export. */
export function SortableItem({
  item,
  onRemove,
  disabled,
  hideRemove,
}: {
  item: TierItem;
  onRemove?: (id: string) => void;
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
      <ItemTile item={item} />
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

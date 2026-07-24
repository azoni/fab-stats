"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TierItem } from "@/lib/tierlists";

/** Pure visual tile — used for both placed items and the drag overlay. */
export function ItemTile({ item, dragging }: { item: TierItem; dragging?: boolean }) {
  return (
    <div
      className={`relative h-[76px] w-[54px] shrink-0 overflow-hidden rounded-md border border-fab-border bg-fab-bg ${
        dragging ? "shadow-2xl ring-2 ring-fab-gold" : ""
      }`}
    >
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={item.label}
          title={item.label}
          draggable={false}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-1 text-center text-[9px] font-bold text-fab-dim">
          {item.label}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/65 px-1 py-0.5 text-center text-[8px] font-semibold leading-tight text-white opacity-0 transition-opacity group-hover:opacity-100">
        {item.label}
      </div>
    </div>
  );
}

/** Sortable, draggable item. `disabled` stops dragging (read-only shared view). */
export function SortableItem({ item, onRemove, disabled }: { item: TierItem; onRemove?: (id: string) => void; disabled?: boolean }) {
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
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${item.label}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          // Always tappable on touch (no hover); hover-reveal on mouse devices.
          className="absolute right-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black/75 text-[11px] leading-none text-white hover:bg-rose-600 [@media(hover:hover)]:hidden [@media(hover:hover)]:group-hover:flex"
        >
          ×
        </button>
      )}
    </div>
  );
}

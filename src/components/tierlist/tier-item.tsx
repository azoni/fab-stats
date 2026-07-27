"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TierItem } from "@/lib/tierlists";

/** Pure visual tile — used for placed items and the drag overlay. Big enough to
 *  read the card art, with the name always shown beneath it. */
export function ItemTile({ item, dragging }: { item: TierItem; dragging?: boolean }) {
  return (
    <div className="w-[80px] shrink-0 select-none">
      <div
        className={`relative h-[112px] w-full overflow-hidden rounded-md border border-fab-border bg-fab-bg ${
          dragging ? "shadow-2xl ring-2 ring-fab-gold" : ""
        }`}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.label} draggable={false} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-1 text-center text-[10px] font-bold text-fab-dim">
            {item.label}
          </div>
        )}
      </div>
      <div className="mt-0.5 truncate text-center text-[9px] leading-tight text-fab-muted" title={item.label}>
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

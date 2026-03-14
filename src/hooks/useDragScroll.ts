import { useRef, useCallback } from "react";

/**
 * Drag-to-scroll hook for scrollable containers.
 * Listeners are attached on mousedown and cleaned up on mouseup so
 * there is no stale-ref problem when the scrollable element mounts late.
 */
export function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    e.preventDefault();
    moved.current = false;

    const startX = e.clientX;
    const startY = e.clientY;
    const scrollL = el.scrollLeft;
    const scrollT = el.scrollTop;
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
      el.scrollLeft = scrollL - dx;
      el.scrollTop = scrollT - dy;
    };

    const onMouseUp = () => {
      el.style.cursor = "grab";
      el.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  return { ref, onMouseDown, movedRef: moved };
}

"use client";

import { useRef, useState } from "react";
import { Move, Crosshair, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { updateLeagueBannerPosition, LEAGUE_DESK_SCRIM, type BannerPosition } from "@/lib/league-images";

const CENTER: BannerPosition = { x: 50, y: 50 };
const SNAP = 6; // % window that snaps to dead-center
const STEP = 2; // arrow-key nudge %

/**
 * Drag-to-reposition control for a league banner. Direct-pan model: grab the
 * photo and drag to frame it — the drag maps 1:1 to CSS object-position.
 *
 * Zero useEffect by design (pointer capture instead of window listeners, drag
 * state in refs), so the deploy-blocking react-hooks/exhaustive-deps rule can't
 * fire. Explicit Save matches the editor's save-on-click UX and keeps writes to
 * one per Save. Overlays the exact scrim the real header ships so the organizer
 * judges readability, not just framing.
 */
export function BannerFocalPicker({
  leagueId,
  url,
  value,
  onSaved,
}: {
  leagueId: string;
  url: string;
  value?: BannerPosition;
  onSaved?: () => void;
}) {
  const initial = value ?? CENTER;
  const [pos, setPos] = useState<BannerPosition>(initial);
  // Last-saved value as state (not a ref) so `dirty` can read it during render.
  const [saved, setSaved] = useState<BannerPosition>(initial);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  const boxRef = useRef<HTMLDivElement | null>(null);
  const natRef = useRef<{ w: number; h: number } | null>(null); // image natural size (from onLoad)
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; from: BannerPosition } | null>(null);

  const dirty = pos.x !== saved.x || pos.y !== saved.y;
  const atCenter = pos.x === 50 && pos.y === 50;

  // True cover-fit slack (px the image overflows the frame on each axis), live.
  function overflow(): { ox: number; oy: number } {
    const box = boxRef.current;
    const nat = natRef.current;
    if (!box || !nat) return { ox: 0, oy: 0 };
    const cw = box.clientWidth;
    const ch = box.clientHeight;
    const s = Math.max(cw / nat.w, ch / nat.h); // cover scale
    return { ox: nat.w * s - cw, oy: nat.h * s - ch };
  }

  function clampSnap(n: number): number {
    let v = Math.min(100, Math.max(0, n));
    if (Math.abs(v - 50) < SNAP) v = 50; // soft snap to center
    return Math.round(v); // store integers
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!natRef.current) return; // wait for the image to load
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId); // keep tracking outside the box
    // preventDefault() above suppresses the compat-mousedown's focus, so focus
    // explicitly — otherwise the arrow-key nudges never reach onKeyDown after a click.
    e.currentTarget.focus();
    const { ox, oy } = overflow();
    drag.current = { sx: e.clientX, sy: e.clientY, ox, oy, from: pos };
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    // At position p%, the image is offset by -overflow*p/100. Dragging the photo
    // right (dx>0) should reveal more of its left edge → p decreases.
    const nx = d.ox > 0 ? d.from.x - (100 * dx) / d.ox : d.from.x;
    const ny = d.oy > 0 ? d.from.y - (100 * dy) / d.oy : d.from.y;
    setPos({ x: clampSnap(nx), y: clampSnap(ny) });
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    drag.current = null;
    setDragging(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const map: Record<string, [number, number]> = {
      ArrowLeft: [-STEP, 0],
      ArrowRight: [STEP, 0],
      ArrowUp: [0, -STEP],
      ArrowDown: [0, STEP],
    };
    const m = map[e.key];
    if (!m) return;
    e.preventDefault();
    setPos((p) => ({ x: clampSnap(p.x + m[0]), y: clampSnap(p.y + m[1]) }));
  }

  async function save() {
    setSaving(true);
    try {
      await updateLeagueBannerPosition(leagueId, pos);
      setSaved(pos);
      toast.success("Banner position saved.");
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save position.");
    }
    setSaving(false);
  }

  return (
    <div className="mt-2">
      <div
        ref={boxRef}
        tabIndex={0}
        role="application"
        aria-label="Drag to reposition banner"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className={`relative aspect-[5/2] w-full touch-none select-none overflow-hidden rounded-lg border border-fab-border focus:outline-none focus:ring-2 focus:ring-fab-gold/50 ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          draggable={false}
          onLoad={(e) => {
            natRef.current = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight };
          }}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
        />
        {/* The same scrim the real header ships — judge framing against the result. */}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: LEAGUE_DESK_SCRIM }} />
        {dragging && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-y-0 left-1/3 w-px bg-white/25" />
            <div className="absolute inset-y-0 left-2/3 w-px bg-white/25" />
            <div className="absolute inset-x-0 top-1/3 h-px bg-white/25" />
            <div className="absolute inset-x-0 top-2/3 h-px bg-white/25" />
          </div>
        )}
        <Crosshair
          aria-hidden
          className={`pointer-events-none absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 transition-colors ${
            atCenter ? "text-fab-gold" : "text-white/70"
          }`}
        />
        <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white/90 backdrop-blur-sm">
          <Move className="h-3 w-3" /> Drag to reposition
        </span>
        <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-white/80">
          {pos.x} · {pos.y}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPos(CENTER)}
          disabled={atCenter}
          className="inline-flex items-center gap-1.5 rounded-md border border-fab-border bg-fab-bg px-2.5 py-2 text-xs font-bold text-fab-text hover:border-fab-gold/40 hover:text-fab-gold disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Center
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 rounded-md border border-fab-gold/50 bg-fab-gold/15 px-3 py-2 text-xs font-bold text-fab-gold hover:bg-fab-gold/25 disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" /> {saving ? "Saving…" : dirty ? "Save position" : "Saved"}
        </button>
        <span className="ml-auto text-[11px] text-fab-dim">Drag the photo (or arrow keys) to choose what shows.</span>
      </div>
    </div>
  );
}

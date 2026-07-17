"use client";
/**
 * "Recent visitors" row on a profile — the last few signed-in viewers, each shown
 * with their equipped avatar frame. Flag-gated + renders nothing when empty, so
 * it's dormant and non-disruptive until the cosmetics system is revealed.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { COSMETICS_ENABLED } from "@/lib/cosmetics/flags";
import { fetchRecentVisitors, type VisitorEntry } from "@/lib/cosmetics/visitors";
import { getCosmeticById } from "@/lib/cosmetics/catalog";
import { useCosmeticCatalog } from "@/lib/cosmetics/use-cosmetics";
import { CosmeticPreview } from "@/components/cosmetics/CosmeticPreview";

function VisitorAvatar({ v }: { v: VisitorEntry }) {
  const [imgOk, setImgOk] = useState(true);
  const frame = getCosmeticById(v.frameId);
  const initial = (v.displayName || "?").charAt(0).toUpperCase();
  const size = 34;
  // Fall back to the initial if the photo is missing OR fails to load (e.g. a
  // legacy record that stored a truncated data-URI, or a blocked cross-origin URL).
  return (
    <div className="relative isolate shrink-0" style={{ width: size, height: size }} title={v.displayName || "Player"}>
      <div className="relative z-10">
        {v.photoUrl && imgOk ? (
          <img
            src={v.photoUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgOk(false)}
            className="h-[34px] w-[34px] rounded-full border border-fab-bg object-cover"
          />
        ) : (
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-fab-bg bg-fab-gold/20 text-xs font-bold text-fab-gold">
            {initial}
          </div>
        )}
      </div>
      {frame && <CosmeticPreview item={frame} context="avatar" size={size} />}
    </div>
  );
}

export function VisitorsRow({ profileUid }: { profileUid: string }) {
  const [visitors, setVisitors] = useState<VisitorEntry[]>([]);
  // Load the catalog once so each avatar's frame resolves via getCosmeticById.
  useCosmeticCatalog();

  useEffect(() => {
    if (!COSMETICS_ENABLED || !profileUid) return;
    let alive = true;
    fetchRecentVisitors(profileUid, 12)
      .then((v) => alive && setVisitors(v))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [profileUid]);

  if (!COSMETICS_ENABLED || visitors.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-fab-dim">Recent visitors</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {visitors.map((v) =>
          v.username ? (
            <Link
              key={v.uid}
              href={`/player/${encodeURIComponent(v.username)}`}
              className="transition-transform hover:-translate-y-0.5"
            >
              <VisitorAvatar v={v} />
            </Link>
          ) : (
            <VisitorAvatar key={v.uid} v={v} />
          ),
        )}
      </div>
    </div>
  );
}

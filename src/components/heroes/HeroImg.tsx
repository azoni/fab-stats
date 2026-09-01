"use client";
import { useState } from "react";
import { getHeroByName, getHeroPortraitUrl, resolveHeroName } from "@/lib/heroes";
import { heroThumbUrl } from "@/lib/image-cdn";

export function HeroImg({ name, size = "sm" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const canonicalName = resolveHeroName(name) || name;
  const hero = getHeroByName(canonicalName);
  const portrait = getHeroPortraitUrl(canonicalName);
  // URLs that have failed to load for this element; the next candidate in the
  // chain takes over: CDN thumbnail → full portrait → card art → letter badge.
  const [failed, setFailed] = useState<string[]>([]);
  const dim = size === "lg" ? "w-10 h-10" : size === "md" ? "w-7 h-7" : "w-5 h-5";

  const candidates: string[] = [];
  if (portrait) {
    const thumb = heroThumbUrl(portrait);
    if (thumb !== portrait) candidates.push(thumb);
    candidates.push(portrait);
  }
  if (hero?.imageUrl) candidates.push(hero.imageUrl);
  const imgUrl = candidates.find((c) => !failed.includes(c));

  if (!imgUrl) {
    const cls = hero?.classes[0] || "";
    return (
      <span className={`inline-flex items-center justify-center ${dim} rounded-full bg-fab-surface text-fab-muted text-[9px] font-bold shrink-0 border border-fab-border`} title={cls}>
        {cls.charAt(0) || "?"}
      </span>
    );
  }
  return (
    <img
      src={imgUrl}
      alt={canonicalName}
      className={`${dim} rounded-full object-cover object-top shrink-0 border border-fab-border`}
      loading="lazy"
      onError={() => setFailed((prev) => (prev.includes(imgUrl) ? prev : [...prev, imgUrl]))}
    />
  );
}

"use client";
import { useState } from "react";
import { getHeroByName, getHeroPortraitUrl } from "@/lib/heroes";

export function HeroImg({ name, size = "sm" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const hero = getHeroByName(name);
  const portrait = getHeroPortraitUrl(name);
  const [portraitFailed, setPortraitFailed] = useState(false);
  const dim = size === "lg" ? "w-10 h-10" : size === "md" ? "w-7 h-7" : "w-5 h-5";

  const imgUrl = (!portraitFailed && portrait) || hero?.imageUrl;

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
      alt={name}
      className={`${dim} rounded-full object-cover object-top shrink-0 border border-fab-border`}
      loading="lazy"
      onError={portrait && !portraitFailed ? () => setPortraitFailed(true) : undefined}
    />
  );
}

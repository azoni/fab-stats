import { getHeroByName, getHeroPortraitUrl } from "@/lib/heroes";

export function HeroImg({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const hero = getHeroByName(name);
  const portrait = getHeroPortraitUrl(name);
  const dim = size === "md" ? "w-7 h-7" : "w-5 h-5";
  const imgUrl = portrait || hero?.imageUrl;
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
    />
  );
}

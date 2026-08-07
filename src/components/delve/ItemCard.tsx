"use client";
/**
 * An item rendered with the cosmetics material engine — the rarity IS the
 * material (worn=bronze, tempered=silver, ordained=gold, mythic=mythic), so a
 * mythic drop is the engraved-purple moment with zero new art.
 */
import { MATERIALS, type Material } from "@/components/cosmetics/materials";
import type { ItemRoll, Rarity } from "@/lib/delve/types";
import { ITEM_BASE_BY_ID, AFFIX_BY_ID } from "@/lib/delve/content";
import { statBudget, slotOf, ENHANCE_PCT_PER_TIER } from "@/lib/delve/balance";

export const RARITY_MATERIAL: Record<Rarity, Material> = {
  worn: "bronze",
  tempered: "silver",
  ordained: "gold",
  mythic: "mythic",
};

export const RARITY_LABEL: Record<Rarity, string> = {
  worn: "Worn",
  tempered: "Tempered",
  ordained: "Ordained",
  mythic: "Mythic",
};

const SLOT_GLYPH: Record<string, string> = {
  weapon: "M14 50 L44 20 L50 14 L52 20 L46 26 L18 54 Z M40 40 L48 48",
  helm: "M16 40 Q16 18 32 16 Q48 18 48 40 L42 40 L42 30 L22 30 L22 40 Z",
  armor: "M20 14 L44 14 L50 24 L44 52 L20 52 L14 24 Z M32 14 L32 52",
  charm: "M32 12 L44 26 L32 52 L20 26 Z M32 12 L32 52 M20 26 L44 26",
  relic: "M24 16 L40 16 L46 30 L32 52 L18 30 Z M32 22 L32 34",
};

export function ItemCard({
  item,
  compact = false,
  onClick,
  selected = false,
}: {
  item: ItemRoll;
  compact?: boolean;
  onClick?: () => void;
  selected?: boolean;
}) {
  const base = ITEM_BASE_BY_ID.get(item.id);
  const m = MATERIALS[RARITY_MATERIAL[item.rarity]];
  const slot = slotOf(item);
  // Same math as effectiveStats — the label must move when the item is enhanced.
  const budget = Math.round(statBudget(slot, item.ilvl) * (1 + (ENHANCE_PCT_PER_TIER * item.enhance) / 100));
  const primaryLabel = slot === "weapon" ? `+${budget} ATK` : slot === "relic" ? `+${Math.round(budget * 0.5)} ATK` : `+${slot === "armor" ? Math.round(budget * 1.5) : budget} HP`;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={base?.name}
        className={`relative flex aspect-square w-full items-center justify-center rounded-lg border-2 bg-fab-bg/70 transition-all hover:brightness-125 ${selected ? "ring-2 ring-fab-gold" : ""}`}
        style={{ borderColor: m.mid }}
      >
        <svg viewBox="0 0 64 64" className="h-3/5 w-3/5">
          <path d={SLOT_GLYPH[slot]} fill="none" stroke={m.specular} strokeWidth={2.5} strokeLinejoin="round" />
        </svg>
        {item.enhance > 0 && (
          <span className="absolute right-0.5 top-0.5 rounded bg-black/70 px-0.5 text-[9px] font-bold" style={{ color: m.specular }}>
            +{item.enhance}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl border-2 p-3"
      style={{
        borderColor: m.mid,
        background: `linear-gradient(160deg, ${m.edge}22, var(--color-fab-bg, #0c0c0f) 55%)`,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border" style={{ borderColor: m.edge, background: `${m.edge}33` }}>
          <svg viewBox="0 0 64 64" className="h-9 w-9">
            <path d={SLOT_GLYPH[slot]} fill="none" stroke={m.specular} strokeWidth={2.5} strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black" style={{ color: m.specular }}>
            {base?.name ?? item.id}
            {item.enhance > 0 && <span className="ml-1">+{item.enhance}</span>}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: m.mid }}>
            {RARITY_LABEL[item.rarity]} {slot} · ilvl {item.ilvl}
          </p>
          <p className="mt-1 text-xs font-bold text-fab-text">{primaryLabel}</p>
          <ul className="mt-0.5 space-y-0.5">
            {item.affixes.map((a) => {
              const d = AFFIX_BY_ID.get(a.id);
              if (!d) return null;
              return (
                <li key={a.id} className="text-[11px] text-fab-muted">
                  {d.name}: +{a.roll}
                  {d.pct ? "%" : ""} {statLabel(d.stat)}
                </li>
              );
            })}
          </ul>
          {base?.flavor && <p className="mt-1 text-[10px] italic text-fab-dim">{base.flavor}</p>}
        </div>
      </div>
    </div>
  );
}

function statLabel(stat: string): string {
  switch (stat) {
    case "crit": return "Crit";
    case "atk": return "ATK";
    case "hp": return "HP";
    case "def": return "DEF";
    case "spd": return "SPD";
    case "lifesteal": return "Lifesteal";
    case "marksFind": return "Marks Found";
    case "xpFind": return "XP Gained";
    default: return stat;
  }
}

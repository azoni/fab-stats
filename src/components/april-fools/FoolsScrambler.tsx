"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAprilFools } from "@/contexts/AprilFoolsContext";

/**
 * Global DOM stat scrambler for April Fools.
 * Uses MutationObserver to find and scramble visible numbers and percentages
 * across the entire page. Saves originals to restore when toggled off.
 */

// Deterministic hash for consistent scrambling
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seeded(seed: number, i: number): number {
  const x = Math.sin(seed + i) * 10000;
  return x - Math.floor(x);
}

// Scramble a number string deterministically
function scrambleNumber(original: string, context: string): string {
  const num = parseFloat(original.replace(/,/g, ""));
  if (isNaN(num)) return original;

  const h = hash(context + original);
  const r = seeded(h, 0);

  // Percentages (contains % nearby or is a decimal like 64.0)
  if (original.includes(".") && num < 100 && num > 0) {
    // Win rate — make absurd
    const fooled = r > 0.4 ? (90 + r * 9.9) : (1 + r * 18);
    return fooled.toFixed(original.includes(".") ? 1 : 0);
  }

  // Small numbers (1-20) — could be streaks, top 8s, etc.
  if (num >= 1 && num <= 20 && !original.includes(",")) {
    const jokes = [42, 69, 420, 1337, 99, 314, 777, 9001];
    return jokes[h % jokes.length].toString();
  }

  // Medium-large numbers — multiply absurdly
  if (num > 20) {
    const factor = 10 + r * 190;
    const fooled = Math.round(num * factor);
    return fooled.toLocaleString();
  }

  return original;
}

// Known FaB hero first names to detect and replace
const HERO_FIRST_NAMES = new Set([
  "Bravo", "Dorinthea", "Boltyn", "Prism", "Lexi", "Oldhim", "Briar",
  "Chane", "Levia", "Viserai", "Rhinar", "Kayo", "Azalea", "Ira",
  "Katsu", "Ninja", "Fai", "Dromai", "Dash", "Maxx", "Teklovossen",
  "Data Doll", "Zen", "Enigma", "Nuu", "Taipanis", "Kano", "Verdance",
  "Terra", "Florian", "Oscilio", "Betsy", "Kassai", "Uzuri", "Arakni",
  "Riptide", "Vynnset", "Aurora", "Olympia", "Victor", "Jarl",
]);

const JOKE_HEROES = [
  "Bravo, Star of the Bench",
  "Dorinthea, Blade of Snacks",
  "Rhinar, Reckless Napper",
  "Katsu, the Couch Potato",
  "Dash, Inventor of Excuses",
  "Lexi, Livewire of Netflix",
  "Prism, Sculptor of Memes",
  "Chane, Bound by Deadlines",
  "Fai, Rising Dumpster Fire",
  "Oldhim, Grandfather of Hot Takes",
  "Kano, Dracai of Microwave Dinners",
  "Enigma, Master of Lost Keys",
  "Zen, Tamer of Mondays",
  "Ira, Crimson Procrastinator",
  "Azalea, Ace in Hiding",
];

function scrambleHeroName(text: string): string | null {
  const firstWord = text.trim().split(/[\s,]/)[0];
  if (HERO_FIRST_NAMES.has(firstWord)) {
    const h = hash(text);
    const joke = JOKE_HEROES[h % JOKE_HEROES.length];
    // Return just the first name part if the original was just a first name
    if (!text.includes(",") && !text.includes(" ")) {
      return joke.split(",")[0];
    }
    return joke;
  }
  return null;
}

const ORIGINAL_DATA = new WeakMap<Text, string>();
const SCRAMBLED_NODES = new Set<Text>();

function processTextNode(node: Text) {
  const text = node.textContent;
  if (!text || text.trim().length === 0) return;

  // Skip if inside nav, script, style, input, textarea, or the fools banner itself
  const parent = node.parentElement;
  if (!parent) return;
  const tag = parent.tagName;
  if (tag === "SCRIPT" || tag === "STYLE" || tag === "INPUT" || tag === "TEXTAREA" || tag === "CODE" || tag === "PRE") return;
  if (parent.closest("nav") || parent.closest(".fools-banner") || parent.closest("[contenteditable]")) return;
  // Skip support page
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/support")) return;
  // Skip settings, admin, deck
  if (typeof window !== "undefined" && (window.location.pathname.startsWith("/settings") || window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/deck"))) return;

  // Save original
  if (!ORIGINAL_DATA.has(node)) {
    ORIGINAL_DATA.set(node, text);
  }

  let modified = text;

  // Try hero name replacement
  const heroReplacement = scrambleHeroName(text.trim());
  if (heroReplacement) {
    modified = heroReplacement;
  } else {
    // Scramble numbers (percentages, counts, etc.)
    modified = text.replace(/\d[\d,]*\.?\d*/g, (match) => {
      // Don't scramble dates (YYYY-MM-DD patterns)
      if (/^\d{4}-\d{2}/.test(match)) return match;
      // Don't scramble tiny numbers that are likely not stats (0, 1 alone)
      if (match === "0" || match === "1") return match;
      return scrambleNumber(match, node.parentElement?.className || "");
    });
  }

  if (modified !== text) {
    node.textContent = modified;
    SCRAMBLED_NODES.add(node);
  }
}

function restoreAll() {
  for (const node of SCRAMBLED_NODES) {
    const original = ORIGINAL_DATA.get(node);
    if (original) node.textContent = original;
  }
  SCRAMBLED_NODES.clear();
  // Don't clear ORIGINAL_DATA — we may need it if user toggles back
}

function scrambleAll() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    processTextNode(node);
  }
}

export function FoolsScrambler() {
  const { isFoolsMode, isAprilFools } = useAprilFools();
  const observerRef = useRef<MutationObserver | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!isAprilFools || !isFoolsMode) {
      if (!isFoolsMode) restoreAll();
      return;
    }

    // Initial scramble after React finishes rendering
    const timer = setTimeout(() => scrambleAll(), 400);

    // Debounced scramble for new content — batches rapid DOM changes
    function debouncedScramble() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => scrambleAll(), 200);
    }

    // Watch for new content (lazy loads, state updates) — but debounced
    observerRef.current = new MutationObserver(debouncedScramble);
    observerRef.current.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      observerRef.current?.disconnect();
    };
  }, [isFoolsMode, isAprilFools, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/**
 * Admin-only import sandbox.
 *
 * An isolated, localStorage-backed copy of the match store used to test the
 * import pipeline (parsing, dedup, the post-import recap, day-2 / per-format
 * rendering and the per-event edit controls) WITHOUT ever touching the real
 * Firestore account or the guest local store.
 *
 * Nothing here reads or writes Firestore — it lives entirely under its own
 * localStorage key, so it can be imported into, edited, seeded and wiped
 * freely with zero risk to real data.
 *
 * The dedup fingerprint intentionally matches `importMatchesFirestore`
 * (src/lib/firestore-storage.ts) — the path a real, logged-in import takes —
 * including playoff-round note normalization, so duplicate-skipping behaves
 * exactly like importing into a real account.
 */
import type { AppData, MatchRecord } from "@/types";
import { normalizeNotes } from "@/lib/firestore-storage";

const SANDBOX_KEY = "fab-stats-sandbox-data";
const SANDBOX_VERSION = 1;

type MatchDraft = Omit<MatchRecord, "id" | "createdAt">;

function read(): MatchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SANDBOX_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as AppData;
    return Array.isArray(data.matches) ? data.matches : [];
  } catch {
    return [];
  }
}

function write(matches: MatchRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SANDBOX_KEY, JSON.stringify({ version: SANDBOX_VERSION, matches }));
}

/** Same dedup key as importMatchesFirestore (notes normalized) so the sandbox
 *  skips duplicates exactly like a real account import. */
function fingerprint(m: { date: string; opponentName?: string; notes?: string; result: string }): string {
  const notes = m.notes ? normalizeNotes(m.notes) : "";
  return `${m.date}|${(m.opponentName || "").toLowerCase()}|${notes}|${m.result}`;
}

/** Mirror Firestore's deleteField(): an `undefined` value removes the key entirely. */
function applyUpdates(match: MatchRecord, updates: Partial<MatchDraft>): MatchRecord {
  const next: Record<string, unknown> = { ...match };
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined) delete next[k];
    else next[k] = v;
  }
  return next as unknown as MatchRecord;
}

export function getSandboxMatches(): MatchRecord[] {
  return read();
}

export function getSandboxCount(): number {
  return read().length;
}

export function setSandboxMatches(matches: MatchRecord[]): void {
  write(matches);
}

/** Import with the same fingerprint dedup as a real import. Returns # newly added. */
export function importSandboxMatches(matches: MatchDraft[]): number {
  const current = read();
  const existing = new Set(current.map((m) => fingerprint(m)));
  const fresh = matches.filter((m) => !existing.has(fingerprint(m)));
  if (fresh.length === 0) return 0;
  const now = new Date().toISOString();
  for (const m of fresh) {
    current.push({ ...(m as MatchRecord), id: crypto.randomUUID(), createdAt: now });
  }
  write(current);
  return fresh.length;
}

/** Add matches WITHOUT dedup — used by "seed sample" / "copy my real events". Returns # added. */
export function seedSandboxMatches(matches: MatchDraft[]): number {
  const current = read();
  const now = new Date().toISOString();
  for (const m of matches) {
    current.push({ ...(m as MatchRecord), id: crypto.randomUUID(), createdAt: now });
  }
  write(current);
  return matches.length;
}

export function clearSandboxMatches(): void {
  write([]);
}

export function updateSandboxMatch(id: string, updates: Partial<MatchDraft>): void {
  const current = read();
  const idx = current.findIndex((m) => m.id === id);
  if (idx === -1) return;
  current[idx] = applyUpdates(current[idx], updates);
  write(current);
}

export function batchUpdateSandboxMatches(ids: string[], updates: Partial<MatchDraft>): void {
  const idSet = new Set(ids);
  const current = read();
  let changed = false;
  for (let i = 0; i < current.length; i++) {
    if (idSet.has(current[i].id)) {
      current[i] = applyUpdates(current[i], updates);
      changed = true;
    }
  }
  if (changed) write(current);
}

export function deleteSandboxMatch(id: string): void {
  write(read().filter((m) => m.id !== id));
}

export function batchDeleteSandboxMatches(ids: string[]): void {
  const idSet = new Set(ids);
  write(read().filter((m) => !idSet.has(m.id)));
}

export function exportSandboxJson(): string {
  return JSON.stringify({ version: SANDBOX_VERSION, matches: read() }, null, 2);
}

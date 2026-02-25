import { STORAGE_KEY, CURRENT_VERSION } from "./constants";
import type { AppData, MatchRecord } from "@/types";

function getAppData(): AppData {
  if (typeof window === "undefined") {
    return { version: CURRENT_VERSION, matches: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: CURRENT_VERSION, matches: [] };
    const data: AppData = JSON.parse(raw);
    return migrateIfNeeded(data);
  } catch {
    return { version: CURRENT_VERSION, matches: [] };
  }
}

function setAppData(data: AppData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function migrateIfNeeded(data: AppData): AppData {
  return { ...data, version: CURRENT_VERSION };
}

export function getAllMatches(): MatchRecord[] {
  return getAppData().matches;
}

export function addMatch(match: Omit<MatchRecord, "id" | "createdAt">): MatchRecord {
  const data = getAppData();
  const newMatch: MatchRecord = {
    ...match,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  data.matches.push(newMatch);
  setAppData(data);
  return newMatch;
}

export function updateMatch(id: string, updates: Partial<Omit<MatchRecord, "id" | "createdAt">>): MatchRecord | null {
  const data = getAppData();
  const index = data.matches.findIndex((m) => m.id === id);
  if (index === -1) return null;
  data.matches[index] = { ...data.matches[index], ...updates };
  setAppData(data);
  return data.matches[index];
}

export function deleteMatch(id: string): boolean {
  const data = getAppData();
  const before = data.matches.length;
  data.matches = data.matches.filter((m) => m.id !== id);
  if (data.matches.length < before) {
    setAppData(data);
    return true;
  }
  return false;
}

export function exportData(): string {
  return JSON.stringify(getAppData(), null, 2);
}

export function importData(jsonString: string): void {
  const data: AppData = JSON.parse(jsonString);
  if (!data.matches || !Array.isArray(data.matches)) {
    throw new Error("Invalid data format");
  }
  setAppData(migrateIfNeeded(data));
}

export function clearAllData(): void {
  setAppData({ version: CURRENT_VERSION, matches: [] });
}

function matchFingerprint(m: { date: string; opponentName?: string; notes?: string; result: string }): string {
  return `${m.date}|${(m.opponentName || "").toLowerCase()}|${m.notes || ""}|${m.result}`;
}

export function importMatchesLocal(
  matches: Omit<MatchRecord, "id" | "createdAt">[]
): number {
  const data = getAppData();
  const existing = new Set(data.matches.map((m) => matchFingerprint(m)));

  const newMatches = matches.filter((m) => !existing.has(matchFingerprint(m)));
  if (newMatches.length === 0) return 0;

  const now = new Date().toISOString();
  for (const match of newMatches) {
    data.matches.push({
      ...match,
      id: crypto.randomUUID(),
      createdAt: now,
    });
  }
  setAppData(data);
  return newMatches.length;
}

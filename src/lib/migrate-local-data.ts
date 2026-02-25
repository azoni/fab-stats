import { getAllMatches } from "./storage";
import { importMatchesFirestore } from "./firestore-storage";

const MIGRATION_KEY = "fab-stats-migrated";

export function hasLocalData(): boolean {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(MIGRATION_KEY)) return false;
  return getAllMatches().length > 0;
}

export function getLocalMatchCount(): number {
  if (typeof window === "undefined") return 0;
  return getAllMatches().length;
}

export async function migrateLocalData(userId: string): Promise<number> {
  if (typeof window === "undefined") return 0;

  const localMatches = getAllMatches();
  if (localMatches.length === 0) {
    window.localStorage.setItem(MIGRATION_KEY, "true");
    return 0;
  }

  // Strip id and createdAt so Firestore generates new ones
  const matchesForImport = localMatches.map(({ id, createdAt, ...rest }) => rest);
  const count = await importMatchesFirestore(userId, matchesForImport);

  window.localStorage.setItem(MIGRATION_KEY, "true");
  return count;
}

export function dismissMigration(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MIGRATION_KEY, "true");
}

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { updateLeaderboardEntry } from "./leaderboard";
import type { UserProfile, MatchRecord } from "@/types";

interface AdminConfig {
  adminEmails: string[];
}

export interface AdminUserStats {
  uid: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  createdAt: string;
  isPublic: boolean;
  matchCount: number;
  // Leaderboard stats (if available)
  winRate?: number;
  totalWins?: number;
  totalLosses?: number;
  totalDraws?: number;
  longestWinStreak?: number;
  currentStreakType?: "win" | "loss" | null;
  currentStreakCount?: number;
  topHero?: string;
  topHeroMatches?: number;
  eventsPlayed?: number;
  eventWins?: number;
  ratedMatches?: number;
  ratedWinRate?: number;
  updatedAt?: string;
}

export interface AdminDashboardData {
  totalUsers: number;
  totalMatches: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  users: AdminUserStats[];
}

/** Check if an email is in the admin list (cached for 10 minutes) */
let adminCache: { emails: string[]; ts: number } | null = null;
const ADMIN_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function checkIsAdmin(
  email: string | null
): Promise<boolean> {
  if (!email) return false;
  try {
    if (adminCache && Date.now() - adminCache.ts < ADMIN_CACHE_TTL) {
      return adminCache.emails.includes(email.toLowerCase());
    }
    const snap = await getDoc(doc(db, "admin", "config"));
    if (!snap.exists()) return false;
    const config = snap.data() as AdminConfig;
    adminCache = { emails: config.adminEmails, ts: Date.now() };
    return config.adminEmails.includes(email.toLowerCase());
  } catch {
    return false;
  }
}

/** Admin dashboard data cache (5 minutes) */
let dashboardCache: { data: AdminDashboardData; ts: number } | null = null;
const DASHBOARD_CACHE_TTL = 5 * 60 * 1000;

/** Fetch all user profiles + match counts for the admin dashboard */
export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  if (dashboardCache && Date.now() - dashboardCache.ts < DASHBOARD_CACHE_TTL) {
    return dashboardCache.data;
  }
  // Step 1: Get all usernames + leaderboard entries in parallel (2 queries total)
  const [usernamesSnap, leaderboardSnap] = await Promise.all([
    getDocs(collection(db, "usernames")),
    getDocs(collection(db, "leaderboard")),
  ]);

  const userEntries = usernamesSnap.docs.map((d) => ({
    username: d.id,
    userId: (d.data() as { userId: string }).userId,
  }));

  const leaderboardMap = new Map<string, Record<string, unknown>>();
  for (const d of leaderboardSnap.docs) {
    leaderboardMap.set(d.id, d.data());
  }

  // Step 2: Fetch each profile (no more per-user getCountFromServer!)
  // Match counts come from leaderboard entries instead.
  const users: AdminUserStats[] = [];
  let totalMatches = 0;

  const results = await Promise.allSettled(
    userEntries.map(async ({ username, userId }) => {
      const profileSnap = await getDoc(doc(db, "users", userId, "profile", "main"));

      // Use leaderboard totalMatches instead of aggregation query
      const lb = leaderboardMap.get(userId);
      const matchCount = lb ? (lb.totalMatches as number) || 0 : 0;
      totalMatches += matchCount;

      if (profileSnap.exists()) {
        const profile = profileSnap.data() as UserProfile;
        const stats: AdminUserStats = {
          uid: profile.uid,
          username: profile.username || username,
          displayName: profile.displayName,
          photoUrl: profile.photoUrl,
          createdAt: profile.createdAt,
          isPublic: profile.isPublic,
          matchCount,
        };
        if (lb) {
          stats.winRate = lb.winRate as number;
          stats.totalWins = lb.totalWins as number;
          stats.totalLosses = lb.totalLosses as number;
          stats.totalDraws = lb.totalDraws as number;
          stats.longestWinStreak = lb.longestWinStreak as number;
          stats.currentStreakType = lb.currentStreakType as "win" | "loss" | null;
          stats.currentStreakCount = lb.currentStreakCount as number;
          stats.topHero = lb.topHero as string;
          stats.topHeroMatches = lb.topHeroMatches as number;
          stats.eventsPlayed = lb.eventsPlayed as number;
          stats.eventWins = lb.eventWins as number;
          stats.ratedMatches = lb.ratedMatches as number;
          stats.ratedWinRate = lb.ratedWinRate as number;
          stats.updatedAt = lb.updatedAt as string;
        }
        return stats;
      }
      return null;
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      users.push(result.value);
    }
  }

  // Step 3: Compute time-based stats
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

  const newUsersThisWeek = users.filter(
    (u) => new Date(u.createdAt).getTime() >= weekAgo
  ).length;
  const newUsersThisMonth = users.filter(
    (u) => new Date(u.createdAt).getTime() >= monthAgo
  ).length;

  const result = {
    totalUsers: users.length,
    totalMatches,
    newUsersThisWeek,
    newUsersThisMonth,
    users,
  };
  dashboardCache = { data: result, ts: Date.now() };
  return result;
}

/** Backfill leaderboard entries for all users (re-computes nemesis, etc.) */
export async function backfillLeaderboard(
  onProgress?: (done: number, total: number) => void
): Promise<{ updated: number; failed: number }> {
  const usernamesSnap = await getDocs(collection(db, "usernames"));
  const userEntries = usernamesSnap.docs.map((d) => ({
    username: d.id,
    userId: (d.data() as { userId: string }).userId,
  }));

  let updated = 0;
  let failed = 0;

  for (const { userId } of userEntries) {
    try {
      const profileSnap = await getDoc(doc(db, "users", userId, "profile", "main"));
      if (!profileSnap.exists()) continue;
      const profile = profileSnap.data() as UserProfile;

      const matchesSnap = await getDocs(
        query(collection(db, "users", userId, "matches"), orderBy("createdAt", "desc"))
      );
      const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as MatchRecord[];

      if (matches.length > 0) {
        await updateLeaderboardEntry(profile, matches);
        updated++;
      }
    } catch {
      failed++;
    }
    onProgress?.(updated + failed, userEntries.length);
  }

  return { updated, failed };
}

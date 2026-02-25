import {
  doc,
  getDoc,
  getDocs,
  collection,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "./firebase";
import type { UserProfile } from "@/types";

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

/** Fetch all user profiles + match counts for the admin dashboard */
export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  // Step 1: Get all usernames (public collection)
  const usernamesSnap = await getDocs(collection(db, "usernames"));
  const userEntries = usernamesSnap.docs.map((d) => ({
    username: d.id,
    userId: (d.data() as { userId: string }).userId,
  }));

  // Step 2: Fetch all leaderboard entries for enrichment
  const leaderboardSnap = await getDocs(collection(db, "leaderboard"));
  const leaderboardMap = new Map<string, Record<string, unknown>>();
  for (const d of leaderboardSnap.docs) {
    leaderboardMap.set(d.id, d.data());
  }

  // Step 3: Fetch each profile + match count in parallel
  const users: AdminUserStats[] = [];
  let totalMatches = 0;

  const results = await Promise.allSettled(
    userEntries.map(async ({ username, userId }) => {
      const [profileSnap, countSnap] = await Promise.all([
        getDoc(doc(db, "users", userId, "profile", "main")),
        getCountFromServer(collection(db, "users", userId, "matches")),
      ]);

      const matchCount = countSnap.data().count;
      totalMatches += matchCount;

      if (profileSnap.exists()) {
        const profile = profileSnap.data() as UserProfile;
        const lb = leaderboardMap.get(userId);
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

  // Step 4: Compute time-based stats
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

  const newUsersThisWeek = users.filter(
    (u) => new Date(u.createdAt).getTime() >= weekAgo
  ).length;
  const newUsersThisMonth = users.filter(
    (u) => new Date(u.createdAt).getTime() >= monthAgo
  ).length;

  return {
    totalUsers: users.length,
    totalMatches,
    newUsersThisWeek,
    newUsersThisMonth,
    users,
  };
}

import { doc, getDoc, getDocs, collection, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Current bot heartbeat / status snapshot */
export interface BotHeartbeat {
  /** Timestamp of last heartbeat */
  timestamp: number;
  /** Number of servers the bot is in */
  serverCount: number;
  /** Total members across all servers */
  totalMembers: number;
  /** Bot uptime in milliseconds */
  uptimeMs: number;
  /** Websocket ping in ms */
  ping: number;
  /** List of servers with basic info */
  servers: BotServer[];
}

export interface BotServer {
  id: string;
  name: string;
  memberCount: number;
  icon?: string | null;
  joinedAt: string;
}

/** Per-command usage stats */
export interface CommandUsage {
  [command: string]: number;
}

/** Daily usage snapshot */
export interface DailyUsage {
  date: string;
  totalCommands: number;
  commands: CommandUsage;
  uniqueUsers: number;
  uniqueServers: number;
}

/** Full analytics payload written by the bot */
export interface BotAnalytics {
  heartbeat: BotHeartbeat;
  /** All-time command usage counts */
  totalCommands: CommandUsage;
  /** Total commands ever executed */
  totalCommandCount: number;
  /** Total unique users who have used commands */
  totalUniqueUsers: number;
  /** Per-server total command counts (serverId → count) */
  serverCommandCounts?: Record<string, number>;
  /** Last updated timestamp */
  updatedAt: number;
}

const BOT_DOC = "discord-bot";

/** Load the bot's latest heartbeat and analytics */
export async function loadBotAnalytics(): Promise<BotAnalytics | null> {
  try {
    const snap = await getDoc(doc(db, "admin", BOT_DOC));
    if (!snap.exists()) return null;
    return snap.data() as BotAnalytics;
  } catch {
    return null;
  }
}

/** Load daily usage history (last N days) */
export async function loadDailyUsage(days: number = 30): Promise<DailyUsage[]> {
  try {
    const q = query(
      collection(db, "admin", BOT_DOC, "daily"),
      orderBy("date", "desc"),
      limit(days)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as DailyUsage).reverse();
  } catch {
    return [];
  }
}

/** Load recent command log entries */
export interface CommandLogEntry {
  command: string;
  userId: string;
  username: string;
  serverId: string;
  serverName: string;
  timestamp: number;
  args?: string;
}

export async function loadCommandLog(count: number = 50): Promise<CommandLogEntry[]> {
  try {
    const q = query(
      collection(db, "admin", BOT_DOC, "log"),
      orderBy("timestamp", "desc"),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as CommandLogEntry);
  } catch {
    return [];
  }
}

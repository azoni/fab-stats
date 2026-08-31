"use client";
import type { ReactNode } from "react";
import {
  Archive,
  BarChart3,
  Bot,
  CalendarDays,
  Crown,
  Gamepad2,
  Gift,
  ListOrdered,
  Mail,
  Medal,
  MessageCircle,
  Newspaper,
  Radar,
  Settings,
  Share2,
  Shield,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Swords,
  TrendingUp,
  Trophy,
  Upload,
  Users,
} from "lucide-react";
import { GAMES } from "@/lib/games";

export type NavSubItem = { href: string; label: string; adminOnly?: boolean; authOnly?: boolean; badge?: string; icon?: ReactNode };
export type NavLink = { href: string; label: string; icon: ReactNode; color: string; bg: string; authOnly?: boolean; iconOnly?: boolean; alwaysOpen?: boolean; subItems?: NavSubItem[] };
export type MoreLink = { href: string; label: string; icon: ReactNode; authOnly?: boolean; adminOnly?: boolean; badge?: string; divider?: boolean; sectionLabel?: string; subItems?: { href: string; label: string }[] };
export type UserMenuLink = { href: string; label: string; icon: ReactNode; adminOnly?: boolean };

/** Renders the custom sharp SVG mark for each sidebar destination. */
function NavAssetIcon({ name }: { name: "home" | "meta" | "activity" | "support" | "extras" | "teams" | "achievements" | "rankings" | "discover" }) {
  return (
    <span className="nav-icon-frame" aria-hidden="true">
      <img src={`/nav-icons/nav-${name}.svg`} alt="" className="nav-asset-icon" />
    </span>
  );
}

function DiscordIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export const navLinks: NavLink[] = [
  { href: "/", label: "Home", icon: <NavAssetIcon name="home" />, color: "text-fab-gold", bg: "bg-fab-gold/10", subItems: [
    { href: "/import", label: "Import", icon: <Upload className="w-3.5 h-3.5" /> },
    { href: "/matches", label: "Matches", icon: <Swords className="w-3.5 h-3.5" /> },
    { href: "/events", label: "Events", icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { href: "/opponents", label: "Opponents", icon: <Users className="w-3.5 h-3.5" /> },
    { href: "/trends", label: "Trends", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { href: "/tournament-stats", label: "Tournament Stats", icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ] },
  { href: "/activity", label: "Activity", icon: <NavAssetIcon name="activity" />, color: "text-indigo-400", bg: "bg-indigo-400/10" },
  { href: "/discover", label: "Discover", icon: <NavAssetIcon name="discover" />, color: "text-emerald-400", bg: "bg-emerald-400/10", subItems: [
    { href: "/players", label: "Players", icon: <Users className="w-3.5 h-3.5" /> },
    { href: "/stores", label: "Stores", badge: "Beta", icon: <Store className="w-3.5 h-3.5" /> },
    { href: "/teams", label: "Teams", icon: <Shield className="w-3.5 h-3.5" /> },
    { href: "/tierlist", label: "Tier Lists", icon: <ListOrdered className="w-3.5 h-3.5" /> },
  ] },
  // Top-level destination (the /discover page still has a Leagues card for mobile).
  // /leagues → "My leagues" tab floats the leagues you're in to the top.
  { href: "/leagues", label: "Leagues", icon: <Trophy className="w-5 h-5" />, color: "text-orange-400", bg: "bg-orange-400/10" },
  { href: "/meta", label: "Meta", icon: <NavAssetIcon name="meta" />, color: "text-teal-400", bg: "bg-teal-400/10", subItems: [
    { href: "/matchups", label: "Matchup Matrix" },
    // Rankings deliberately NOT here — /leaderboard belongs to Prestige, and
    // listing it twice made both sidebar buckets highlight at once.
    { href: "/archive", label: "Event Archive", icon: <Archive className="w-3.5 h-3.5" /> },
    { href: "/meta/reports", label: "Weekly Reports", icon: <Newspaper className="w-3.5 h-3.5" /> },
  ] },
  // Rankings + Achievements share one "Prestige" tab — hover reveals both pages.
  { href: "/leaderboard", label: "Prestige", icon: <Crown className="w-5 h-5" />, color: "text-amber-400", bg: "bg-amber-400/10", subItems: [
    { href: "/leaderboard", label: "Rankings", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { href: "/achievements", label: "Achievements", icon: <Medal className="w-3.5 h-3.5" /> },
  ] },
  // Shop/Reliquary intentionally NOT in the sidebar for now — /shop still works by
  // URL (the cosmetics flag stays on). Re-add a flag-gated link here to reveal it.
  { href: "/extras", label: "Extras", icon: <NavAssetIcon name="extras" />, color: "text-violet-400", bg: "bg-violet-400/10", subItems: [
    { href: "/games", label: "Daily Games", icon: <Gamepad2 className="w-3.5 h-3.5" /> },
    { href: "/tierlist", label: "Tier Lists", icon: <ListOrdered className="w-3.5 h-3.5" /> },
    { href: "/wrapped", label: "Season Wrapped", icon: <Gift className="w-3.5 h-3.5" /> },
    { href: "/share-stats", label: "Share My Stats", icon: <Share2 className="w-3.5 h-3.5" /> },
    { href: "/insights", label: "AI Insights", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { href: "/scout", label: "Player Scout", icon: <Radar className="w-3.5 h-3.5" /> },
    { href: "/compare", label: "Versus" },
    { href: "/docs", label: "Docs" },
    { href: "/changelog", label: "Changelog" },
  ] },
  // Support pinned at the bottom and always expanded (no hover needed).
  { href: "/support", label: "Support", icon: <NavAssetIcon name="support" />, color: "text-pink-400", bg: "bg-pink-400/10", alwaysOpen: true, subItems: [
    { href: "https://www.amazon.com/?tag=fabstats-20", label: "Shop Amazon", badge: "Free", icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { href: "https://partner.tcgplayer.com/fabstats", label: "Shop TCGplayer", badge: "Free", icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { href: "/feedback", label: "Send Feedback", icon: <MessageCircle className="w-3.5 h-3.5" /> },
    { href: "https://discord.gg/WPP5aqCUHY", label: "Join Discord", icon: <DiscordIcon /> },
    { href: "https://discord.com/oauth2/authorize?client_id=1478583612537573479&permissions=0&scope=bot+applications.commands", label: "Add Discord Bot", icon: <Bot className="w-3.5 h-3.5" /> },
    { href: "https://x.com/FabStats", label: "Follow on X", icon: <XIcon /> },
    { href: "https://mfy.gg/@azoni/members?membershipId=99383fe4-b403-4f05-a041-c3212bd7ea30", label: "Metafy Membership", icon: <Users className="w-3.5 h-3.5" /> },
  ] },
];

export const moreLinks: MoreLink[] = [];

// ── Route buckets — SINGLE SOURCE for MobileTabBar highlighting and
// BucketSubNav pill routing. These lists used to be hand-copied in three
// files and drifted (five Extras pages lit no tab at all). Game routes come
// straight from the games registry so a new game can't fall out of nav.
const GAME_ROUTES = [...new Set(GAMES.map((g) => g.href.split("?")[0]))];

export const BUCKET_ROUTES = {
  /** "/" is handled specially (exact match) by consumers. */
  home: ["/matches", "/events", "/opponents", "/trends", "/tournament-stats", "/import"],
  activity: ["/activity", "/community", "/friends", "/feed"],
  // "/player" also covers "/players" via prefix matching.
  discover: ["/discover", "/player", "/search", "/stores", "/leagues", "/teams", "/group"],
  meta: ["/meta", "/leaderboard", "/matchups", "/archive"],
  extras: [
    "/extras",
    "/achievements",
    "/games",
    "/compare",
    "/docs",
    "/changelog",
    "/tierlist",
    "/insights",
    "/scout",
    "/share-stats",
    "/wrapped",
    ...GAME_ROUTES,
  ],
} as const;

export function routeInBucket(pathname: string, bucket: readonly string[]): boolean {
  return bucket.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

export const userMenuLinks: UserMenuLink[] = [
  { href: "/inbox", label: "Inbox", icon: <Mail className="w-4 h-4" /> },
  { href: "/friends", label: "Friends", icon: <Users className="w-4 h-4" /> },
  { href: "/favorites", label: "Favorites", icon: <Star className="w-4 h-4" /> },
  { href: "/settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
];

export const exploreLinks: { href: string; label: string }[] = [];

export const resourceLinks = [
  { href: "/docs", label: "Docs" },
  { href: "/changelog", label: "Changelog" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

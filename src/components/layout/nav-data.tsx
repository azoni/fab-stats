import type { ReactNode } from "react";
import {
  Bot,
  Gamepad2,
  Mail,
  MessageCircle,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Star,
  Trophy,
  Users,
} from "lucide-react";

export type NavSubItem = { href: string; label: string; adminOnly?: boolean; authOnly?: boolean; badge?: string; icon?: ReactNode };
export type NavLink = { href: string; label: string; icon: ReactNode; color: string; bg: string; authOnly?: boolean; iconOnly?: boolean; subItems?: NavSubItem[] };
export type MoreLink = { href: string; label: string; icon: ReactNode; authOnly?: boolean; adminOnly?: boolean; badge?: string; divider?: boolean; sectionLabel?: string; subItems?: { href: string; label: string }[] };
export type UserMenuLink = { href: string; label: string; icon: ReactNode; adminOnly?: boolean };

function NavAssetIcon({ name }: { name: "home" | "meta" | "community" | "support" }) {
  return (
    <span className="nav-icon-frame" aria-hidden="true">
      <img src={`/nav-icons/nav-${name}.png`} alt="" className="nav-asset-icon" />
    </span>
  );
}

function ExtrasIcon() {
  return (
    <span className="nav-icon-frame" aria-hidden="true">
      <svg className="w-4 h-4 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.55 4.7L18.5 9l-4.95 1.3L12 15l-1.55-4.7L5.5 9l4.95-1.3L12 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 15l.9 2.7L22.5 19l-2.6.7L19 22.5l-.9-2.8-2.6-.7 2.6-1.3L19 15zM5 14l.75 2.25L8 17l-2.25.75L5 20l-.75-2.25L2 17l2.25-.75L5 14z" />
      </svg>
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
  { href: "/", label: "Home", icon: <NavAssetIcon name="home" />, color: "text-fab-gold", bg: "bg-fab-gold/10", authOnly: true },
  { href: "/meta", label: "Meta", icon: <NavAssetIcon name="meta" />, color: "text-teal-400", bg: "bg-teal-400/10", subItems: [
    { href: "/leaderboard", label: "Rankings" },
    { href: "/matchups", label: "Matchup Matrix" },
  ] },
  { href: "/community", label: "Community", icon: <NavAssetIcon name="community" />, color: "text-indigo-400", bg: "bg-indigo-400/10", subItems: [
    { href: "/team", label: "Teams" },
    { href: "/friends", label: "Friends", authOnly: true },
  ] },
  { href: "/support", label: "Support", icon: <NavAssetIcon name="support" />, color: "text-pink-400", bg: "bg-pink-400/10", iconOnly: true, subItems: [
    { href: "https://discord.gg/WPP5aqCUHY", label: "Join Discord", icon: <DiscordIcon /> },
    { href: "https://discord.com/oauth2/authorize?client_id=1478583612537573479&permissions=0&scope=bot+applications.commands", label: "Add Discord Bot", icon: <Bot className="w-3.5 h-3.5" /> },
    { href: "https://x.com/FabStats", label: "Follow on X", icon: <XIcon /> },
    { href: "https://www.amazon.com/?tag=oldwaystoda00-20", label: "Shop Amazon", badge: "Free", icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { href: "https://partner.tcgplayer.com/fabstats", label: "Shop TCGplayer", badge: "Free", icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { href: "/feedback", label: "Send Feedback", icon: <MessageCircle className="w-3.5 h-3.5" /> },
  ] },
  { href: "/games", label: "Extras", icon: <ExtrasIcon />, color: "text-violet-400", bg: "bg-violet-400/10", subItems: [
    { href: "/games", label: "Daily Games", icon: <Gamepad2 className="w-3.5 h-3.5" /> },
    { href: "/achievements", label: "Achievements", icon: <Trophy className="w-3.5 h-3.5" /> },
    { href: "/compare", label: "Versus" },
    { href: "/docs", label: "Docs" },
    { href: "/changelog", label: "Changelog" },
  ] },
];

export const moreLinks: MoreLink[] = [];

export const userMenuLinks: UserMenuLink[] = [
  { href: "/inbox", label: "Inbox", icon: <Mail className="w-4 h-4" /> },
  { href: "/friends", label: "Friends", icon: <Users className="w-4 h-4" /> },
  { href: "/favorites", label: "Favorites", icon: <Star className="w-4 h-4" /> },
  { href: "/settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  { href: "/admin", label: "Admin", adminOnly: true, icon: <ShieldCheck className="w-4 h-4" /> },
];

export const exploreLinks: { href: string; label: string }[] = [];

export const resourceLinks = [
  { href: "/docs", label: "Docs" },
  { href: "/changelog", label: "Changelog" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

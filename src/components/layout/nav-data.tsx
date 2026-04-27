import { SwordsIcon } from "@/components/icons/NavIcons";
import type { ReactNode } from "react";
import {
  Globe, Mail, Star, Users, Settings, ShieldCheck,
  Heart, MessageCircle, ShoppingCart, Coffee, Github, Gamepad2, Home as HomeIcon,
} from "lucide-react";

export type NavSubItem = { href: string; label: string; adminOnly?: boolean; authOnly?: boolean; badge?: string; icon?: ReactNode };
export type NavLink = { href: string; label: string; icon: ReactNode; color: string; bg: string; authOnly?: boolean; iconOnly?: boolean; subItems?: NavSubItem[] };
export type MoreLink = { href: string; label: string; icon: ReactNode; authOnly?: boolean; adminOnly?: boolean; badge?: string; divider?: boolean; sectionLabel?: string; subItems?: { href: string; label: string }[] };
export type UserMenuLink = { href: string; label: string; icon: ReactNode; adminOnly?: boolean };

// ── 3-bucket primary nav (Phase 2 IA rethink) ──
//
// Identity: post-event share + personal repo. Three buckets only:
//   Home      — your stats, your matches, your history (the repo job)
//   Meta      — community-level competitive analysis
//   Community — teams + people + search
//
// /share is the focal post-event-recap entry; mobile bottom-bar has a
// dedicated [+] tab for it. Not surfaced as a primary nav item because
// the prominent [+] does that job better than another link in a row.
export const navLinks: NavLink[] = [
  { href: "/", label: "Home", icon: <HomeIcon className="w-4 h-4" />, color: "text-fab-gold", bg: "bg-fab-gold/10", authOnly: true, subItems: [
    { href: "/", label: "Dashboard" },
    { href: "/matches", label: "Matches" },
    { href: "/events", label: "Events" },
    { href: "/opponents", label: "Opponents" },
    { href: "/trends", label: "Trends" },
    { href: "/tournament-stats", label: "Tournament Stats" },
    { href: "/goals", label: "Goals" },
  ] },
  { href: "/meta", label: "Meta", icon: <Globe className="w-4 h-4" />, color: "text-teal-400", bg: "bg-teal-400/10", subItems: [
    { href: "/meta", label: "Hero Stats" },
    { href: "/leaderboard", label: "Rankings" },
    { href: "/matchups", label: "Matchup Matrix" },
    { href: "/tier-list", label: "Tier List" },
    { href: "/compare", label: "Versus" },
    { href: "/tournaments", label: "Tournaments" },
  ] },
  { href: "/community", label: "Community", icon: <Users className="w-4 h-4" />, color: "text-indigo-400", bg: "bg-indigo-400/10", subItems: [
    { href: "/team", label: "Teams" },
    { href: "/friends", label: "Friends", authOnly: true },
    { href: "/search", label: "Search" },
  ] },
  // Support kept as iconOnly affiliate hub; will move to footer in a follow-up.
  { href: "/support", label: "Support", icon: <Heart className="w-4 h-4" />, color: "text-pink-400", bg: "bg-pink-400/10", iconOnly: true, subItems: [
    { href: "https://www.amazon.com/?tag=oldwaystoda00-20", label: "Shop Amazon", badge: "Free", icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { href: "https://partner.tcgplayer.com/fabstats", label: "Shop TCGplayer", badge: "Free", icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { href: "https://github.com/sponsors/azoni", label: "GitHub Sponsors", icon: <Github className="w-3.5 h-3.5" /> },
    { href: "https://ko-fi.com/azoni", label: "Ko-fi", icon: <Coffee className="w-3.5 h-3.5" /> },
    { href: "/feedback", label: "Send Feedback", icon: <MessageCircle className="w-3.5 h-3.5" /> },
    { href: "https://discord.gg/WPP5aqCUHY", label: "Join Discord", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg> },
    { href: "https://x.com/FabStats", label: "Follow on X", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  ] },
];

// moreLinks emptied — Trends + Tournament Stats live in Home > subItems now.
// MoreLink type kept for any external import that hasn't been cleaned.
export const moreLinks: MoreLink[] = [];

export const userMenuLinks: UserMenuLink[] = [
  { href: "/inbox", label: "Inbox", icon: <Mail className="w-4 h-4" /> },
  { href: "/favorites", label: "Favorites", icon: <Star className="w-4 h-4" /> },
  { href: "/import", label: "Import", icon: <SwordsIcon className="w-4 h-4" /> },
  { href: "/games", label: "Daily Games", icon: <Gamepad2 className="w-4 h-4" /> },
  { href: "/settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  { href: "/admin", label: "Admin", adminOnly: true, icon: <ShieldCheck className="w-4 h-4" /> },
];

// Legacy export — kept so any component still importing it doesn't break,
// but the Phase 2 navbar no longer renders an Explore dropdown.
export const exploreLinks: { href: string; label: string }[] = [];

// Footer-only resource links (rendered in the desktop footer in layout.tsx).
export const resourceLinks = [
  { href: "/docs", label: "Docs" },
  { href: "/changelog", label: "Changelog" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

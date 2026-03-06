/** Central registry of daily games. Add new games here and all nav surfaces update automatically. */

export type GameCategory = "puzzle" | "knowledge" | "dice" | "ninja";

export const GAME_CATEGORIES: { id: GameCategory; label: string; description: string; color: string }[] = [
  { id: "puzzle", label: "Puzzles", description: "Logic and word puzzles", color: "text-emerald-400" },
  { id: "knowledge", label: "Knowledge", description: "Test your FaB knowledge", color: "text-purple-400" },
  { id: "dice", label: "Brute Dice", description: "Roll dice, deal damage", color: "text-red-400" },
  { id: "ninja", label: "Ninja", description: "Speed, combos, and chains", color: "text-cyan-400" },
];

export interface GameEntry {
  href: string;
  slug: string;
  label: string;
  subtitle: string;
  description: string;
  color: string;
  iconPath: string;
  category: GameCategory;
}

export const GAMES: GameEntry[] = [
  {
    href: "/fabdoku",
    slug: "fabdoku",
    label: "FaBdoku",
    subtitle: "Daily hero puzzle",
    description: "Fill the 3×3 grid with heroes that match each row and column category.",
    color: "text-emerald-400",
    category: "puzzle",
    iconPath: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z",
  },
  {
    href: "/crossword",
    slug: "crossword",
    label: "Crossword",
    subtitle: "Daily word puzzle",
    description: "Solve the daily FaB-themed crossword puzzle.",
    color: "text-blue-400",
    category: "puzzle",
    iconPath: "M3.75 6A2.25 2.25 0 016 3.75h3v4.5H4.5A.75.75 0 013.75 7.5V6zM9 3.75h6v4.5H9v-4.5zM15 3.75h3A2.25 2.25 0 0120.25 6v1.5a.75.75 0 01-.75.75H15v-4.5zM3.75 9h4.5v6h-4.5V9zM9 9h6v6H9V9zM15.75 9h4.5v6h-4.5V9zM3.75 15.75h4.5v4.5H6a2.25 2.25 0 01-2.25-2.25v-2.25zM9 15.75h6v4.5H9v-4.5zM15.75 15.75h4.5V18a2.25 2.25 0 01-2.25 2.25h-2.25v-4.5z",
  },
  {
    href: "/heroguesser",
    slug: "heroguesser",
    label: "Hero Guesser",
    subtitle: "Guess the hero",
    description: "Guess the FaB hero in 6 tries using attribute clues.",
    color: "text-purple-400",
    category: "knowledge",
    iconPath: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
  },
  {
    href: "/matchupmania",
    slug: "matchupmania",
    label: "Matchup Mania",
    subtitle: "Pick the winner",
    description: "Guess which hero has the higher community win rate. 10 rounds.",
    color: "text-orange-400",
    category: "knowledge",
    iconPath: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6",
  },
  {
    href: "/connections",
    slug: "connections",
    label: "Connections",
    subtitle: "Group the words",
    description: "Find four groups of four from 16 FaB-themed words.",
    color: "text-yellow-400",
    category: "puzzle",
    iconPath: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.07a4.5 4.5 0 00-6.364-6.364L4.5 8.257m10.5-1.5l4.5 4.5",
  },
  {
    href: "/timeline",
    slug: "timeline",
    label: "Timeline",
    subtitle: "Order events",
    description: "Place 5 FaB events in chronological order. 3 lives.",
    color: "text-cyan-400",
    category: "knowledge",
    iconPath: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
  },
  {
    href: "/trivia",
    slug: "trivia",
    label: "Trivia",
    subtitle: "Test your knowledge",
    description: "Answer 5 daily FaB trivia questions.",
    color: "text-red-400",
    category: "knowledge",
    iconPath: "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z",
  },
  {
    href: "/rhinarsrampage",
    slug: "rhinarsrampage",
    label: "Rhinar's Rampage",
    subtitle: "Push your luck",
    description: "Roll dice to build damage. Bank or bust — can you defeat Rhinar?",
    color: "text-red-500",
    category: "dice",
    iconPath: "M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25",
  },
  {
    href: "/kayosknockout",
    slug: "kayosknockout",
    label: "Kayo's Knockout",
    subtitle: "Combo dice",
    description: "Roll 5 dice, pick combos, KO Kayo in 3 rounds. Yahtzee meets FaB.",
    color: "text-red-400",
    category: "dice",
    iconPath: "M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59",
  },
  {
    href: "/brutebrawl",
    slug: "brutebrawl",
    label: "Brute Brawl",
    subtitle: "Dice combat",
    description: "Roll attack dice vs a daily defender. Deal 20 damage to win!",
    color: "text-red-600",
    category: "dice",
    iconPath: "M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z",
  },
  {
    href: "/ninjacombo",
    slug: "ninjacombo",
    label: "Katsu's Combo",
    subtitle: "Build the chain",
    description: "Sequence 5 attack cards to maximize combo damage. Find the optimal chain!",
    color: "text-cyan-400",
    category: "ninja",
    iconPath: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  },
  {
    href: "/shadowstrike",
    slug: "shadowstrike",
    label: "Shadow Strike",
    subtitle: "Match the pairs",
    description: "Find all 8 matching ninja card pairs in a 4×4 memory grid.",
    color: "text-indigo-400",
    category: "ninja",
    iconPath: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    href: "/bladedash",
    slug: "bladedash",
    label: "Blade Dash",
    subtitle: "Unscramble words",
    description: "Unscramble 8 ninja-themed words as fast as you can.",
    color: "text-pink-400",
    category: "ninja",
    iconPath: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
  },
];

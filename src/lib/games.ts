/** Central registry of daily games. Add new games here and all nav surfaces update automatically. */
export const GAMES: { href: string; label: string; subtitle: string; iconPath: string }[] = [
  {
    href: "/fabdoku",
    label: "FaBdoku",
    subtitle: "Daily hero puzzle",
    iconPath: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z",
  },
  {
    href: "/crossword",
    label: "Crossword",
    subtitle: "Daily word puzzle",
    iconPath: "M3.75 6A2.25 2.25 0 016 3.75h3v4.5H4.5A.75.75 0 013.75 7.5V6zM9 3.75h6v4.5H9v-4.5zM15 3.75h3A2.25 2.25 0 0120.25 6v1.5a.75.75 0 01-.75.75H15v-4.5zM3.75 9h4.5v6h-4.5V9zM9 9h6v6H9V9zM15.75 9h4.5v6h-4.5V9zM3.75 15.75h4.5v4.5H6a2.25 2.25 0 01-2.25-2.25v-2.25zM9 15.75h6v4.5H9v-4.5zM15.75 15.75h4.5V18a2.25 2.25 0 01-2.25 2.25h-2.25v-4.5z",
  },
];

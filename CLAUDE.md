# FaB Stats

Flesh and Blood TCG stats tracker with daily minigames. Built for fabstats.net.

## Stack

- Next.js 16 static export (`output: 'export'`), deployed on Netlify
- Firebase/Firestore for data, Firebase Auth
- Tailwind CSS v4, React 19
- `@flesh-and-blood/cards` npm package for card data + images
- OG images: satori + resvg-js in Netlify serverless functions

## Commands

- `npx tsc --noEmit` — type check (run after changes)
- `npm run build` — full build (extension + Next.js)
- `npm run dev` — dev server

## Path Aliases

- `@/*` → `./src/*`

## Key Architecture

### All Game Dates Use UTC

`getTodayDateStr()` from `src/lib/fabdoku/puzzle-generator.ts` is the canonical date source for FaBdoku. All games use UTC dates so puzzles reset at UTC midnight for all players. Countdown timers target UTC midnight. Never use local-time date methods (`getFullYear`, `getMonth`, `getDate`) for game dates — always use UTC variants.

### FaBdoku Modes

Two isolated game modes sharing the FaBdoku page (`/fabdoku?mode=cards`):

| | Hero Mode | Card Mode |
|---|---|---|
| Pool | ~136 heroes | ~4,200 cards |
| Seed | `dateToSeed(date)` | `dateToSeed(date) + 1_000_003` |
| localStorage | `fabdoku-{date}` | `fabdoku-card-{date}` |
| Firestore results | `fabdoku-results` | `fabdoku-card-results` |
| Firestore picks | `fabdoku-picks` | `fabdoku-card-picks` |
| Stats subcol | `fabdoku-stats` | `fabdoku-card-stats` |
| Public stats | `fabdokuPlayerStats` | `fabdokuCardPlayerStats` |
| Feed event type | `fabdoku` | `fabdoku-cards` |
| Activity action | `fabdoku_share` | `fabdoku_card_share` |

### Seeded Random

FaBdoku and Crossword use the **original Java-style hash** in `src/lib/fabdoku/seeded-random.ts`. Newer games (connections, trivia, etc.) use Fibonacci hashing in `src/lib/games/seeded-random.ts`. Do NOT change the FaBdoku hash — it would break all historical puzzles.

### Card Data Gotchas

- `@flesh-and-blood/cards` uses lowercase "Go again" (not "Go Again")
- Generic cards (601) are excluded from class categories to prevent trivial games
- Pitch variants (Red/Yellow/Blue) are separate entries keyed by `cardIdentifier`
- Card images: `https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/{defaultImage}.webp`

### Each Game Has Isolated Data

Games have their own: Firestore collections, localStorage prefixes, feed event types, activity actions, achievements, and profile badges. When adding a new game mode, create all layers.

## OG Image System (Netlify)

- Serverless function: `netlify/functions/og-image.mts`
- Edge functions: `netlify/edge-functions/og-rewrite.ts` (player), `og-rewrite-meta.ts` (meta)
- Fonts: WOFF files in `netlify/functions/fonts/` (satori doesn't support WOFF2)
- Domain: All URLs must use `www.fabstats.net` (bare domain 301-redirects)
- `netlify.toml` must include `node_modules/@resvg/resvg-js-*/**` and fonts in `included_files`

## Conventions

- Do not commit `.env` or credentials files
- Achievements defined in `src/lib/achievements.ts`, profile badges in `src/lib/profile-badges.ts`
- Feed events defined in `src/types/index.ts`, created in `src/lib/feed.ts`, rendered in `src/components/feed/FeedCard.tsx`
- Activity logging in `src/lib/activity-log.ts`

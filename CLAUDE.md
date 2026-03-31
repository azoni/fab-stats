# FaB Stats

Flesh and Blood TCG stats tracker with daily minigames. Built for fabstats.net.

## Quick Reference

```bash
npx tsc --noEmit          # Type check — run after every change
npm run build             # Full build (extension zip + Next.js static export)
npm run dev               # Dev server
npm run lint              # ESLint
npm run format            # Prettier — format all src files
npm run format:check      # Check formatting without writing
```

**Path aliases:** `@/*` → `./src/*`

## Stack

- Next.js 16 static export (`output: 'export'`), deployed on Netlify
- Firebase/Firestore for data, Firebase Auth
- Tailwind CSS v4, React 19
- `@flesh-and-blood/cards` npm package for card data + images
- OG images: satori + resvg-js in Netlify serverless functions
- Discord bot companion: `fab-stats-bot/` (discord.js 14, separate repo)

## Rules — Do This

- **Always use UTC for game dates.** `getTodayDateStr()` from `src/lib/fabdoku/puzzle-generator.ts` is canonical. Use `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()` — never local-time variants for game logic.
- **Run `npx tsc --noEmit` after every change.** It catches most bugs in ~5 seconds.
- **Use the ref pattern for callbacks in useEffect.** The deploy pipeline treats `react-hooks/exhaustive-deps` warnings as errors. If a callback is used inside a useEffect, access it via a ref:
  ```tsx
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => { fnRef.current(); }, [dep]);
  ```
- **Keep PRs focused.** One feature or fix per branch. Branch naming: `feature/description` or `fix/description`.
- **Check Netlify redirect rules** when adding new dynamic routes. Static export needs explicit `[[redirects]]` in `netlify.toml` for any `/route/*` pattern (see `/team/*`, `/group/*`, `/player/*` as examples).

## Rules — Don't Do This

- **NEVER commit directly to main.** Always use feature/fix branches → PR → merge.
- **NEVER change the FaBdoku seeded random hash** in `src/lib/fabdoku/seeded-random.ts`. It uses the original Java-style hash. Changing it breaks all historical puzzles. Newer games use Fibonacci hashing in `src/lib/games/seeded-random.ts`.
- **NEVER commit `.env` or credentials files.**
- **Don't add features nobody asked for.** Check user feedback before building. The AI chatbot was removed because zero users requested it.
- **Don't use `getFullYear()`, `getMonth()`, `getDate()`** for game dates — these return local timezone values and cause different puzzles for different timezones.

## Architecture

### Data Model

- **Public data:** `leaderboard/{userId}` — readable by anyone, used by OG image function
- **Private data:** `users/{userId}/matches/{matchId}` — only readable by owner
- **Teams:** `teams/{teamId}` + `teams/{teamId}/members/{uid}` + `teamnames/{slug}`
- **Groups:** `groups/{groupId}` + `groups/{groupId}/members/{uid}` + `groupnames/{slug}` + `users/{uid}/groups/{groupId}` (membership tracking)
- **Invites:** `teamInvites/{id}`, `groupInvites/{id}`

### Import Pipeline

5 import methods all feed into `importMatchesFirestore()` with fingerprint-based dedup:
1. **Browser Extension** (`content.js`) — scrapes GEM DOM, LZ-compresses, opens /import
2. **Copy-Paste** (`gem-paste-import.ts`) — heuristic parsing with 20+ regex patterns
3. **CSV** (`gem-import.ts`) — structured, most reliable
4. **Single Event** (`single-event-import.ts`) — quick manual entry
5. **Admin Auto-Sync** — serverless function with stored credentials

### Event Type Classification

`getEventType()` in `src/lib/stats.ts` determines event types. Pipeline:
1. `match.eventTypeOverride` — user manual override (final)
2. `refineEventType(eventType, eventName)` — checks name for keywords, validates against GEM type
3. `guessEventTypeFromNotes(notes)` — parses from match notes
4. Qualifier check: events with "qualifier" in name → "Other" (not the parent event type)

### OG Image System

- Serverless function: `netlify/functions/og-image.mts`
- Edge functions: `netlify/edge-functions/og-rewrite.ts` (player), `og-rewrite-meta.ts` (meta)
- Fonts: WOFF files in `netlify/functions/fonts/` (satori doesn't support WOFF2)
- Domain: All URLs must use `www.fabstats.net` (bare domain 301-redirects)
- `netlify.toml` must include `node_modules/@resvg/resvg-js-*/**` and fonts in `included_files`

## Game Data Isolation

Each game has isolated: Firestore collections, localStorage prefixes, feed event types, activity actions, achievements, and profile badges. When adding a new game mode, create ALL layers.

**FaBdoku example (Hero vs Card mode):**

| | Hero Mode | Card Mode |
|---|---|---|
| Seed | `dateToSeed(date)` | `dateToSeed(date) + 1_000_003` |
| localStorage | `fabdoku-{date}` | `fabdoku-card-{date}` |
| Firestore | `fabdoku-results` | `fabdoku-card-results` |
| Feed event | `fabdoku` | `fabdoku-cards` |

## Key File Locations

| What | Where |
|------|-------|
| Types | `src/types/index.ts` |
| Stats computation | `src/lib/stats.ts` |
| Leaderboard | `src/lib/leaderboard.ts` |
| Teams CRUD | `src/lib/teams.ts` |
| Groups CRUD | `src/lib/groups.ts` |
| Achievements | `src/lib/achievements.ts` |
| Profile badges | `src/lib/profile-badges.ts` |
| Feed events | `src/lib/feed.ts` |
| Activity logging | `src/lib/activity-log.ts` |
| Nav links (shared) | `src/components/layout/nav-data.tsx` |
| Firestore rules | `firestore.rules` |
| Netlify config | `netlify.toml` |

## Card Data Gotchas

- `@flesh-and-blood/cards` uses lowercase "Go again" (not "Go Again")
- Generic cards (601) excluded from class categories
- Pitch variants (Red/Yellow/Blue) are separate entries by `cardIdentifier`
- Card images: `https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/{defaultImage}.webp`

## Git Workflow

- NEVER commit directly to main
- Create feature branches (`feature/description`) or fix branches (`fix/description`)
- Commit to the branch, push, and open a PR to merge into main
- Keep PRs focused — one feature or fix per branch

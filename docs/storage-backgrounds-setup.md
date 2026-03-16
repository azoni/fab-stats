# Profile Background Storage Setup

This project now expects background image files to live in Firebase Storage, with metadata in Firestore (`profileBackgroundCatalog`).

## 1) Verify Firebase project + bucket

- Project: `fab-stats-fc757`
- In Firebase Console, enable Storage for this project if not already enabled.
- Confirm the bucket name shown in **Project settings -> General** and set:
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` in `.env.local`

Example:

```env
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=fab-stats-fc757.firebasestorage.app
```

## 2) Deploy Firestore + Storage rules

From repo root:

```bash
npx firebase deploy --only firestore:rules,storage
```

This uses:

- `firestore.rules` for app data and catalog access
- `storage.rules` for image file access control

## 3) Storage folder layout

Use this path convention:

- Full images: `profile-backgrounds/full/<id>.jpg`
- Thumbnails: `profile-backgrounds/thumb/<id>.jpg`

Example:

- `profile-backgrounds/full/playmat-solana.jpg`
- `profile-backgrounds/thumb/playmat-solana.jpg`

## 4) Upload images

Upload through Firebase Console Storage UI, or CLI:

```bash
# Example (PowerShell)
npx firebase storage:upload ".\\public\\backgrounds\\fab-official\\lore-solana-matte.jpg" --path "profile-backgrounds/full/playmat-solana.jpg"
```

Repeat for thumbnail image with `thumb/`.

Recommended guard rails:

- Keep full images under `8 MB` each.
- Keep thumbnails under `800 KB` each (target `30-120 KB`).
- Use predictable object names: `<id>.<ext>` where `id` is stable and lowercase.

## 5) Add catalog metadata docs in Firestore

Collection: `profileBackgroundCatalog`

Document ID should match the background `id` used in profiles (e.g. `playmat-solana`).

Recommended fields:

- `id` (string)
- `label` (string)
- `imageUrl` (string, public download URL)
- `thumbnailUrl` (string, public download URL)
- `kind` (`key-art` | `playmat` | `hero-art`)
- `focusPosition` (string, optional)
- `adminOnly` (boolean, optional)
- `sortOrder` (number, optional)
- `isActive` (boolean, optional, default `true`)
- `unlockType` (`achievement` | `supporter` | `manual`, optional)
- `unlockKey` (string, optional; required when `unlockType` is set)
- `unlockLabel` (string, optional)

Minimal required:

- `id`, `label`, `imageUrl`

## 6) Validate in app

1. Open profile background chooser.
2. Confirm thumbnails load quickly.
3. Select background and save profile.
4. View your own profile and another profile route (`/player/<username>`) to verify site-wide background switching.

## 7) Admin Sync (in-app)

The Admin dashboard now has a **Sync Background Catalog** tool:

- Path: `Admin -> Tools -> Sync Background Catalog`
- Action: upserts `profileBackgroundCatalog` from the built-in background list
- Uses Storage URL pattern:
  - `profile-backgrounds/full/<id>.jpg`
  - `profile-backgrounds/thumb/<id>.jpg`

This keeps IDs stable while refreshing labels, ordering, and URLs.

## 8) Safe bulk sync script (recommended)

Run the guarded sync script from repo root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\sync-profile-background-catalog.ps1
```

By default, the script auto-uses:

- `config/profile-background-manifest.json` (if present)

Useful options:

- Dry run validation only (no writes):
  - `-DryRun`
- Override limits:
  - `-MaxFullBytes 8388608 -MaxThumbBytes 819200`
- Manifest-driven sync:
  - `-ManifestPath .\path\to\background-manifest.json`

Manifest format (array of objects):

```json
[
  {
    "id": "playmat-solana",
    "label": "Solana Playmat",
    "file": "lore-solana-matte.jpg",
    "kind": "playmat",
    "focusPosition": "center center",
    "adminOnly": false,
    "unlockType": "achievement",
    "unlockKey": "bg_mastery_500",
    "unlockLabel": "Win 500 matches"
  }
]
```

Alternative manifest source:

- Use `sourcePath` (repo-relative path) instead of `file` for vendor/imported assets.

## Notes

- If catalog docs are missing/unavailable, app falls back to local bundled background options.
- Catalog reads are now scope-aware:
  - regular users load only active non-admin backgrounds
  - admins can load full catalog
- Profile background rendering lazily fetches unknown IDs on demand instead of loading the full catalog on every page load.
- Admin dashboard includes a **Background Visibility Manager** for toggling:
  - `active` vs `inactive`
  - `public` vs `admin-only`
  - optional unlock metadata (`unlockType`, `unlockKey`, `unlockLabel`)

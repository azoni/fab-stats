# Publishing the FaB Stats extension to Firefox (AMO)

The extension code is already Firefox-compatible (no `chrome.*`/`browser.*` APIs — only
standard web APIs) and the manifest is AMO-ready. This is the one-time checklist to get it
listed on [addons.mozilla.org](https://addons.mozilla.org) (AMO) so Firefox users get a
permanent, one-click "Add to Firefox" install with automatic updates.

The same `extension/` source ships to both Chrome and Firefox — Chrome ignores the
`browser_specific_settings` block, so there is **one codebase, one build**.

> Keep this guide at the repo root, **not** inside `extension/` — `scripts/zip-extension.mjs`
> bundles every file in `extension/` into the uploaded package.

---

## 1. Build the upload artifact

```bash
npm run build:ext        # writes public/fab-stats-extension.zip
```

Upload `public/fab-stats-extension.zip` to AMO. (This is the same zip the site serves for the
manual-install fallback.)

Sanity-check it first — should print `errors 0`:

```bash
npx web-ext lint --source-dir extension
```

> Expect 3 `UNSAFE_VAR_ASSIGNMENT` warnings for `innerHTML` in `content.js`. These are
> **advisory only** and do not block signing — the assigned HTML is built from
> developer-controlled template strings (status text, match counts, the import URL), not from
> attacker-controlled input. If an AMO reviewer ever asks, the fix is to render the dynamic
> bits with `textContent`/`createElement` instead of `innerHTML`.

## 2. Create a Mozilla add-on developer account

Free, one-time: https://addons.mozilla.org/developers/ → sign in with a Firefox account.

## 3. Submit a new add-on

Developer Hub → **Submit a New Add-on** → **On this site** (listed / AMO-hosted) → upload the
zip.

**Slug — important:** set the listing slug to **`fab-stats-gem-exporter`** (matches the Chrome
Web Store slug). The site's "Add to Firefox" button links to
`https://addons.mozilla.org/firefox/addon/fab-stats-gem-exporter/`, so the slug must match or
that button 404s. (See `src/app/import/page.tsx`.)

## 4. Data-collection consent (must match the manifest)

The manifest declares:

```json
"data_collection_permissions": { "required": ["websiteContent"] }
```

…because the extension reads your GEM match history (website content) and transmits it to
fabstats.net. On the AMO form, answer the data-collection questions to match: **Website
content — required**. Mismatches between the form and the manifest get flagged in review.

## 5. Privacy policy

Required because we declare data collection. Use the existing page:
**https://www.fabstats.net/privacy** (source: `src/app/privacy/page.tsx`). Make sure it
mentions that the browser extension reads your GEM match history and sends it to your FaB Stats
account at your explicit action.

## 6. Source code

Not required — `content.js` ships **unminified/unobfuscated**, so AMO's "provide source code"
requirement does not apply. If that ever changes (a build step that minifies), AMO will require
a source upload + build instructions.

## 7. Review & go live

First-time listings get a human review, typically ~1–3 days. Once approved:

1. Confirm `https://addons.mozilla.org/firefox/addon/fab-stats-gem-exporter/` resolves.
2. Deploy the site so the **Add to Firefox** button (on `/import`) goes live. Until approval
   the button 404s, so deploy this change *after* the listing is approved — the manual-install
   `<details>` fallback covers users in the meantime.

---

## Pushing future updates

AMO requires a unique version per upload. For each update:

1. Bump the version in **both** `extension/manifest.json` and the `VERSION` constant in
   `extension/content.js` (keep them in sync; `VERSION` is recorded on every import).
2. `npm run build:ext`
3. Developer Hub → the listing → **Upload New Version** → upload the new zip.

Keeping the Chrome and Firefox versions identical is the simplest policy — publish the same
bumped zip to both stores.

## Compatibility notes

- `strict_min_version` is **140.0** (Android **142.0**) — the first versions that support the
  `data_collection_permissions` manifest key. As of mid-2026 this covers all actively-updated
  Firefox installs (current ESR is 140). Lowering it re-introduces the
  `KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION` lint warnings but does not otherwise break older
  Firefox (the key is just ignored there).
- Add-on ID: `fabstats@fabstats.net` (set in the manifest; AMO ties the listing to it).

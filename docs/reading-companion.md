# Reading companion

Phases 3–4 add reader tools, local statistics, offline reading, metadata and optional syncing. Everything below keeps the static export, the base path and the black/white/lime design system.

## Reader tools

- Select text in a Markdown or HTML reader to highlight it in one of four colours. Anchors store the quote plus short prefix/suffix context, so a highlight can be relocated after a small upstream edit; if the quote disappears, the highlight stays in Dexie but is not rendered.
- The Notes panel shows highlights for the current book. Each has a private note, a jump link to its chapter, a delete action and a Markdown export.
- The reader toolbar adds focus mode (`Z`), a shortcuts dialog (`?`), and an estimate of minutes left, based on 225 words/minute and saved progress.
- Scroll position is saved per chapter in a preference key, in addition to the existing book-level progress.
- PDF pages now have a selectable text layer. Selecting text on a page stores a normalized rectangle (0–1000 coordinates) per book and page.

All reader tools work on the three allowlisted books. External resources never fetch book content.

## Local statistics

Reading stats are off by default. When enabled in Settings, the reader records sessions on visibility changes, capped at four hours each. `/stats` shows weekly minutes, current and longest streaks, a 56-day heatmap, an editable weekly goal, and a delete action. The heatmap component is lazy-loaded so `/stats` does not affect catalog or home-page paint.

Dexie version 3 adds `highlights` and `sessions` tables. The v2→v3 upgrade only adds stores; it does not rewrite existing records. Export format v3 includes both arrays and still imports v1 and v2 files.

## Offline mode

Offline mode is off by default. When enabled, `OfflineRegistrar` lazy-loads and registers `public/sw.js` with the `NEXT_PUBLIC_BASE_PATH` scope. The worker caches the app shell, manifest, `readable.json` and the three bundled books, keyed by the synced commit. It serves cached same-origin responses first and revalidates in the background. It never caches `books.json` or external URLs. Settings and the registrar both offer Clear offline data; the registrar shows an update notice when a new worker is installed.

## Source-provided metadata

`npm run sync:covers` also writes `public/data/cover-metadata.json`. Descriptions, first publication years, ISBNs and median page counts are stored only when Open Library returns them for the same strictly matched book, with a source URL per field. Missing fields stay absent; DevShelf never invents them. The book detail page shows this block with an Open Library attribution when present, and the validator rejects unknown book ids or unsafe sources.

## SEO

`npm run generate:seo` (part of `prebuild`) writes one typographic SVG OG image per book, `sitemap.xml` and `robots.txt`. Book pages emit canonical, Open Graph, Twitter and `Book` JSON-LD metadata. All generated paths respect the deployed site URL; no runtime dependency was added.

## Optional gist sync

Gist sync is off by default and always user-initiated. The Settings panel previews the upload, then sends only book ids, statuses and timestamps to a secret gist in the user's GitHub account. Notes, highlights, bookmarks, progress and preferences are never uploaded. The token is encrypted locally with AES-GCM derived from a user passphrase (PBKDF2, 150,000 iterations), stored as a preference (`gistTokenEncrypted`), and filtered out of exports. Remote entries are merged by newest timestamp; conflicts with different statuses are reported. Disconnecting clears local token/gist preferences but leaves the user's gist intact.

This is the only feature that sends data to a third party from the browser, and it requires an explicit toggle plus an explicit Sync click.

## Tests and commands

`npm test` covers highlight anchors and relocation, Markdown export, reading time, session aggregation and streaks, PDF rectangle clamping, gist conflict merging, token encryption round-trips, and Open Library metadata extraction. `npm run smoke` checks `/stats`, `/manifest.webmanifest`, `/sitemap.xml`, `/robots.txt` and `/sw.js` in addition to the earlier routes.

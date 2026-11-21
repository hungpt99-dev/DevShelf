# DevShelf feature plan

Status: Phase 0 recon complete. No feature code from phases 1–4 has been written. Awaiting approval of this document.

## Recon snapshot

### Static data (`public/data/`)

| File | Content |
| --- | --- |
| `books.json` | 4,735 normalized book records. Stable SHA-1-like ids (`b-…`), source file/line/heading, original URL, authors, language, categories, format, license, reading availability. |
| `categories.json` | 498 categories derived from Markdown headings. |
| `languages.json` | 46 languages derived from source filenames. |
| `metadata.json` | Source commit, sync timestamp, counts, license. |
| `readable.json` | 3 allowlisted books: Clean ABAP (Markdown, 226 chapters), Smooth CoffeeScript (HTML, 50 chapters), The Little Go Book (PDF, 84 pages). |
| `sync-history.json` | Last 24 sync runs with added/updated/removed ids. |
| `covers.json` | Stable book id → Open Library cover URL; currently 1 matched cover. |

Other committed assets: `public/content/` (the three bundled books), `public/images/default-cover.svg`, `public/pdf/pdf.worker.min.mjs` and `public/pdf/standard_fonts/`. Miss cache: `scripts/cache/cover-misses.json`.

### Dexie schema (`src/lib/db/db.ts`)

Version 1 only, database `devshelf`:

- `books`: `id`, `title`, `metadata` — key `id`, index `title`.
- `readingProgress`: `bookId`, `chapterId`, `position`, `percentage`, `updatedAt` — key `bookId`.
- `readingList`: `bookId`, `status` (`saved|reading|completed`), `addedAt` — key `bookId`.
- `bookmarks`: `id`, `bookId`, `chapterId`, `position`, `note`, `createdAt` — key `id`.
- `preferences`: `key`, `value` — key `key`. Types live in `Preferences`; defaults in `DEFAULT_PREFERENCES`.

Export/import is v1 only (`src/lib/db/operations.ts`): import clears all tables and requires `version === 1`.

### Reader providers (`src/lib/readers/providers.ts`)

- `MarkdownReaderProvider`: fetches same-origin Markdown, builds chapters from `h1`–`h4` using `github-slugger`.
- `HtmlReaderProvider`: fetches same-origin HTML, assigns heading ids, rewrites relative asset links against `assetBase`, sanitizes with DOMPurify, wraps external links with `noopener noreferrer`.
- `PdfReaderProvider`: HEAD-checks same-origin PDF, lazy-loads `pdf.js` in the UI.
- `ExternalReaderProvider`: no content load; detail page points to the original source.

Reader chrome lives in `src/components/reader/reader-shell.tsx`; Markdown/HTML rendering in `markdown-content.tsx` and `html-content.tsx`; code blocks in `code-block.tsx`. No DOMPurify rules or allowlist changes are planned.

### CI workflow (`.github/workflows/sync-books.yml`)

Schedule `0 */6 * * *` plus `workflow_dispatch({force})`. Steps: check upstream SHA, sync catalog, fetch a bounded cover batch, validate data, test/typecheck, commit data, build with `NEXT_PUBLIC_BASE_PATH=/DevShelf`, deploy GitHub Pages, optional Cloudflare build/deploy gated on secrets. The current head has no workflow run yet; the last run deployed Pages and failed only at the Cloudflare step (token missing `User → User Details:Read` / `User → Memberships:Read`). Link health gets a separate weekly workflow.

### Phase 0 reader regression findings

Checked in a real browser against the bundled Clean ABAP Markdown book:

- Inline code is `display: inline` — no bug.
- TOC has 226 entries, all unique; DOM headings have 226 unique ids — no duplicate entries.
- Next button is rendered and enabled — no bug.
- Real bug found: `text-ink` was not a Tailwind token (`--color-ink` was missing), so the active TOC entry inherited the reader foreground while its background came from the app theme. With different app/reader themes this failed contrast. Fixed by adding `--color-ink` and `--color-reader-fg` tokens, using `text-foreground` for TOC chrome and `text-reader-fg` for reader-content labels.
- Real bug found: fenced Markdown code rendered without `<pre>` because `CodeBlock` did not wrap its children. Fixed by wrapping children in `<pre>`.
- Regression tests added in `scripts/lib/reader-ui.test.ts`; smoke now asserts TOC and chapter navigation are present on every reader route.

## Baseline measurements

| Metric | Before Phase 0 |
| --- | --- |
| Unit tests | 16 passing (19 after Phase 0 regression tests) |
| Smoke checks | 21/21 |
| Static build | exit 0, 9,477 pages, ~2 min |
| Home first-load JS | 886 KB (13 scripts) |
| Catalog first-load JS | 906 KB (14 scripts) |
| Reader first-load JS | 1,218 KB (14 scripts, includes PDF chunk) |
| Total `out/_next/static/chunks/*.js` | 1,972 KB (25 files) |

Reproduce with a script that sums `<script src="…js">` bytes in the built HTML, plus `du` over the chunk directory. Every later phase reports the same numbers and must not increase the home or catalog budget.

## Dexie migration plan

1. **Version 2 — library v2 (Phase 2).** Add `shelves: "id,name,color,createdAt"`. Extend `readingList` records with optional `shelfId`, `tags[]`, `notes`, `rating`, `startedAt`, `finishedAt`. Upgrade callback backfills defaults on existing rows without clearing anything; primary keys stay `bookId`/`id`.
2. **Version 3 — highlights and stats (Phase 3).** Add `highlights: "id,bookId,chapterId,createdAt"` and `sessions: "id,date,startedAt"`. No upgrade data migration required (new empty tables).
3. **Version 4 — sync metadata (Phase 4, only if Gist sync ships).** Add `syncMeta: "key"` for conflict snapshots and last-known-good hashes. Never store the Gist token in a versioned table; it stays an encrypted preference value.

Export format v2: `{ version: 2, exportedAt, schemaVersion, books, readingProgress, readingList, bookmarks, preferences, shelves, highlights, sessions }`. Import accepts v1 or v2: v1 records are mapped into v2 defaults and tagged `importedFromVersion: 1`. No import path may clear tables before validating the file.

## Data schemas for new static files

- `data/paths/*.json`: `{ id, title, description, level, estimatedHours?, books: [{ id, why }] }`; ids must exist in `books.json`, order unique, description must not invent book metadata.
- `public/data/link-health.json`: `{ [sourceUrl]: { status: "ok|redirected|broken|unknown", httpStatus: number|null, checkedAt, consecutiveFailures } }`; broken only after two consecutive failures.
- Share hash payload: `{ v: 1, kind: "shelf|path", title?, items: [{ id, status? }] }` → JSON → `CompressionStream('deflate-raw')` → base64url. Cap 4 KB decoded, fail with a visible error above that.
- `highlights` record: `{ id, bookId, chapterId, quote, prefix, suffix, startOffset, endOffset, color, note?, createdAt }`; applied as DOM ranges after sanitization, never through `innerHTML`.
- `sessions` record: `{ id, date, startedAt, endedAt, activeMs }`; derived from visibility/idle events, content never recorded.
- Editions: keep the existing stable id on the representative record and add `editions: [{ id, title, authors, language, format, url, source }]`; grouping key = normalized title + first author, ignoring format/language.
- Cover enrichment: keep `covers.json` as id → URL for compatibility; add `public/data/cover-metadata.json` with `{ [id]: { description?, firstPublishYear?, isbn?, pageCount?, sources } }`, only when Open Library supplies the value.
- Generated build outputs: `feed.xml` (Atom), `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, per-book OG images.

## Phase file lists

### Phase 1 — Foundations
- Add `src/lib/i18n/{index.ts,en.ts,vi.ts}`, `src/hooks/use-url-filters.ts`, tests in `scripts/lib/i18n.test.ts` and `scripts/lib/url-filters.test.ts`.
- Change `src/components/books/catalog.tsx`, `src/app/books/page.tsx`, `src/components/settings/settings-form.tsx`, `src/providers/preferences-provider.tsx`, `src/lib/db/db.ts` (preference keys only, no schema change), `src/app/layout.tsx` (`lang`).
- Docs: `docs/i18n.md`, README surfaces/status/measured, `docs/DEPLOYMENT.md` if base-path notes change.

### Phase 2 — Library and discovery
- Dexie v2: `src/lib/db/db.ts`, `operations.ts`, new `scripts/lib/db-migration.test.ts`, `scripts/lib/export-v2.test.ts`.
- UI: `reading-list-view.tsx`, `book-card.tsx`, `book-actions.tsx`, `books/[id]/page.tsx`.
- Paths: `data/paths/*.json`, `scripts/lib/paths-schema.ts`, `validate-data.ts`, `src/app/paths/{page.tsx,[id]/page.tsx}`, tests.
- Share: `src/lib/share.ts`, `src/app/shared/page.tsx`, `scripts/lib/share.test.ts`, export helpers.
- Editions: `scripts/lib/parse-books.ts`, `scripts/sync-books.ts`, `parse-books.test.ts`, `book-card.tsx`, detail page.
- Link health: `.github/workflows/link-health.yml`, `scripts/check-links.ts`, `public/data/link-health.json`, detail page, catalog filter, `.github/ISSUE_TEMPLATE/*`.
- New/feed/changelog: `src/app/new/page.tsx`, `src/app/changelog/page.tsx`, build-time `scripts/generate-feeds.ts`, `public/feed.xml`.
- Smoke: add `/paths`, `/new`, `/shared`, `/feed.xml`.

### Phase 3 — Reader and habits
- Highlights: `src/lib/readers/highlight-anchor.ts`, `src/components/reader/highlight-*`, Dexie v3, tests.
- Reader QoL: `reader-shell.tsx`, new `src/components/reader/shortcuts-dialog.tsx`, reading-time helper + test.
- Stats (OPT-IN): `src/lib/stats/*`, lazy `src/components/stats/heatmap.tsx`, settings toggle, `docs/STATS.md`.
- PDF text layer/annotations: `pdf-reader.tsx`, `src/lib/readers/pdf-highlights.ts`, test on the bundled 84-page PDF plus a larger externally sourced test fixture.
- PWA (OPT-IN): `public/manifest.webmanifest`, `public/sw.js`, `src/components/pwa/*`, settings toggle, base-path tests with and without `NEXT_PUBLIC_BASE_PATH`.

### Phase 4 — Growth and enrichment
- SEO: `generateStaticParams` already exists for books; add metadata/OG generation, `scripts/generate-seo.ts`, `public/sitemap.xml`, `public/robots.txt`, build-time timing in report, `docs/SEO.md`.
- Enrichment: extend `scripts/fetch-covers.ts` for description/year/ISBN/pages with source, `cover-metadata.json`, validator, settings copy, tests.
- Gist sync (OPT-IN): `src/lib/sync/gist.ts`, Web Crypto helpers, merge UI, settings disconnect, `docs/SYNC.md`; README must state this is the only feature that sends user data to a third party.

## Risks and decisions

1. **Privacy wins over completeness.** Any feature needing a browser-side third-party request (Gist sync, Open Library covers) stays default OFF with a Settings toggle and a README privacy note. Link health and cover fetching are CI/build-time only and never use the visitor's browser.
2. **Base path everywhere.** Every direct `fetch`, manifest path, service-worker scope, sitemap URL and OG URL must go through `publicPath()` or derive from `NEXT_PUBLIC_BASE_PATH`. Both build modes get tested.
3. **No silent data loss.** Dexie upgrades are additive; import validates before clearing; v1 exports remain importable; conflicts in Gist sync always show a merge screen.
4. **DOMPurify and allowlist stay unchanged.** Highlights are DOM ranges applied after sanitize; no `innerHTML` of user text; no new bundled book content.
5. **Search and first paint stay flat.** URL/i18n work must not add work to the catalog filter loop; heavy code (PDF, heatmap, service worker, share codec) is dynamically imported.
6. **Build time cap 10 minutes.** If per-book OG generation exceeds it, prerender categories plus the top N books and document the client fallback for the rest.
7. **Broken-link accuracy.** A link is labeled "may be unavailable" only after two consecutive failures; the workflow never blocks deploy and never fails the job on network errors.
8. **Pre-existing external blocker.** Cloudflare deploy still fails with auth code 10000 until the token gains the two missing User read permissions. This does not block GitHub Pages or feature work.

## Phase 0 result

- `docs/PLAN-features.md` added; no phase-1+ feature code.
- Reader fixes: `--color-ink` / `--color-reader-fg` tokens, fenced code wrapped in `<pre>`, TOC active entry uses app-theme foreground, reader labels use reader foreground.
- Tests: 19/19 (three new reader regression tests); smoke 21/21 with TOC and chapter-navigation guards; typecheck, lint, data validation, README check and static build all pass.
- Browser check with app theme light + reader theme dark: active TOC contrast 18.88:1, fenced code contains `<pre>`.
- Bundle after Phase 0: home 886.0 KB, catalog 905.9 KB, reader 1,218.1 KB, total chunks 1,972.1 KB — effectively flat.

## Approval gate

Phase 0 stops here. Please approve this plan before Phase 1 begins.

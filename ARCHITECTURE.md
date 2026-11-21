# DevShelf architecture

The phased feature roadmap and migration plan live in [docs/PLAN-features.md](docs/PLAN-features.md). No phase-1+ feature code has been implemented yet.

## Runtime shape

DevShelf is a static Next.js App Router application (`output: "export"`). Pages that depend on the catalog are statically generated at build time; the large searchable catalog is fetched once by the browser from `/data/books.json` and indexed in memory with Fuse.js. There is no server-side request handling at runtime.

```
GitHub catalog Markdown ──sync-books.ts──▶ public/data/*.json ──build──▶ static HTML
                                      └──▶ public/content/<id>/* (allowlist only)
Browser ──fetch(/data/*.json)──▶ Fuse index + catalog UI
Browser ──Dexie/IndexedDB──▶ reading list, progress, bookmarks, preferences
```

## Ingestion (`scripts/`)

- `sync-books.ts` downloads one tarball of the upstream repository (or reads `--source`), parses every `books/*.md`, normalizes records and writes `books.json`, `categories.json`, `languages.json`, `readable.json`, `metadata.json` and a human-readable `scripts/reports/sync-report.md`.
- `lib/parse-books.ts` is a pure parser: heading hierarchy → categories, first HTTP(S) link → title/URL, following link labels → alternate formats, trailing source text → authors, parenthesized labels → format evidence and license. It never calls the network.
- `lib/parse-books.test.ts` covers the parser with literal fixtures (`node:test`).
- `validate-data.ts` validates all generated files with Zod, checks referential integrity and verifies that bundled content files exist.
- `reading-sources.json` is the only mechanism that downloads book content. Only URLs already present in the catalog can be matched; unknown entries are reported and skipped.

IDs are `b-` plus the first 12 hex characters of SHA-1 over the normalized URL (no hash, lowercase host, no tracking parameters). Deduplication is by that normalized URL, merging categories, authors, alternate links, licenses and source references.

## Automatic synchronization (CI only)

`scripts/sync-books.ts` is independent of the frontend app. In `--check` mode it resolves the upstream `main` SHA with `git ls-remote` and compares it with `metadata.json.commit`. A normal run downloads one tarball pinned to that SHA, parses it with the pure parser, diffs old/new records by stable ID, stages allowlisted content downloads in `.cache/`, and only then writes `public/data/*.json`, `public/content/`, `sync-history.json` and the report. Any failure aborts before writes and emits `scripts/reports/sync-error.md`, so the last known good dataset survives.

`public/data/sync-history.json` keeps the last 24 runs with added/updated/removed IDs and counts. The homepage reads its latest entry for "New in this sync"; the first entry is marked `initial` because there was no earlier run to diff against.

The GitHub Actions workflow runs this pipeline every 6 hours and on demand, validates data, commits only when the upstream commit changed, and deploys the static export to GitHub Pages. When Cloudflare secrets are configured, it rebuilds without a base path and also deploys the same dataset to Cloudflare Pages. The frontend never calls GitHub or any API at runtime; all tokens stay in the Actions runner.

## Reader engine

`ReaderProvider` (`src/lib/readers/types.ts`) defines `canRead`, `getReaderType` and `loadContent`. Implementations:

| Provider | Content | Table of contents | Saving |
| --- | --- | --- | --- |
| `MarkdownReaderProvider` | Bundled `.md`, rendered with react-markdown + GFM + rehype-slug/highlight | generated from heading AST with github-slugger | scroll position → IndexedDB |
| `HtmlReaderProvider` | Bundled `.html`, parsed with DOMParser, relative assets resolved against the source base URL, sanitized with DOMPurify | heading IDs from the document | scroll position → IndexedDB |
| `PdfReaderProvider` | Bundled `.pdf`, rendered by lazily imported pdf.js into a canvas | page navigation instead of chapters | last page → IndexedDB |
| `ExternalReaderProvider` | No bundled content | none | detail page links to the original source |

`selectProvider()` is the only selection point; a book is readable only when `books.json` says `reading.available` and a matching record exists in `readable.json`. External books never enter the reader as "readable".

## Client state and interface language

Catalog filters are encoded in the URL by `src/lib/url-filters.ts` and read with `useSearchParams()`; no server is involved. Interface copy comes from typed catalogs in `src/lib/i18n/`, selected by the `locale` preference. Book data and reader content are never translated.

## Persistence

Dexie/IndexedDB tables: `books` (local copy of metadata for saved books), `readingProgress`, `readingList`, `bookmarks`, `preferences`. All operations tolerate missing IndexedDB (SSR, privacy modes) by returning empty values. Export writes a versioned JSON document; import replaces local tables inside one transaction. Preferences are mirrored to `localStorage` only for the pre-hydration theme, so there is no flash of the wrong theme.

## State and UI

- Zustand holds ephemeral UI state (search dialog, table-of-contents toggle).
- `PreferencesProvider` loads preferences from IndexedDB and applies theme changes.
- shadcn/ui components provide accessible primitives (dialog, dropdown, tabs, switch, tooltip, etc.), styled with Tailwind CSS v4 design tokens.
- Reader theme is scoped via `.reader-scope[data-reader-theme]` so it can differ from the application theme.

## Performance and accessibility

- No book content is loaded on the homepage; only static metadata is inlined there.
- The PDF viewer and PDF worker are loaded on demand; the worker is copied into `public/pdf/` at install/build time.
- Search index construction happens once, in the browser, after the first search dialog opens.
- Semantic landmarks, labelled controls, visible focus rings, keyboard navigation and `prefers-reduced-motion` handling are used throughout.

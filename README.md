# DevShelf

A free programming books library and reader built from the [EbookFoundation/free-programming-books](https://github.com/EbookFoundation/free-programming-books) catalog.

DevShelf is a **frontend-only, static** Next.js application. It has no backend, no API, no database server, no authentication and no cloud sync. Book records come from the source repository; your reading list and progress live in your browser's IndexedDB.

## What works

- Real catalog ingestion: 4,700+ resources parsed from the repository's `books/*.md` files, with source file, heading and line preserved.
- Discovery: editorial homepage, full catalog with instant search (Cmd/Ctrl+K), filters by title/author/language/category/format/availability, sorting and load-more paging.
- Book details: source-provided authors, language, categories, format evidence, license when stated, alternate links and related resources.
- Reading: modular providers for Markdown, HTML and PDF content, with table of contents, themes, font controls, keyboard navigation, fullscreen and locally saved progress.
- Personal library: reading list (saved / reading / completed), bookmarks, progress, export and import — all in IndexedDB, no account.
- Responsive, accessible interface with light, dark and sepia themes and reduced-motion support.

## Quick start

Requires Node.js 20.9+ (developed on Node 24).

```bash
npm install
npm run sync          # download and parse the real catalog; writes public/data/*.json
npm run validate:data # verify generated data and bundled content
npm run dev           # http://localhost:3000
```

The generated JSON files are committed in `public/data/`, so the app also runs without re-syncing. Re-run `npm run sync` whenever you want a fresh snapshot of the upstream catalog.

## npm scripts

| Script | Purpose |
| --- | --- |
| `npm run sync` | Download the repository tarball, parse catalog Markdown, deduplicate, generate indexes and bundle the allowlisted reading content. `--source <dir>` parses a local checkout; `--no-content` skips content downloads. |
| `npm run validate:data` | Validate all generated JSON with Zod and check that readable content files exist. |
| `npm run sync:check` | Print `CHANGED=true/false` by comparing the upstream commit with the last successful sync. |
| `npm test` | Unit tests for the Markdown parser and the added/updated/removed diff logic. |
| `npm run typecheck` | TypeScript strict-mode check. |
| `npm run lint` | ESLint. |
| `npm run build` | Static production export into `out/`. |
| `npm start` | Serve the built `out/` directory locally. |

## Automatic synchronization

`.github/workflows/sync-books.yml` keeps the catalog current without a server or manual intervention:

- Runs every 6 hours (`0 */6 * * *`) and on `workflow_dispatch`.
- Detects upstream changes with `git ls-remote`; if the `main` commit matches the last successful sync, validation still runs but no commit, build or deployment happens.
- On a change, downloads a tarball pinned to that exact commit, re-parses the catalog, computes added/updated/removed resources, regenerates every index, validates the data, commits the dataset, builds and deploys to GitHub Pages.
- `workflow_dispatch` offers a `force` input to rebuild/redeploy even when upstream is unchanged.
- On any network, parse, validation or content failure the job stops before writing: the last known good dataset and the live deployment are retained, and an error report is attached to the run.

The website displays the last synchronized timestamp, total books, recently added books from `public/data/sync-history.json`, and the source repository link. Browser-stored reading progress, bookmarks and preferences are never touched by synchronization.

Setup: enable GitHub Pages with **Source: GitHub Actions** in repository settings. No token is placed in frontend code — the workflow uses the built-in `GITHUB_TOKEN` for the data commit and Pages deployment.

## Data and attribution

The catalog is derived from [EbookFoundation/free-programming-books](https://github.com/EbookFoundation/free-programming-books), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Each generated book record keeps its original URL, source file, line and heading.

DevShelf does **not** invent descriptions, authors, publication dates, ratings, popularity metrics or licenses. Formats and licenses are recorded only when the source provides explicit evidence; otherwise the values are `unknown` / `null`. Books that cannot be rendered locally link to their original source — DevShelf never scrapes, proxies or bypasses access restrictions.

A small, explicit allowlist in `scripts/reading-sources.json` controls which books are bundled for in-app reading. Individual book licenses and attribution are shown in the reader. See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) for the full list.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the module map, data flow, reader provider abstraction, IndexedDB schema and static-export notes.

## Static deployment

```bash
npm install
npm run build      # output: out/
```

Deploy the `out/` directory to any static host (Cloudflare Pages, Netlify, GitHub Pages with the appropriate base path, or any object storage + CDN). No server process, environment variables or API keys are required. Details in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Project layout

```
src/app/                 App Router pages (/, /books, /books/[id], /read/[id], /reading-list, /settings)
src/components/          layout, books, search, reader, settings, shadcn/ui components
src/features/            (feature-oriented helpers live under lib/ and components/)
src/lib/db/              Dexie schema and persistence operations
src/lib/readers/         ReaderProvider abstraction and implementations
src/lib/search/          Fuse.js local search index
src/providers/           Preferences context
src/stores/              Zustand UI state
src/types/               Shared data models
scripts/                 sync, validation, parser tests, PDF worker copy
public/data/             generated static JSON indexes
public/content/          allowlisted, attributed reading content
scripts/reports/         generated synchronization report
```

## License

DevShelf source code is provided under the MIT License. The upstream catalog is CC BY 4.0; individual books retain their own licenses as recorded in the data and reader attribution.

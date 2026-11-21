# Data sources and attribution

## Primary catalog

- Repository: [EbookFoundation/free-programming-books](https://github.com/EbookFoundation/free-programming-books), branch `main`.
- License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/) (see the repository's `LICENSE` file).
- DevShelf parses `books/free-programming-books-*.md`: `langs.md` and `subjects.md` (English) plus one file per translated language.
- The sync commit SHA, timestamp and counts are recorded in `public/data/metadata.json` and `scripts/reports/sync-report.md`.

All generated book records keep `source.repository`, `source.file`, `source.heading` and `source.line`, plus the original `url` and any alternate links exactly as they appear in the catalog.

## Generated files

| File | Contents |
| --- | --- |
| `public/data/books.json` | Normalized book records. `description` is always `null`; `format` is `unknown` unless the source states a format or the URL is a direct file; `license` is `null` unless the source states one. |
| `public/data/categories.json` | Category names, slugs and counts derived from Markdown headings. |
| `public/data/languages.json` | Language codes, names and counts derived from source filenames. |
| `public/data/readable.json` | Allowlisted bundled content mapping: book ID → local path, original source URL, attribution, license and asset base. |
| `public/data/metadata.json` | Provenance, commit, sync timestamp, license and aggregate counts. |
| `public/data/sync-history.json` | Last 24 synchronization runs with added/updated/removed book IDs and counts; drives "New in this sync" on the homepage. |
| `scripts/reports/sync-report.md` | Human-readable synchronization report, including per-file counts and content download status. |

## Bundled reading content

Content is downloaded **only** from URLs that already appear in the catalog and are listed in `scripts/reading-sources.json`. This is a deliberate, reviewable allowlist — DevShelf does not mirror every book.

| Book | Format | Source link in the catalog | License / attribution |
| --- | --- | --- | --- |
| Clean ABAP | Markdown | `https://github.com/SAP/styleguides/blob/master/clean-abap/CleanABAP.md` | CC BY 3.0 per the source repository LICENSE; SAP SE |
| Smooth CoffeeScript | HTML | `http://autotelicum.github.io/Smooth-CoffeeScript/SmoothCoffeeScript.html` | CC BY per the catalog entry; Kevin Lindsay |
| The Little Go Book | PDF | `https://www.openmymind.net/assets/go/go.pdf` | CC BY-NC-SA per the catalog entry; Karl Seguin |

The reader displays attribution and license for each of these books, plus the upstream catalog attribution.

## Change detection

Each run compares the upstream `main` commit SHA (from `git ls-remote`) with `metadata.json.commit`. Changed runs are diffed by stable book ID: new IDs are *added*, missing IDs are *removed*, and records whose source-derived fields changed are *updated*. Volatile timestamps and local reading state are excluded from that comparison. The synchronization report lists counts and sample titles for all three categories.

## Integrity rules

- No fabricated descriptions, authors, dates, covers, ratings, popularity numbers or download links.
- No runtime scraping of arbitrary websites and no attempts to bypass CORS, authentication or paywalls.
- Other resources remain external: their detail pages link to the original source and explain that DevShelf cannot render them locally.

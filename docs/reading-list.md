# Reading list v2

The reading list is local-only (Dexie/IndexedDB). Any book id works — bundled or external.

Dexie version 2 adds `shelves` and extends `readingList` with `shelfId`, `tags`, `notes`, `rating`, `startedAt` and `finishedAt`. The upgrade backfills existing rows with empty defaults; no table is cleared. Export format v2 includes shelves; import accepts v1 and v2.

Cards and detail pages have "Mark as reading" and "Mark as done" actions. The detail page also has a private editor for shelf, tags, note, 1–5 rating and dates. The reading list page filters by status, shelf, tag and rating, sorts by added/title/status/rating, and exports Markdown or JSON.

All fields stay in this browser. There is no account and no cloud sync.

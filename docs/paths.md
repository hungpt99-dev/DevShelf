# Learning paths

Curated JSON lives in `data/paths/*.json`; `schema.json` documents the shape. Each path has an id, title, description, level, optional estimated hours, and an ordered list of catalog book ids with a short "why this book" note.

`npm run validate:data` checks the schema, verifies every book id exists in `public/data/books.json`, and rejects duplicate ordering. Six paths are seeded from real catalog ids: Rust, JavaScript fundamentals, algorithms and data structures, Git and tooling, Linux command line, Python for beginners.

`/paths` lists paths with progress derived from the local reading list. `/paths/[id]` shows the ordered books, their notes and share/export actions. Book content is never invented or translated.

# Sharing without a server

A shelf or path can be shared as a URL hash. `src/lib/share.ts` serializes `{ v: 1, kind, title?, items }` to JSON, compresses it with `CompressionStream('deflate-raw')`, and base64url-encodes the result. Decoding rejects bad hashes, unsupported versions and oversize payloads (4 KB before compression).

`/shared` decodes the hash, displays the books read-only from the local catalog, and offers "Import to my list". Share payloads contain only book ids and reading statuses — no tokens, notes, personal data or analytics.

Shelves can also be exported to Markdown and JSON from the reading list and path pages.

import assert from "node:assert/strict";
import test from "node:test";
import type { Book } from "../../src/types/book";
import { changedFields, diffBooks, stableSignature } from "./sync-diff";

function book(id: string, overrides: Partial<Book> = {}): Book {
  return {
    id, title: `Book ${id}`, authors: [], description: null, language: "English", languageCode: "en",
    categories: ["Go"], url: `https://example.test/${id}`, alternateUrls: [], format: "unknown",
    formatEvidence: null,
    source: { repository: "EbookFoundation/free-programming-books", file: "books/free-programming-books-langs.md", heading: "Go", line: 1 },
    license: null, lastSyncedAt: "2026-01-01T00:00:00.000Z", firstSeenAt: "2026-01-01T00:00:00.000Z",
    lastSeenAt: "2026-01-01T00:00:00.000Z", reading: { available: false, type: null },
    ...overrides,
  };
}

test("detects added, removed and updated resources by stable ID", () => {
  const previous = [book("keep"), book("gone"), book("changed")];
  const current = [book("keep"), book("changed", { authors: ["New Author"] }), book("fresh")];
  const result = diffBooks(previous, current);
  assert.deepEqual(result.added.map((item) => item.id), ["fresh"]);
  assert.deepEqual(result.removed.map((item) => item.id), ["gone"]);
  assert.deepEqual(result.updated.map((item) => item.id), ["changed"]);
  assert.deepEqual(result.updatedDetails[0].fields, ["authors"]);
});

test("timestamps and local reading state are not updates", () => {
  const a = book("same");
  const b = book("same", {
    firstSeenAt: "2026-02-01T00:00:00.000Z",
    lastSeenAt: "2026-02-01T00:00:00.000Z",
    lastSyncedAt: "2026-02-01T00:00:00.000Z",
    reading: { available: true, type: "markdown" },
  });
  assert.equal(stableSignature(a), stableSignature(b));
  assert.deepEqual(changedFields(a, b), []);
  assert.equal(diffBooks([a], [b]).updated.length, 0);
});

import assert from "node:assert/strict";
import test from "node:test";
import { normalizeExport, upgradeV1ToV2 } from "../../src/lib/db/export-format";

const v1 = {
  version: 1,
  exportedAt: "2026-01-01T00:00:00.000Z",
  books: [{ id: "b-1", title: "Book", metadata: {} }],
  readingProgress: [{ bookId: "b-1", chapterId: null, position: 0, percentage: 12, updatedAt: "2026-01-01T00:00:00.000Z" }],
  readingList: [{ bookId: "b-1", status: "reading", addedAt: "2026-01-01T00:00:00.000Z" }],
  bookmarks: [],
  preferences: [{ key: "theme", value: "dark" }],
};

test("v1 exports are upgraded to v2 without losing arrays", () => {
  const v2 = upgradeV1ToV2(v1 as never);
  assert.equal(v2.version, 2);
  assert.equal(v2.schemaVersion, 2);
  assert.equal(v2.books.length, 1);
  assert.equal(v2.readingList.length, 1);
  assert.equal(v2.preferences[0].key, "theme");
  assert.deepEqual(v2.shelves, []);
  assert.deepEqual(v2.highlights, []);
  assert.deepEqual(v2.sessions, []);
});

test("normalizeExport accepts v1 and marks the import source", () => {
  const result = normalizeExport(v1);
  assert.equal(result.version, 2);
  assert.equal(result.importedFromVersion, 1);
  assert.equal(result.readingProgress[0].percentage, 12);
});

test("normalizeExport preserves a v2 file including new arrays", () => {
  const v2 = { ...upgradeV1ToV2(v1 as never), shelves: [{ id: "s-1", name: "Learning" }], highlights: [{ id: "h-1" }] };
  const result = normalizeExport(v2);
  assert.equal(result.importedFromVersion, undefined);
  assert.deepEqual(result.shelves, [{ id: "s-1", name: "Learning" }]);
  assert.deepEqual(result.highlights, [{ id: "h-1" }]);
});

test("normalizeExport rejects unsupported or malformed files", () => {
  assert.throws(() => normalizeExport({ version: 3 }), /Unsupported export version/);
  assert.throws(() => normalizeExport({ version: 2, books: [], readingList: null }), /Invalid export file/);
  assert.throws(() => normalizeExport(null), /Invalid export file/);
});

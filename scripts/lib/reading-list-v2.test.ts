import assert from "node:assert/strict";
import test from "node:test";
import { filterAndSortEntries, upgradeReadingListV1, type Shelf, type V2ListEntry } from "../../src/lib/reading-list-v2";

const shelves: Shelf[] = [
  { id: "s-1", name: "Learning", color: "#c8f542", createdAt: "2026-01-01T00:00:00.000Z" },
];

function entry(bookId: string, extra: Partial<V2ListEntry> = {}): V2ListEntry {
  return {
    bookId, status: "reading", addedAt: "2026-01-01T00:00:00.000Z", shelfId: null,
    tags: [], notes: "", rating: 0, startedAt: null, finishedAt: null, ...extra,
  };
}

test("v1 reading list records gain v2 defaults", () => {
  const upgraded = upgradeReadingListV1([
    { bookId: "b-1", status: "reading", addedAt: "2026-01-01T00:00:00.000Z" },
  ]);
  assert.deepEqual(upgraded[0], entry("b-1"));
});

test("filtering by shelf, tag, status and rating works together", () => {
  const list = [
    entry("b-1", { shelfId: "s-1", tags: ["rust"], rating: 5 }),
    entry("b-2", { shelfId: "s-1", tags: ["go"], rating: 3, status: "completed" }),
    entry("b-3", { rating: 4 }),
  ];
  assert.deepEqual(filterAndSortEntries(list, { shelves }, { shelfId: "s-1" }).map((e) => e.bookId), ["b-1", "b-2"]);
  assert.deepEqual(filterAndSortEntries(list, { shelves }, { tag: "rust" }).map((e) => e.bookId), ["b-1"]);
  assert.deepEqual(filterAndSortEntries(list, { shelves }, { status: "completed" }).map((e) => e.bookId), ["b-2"]);
  assert.deepEqual(filterAndSortEntries(list, { shelves }, { minRating: 4 }).map((e) => e.bookId), ["b-1", "b-3"]);
});

test("sorting supports added, title, status and rating", () => {
  const list = [entry("b-1", { rating: 2 }), entry("b-2", { rating: 5 }), entry("b-3", { rating: 3 })];
  assert.deepEqual(filterAndSortEntries(list, { shelves }, { sort: "rating" }).map((e) => e.bookId), ["b-2", "b-3", "b-1"]);
  assert.deepEqual(filterAndSortEntries(list, { shelves }, { sort: "rating", minRating: 3 }).map((e) => e.bookId), ["b-2", "b-3"]);
});

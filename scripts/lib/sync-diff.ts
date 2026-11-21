import type { Book } from "../../src/types/book";

const VOLATILE = new Set(["firstSeenAt", "lastSeenAt", "lastSyncedAt", "reading"]);

/** Source-derived fields only: timestamps and local reading state never count as book updates. */
export function stableSignature(book: Book): string {
  return JSON.stringify(Object.fromEntries(Object.entries(book).filter(([key]) => !VOLATILE.has(key))));
}

export function changedFields(previous: Book, current: Book): string[] {
  return (Object.keys(current) as (keyof Book)[]).filter(
    (key) => !VOLATILE.has(key) && JSON.stringify(previous[key]) !== JSON.stringify(current[key]),
  );
}

export function diffBooks(previous: Book[], current: Book[]) {
  const previousById = new Map(previous.map((book) => [book.id, book]));
  const currentById = new Map(current.map((book) => [book.id, book]));
  const added = current.filter((book) => !previousById.has(book.id));
  const removed = previous.filter((book) => !currentById.has(book.id));
  const updated = current.filter(
    (book) => previousById.has(book.id) && stableSignature(previousById.get(book.id)!) !== stableSignature(book),
  );
  const updatedDetails = updated.map((book) => ({
    id: book.id,
    title: book.title,
    fields: changedFields(previousById.get(book.id)!, book),
  }));
  return { added, removed, updated, updatedDetails };
}

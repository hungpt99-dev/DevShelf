import Fuse, { type FuseResult } from "fuse.js";
import type { Book } from "@/types/book";

let index: Fuse<Book> | null = null;

export function buildSearchIndex(books: Book[]): void {
  index = new Fuse(books, {
    keys: [
      { name: "title", weight: 0.45 },
      { name: "authors", weight: 0.25 },
      { name: "categories", weight: 0.2 },
      { name: "language", weight: 0.1 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    includeMatches: true,
    minMatchCharLength: 2,
  });
}

export function searchBooks(query: string, limit = 12): FuseResult<Book>[] {
  if (!index || query.trim().length < 2) return [];
  return index.search(query.trim(), { limit });
}

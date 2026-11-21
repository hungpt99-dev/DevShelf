import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Book, CategoryRecord, LanguageRecord, LibraryMetadata, ReadableRecord } from "@/types/book";

const DATA_DIR = join(process.cwd(), "public", "data");

function load<T>(name: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, name), "utf8")) as T;
}

// Static generation calls these functions thousands of times; parse each file once per worker.
let booksCache: Book[] | null = null;
let metadataCache: LibraryMetadata | null = null;
let categoriesCache: CategoryRecord[] | null = null;
let languagesCache: LanguageRecord[] | null = null;
let readableCache: ReadableRecord[] | null = null;
let bookIndex: Map<string, Book> | null = null;

export function getBooks(): Book[] {
  booksCache ??= load<Book[]>("books.json");
  return booksCache;
}

export function getBook(id: string): Book | undefined {
  bookIndex ??= new Map(getBooks().map((book) => [book.id, book]));
  return bookIndex.get(id);
}

export function getMetadata(): LibraryMetadata {
  metadataCache ??= load<LibraryMetadata>("metadata.json");
  return metadataCache;
}

export function getCategories(): CategoryRecord[] {
  categoriesCache ??= load<CategoryRecord[]>("categories.json");
  return categoriesCache;
}

export function getLanguages(): LanguageRecord[] {
  languagesCache ??= load<LanguageRecord[]>("languages.json");
  return languagesCache;
}

export function getReadable(): ReadableRecord[] {
  readableCache ??= load<ReadableRecord[]>("readable.json");
  return readableCache;
}

export function getRelatedBooks(book: Book, limit = 6): Book[] {
  return getBooks()
    .filter((candidate) => candidate.id !== book.id)
    .map((candidate) => ({
      book: candidate,
      overlap: candidate.categories.filter((category) => book.categories.includes(category)).length,
    }))
    .filter((item) => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.book.title.localeCompare(b.book.title))
    .slice(0, limit)
    .map((item) => item.book);
}

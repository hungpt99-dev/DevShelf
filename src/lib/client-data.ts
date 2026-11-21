import { publicPath } from "@/lib/utils";
import type { Book, LanguageRecord, LibraryMetadata, ReadableRecord, ReadableRecord as Readable } from "@/types/book";

let booksPromise: Promise<Book[]> | null = null;
let readablePromise: Promise<ReadableRecord[]> | null = null;
let metadataPromise: Promise<LibraryMetadata> | null = null;
let languagesPromise: Promise<LanguageRecord[]> | null = null;

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(publicPath(path));
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
  return (await response.json()) as T;
}

export function fetchBooks(): Promise<Book[]> {
  booksPromise ??= getJson<Book[]>("/data/books.json");
  return booksPromise;
}

export function fetchReadable(): Promise<Readable[]> {
  readablePromise ??= getJson<ReadableRecord[]>("/data/readable.json");
  return readablePromise;
}

export function fetchMetadata(): Promise<LibraryMetadata> {
  metadataPromise ??= getJson<LibraryMetadata>("/data/metadata.json");
  return metadataPromise;
}

export function fetchLanguages(): Promise<LanguageRecord[]> {
  languagesPromise ??= getJson<LanguageRecord[]>("/data/languages.json");
  return languagesPromise;
}

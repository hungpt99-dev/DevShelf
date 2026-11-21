export type ReaderType = "markdown" | "html" | "pdf" | "external";
export type BookFormat = "pdf" | "html" | "epub" | "web" | "unknown";

export interface BookSource {
  repository: "EbookFoundation/free-programming-books";
  file: string;
  heading: string | null;
  line: number;
}

export interface AlternateLink {
  label: string;
  url: string;
}

export interface Book {
  id: string;
  title: string;
  authors: string[];
  description: null;
  language: string;
  languageCode: string;
  categories: string[];
  url: string;
  alternateUrls: AlternateLink[];
  format: BookFormat;
  formatEvidence: string | null;
  source: BookSource;
  license: string | null;
  lastSyncedAt: string;
  firstSeenAt: string;
  lastSeenAt: string;
  reading: { available: boolean; type: ReaderType | null };
}

export interface CategoryRecord {
  name: string;
  slug: string;
  count: number;
}

export interface LanguageRecord {
  code: string;
  name: string;
  count: number;
}

export interface ReadableRecord {
  bookId: string;
  type: Exclude<ReaderType, "external">;
  path: string;
  sourceUrl: string;
  originalUrl: string;
  license: string | null;
  attribution: string;
  assetBase: string | null;
  downloadedAt: string;
}

export interface SyncHistoryEntry {
  syncedAt: string;
  commit: string | null;
  added: string[];
  updated: string[];
  removed: string[];
  counts: { books: number; added: number; updated: number; removed: number };
  initial?: boolean;
}

export interface LibraryMetadata {
  repository: string;
  sourceUrl: string;
  ref: string;
  commit: string | null;
  syncedAt: string;
  license: { name: string; url: string };
  counts: {
    books: number;
    categories: number;
    languages: number;
    readable: number;
    sourceFiles: number;
    duplicatesRemoved: number;
    invalidUrlsSkipped: number;
    newSinceLastSync: number;
  };
  notes: string[];
}

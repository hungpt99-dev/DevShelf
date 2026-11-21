import type {
  BookmarkRecord, LocalBook, PreferenceRecord, ProgressRecord, ReadingListRecord,
} from "./db";

export interface V2Export {
  version: 2;
  schemaVersion: 2;
  exportedAt: string;
  books: LocalBook[];
  readingProgress: ProgressRecord[];
  readingList: ReadingListRecord[];
  bookmarks: BookmarkRecord[];
  preferences: PreferenceRecord[];
  shelves: unknown[];
  highlights: unknown[];
  sessions: unknown[];
  importedFromVersion?: 1;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function upgradeV1ToV2(raw: {
  exportedAt?: string;
  books?: LocalBook[];
  readingProgress?: ProgressRecord[];
  readingList?: ReadingListRecord[];
  bookmarks?: BookmarkRecord[];
  preferences?: PreferenceRecord[];
}): V2Export {
  return {
    version: 2,
    schemaVersion: 2,
    exportedAt: raw.exportedAt ?? new Date().toISOString(),
    books: array(raw.books) as LocalBook[],
    readingProgress: array(raw.readingProgress) as ProgressRecord[],
    readingList: array(raw.readingList) as ReadingListRecord[],
    bookmarks: array(raw.bookmarks) as BookmarkRecord[],
    preferences: array(raw.preferences) as PreferenceRecord[],
    shelves: [],
    highlights: [],
    sessions: [],
  };
}

/** Accepts v1 and v2 files. Validation happens before any local table is cleared. */
export function normalizeExport(value: unknown): V2Export {
  if (!value || typeof value !== "object") throw new Error("Invalid export file");
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 && raw.version !== 2) throw new Error("Unsupported export version");
  if (!Array.isArray(raw.books) || !Array.isArray(raw.readingList)) throw new Error("Invalid export file");

  const result: V2Export = {
    version: 2,
    schemaVersion: 2,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : new Date().toISOString(),
    books: raw.books as LocalBook[],
    readingProgress: array(raw.readingProgress) as ProgressRecord[],
    readingList: raw.readingList as ReadingListRecord[],
    bookmarks: array(raw.bookmarks) as BookmarkRecord[],
    preferences: array(raw.preferences) as PreferenceRecord[],
    shelves: array(raw.shelves),
    highlights: array(raw.highlights),
    sessions: array(raw.sessions),
  };
  if (raw.version === 1) result.importedFromVersion = 1;
  return result;
}

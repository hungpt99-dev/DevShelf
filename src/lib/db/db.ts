import Dexie, { type Table } from "dexie";
import type { Book } from "@/types/book";

export type ListStatus = "saved" | "reading" | "completed";

export interface LocalBook {
  id: string;
  title: string;
  metadata: Book;
}

export interface ProgressRecord {
  bookId: string;
  chapterId: string | null;
  position: number;
  percentage: number;
  updatedAt: string;
}

export interface ReadingListRecord {
  bookId: string;
  status: ListStatus;
  addedAt: string;
  shelfId?: string | null;
  tags?: string[];
  notes?: string;
  rating?: number;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface ShelfRecord {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface BookmarkRecord {
  id: string;
  bookId: string;
  chapterId: string | null;
  position: number;
  note: string;
  createdAt: string;
}

export interface PreferenceRecord {
  key: string;
  value: unknown;
}

export interface Preferences {
  theme: "light" | "dark" | "sepia";
  readerTheme: "light" | "dark" | "sepia";
  fontFamily: "serif" | "sans";
  fontSize: number;
  readingWidth: number;
  lineHeight: number;
  sidebarDefaultOpen: boolean;
  loadCoverImages: boolean;
  locale: "en" | "vi";
  offlineMode: boolean;
  readingStats: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "light",
  readerTheme: "sepia",
  fontFamily: "serif",
  fontSize: 19,
  readingWidth: 68,
  lineHeight: 1.75,
  sidebarDefaultOpen: true,
  loadCoverImages: true,
  locale: "en",
  offlineMode: false,
  readingStats: false,
};

class DevShelfDatabase extends Dexie {
  books!: Table<LocalBook, string>;
  readingProgress!: Table<ProgressRecord, string>;
  readingList!: Table<ReadingListRecord, string>;
  bookmarks!: Table<BookmarkRecord, string>;
  preferences!: Table<PreferenceRecord, string>;
  shelves!: Table<ShelfRecord, string>;

  constructor() {
    super("devshelf");
    this.version(1).stores({
      books: "id,title",
      readingProgress: "bookId,updatedAt",
      readingList: "bookId,status,addedAt",
      bookmarks: "id,bookId,chapterId",
      preferences: "key",
    });
    this.version(2).stores({
      books: "id,title",
      readingProgress: "bookId,updatedAt",
      readingList: "bookId,status,addedAt,shelfId",
      bookmarks: "id,bookId,chapterId",
      preferences: "key",
      shelves: "id,name,createdAt",
    }).upgrade(async (transaction) => {
      const records = await transaction.table("readingList").toArray();
      await transaction.table("readingList").bulkPut(records.map((record) => ({
        ...record,
        shelfId: record.shelfId ?? null,
        tags: record.tags ?? [],
        notes: record.notes ?? "",
        rating: record.rating ?? 0,
        startedAt: record.startedAt ?? null,
        finishedAt: record.finishedAt ?? null,
      })));
    });
  }
}

let instance: DevShelfDatabase | null = null;

/** Returns null during SSR or when IndexedDB is unavailable; callers degrade gracefully. */
export function getDb(): DevShelfDatabase | null {
  if (typeof indexedDB === "undefined") return null;
  if (!instance) {
    try {
      instance = new DevShelfDatabase();
    } catch {
      return null;
    }
  }
  return instance;
}

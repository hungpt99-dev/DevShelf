import type { Book } from "@/types/book";
import {
  DEFAULT_PREFERENCES, getDb,
  type BookmarkRecord, type ListStatus, type LocalBook, type PreferenceRecord,
  type Preferences, type ProgressRecord, type ReadingListRecord, type ShelfRecord,
} from "./db";
import { normalizeExport } from "./export-format";
import { upgradeReadingListV1, type V2ListEntry } from "../reading-list-v2";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function rememberBook(book: Book): Promise<void> {
  await safe(async () => {
    const db = getDb();
    if (!db) return;
    await db.books.put({ id: book.id, title: book.title, metadata: book } satisfies LocalBook);
  }, undefined);
}

export async function getLocalBooks(): Promise<LocalBook[]> {
  return safe(async () => {
    const db = getDb();
    return db ? await db.books.toArray() : [];
  }, []);
}

export async function getReadingList(): Promise<{ record: ReadingListRecord; book: LocalBook | null }[]> {
  return safe(async () => {
    const db = getDb();
    if (!db) return [];
    const records = await db.readingList.orderBy("addedAt").reverse().toArray();
    return await Promise.all(
      records.map(async (record) => ({ record, book: (await db.books.get(record.bookId)) ?? null })),
    );
  }, []);
}

export async function getListEntry(bookId: string): Promise<ListStatus | null> {
  return safe(async () => (await getDb()?.readingList.get(bookId))?.status ?? null, null);
}

export async function setBookStatus(status: ListStatus, book: Book): Promise<void> {
  await safe(async () => {
    const db = getDb();
    if (!db) return;
    await rememberBook(book);
    const existing = await db.readingList.get(book.id);
    await db.readingList.put({
      bookId: book.id,
      status,
      addedAt: existing?.addedAt ?? new Date().toISOString(),
      shelfId: existing?.shelfId ?? null,
      tags: existing?.tags ?? [],
      notes: existing?.notes ?? "",
      rating: existing?.rating ?? 0,
      startedAt: status === "reading" ? (existing?.startedAt ?? new Date().toISOString()) : (existing?.startedAt ?? null),
      finishedAt: status === "completed" ? (existing?.finishedAt ?? new Date().toISOString()) : null,
    } satisfies ReadingListRecord);
    if (status === "completed") {
      const progress = await db.readingProgress.get(book.id);
      await db.readingProgress.put({
        bookId: book.id,
        chapterId: progress?.chapterId ?? null,
        position: progress?.position ?? 0,
        percentage: 100,
        updatedAt: new Date().toISOString(),
      } satisfies ProgressRecord);
    }
  }, undefined);
}

export async function removeFromList(bookId: string): Promise<void> {
  await safe(async () => {
    const db = getDb();
    if (!db) return;
    await db.readingList.delete(bookId);
    await db.readingProgress.delete(bookId);
    await db.bookmarks.where("bookId").equals(bookId).delete();
  }, undefined);
}

export async function saveProgress(bookId: string, chapterId: string | null, position: number, percentage: number): Promise<void> {
  await safe(async () => {
    const db = getDb();
    if (!db) return;
    await db.readingProgress.put({
      bookId, chapterId, position, percentage, updatedAt: new Date().toISOString(),
    } satisfies ProgressRecord);
    const entry = await db.readingList.get(bookId);
    if (entry && entry.status === "saved" && percentage > 1) {
      await db.readingList.put({ ...entry, status: "reading" });
    }
  }, undefined);
}

export async function getProgress(bookId: string): Promise<ProgressRecord | null> {
  return safe(async () => (await getDb()?.readingProgress.get(bookId)) ?? null, null);
}

export async function addBookmark(bookId: string, chapterId: string | null, position: number, note: string): Promise<void> {
  await safe(async () => {
    const db = getDb();
    if (!db) return;
    await db.bookmarks.put({
      id: `${bookId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      bookId, chapterId, position, note, createdAt: new Date().toISOString(),
    } satisfies BookmarkRecord);
  }, undefined);
}

export async function getBookmarks(bookId: string): Promise<BookmarkRecord[]> {
  return safe(async () => {
    const db = getDb();
    return db ? await db.bookmarks.where("bookId").equals(bookId).toArray() : [];
  }, []);
}

export async function removeBookmark(id: string): Promise<void> {
  await safe(async () => { await getDb()?.bookmarks.delete(id); }, undefined);
}

export async function getShelves(): Promise<ShelfRecord[]> {
  return safe(async () => {
    const db = getDb();
    return db ? await db.shelves.toArray() : [];
  }, []);
}

export async function createShelf(name: string, color: string): Promise<ShelfRecord> {
  const shelf: ShelfRecord = {
    id: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(), color, createdAt: new Date().toISOString(),
  };
  await safe(async () => { await getDb()?.shelves.put(shelf); }, undefined);
  return shelf;
}

export async function deleteShelf(id: string): Promise<void> {
  await safe(async () => {
    const db = getDb();
    if (!db) return;
    await db.shelves.delete(id);
    for (const entry of await db.readingList.where("shelfId").equals(id).toArray()) {
      await db.readingList.put({ ...entry, shelfId: null });
    }
  }, undefined);
}

export function toV2Entry(record: ReadingListRecord): V2ListEntry {
  return {
    bookId: record.bookId, status: record.status, addedAt: record.addedAt,
    shelfId: record.shelfId ?? null, tags: record.tags ?? [], notes: record.notes ?? "",
    rating: record.rating ?? 0, startedAt: record.startedAt ?? null, finishedAt: record.finishedAt ?? null,
  };
}

export async function getV2Entries(): Promise<V2ListEntry[]> {
  const records = await safe(async () => (await getDb()?.readingList.toArray()) ?? [], []);
  return upgradeReadingListV1(records);
}

export async function updateListEntry(bookId: string, patch: Partial<V2ListEntry>): Promise<void> {
  await safe(async () => {
    const db = getDb();
    const existing = await db?.readingList.get(bookId);
    if (!db || !existing) return;
    await db.readingList.put({ ...existing, ...patch, bookId });
  }, undefined);
}

export async function getPreferences(): Promise<Preferences> {
  return safe(async () => {
    const db = getDb();
    if (!db) return DEFAULT_PREFERENCES;
    const records = await db.preferences.toArray();
    const values = Object.fromEntries(records.map((record) => [record.key, record.value])) as Partial<Preferences>;
    return { ...DEFAULT_PREFERENCES, ...values };
  }, DEFAULT_PREFERENCES);
}

export async function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]): Promise<void> {
  await safe(async () => {
    await getDb()?.preferences.put({ key, value } satisfies PreferenceRecord);
  }, undefined);
}

export async function exportData(): Promise<string> {
  const db = getDb();
  const data = {
    version: 2,
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    books: db ? await db.books.toArray() : [],
    readingProgress: db ? await db.readingProgress.toArray() : [],
    readingList: db ? await db.readingList.toArray() : [],
    bookmarks: db ? await db.bookmarks.toArray() : [],
    preferences: db ? await db.preferences.toArray() : [],
    shelves: db ? await db.shelves.toArray() : [],
    highlights: [],
    sessions: [],
  };
  return JSON.stringify(data, null, 2);
}

export async function importData(text: string): Promise<{ books: number; readingList: number; bookmarks: number }> {
  const parsed = normalizeExport(JSON.parse(text) as unknown);
  const db = getDb();
  if (!db) throw new Error("IndexedDB is unavailable in this browser");
  await db.transaction("rw", [db.books, db.readingProgress, db.readingList, db.bookmarks, db.preferences, db.shelves], async () => {
    await Promise.all([
      db.books.clear(), db.readingProgress.clear(), db.readingList.clear(), db.bookmarks.clear(), db.preferences.clear(), db.shelves.clear(),
    ]);
    await db.books.bulkAdd(parsed.books);
    await db.readingProgress.bulkAdd(parsed.readingProgress);
    await db.readingList.bulkAdd(parsed.readingList);
    await db.bookmarks.bulkAdd(parsed.bookmarks);
    await db.preferences.bulkAdd(parsed.preferences);
    await db.shelves.bulkAdd(parsed.shelves as ShelfRecord[]);
  });
  return { books: parsed.books.length, readingList: parsed.readingList.length, bookmarks: parsed.bookmarks?.length ?? 0 };
}

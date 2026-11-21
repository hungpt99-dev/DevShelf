import type { Book } from "@/types/book";
import {
  DEFAULT_PREFERENCES, getDb,
  type BookmarkRecord, type ListStatus, type LocalBook, type PreferenceRecord,
  type Preferences, type ProgressRecord, type ReadingListRecord,
} from "./db";

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
    version: 1,
    exportedAt: new Date().toISOString(),
    books: db ? await db.books.toArray() : [],
    readingProgress: db ? await db.readingProgress.toArray() : [],
    readingList: db ? await db.readingList.toArray() : [],
    bookmarks: db ? await db.bookmarks.toArray() : [],
    preferences: db ? await db.preferences.toArray() : [],
  };
  return JSON.stringify(data, null, 2);
}

export async function importData(text: string): Promise<{ books: number; readingList: number; bookmarks: number }> {
  const parsed = JSON.parse(text) as {
    version?: number;
    books?: LocalBook[];
    readingProgress?: ProgressRecord[];
    readingList?: ReadingListRecord[];
    bookmarks?: BookmarkRecord[];
    preferences?: PreferenceRecord[];
  };
  if (parsed.version !== 1 || !Array.isArray(parsed.books) || !Array.isArray(parsed.readingList)) {
    throw new Error("Not a DevShelf v1 export file");
  }
  const db = getDb();
  if (!db) throw new Error("IndexedDB is unavailable in this browser");
  await db.transaction("rw", db.books, db.readingProgress, db.readingList, db.bookmarks, db.preferences, async () => {
    await Promise.all([
      db.books.clear(), db.readingProgress.clear(), db.readingList.clear(), db.bookmarks.clear(), db.preferences.clear(),
    ]);
    await db.books.bulkAdd(parsed.books ?? []);
    await db.readingProgress.bulkAdd(parsed.readingProgress ?? []);
    await db.readingList.bulkAdd(parsed.readingList ?? []);
    await db.bookmarks.bulkAdd(parsed.bookmarks ?? []);
    await db.preferences.bulkAdd(parsed.preferences ?? []);
  });
  return { books: parsed.books.length, readingList: parsed.readingList.length, bookmarks: parsed.bookmarks?.length ?? 0 };
}

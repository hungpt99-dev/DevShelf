import type { ListStatus } from "./db/db";

export interface Shelf {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface V2ListEntry {
  bookId: string;
  status: ListStatus;
  addedAt: string;
  shelfId: string | null;
  tags: string[];
  notes: string;
  rating: number;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface V1ListEntry {
  bookId: string;
  status: ListStatus;
  addedAt: string;
}

export interface ListFilters {
  status?: ListStatus;
  shelfId?: string;
  tag?: string;
  minRating?: number;
  sort?: "added" | "title" | "status" | "rating";
}

export function upgradeReadingListV1(list: V1ListEntry[]): V2ListEntry[] {
  return list.map((record) => ({
    ...record,
    shelfId: null,
    tags: [],
    notes: "",
    rating: 0,
    startedAt: null,
    finishedAt: null,
  }));
}

export function filterAndSortEntries(
  entries: V2ListEntry[],
  context: { shelves?: Shelf[]; titles?: Record<string, string> },
  filters: ListFilters = {},
): V2ListEntry[] {
  const result = entries.filter((entry) => {
    if (filters.status && entry.status !== filters.status) return false;
    if (filters.shelfId && entry.shelfId !== filters.shelfId) return false;
    if (filters.tag && !entry.tags.includes(filters.tag)) return false;
    if (filters.minRating && entry.rating < filters.minRating) return false;
    return true;
  });
  const titles = context.titles ?? {};
  const statusOrder: Record<ListStatus, number> = { reading: 0, saved: 1, completed: 2 };
  return result.sort((a, b) => {
    if (filters.sort === "rating") return b.rating - a.rating || a.bookId.localeCompare(b.bookId);
    if (filters.sort === "title") return (titles[a.bookId] ?? a.bookId).localeCompare(titles[b.bookId] ?? b.bookId);
    if (filters.sort === "status") return statusOrder[a.status] - statusOrder[b.status] || b.addedAt.localeCompare(a.addedAt);
    return b.addedAt.localeCompare(a.addedAt);
  });
}

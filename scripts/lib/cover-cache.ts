export interface CoverMiss { checkedAt: string }
export type CoverMissCache = Record<string, CoverMiss>;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function shouldRetryMiss(miss: CoverMiss | undefined, now = Date.now(), force = false): boolean {
  if (!miss) return true;
  if (force) return true;
  const checked = Date.parse(miss.checkedAt);
  return !Number.isFinite(checked) || now - checked >= THIRTY_DAYS_MS;
}

export interface PlanArgs {
  books: { id: string }[];
  covers: Record<string, string>;
  misses: CoverMissCache;
  now?: number;
  force?: boolean;
  limit?: number;
}

/** Books that still need an Open Library lookup, in catalog order. */
export function planCoverLookups({ books, covers, misses, now = Date.now(), force = false, limit }: PlanArgs): string[] {
  const pending = books
    .map((book) => book.id)
    .filter((id) => !covers[id] && shouldRetryMiss(misses[id], now, force));
  return typeof limit === "number" && limit >= 0 ? pending.slice(0, limit) : pending;
}

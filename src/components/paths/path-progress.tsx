"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { pathProgress } from "@/lib/paths";
import { getV2Entries } from "@/lib/db/operations";
import type { PathBook } from "@/lib/paths";

export function PathProgress({ books }: { books: PathBook[] }) {
  const entries = useLiveQuery(() => getV2Entries(), []);
  const statuses = Object.fromEntries((entries ?? []).map((entry) => [entry.bookId, entry.status]));
  const progress = pathProgress(books, statuses);
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-lime" style={{ width: `${progress.percentage}%` }} role="progressbar" aria-valuenow={progress.percentage} aria-valuemin={0} aria-valuemax={100} aria-label="Path progress" />
      </div>
      <p className="mt-1.5 font-mono text-[10px] text-muted">{progress.completed}/{progress.total} complete · {progress.reading} reading</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { ArrowRight, Clock, Trash2 } from "lucide-react";
import { BookCover } from "@/components/book/BookCover";
import { getProgress, getReadingList, removeFromList } from "@/lib/db/operations";
import type { ListStatus } from "@/lib/db/db";

type Entry = NonNullable<Awaited<ReturnType<typeof getReadingList>>>[number];

const LABELS: Record<ListStatus, string> = {
  saved: "Saved", reading: "Currently reading", completed: "Completed",
};

function EntryCard({ entry, progress }: { entry: Entry; progress: number }) {
  const book = entry.book?.metadata;
  if (!book) return null;
  return (
    <article className="flex flex-wrap items-center gap-4 rounded-[16px] border border-line bg-card p-3 hover:border-lime">
      <Link href={`/books/${book.id}`} className="w-14 shrink-0"><BookCover book={book} small /></Link>
      <div className="min-w-[180px] flex-1">
        <Link href={`/books/${book.id}`} className="text-[13px] font-medium hover:text-lime-text">{book.title}</Link>
        <p className="mt-0.5 truncate text-[11px] text-muted">{book.authors.length ? book.authors.join(", ") : "Unknown"} · {book.language}</p>
      </div>
      <div className="min-w-[130px] flex-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#262626]">
          <div className="h-full rounded-full bg-lime" style={{ width: `${Math.round(progress)}%` }} role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress for ${book.title}`} />
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-muted">{Math.round(progress)}% · {LABELS[entry.record.status]}</p>
      </div>
      <div className="flex items-center gap-1">
        {book.reading.available && (
          <Link href={`/read/${book.id}`} className="primary-action inline-flex h-8 items-center gap-1 rounded-[12px] bg-button-bg px-3 text-[12px] font-medium text-button-fg hover:opacity-90">
            Continue <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
        <button type="button" onClick={() => void removeFromList(book.id)} className="flex size-8 items-center justify-center rounded-[12px] border border-line hover:border-lime" aria-label={`Remove ${book.title} from library`}>
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </article>
  );
}

export function ReadingListView() {
  const entries = useLiveQuery(() => getReadingList(), []);
  const progresses = useLiveQuery(async () => {
    const list = await getReadingList();
    return Object.fromEntries(await Promise.all(list.map(async (item) => [item.record.bookId, (await getProgress(item.record.bookId))?.percentage ?? 0])));
  }, [entries]);

  const all = entries ?? [];
  const [active, setActive] = useState<ListStatus>("reading");
  const list = all.filter((entry) => entry.record.status === active);

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Shelf status">
        {(["reading", "saved", "completed"] as const).map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={active === status}
            onClick={() => setActive(status)}
            className={
              active === status
                ? "rounded-full border border-white bg-white px-3.5 py-1.5 text-[12px] font-medium text-black"
                : "rounded-full border border-line px-3.5 py-1.5 text-[12px] text-muted hover:border-lime"
            }
          >
            {LABELS[status]} ({all.filter((item) => item.record.status === status).length})
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-line py-16 text-center">
          <p className="text-sm font-medium">Nothing here yet</p>
          <p className="mt-1 text-[13px] text-muted">Add a book from its detail page.</p>
        </div>
      ) : (
        <div className="space-y-2">{list.map((entry) => <EntryCard key={entry.record.bookId} entry={entry} progress={progresses?.[entry.record.bookId] ?? 0} />)}</div>
      )}
      {all.length === 0 && (
        <p className="mt-6 flex items-center gap-2 text-[11px] text-muted"><Clock className="size-3.5" aria-hidden /> Your shelf lives in this browser only. No account, no cloud sync.</p>
      )}
    </div>
  );
}

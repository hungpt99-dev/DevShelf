"use client";

import { useEffect, useState } from "react";
import { getShelves, getV2Entries, updateListEntry } from "@/lib/db/operations";
import type { ShelfRecord } from "@/lib/db/db";
import type { V2ListEntry } from "@/lib/reading-list-v2";
import type { Book } from "@/types/book";

export function ListMetaEditor({ book }: { book: Book }) {
  const [shelves, setShelves] = useState<ShelfRecord[]>([]);
  const [entry, setEntry] = useState<V2ListEntry | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([getShelves(), getV2Entries()]).then(([s, entries]) => {
      if (!active) return;
      setShelves(s);
      setEntry(entries.find((item) => item.bookId === book.id) ?? null);
    });
    return () => { active = false; };
  }, [book.id]);

  if (!entry) return null;

  const save = (patch: Partial<V2ListEntry>) => {
    const next = { ...entry, ...patch };
    setEntry(next);
    void updateListEntry(book.id, patch);
  };
  const inputClass = "rounded-[10px] border border-line bg-background px-2 py-1 text-[12px] outline-none hover:border-lime focus:border-lime";

  return (
    <section className="rounded-[16px] border border-line bg-card p-5" aria-label="Library details">
      <h2 className="text-[13px] font-medium">Your library details</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[11px] text-muted">
          Shelf
          <select value={entry.shelfId ?? ""} onChange={(event) => save({ shelfId: event.target.value || null })} className={inputClass}>
            <option value="">No shelf</option>
            {shelves.map((shelf) => <option key={shelf.id} value={shelf.id}>{shelf.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-muted">
          Tags (comma separated)
          <input value={entry.tags.join(", ")} onChange={(event) => save({ tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-muted sm:col-span-2">
          Private note
          <textarea value={entry.notes} onChange={(event) => save({ notes: event.target.value })} rows={3} className={inputClass} />
        </label>
        <div className="flex flex-col gap-1 text-[11px] text-muted">
          Rating
          <div className="flex gap-1" role="group" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => save({ rating })}
                className={`flex size-8 items-center justify-center rounded-[10px] border ${rating <= entry.rating ? "border-lime bg-lime text-on-lime" : "border-line hover:border-lime"}`}
                aria-label={`Rate ${rating} stars`}
                aria-pressed={rating <= entry.rating}
              >
                {rating}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1 text-[11px] text-muted">
          Started / finished
          <div className="flex gap-2">
            <input type="date" value={entry.startedAt?.slice(0, 10) ?? ""} onChange={(event) => save({ startedAt: event.target.value || null })} className={inputClass} aria-label="Started date" />
            <input type="date" value={entry.finishedAt?.slice(0, 10) ?? ""} onChange={(event) => save({ finishedAt: event.target.value || null })} className={inputClass} aria-label="Finished date" />
          </div>
        </div>
      </div>
    </section>
  );
}

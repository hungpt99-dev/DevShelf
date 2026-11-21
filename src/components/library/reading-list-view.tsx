"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, BookOpen, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <article className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary"><BookOpen className="size-4" aria-hidden /></span>
      <div className="min-w-[200px] flex-1">
        <Link href={`/books/${book.id}`} className="text-sm font-medium hover:text-primary">{book.title}</Link>
        <p className="mt-0.5 text-xs text-muted-foreground">{book.authors.join(", ") || "Author not listed"} · {book.language}</p>
      </div>
      <div className="min-w-[140px]">
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary" style={{ width: `${Math.round(progress)}%` }} role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress for ${book.title}`} />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">{Math.round(progress)}% · {LABELS[entry.record.status]}</p>
      </div>
      <div className="flex items-center gap-1">
        {book.reading.available && (
          <Button size="sm" asChild><Link href={`/read/${book.id}`}>Continue <ArrowRight className="size-3.5" aria-hidden /></Link></Button>
        )}
        <Button size="icon" variant="ghost" onClick={() => void removeFromList(book.id)} aria-label={`Remove ${book.title} from library`}><Trash2 className="size-4" /></Button>
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
  const render = (status: ListStatus) => {
    const list = all.filter((entry) => entry.record.status === status);
    if (!list.length) return <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">Nothing here yet. Add a book from its detail page.</p>;
    return <div className="space-y-3">{list.map((entry) => <EntryCard key={entry.record.bookId} entry={entry} progress={progresses?.[entry.record.bookId] ?? 0} />)}</div>;
  };

  return (
    <Tabs defaultValue="reading">
      <TabsList>
        <TabsTrigger value="reading">Currently reading ({all.filter((item) => item.record.status === "reading").length})</TabsTrigger>
        <TabsTrigger value="saved">Saved ({all.filter((item) => item.record.status === "saved").length})</TabsTrigger>
        <TabsTrigger value="completed">Completed ({all.filter((item) => item.record.status === "completed").length})</TabsTrigger>
      </TabsList>
      <TabsContent value="reading" className="mt-5">{render("reading")}</TabsContent>
      <TabsContent value="saved" className="mt-5">{render("saved")}</TabsContent>
      <TabsContent value="completed" className="mt-5">{render("completed")}</TabsContent>
      {all.length === 0 && (
        <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><Clock className="size-3.5" aria-hidden /> Your library lives in this browser only — no account and no cloud sync.</p>
      )}
    </Tabs>
  );
}

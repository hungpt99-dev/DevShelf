"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, BookOpen } from "lucide-react";
import { BookCover } from "@/components/book/BookCover";
import { getProgress, getReadingList } from "@/lib/db/operations";

interface Stats { books: number; categories: number; languages: number; readable: number }

export function HomeBento({ stats }: { stats: Stats }) {
  const reading = useLiveQuery(async () => {
    const list = await getReadingList();
    const withProgress = await Promise.all(
      list.filter((entry) => entry.record.status !== "completed").map(async (entry) => ({
        entry,
        progress: await getProgress(entry.record.bookId),
      })),
    );
    return withProgress
      .filter((item) => (item.progress?.percentage ?? 0) > 0)
      .sort((a, b) => (b.progress?.updatedAt ?? "").localeCompare(a.progress?.updatedAt ?? ""))[0] ?? null;
  }, []);

  const book = reading?.entry.book?.metadata;
  const percent = Math.round(reading?.progress?.percentage ?? 0);
  const location = reading?.progress?.chapterId
    ? `Chapter: ${reading.progress.chapterId}`
    : reading?.progress?.position ? `Page ${reading.progress.position}` : "Just started";

  return (
    <section className={`grid gap-3 ${book ? "md:grid-cols-[3fr_2fr]" : "md:grid-cols-1"}`} aria-label="Library overview">
      {book && (
        <div className="flex min-h-[210px] flex-col justify-between rounded-[16px] border border-lime bg-lime p-6 text-on-lime">
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-12 shrink-0"><BookCover book={book} small /></div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">Continue reading</p>
              <h2 className="mt-2 line-clamp-2 text-[20px] font-medium leading-tight tracking-tight">{book.title}</h2>
              <p className="mt-1 text-[12px] opacity-75">{location}</p>
            </div>
          </div>
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#1a2200]/20">
              <div className="h-full rounded-full bg-[#1a2200]" style={{ width: `${percent}%` }} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress for ${book.title}`} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] opacity-70">{percent}% read</span>
              <Link href={`/read/${book.id}`} className="inline-flex items-center gap-1 rounded-[10px] border border-[#1a2200] px-3 py-1.5 text-[12px] font-medium hover:opacity-80">
                Continue <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[16px] border border-line bg-card p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">The shelf, in numbers</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6">
          {[
            ["Books", stats.books],
            ["Categories", stats.categories],
            ["Languages", stats.languages],
            ["Readable here", stats.readable],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="flex items-center gap-1.5 text-[11px] text-muted"><BookOpen className="size-3" aria-hidden /> {label}</dt>
              <dd className="mt-1 text-[24px] font-medium tracking-tight tabular-nums">{Number(value).toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

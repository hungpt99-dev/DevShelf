"use client";

import Link from "next/link";
import { useState } from "react";
import { BookCover } from "@/components/book/BookCover";
import { useCoverUrl } from "@/lib/use-covers";
import { usePreferences } from "@/providers/preferences-provider";
import type { Book } from "@/types/book";

function formatLabel(book: Book): string {
  if (book.reading.type === "markdown") return "MD";
  if (book.format === "unknown") return "TXT";
  return book.format.toUpperCase();
}

export function BookCard({ book }: { book: Book }) {
  const coverUrl = useCoverUrl(book.id);
  const { effective, ready } = usePreferences();
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const imageFailed = Boolean(coverUrl && failedCover === coverUrl);
  const showTitleBelow = Boolean(coverUrl && ready && effective.loadCoverImages && !imageFailed);

  return (
    <article className="group rounded-[16px] border border-line bg-card p-2 transition-colors duration-150 hover:border-lime motion-reduce:transition-none">
      <Link href={`/books/${book.id}`} aria-label={`Open ${book.title}`} className="block rounded-[12px] focus-visible:outline-offset-4">
        <BookCover book={book} coverUrl={coverUrl} onFallback={() => setFailedCover(coverUrl ?? null)} />
        <div className="px-1 pb-1 pt-3">
          <div className="h-[34px]">
            {showTitleBelow && <p className="line-clamp-2 text-[13px] font-medium leading-[1.3]">{book.title}</p>}
          </div>
          <p className="truncate text-[12px] text-muted">
            {book.authors.length ? book.authors.join(", ") : "Unknown"}
          </p>
        </div>
      </Link>
      <div className="flex flex-wrap gap-1.5 px-1 pb-1 pt-1">
        {book.reading.available && (
          <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-medium text-on-lime">Readable</span>
        )}
        <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-muted">{formatLabel(book)}</span>
        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">{book.language}</span>
      </div>
    </article>
  );
}

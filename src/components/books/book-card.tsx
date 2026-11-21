import Link from "next/link";
import { BookCover } from "@/components/books/book-cover";
import type { Book } from "@/types/book";

function formatLabel(book: Book): string {
  if (book.reading.type === "markdown") return "MD";
  if (book.format === "unknown") return "TXT";
  return book.format.toUpperCase();
}

export function BookCard({ book }: { book: Book }) {
  return (
    <article className="group rounded-[16px] border border-line bg-card p-2 hover:border-lime">
      <Link href={`/books/${book.id}`} className="block focus-visible:outline-offset-4">
        <BookCover book={book} />
        <div className="px-1 pb-1 pt-3">
          <p className="truncate text-[13px] font-medium">{book.title}</p>
          <p className="mt-0.5 truncate text-[12px] text-muted">{book.authors.length ? book.authors.join(", ") : "Unknown"}</p>
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

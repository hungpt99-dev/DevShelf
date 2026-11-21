import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BookGrid } from "@/components/books/book-grid";
import type { Book } from "@/types/book";

export function ShelfRow({ title, books, href = "/books", emptyMessage }: { title: string; books: Book[]; href?: string; emptyMessage?: string }) {
  if (!books.length && !emptyMessage) return null;
  return (
    <section aria-label={title}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[18px] font-medium">{title}</h2>
        <Link href={href} className="inline-flex items-center gap-1 text-[13px] font-medium link-lime hover:opacity-80">
          See all <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      {books.length ? <BookGrid books={books} /> : <p className="rounded-[16px] border border-dashed border-line px-4 py-8 text-center text-[13px] text-muted">{emptyMessage}</p>}
    </section>
  );
}

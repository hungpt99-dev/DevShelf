import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Github } from "lucide-react";
import { BookActions } from "@/components/books/book-actions";
import { BookCover } from "@/components/books/book-cover";
import { ShelfRow } from "@/components/books/shelf-row";
import { SiteFooter } from "@/components/layout/site-footer";
import { getBook, getBooks, getReadable, getRelatedBooks } from "@/lib/data";

export function generateStaticParams() {
  return getBooks().map((book) => ({ id: book.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const book = getBook(id);
  return { title: book?.title ?? "Book not found", description: book ? `${book.title} — ${book.language} programming resource from the free-programming-books catalog.` : undefined };
}

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = getBook(id);
  if (!book) notFound();
  const readable = getReadable().find((item) => item.bookId === book.id) ?? null;
  const related = getRelatedBooks(book);
  const format = book.reading.type === "markdown" ? "MD" : book.format === "unknown" ? "TXT" : book.format.toUpperCase();

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/books" className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-lime-text"><ArrowLeft className="size-4" aria-hidden /> Back to library</Link>

        <div className="mt-8 grid gap-8 md:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
          <div className="mx-auto w-full max-w-[260px] md:mx-0">
            <BookCover book={book} large />
          </div>

          <div>
            <div className="flex flex-wrap gap-1.5">
              {book.categories.slice(0, 3).map((category) => (
                <Link key={category} href={`/books?category=${encodeURIComponent(category)}`} className="rounded-full border border-line px-2.5 py-1 text-[11px] text-muted hover:border-lime">{category}</Link>
              ))}
              <span className="rounded-full border border-line px-2.5 py-1 text-[11px] text-muted">{book.language}</span>
              {book.reading.available && <span className="rounded-full bg-lime px-2.5 py-1 text-[11px] font-medium text-on-lime">Readable</span>}
            </div>

            <h1 className="mt-5 text-balance text-[30px] leading-tight sm:text-[36px]">{book.title}</h1>
            <p className="mt-2 text-[14px] text-muted">{book.authors.length ? book.authors.join(", ") : "Unknown author"}</p>
            <p className="mt-5 max-w-2xl text-[13px] leading-relaxed text-muted">
              DevShelf does not invent descriptions. Open the original source for the author&apos;s own introduction and full text.
            </p>

            <div className="mt-7"><BookActions book={book} resource={readable} /></div>

            <div className="mt-8 rounded-[16px] border border-line bg-card p-5 font-mono text-[11px] leading-relaxed">
              <p className="flex items-center gap-2 text-[11px] font-medium text-ink"><Github className="size-4" aria-hidden /> Catalog entry</p>
              <p className="mt-3 break-all text-muted">{book.source.file}:{book.source.line} · {book.source.heading ?? "Top level"}</p>
              <p className="mt-1 break-all"><a className="text-lime-text underline underline-offset-2" href={book.url} target="_blank" rel="noopener noreferrer">{book.url}</a></p>
              <p className="mt-3 text-muted">format {format} · license {book.license ?? "not stated"}</p>
              {book.alternateUrls.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {book.alternateUrls.map((link) => (
                    <li key={link.url}><a className="inline-flex items-center gap-1 text-muted underline underline-offset-2 hover:text-lime-text" href={link.url} target="_blank" rel="noopener noreferrer">{link.label} <ExternalLink className="size-3" aria-hidden /></a></li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="mt-16"><ShelfRow title="Related books" books={related} href={`/books?category=${encodeURIComponent(book.categories[0] ?? "")}`} /></div>
      </div>
      <SiteFooter />
    </>
  );
}

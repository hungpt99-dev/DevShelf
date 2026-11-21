import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ReaderShell } from "@/components/reader/reader-shell";
import { getBook, getBooks, getReadable } from "@/lib/data";

export function generateStaticParams() {
  return getBooks().map((book) => ({ id: book.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Read: ${getBook(id)?.title ?? "Unknown book"}` };
}

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = getBook(id);
  if (!book) notFound();
  const resource = getReadable().find((item) => item.bookId === book.id);

  if (!resource) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">External resource</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{book.title}</h1>
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          This book is not bundled with DevShelf, so it cannot be rendered in the reader. DevShelf does not scrape websites or bypass access controls. Open the original resource to read it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href={book.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Open original resource <ExternalLink className="size-4" aria-hidden /></a>
          <Link href={`/books/${book.id}`} className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary"><ArrowLeft className="size-4" aria-hidden /> Book details</Link>
        </div>
      </div>
    );
  }

  return <ReaderShell book={book} resource={resource} />;
}

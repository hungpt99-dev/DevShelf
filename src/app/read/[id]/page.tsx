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
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">External resource</p>
        <h1 className="mt-3 text-[30px] font-medium tracking-tight">{book.title}</h1>
        <p className="mt-5 text-[13px] leading-relaxed text-muted">
          This book is not bundled with DevShelf, so it cannot be rendered in the reader. Open the original resource to read it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <a href={book.url} target="_blank" rel="noopener noreferrer" className="primary-action inline-flex items-center gap-2 rounded-[12px] bg-button-bg px-5 py-2.5 text-[13px] font-medium text-button-fg hover:opacity-90">Open original source <ExternalLink className="size-4" aria-hidden /></a>
          <Link href={`/books/${book.id}`} className="inline-flex items-center gap-2 rounded-[12px] border border-line px-5 py-2.5 text-[13px] hover:border-lime"><ArrowLeft className="size-4" aria-hidden /> Book details</Link>
        </div>
      </div>
    );
  }

  return <ReaderShell book={book} resource={resource} />;
}

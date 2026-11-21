import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Github } from "lucide-react";
import { BookActions } from "@/components/books/book-actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { Badge } from "@/components/ui/badge";
import { getBook, getBooks, getReadable, getRelatedBooks } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

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

  const facts = [
    { label: "Language", value: book.language },
    { label: "Categories", value: book.categories.join(", ") },
    { label: "Format", value: book.format === "unknown" ? "Unverified" : book.format.toUpperCase() },
    { label: "Authors", value: book.authors.length ? book.authors.join(", ") : "Not listed in source" },
    { label: "License", value: book.license ?? "Not stated in source" },
    { label: "Reading", value: readable ? "Available inside DevShelf" : "External resource" },
  ];

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/books" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden /> Back to library</Link>
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="flex flex-wrap gap-2">
              {book.categories.map((category) => (
                <Link key={category} href={`/books?category=${encodeURIComponent(category)}`}><Badge variant="outline">{category}</Badge></Link>
              ))}
              <Badge variant="secondary">{book.language}</Badge>
            </div>
            <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{book.title}</h1>
            <p className="mt-3 text-lg text-muted-foreground">{book.authors.length ? book.authors.join(", ") : "No author listed in the source catalog"}</p>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              DevShelf does not invent descriptions. Open the original resource below for the author&apos;s own introduction and full text.
            </p>

            <div className="mt-8"><BookActions book={book} resource={readable} /></div>

            <dl className="mt-10 grid gap-x-8 gap-y-5 border-t border-border pt-8 sm:grid-cols-2">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">{fact.label}</dt>
                  <dd className="mt-1 text-sm">{fact.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 rounded-lg border border-border bg-card p-5 text-sm">
              <p className="flex items-center gap-2 font-medium"><Github className="size-4" aria-hidden /> Original catalog entry</p>
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{book.source.file}:{book.source.line} · {book.source.heading ?? "Top level"}</p>
              <p className="mt-2 break-all text-xs text-muted-foreground"><a className="underline underline-offset-2" href={book.url} target="_blank" rel="noopener noreferrer">{book.url}</a></p>
              {book.alternateUrls.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs">
                  {book.alternateUrls.map((link) => (
                    <li key={link.url}><a className="inline-flex items-center gap-1 text-muted-foreground underline underline-offset-2 hover:text-foreground" href={link.url} target="_blank" rel="noopener noreferrer">{link.label} <ExternalLink className="size-3" aria-hidden /></a></li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <aside className="space-y-6" aria-label="Book details sidebar">
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Reading status</p>
              <p className="mt-3 text-sm font-medium">{readable ? "Bundled for offline-style reading" : "Hosted externally"}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {readable
                  ? `Content is served from a link in the catalog. ${readable.attribution}${readable.license ? ` (${readable.license})` : ""}`
                  : "DevShelf never proxies, scrapes or bypasses access controls on external sites. Your reading list and progress still work locally."}
              </p>
            </div>
            {related.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Related resources ({formatNumber(related.length)} shown)</p>
                <div className="space-y-2">
                  {related.map((item) => (
                    <Link key={item.id} href={`/books/${item.id}`} className="block rounded-md border border-border bg-card p-3 text-sm hover:border-primary/40">{item.title}<span className="mt-1 block text-xs text-muted-foreground">{item.categories[0]}</span></Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}

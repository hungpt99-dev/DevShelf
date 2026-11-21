import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Github } from "lucide-react";
import { BookActions } from "@/components/books/book-actions";
import { BookCover } from "@/components/book/BookCover";
import { ListMetaEditor } from "@/components/books/list-meta-editor";
import { ShelfRow } from "@/components/books/shelf-row";
import { SiteFooter } from "@/components/layout/site-footer";
import { getBook, getBooks, getCoverMetadata, getLinkHealth, getReadable, getRelatedBooks } from "@/lib/data";

export function generateStaticParams() {
  return getBooks().map((book) => ({ id: book.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const book = getBook(id);
  if (!book) return { title: "Book not found" };
  const url = `https://hungpt99-dev.github.io/DevShelf/books/${id}`;
  const description = `${book.title} — ${book.language} programming resource from the free-programming-books catalog.`;
  return {
    title: book.title,
    description,
    alternates: { canonical: url },
    openGraph: { title: book.title, description, url, type: "article", images: [`https://hungpt99-dev.github.io/DevShelf/og/${id}.svg`] },
    twitter: { card: "summary_large_image", title: book.title, description, images: [`https://hungpt99-dev.github.io/DevShelf/og/${id}.svg`] },
  };
}

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = getBook(id);
  if (!book) notFound();
  const readable = getReadable().find((item) => item.bookId === book.id) ?? null;
  const coverMeta = getCoverMetadata()[book.id];
  const related = getRelatedBooks(book);
  const health = getLinkHealth()[book.url];
  const format = book.reading.type === "markdown" ? "MD" : book.format === "unknown" ? "TXT" : book.format.toUpperCase();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "Book", name: book.title,
        author: book.authors.map((name) => ({ "@type": "Person", name })),
        inLanguage: book.language, url: book.url,
      }) }} />
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

            {coverMeta && (
              <section className="mt-6 rounded-[16px] border border-line bg-card p-5" aria-label="Source-provided book details">
                <h2 className="text-[14px] font-medium">Source details</h2>
                {coverMeta.description && <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">{coverMeta.description}</p>}
                <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[12px]">
                  {coverMeta.firstPublishYear && <div><dt className="text-muted">First published</dt><dd>{coverMeta.firstPublishYear}</dd></div>}
                  {coverMeta.pageCount && <div><dt className="text-muted">Pages</dt><dd>{coverMeta.pageCount}</dd></div>}
                  {coverMeta.isbn && <div><dt className="text-muted">ISBN</dt><dd className="font-mono">{coverMeta.isbn}</dd></div>}
                </dl>
                <p className="mt-3 text-[11px] text-muted">Source: <a href={Object.values(coverMeta.sources)[0]} target="_blank" rel="noreferrer" className="link-lime">Open Library</a></p>
              </section>
            )}

            <div className="mt-7"><BookActions book={book} resource={readable} /></div>
            <div className="mt-5"><ListMetaEditor book={book} /></div>

            <div className="mt-8 rounded-[16px] border border-line bg-card p-5 font-mono text-[11px] leading-relaxed">
              <p className="flex items-center gap-2 text-[11px] font-medium text-ink"><Github className="size-4" aria-hidden /> Catalog entry</p>
              <p className="mt-3 break-all text-muted">{book.source.file}:{book.source.line} · {book.source.heading ?? "Top level"}</p>
              <p className="mt-1 break-all"><a className="text-lime-text underline underline-offset-2" href={book.url} target="_blank" rel="noopener noreferrer">{book.url}</a></p>
              {health?.status === "broken" && <p className="mt-2 text-[11px] text-destructive">This link may be unavailable (checked {health.checkedAt.slice(0, 10)}).</p>}
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

        {(book.editions?.length ?? 0) > 1 && (
          <section className="mt-12 rounded-[16px] border border-line bg-card p-5">
            <h2 className="text-[15px] font-medium">{book.editions!.length} editions</h2>
            <ul className="mt-4 divide-y divide-line">
              {book.editions!.map((edition) => (
                <li key={edition.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-[12px]">
                  <Link href={`/books/${edition.id}`} className="hover:text-lime-text">{edition.title} · {edition.language}</Link>
                  <span className="font-mono text-[10px] text-muted">{edition.format}{edition.readable ? " · readable" : ""}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-10 flex flex-wrap gap-2">
          <a href={`https://github.com/hungpt99-dev/DevShelf/issues/new?title=${encodeURIComponent(`Book issue: ${book.title}`)}&body=${encodeURIComponent(`Book id: ${book.id}
Source: ${book.source.file}:${book.source.line}
URL: ${book.url}

Describe the problem:`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-[12px] border border-line px-3 py-2 text-[12px] hover:border-lime">Report broken link</a>
        </div>

        <div className="mt-16"><ShelfRow title="Related books" books={related} href={`/books?category=${encodeURIComponent(book.categories[0] ?? "")}`} /></div>
      </div>
      <SiteFooter />
    </>
  );
}

import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import { ShelfRow } from "@/components/books/shelf-row";
import { CategoryChips } from "@/components/home/category-chips";
import { HeroSearch } from "@/components/home/hero-search";
import { HomeBento } from "@/components/home/home-bento";
import { SiteFooter } from "@/components/layout/site-footer";
import { getBooks, getCategories, getMetadata, getSyncHistory } from "@/lib/data";

export default function HomePage() {
  const books = getBooks();
  const categories = getCategories();
  const metadata = getMetadata();
  const history = getSyncHistory();
  const latestSync = history.at(-1);
  const byId = new Map(books.map((book) => [book.id, book]));
  const addedIds = latestSync?.added ?? [];
  const recent = (addedIds.length
    ? addedIds.map((id) => byId.get(id)).filter((book): book is NonNullable<typeof book> => Boolean(book))
    : books.filter((book) => book.firstSeenAt === metadata.syncedAt))
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 10);
  const readable = books.filter((book) => book.reading.available);
  const curated = books.filter((_, index) => index % 137 === 0).slice(0, 10);
  const synced = metadata.syncedAt.slice(0, 10);

  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-16">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            <span className="size-1.5 rounded-full bg-lime" aria-hidden /> {books.length.toLocaleString()} books · synced {synced}
          </p>
          <h1 className="mx-auto mt-7 max-w-4xl text-balance text-[34px] leading-[1.1] sm:text-[46px]">
            Read the best programming books, <span className="bg-lime px-2 text-on-lime">free.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-[14px] leading-relaxed text-muted sm:text-[15px]">
            A quiet library of free programming books. Search it, open a book, and keep your place — all without an account.
          </p>
          <div className="mt-9"><HeroSearch count={books.length} /></div>
          <CategoryChips categories={categories.slice(0, 10).map((category) => category.name)} />
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
        <ShelfRow title="Ready to read here" books={readable} />

        <HomeBento stats={{ books: books.length, categories: categories.length, languages: metadata.counts.languages, readable: readable.length }} />

        <ShelfRow title="Recently added" books={recent} emptyMessage="No new resources in this sync." />
        <ShelfRow title="From the catalog" books={curated} />

        <section className="rounded-[16px] border border-line bg-card p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="text-[18px] font-medium">Built on open data</h2>
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
                Every record comes from the <a href={metadata.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-lime-text">EbookFoundation/free-programming-books</a> catalog. DevShelf keeps the original link and source file for each book, and never invents descriptions, covers or ratings.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/books" className="inline-flex items-center gap-1 rounded-[12px] border border-line px-4 py-2 text-[13px] hover:border-lime">Browse library <ArrowRight className="size-3.5" aria-hidden /></Link>
              <a href={metadata.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-[12px] border border-line px-4 py-2 text-[13px] hover:border-lime">Source <Github className="size-3.5" aria-hidden /></a>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}

import Link from "next/link";
import { ArrowRight, Check, Database, Layers3, Sparkles } from "lucide-react";
import { BookCard } from "@/components/books/book-card";
import { SearchTrigger } from "@/components/search/search-trigger";
import { SiteFooter } from "@/components/layout/site-footer";
import { Badge } from "@/components/ui/badge";
import { getBooks, getCategories, getMetadata } from "@/lib/data";

const FEATURED_ALIASES = ["Java", "Python", "JavaScript", "TypeScript", "Go", "Rust", "C++", "System Design", "DevOps", "Databases", "AI & Machine Learning"];
const ALIASES: Record<string, string> = {
  "System Design": "Software Architecture",
  Databases: "Database",
  "AI & Machine Learning": "Machine Learning",
};

export default function HomePage() {
  const books = getBooks();
  const categories = getCategories();
  const metadata = getMetadata();
  const byName = new Map(categories.map((category) => [category.name, category]));
  const featured = FEATURED_ALIASES.map((alias) => byName.get(ALIASES[alias] ?? alias)).filter((item): item is NonNullable<typeof item> => Boolean(item));

  const newBooks = books
    .filter((book) => book.firstSeenAt === metadata.syncedAt)
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 6);
  const curated = books
    .filter((book) => book.reading.available)
    .concat(books.filter((_, index) => index % 137 === 0 && !books[index].reading.available))
    .slice(0, 6);

  return (
    <>
      <section className="border-b border-border bg-[radial-gradient(ellipse_at_top,var(--card),var(--background)_70%)]">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <Badge variant="outline" className="mb-6 gap-1.5 font-normal">
            <Sparkles className="size-3" aria-hidden /> Built on an open-source catalog
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">Your library for learning to code.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Explore thousands of free programming books and technical resources. Read supported books right here, or follow the original source.
          </p>
          <div className="mx-auto mt-9 max-w-2xl"><SearchTrigger count={books.length} /></div>
          <div className="mt-5 flex justify-center">
            <ButtonLink href="/books">Explore Library <ArrowRight className="size-4" aria-hidden /></ButtonLink>
          </div>
          <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4 border-t border-border pt-6">
            <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Resources</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{books.length.toLocaleString()}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Categories</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{categories.length}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Languages</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{metadata.counts.languages}</dd></div>
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-16 sm:px-6 lg:px-8">
        <section aria-labelledby="featured-categories">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Browse</p>
              <h2 id="featured-categories" className="mt-1 text-2xl font-semibold tracking-tight">Featured categories</h2>
            </div>
            <Link href="/books" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">All categories <ArrowRight className="size-3.5" aria-hidden /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {featured.map((category) => (
              <Link key={category.name} href={`/books?category=${encodeURIComponent(category.name)}`} className="group flex flex-col justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40">
                <Layers3 className="size-4 text-muted-foreground" aria-hidden />
                <span className="mt-6 text-sm font-medium leading-snug group-hover:text-primary">{category.name}</span>
                <span className="mt-1 text-xs text-muted-foreground">{category.count} resources</span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="explore-library">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Discover</p>
            <h2 id="explore-library" className="mt-1 text-2xl font-semibold tracking-tight">Explore the library</h2>
          </div>
          <div className="grid gap-10 lg:grid-cols-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4" aria-hidden /> New in this sync</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Resources first seen in the {new Date(metadata.syncedAt).toLocaleDateString("en-US")} catalog snapshot.</p>
              <ul className="mt-4 space-y-3">
                {newBooks.map((book) => <li key={book.id}><Link className="text-sm hover:text-primary" href={`/books/${book.id}`}>{book.title}</Link><p className="text-xs text-muted-foreground">{book.categories[0]} · {book.language}</p></li>)}
                {newBooks.length === 0 && <li className="text-sm text-muted-foreground">No new resources in this sync.</li>}
              </ul>
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold"><Database className="size-4" aria-hidden /> Largest collections</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Ranked by the number of resources in the catalog — not by popularity.</p>
              <ul className="mt-4 space-y-3">
                {categories.slice(0, 6).map((category) => (
                  <li key={category.name} className="flex items-center justify-between gap-3 text-sm">
                    <Link className="hover:text-primary" href={`/books?category=${encodeURIComponent(category.name)}`}>{category.name}</Link>
                    <span className="tabular-nums text-muted-foreground">{category.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold"><Check className="size-4" aria-hidden /> Curated selection</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Deterministic picks: books bundled for in-app reading, then every 137th resource in title order. No ratings or fabricated popularity.</p>
              <ul className="mt-4 space-y-3">
                {curated.map((book) => <li key={book.id}><Link className="text-sm hover:text-primary" href={`/books/${book.id}`}>{book.title}</Link><p className="text-xs text-muted-foreground">{book.reading.available ? "Readable in DevShelf" : "External resource"}</p></li>)}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="reading-now">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Start reading</p>
              <h2 id="reading-now" className="mt-1 text-2xl font-semibold tracking-tight">Ready to read inside DevShelf</h2>
              <p className="mt-2 text-sm text-muted-foreground">Bundled from links present in the source catalog, with attribution preserved in the reader.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.filter((book) => book.reading.available).map((book) => <BookCard key={book.id} book={book} />)}
          </div>
        </section>

        <section aria-labelledby="about-library" className="rounded-xl border border-border bg-card p-6 sm:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">About</p>
              <h2 id="about-library" className="mt-1 text-2xl font-semibold tracking-tight">An open library, built from open data</h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Every book record here comes from the <a href={metadata.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">EbookFoundation/free-programming-books</a> repository.
                DevShelf parses its Markdown catalogs, keeps the original links and source file for each entry, and never invents a description, author, rating or license.
                Books that cannot be rendered locally open their original source instead.
              </p>
              <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                The source catalog is licensed <a href={metadata.license.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">CC BY 4.0</a>.
                Individual books keep their own licenses; check the book detail page and reader attribution before reuse.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <ButtonLink href="/books" variant="outline">Browse catalog</ButtonLink>
              <a href={metadata.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Original repository <ArrowRight className="size-4" aria-hidden /></a>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}

function ButtonLink({ href, children, variant = "default" }: { href: string; children: React.ReactNode; variant?: "default" | "outline" }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium transition-colors ${
        variant === "default" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border hover:bg-secondary"
      }`}
    >
      {children}
    </Link>
  );
}

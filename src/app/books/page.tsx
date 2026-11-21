import type { Metadata } from "next";
import { Catalog } from "@/components/books/catalog";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = { title: "Explore the library", description: "Search and filter the full free-programming-books catalog." };

export default function BooksPage() {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Catalog</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Explore the library</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Search by title or author, then narrow by language, category, format and reading availability. Everything runs locally in your browser.</p>
        </header>
        <Catalog />
      </div>
      <SiteFooter />
    </>
  );
}

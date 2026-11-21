import type { Metadata } from "next";
import { Catalog } from "@/components/books/catalog";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = { title: "Library", description: "Search and filter the full free-programming-books catalog." };

export default function BooksPage() {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Catalog</p>
          <h1 className="mt-2 text-[30px] font-medium tracking-tight sm:text-[36px]">The library</h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">Search by title or author, then narrow by language, category, format and reading availability. Everything runs in your browser.</p>
        </header>
        <Catalog />
      </div>
      <SiteFooter />
    </>
  );
}

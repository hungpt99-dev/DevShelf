import type { Metadata } from "next";
import { Suspense } from "react";
import { BooksIntro } from "@/components/books/books-intro";
import { Catalog } from "@/components/books/catalog";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = { title: "Library", description: "Search and filter the full free-programming-books catalog." };

export default function BooksPage() {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <BooksIntro />
        <Suspense fallback={<div className="py-16 text-center text-[13px] text-muted">loading...</div>}>
          <Catalog />
        </Suspense>
      </div>
      <SiteFooter />
    </>
  );
}

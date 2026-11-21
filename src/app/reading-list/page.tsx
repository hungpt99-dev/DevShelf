import type { Metadata } from "next";
import { ReadingListView } from "@/components/library/reading-list-view";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = { title: "Reading list", description: "Your local, account-free reading library." };

export default function ReadingListPage() {
  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Your shelf</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Reading list</h1>
          <p className="mt-2 text-sm text-muted-foreground">Saved books, reading progress and completed titles — stored only in this browser via IndexedDB.</p>
        </header>
        <ReadingListView />
      </div>
      <SiteFooter />
    </>
  );
}

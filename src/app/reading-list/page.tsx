import type { Metadata } from "next";
import { ReadingListView } from "@/components/library/reading-list-view";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = { title: "Reading list", description: "Your local, account-free reading shelf." };

export default function ReadingListPage() {
  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Your shelf</p>
          <h1 className="mt-2 text-[30px] font-medium tracking-tight sm:text-[36px]">Reading list</h1>
          <p className="mt-2 text-[13px] text-muted">Saved books, progress and completed titles — stored only in this browser.</p>
        </header>
        <ReadingListView />
      </div>
      <SiteFooter />
    </>
  );
}

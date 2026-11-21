import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { getBook, getSyncHistory } from "@/lib/data";

export const metadata: Metadata = { title: "Changelog", description: "Catalog synchronization history." };

export default function ChangelogPage() {
  const history = [...getSyncHistory()].reverse();
  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <header>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">History</p>
          <h1 className="mt-2 text-[30px] font-medium tracking-tight sm:text-[36px]">Changelog</h1>
          <p className="mt-2 text-[13px] text-muted">Each record is one catalog synchronization run.</p>
        </header>
        <ol className="mt-8 space-y-3">
          {history.map((entry, index) => (
            <li key={`${entry.syncedAt}-${index}`} className="rounded-[16px] border border-line bg-card p-4">
              <p className="font-mono text-[11px] text-muted">{entry.syncedAt}{entry.commit ? ` · ${entry.commit.slice(0, 12)}` : ""}</p>
              <p className="mt-2 text-[13px] font-medium">{entry.counts.added} added · {entry.counts.updated} updated · {entry.counts.removed} removed</p>
              {entry.added.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {entry.added.slice(0, 8).map((id) => {
                    const book = getBook(id);
                    return book ? <li key={id}><Link href={`/books/${id}`} className="text-[12px] link-lime">{book.title}</Link></li> : null;
                  })}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>
      <SiteFooter />
    </>
  );
}

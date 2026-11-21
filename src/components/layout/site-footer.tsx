import Link from "next/link";
import { Github } from "lucide-react";
import { getMetadata } from "@/lib/data";

export function SiteFooter() {
  const metadata = getMetadata();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium"><span className="size-2 rounded-full bg-lime" aria-hidden /> DevShelf</p>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted">
            A library of free programming books. No account, no backend, no tracking. Your shelf stays in your browser.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">Explore</p>
          <ul className="mt-3 space-y-2 text-[13px] text-muted">
            <li><Link className="hover:text-lime-text" href="/books">All books</Link></li>
            <li><Link className="hover:text-lime-text" href="/reading-list">Reading list</Link></li>
            <li><Link className="hover:text-lime-text" href="/settings">Settings</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Data source</p>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            Catalog from <a className="underline underline-offset-2 hover:text-lime-text" href={metadata.sourceUrl} target="_blank" rel="noopener noreferrer">EbookFoundation/free-programming-books</a>, licensed <a className="underline underline-offset-2 hover:text-lime-text" href={metadata.license.url} target="_blank" rel="noopener noreferrer">CC BY 4.0</a>.
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] text-muted">
            <Github className="size-3" aria-hidden /> synced {metadata.syncedAt.slice(0, 10)} · {metadata.counts.books.toLocaleString()} books
          </p>
        </div>
      </div>
    </footer>
  );
}

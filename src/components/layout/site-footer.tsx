import Link from "next/link";
import { Github } from "lucide-react";
import { getMetadata } from "@/lib/data";

export function SiteFooter() {
  const metadata = getMetadata();
  return (
    <footer className="mt-20 border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <p className="text-sm font-semibold">DevShelf</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            A reading-first library for free programming books. No account, no backend, no tracking — your library stays in your browser.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Explore</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/books">All books</Link></li>
            <li><Link className="hover:text-foreground" href="/reading-list">Reading list</Link></li>
            <li><Link className="hover:text-foreground" href="/settings">Settings & data</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Data source</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Catalog from <a className="underline underline-offset-2 hover:text-foreground" href={metadata.sourceUrl} target="_blank" rel="noopener noreferrer">EbookFoundation/free-programming-books</a>,
            licensed <a className="underline underline-offset-2 hover:text-foreground" href={metadata.license.url} target="_blank" rel="noopener noreferrer">{metadata.license.name}</a>.
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Github className="size-3.5" aria-hidden /> Synced {new Date(metadata.syncedAt).toLocaleDateString("en-US")} · {metadata.counts.books.toLocaleString()} resources
          </p>
        </div>
      </div>
    </footer>
  );
}

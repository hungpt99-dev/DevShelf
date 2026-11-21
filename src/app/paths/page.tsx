import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PathProgress } from "@/components/paths/path-progress";
import { SiteFooter } from "@/components/layout/site-footer";
import { getBook, getPaths } from "@/lib/data";

export const metadata: Metadata = { title: "Learning paths", description: "Curated sequences of real books from the catalog." };

export default function PathsPage() {
  const paths = getPaths();
  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Guided reading</p>
          <h1 className="mt-2 text-[30px] font-medium tracking-tight sm:text-[36px]">Learning paths</h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">Ordered sequences of real catalog books. Progress comes from your local reading list.</p>
        </header>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {paths.map((path) => (
            <Link key={path.id} href={`/paths/${path.id}`} className="rounded-[16px] border border-line bg-card p-5 transition-colors hover:border-lime">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{path.level}{path.estimatedHours ? ` · ${path.estimatedHours}h` : ""}</p>
              <h2 className="mt-2 flex items-center justify-between gap-2 text-[17px] font-medium">{path.title}<ArrowRight className="size-4" aria-hidden /></h2>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">{path.description}</p>
              <div className="mt-4"><PathProgress books={path.books} /></div>
              <p className="mt-2 text-[11px] text-muted">{path.books.map((item) => getBook(item.id)?.title).filter(Boolean).slice(0, 2).join(" · ")}</p>
            </Link>
          ))}
        </div>
      </div>
      <SiteFooter />
    </>
  );
}

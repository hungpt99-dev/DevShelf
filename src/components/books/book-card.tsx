import Link from "next/link";
import { ArrowUpRight, BookOpenText, GitFork } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/utils";
import type { Book } from "@/types/book";

const ACCENTS = ["#6f8d82", "#9a7c58", "#7c849e", "#9a6f72", "#668b93", "#8a7b9c"];

function accentFor(category: string): string {
  const hash = [...category].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ACCENTS[hash % ACCENTS.length];
}

export function BookCard({ book }: { book: Book }) {
  const accent = accentFor(book.categories[0] ?? "General");
  const canRead = book.reading.available;
  return (
    <article className="group relative flex min-h-[220px] flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/40 hover:shadow-[0_8px_30px_-18px_rgba(0,0,0,0.35)]">
      <div className="h-1 w-full" style={{ backgroundColor: accent }} aria-hidden />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/books/${book.id}`} className="text-[15px] font-semibold leading-snug tracking-tight hover:text-primary">
            {book.title}
          </Link>
          <Badge variant={book.format === "unknown" ? "outline" : "secondary"} className="shrink-0 text-[10px] uppercase tracking-wide">
            {book.format === "unknown" ? "unverified" : book.format}
          </Badge>
        </div>
        <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
          {book.authors.length ? book.authors.join(", ") : "Author not listed in source"}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {book.categories.slice(0, 2).map((category) => (
            <Link key={category} href={`/books?category=${encodeURIComponent(category)}`}>
              <Badge variant="outline" className="font-normal text-[11px]">{category}</Badge>
            </Link>
          ))}
          {book.categories.length > 2 && <span className="self-center text-[11px] text-muted-foreground">+{book.categories.length - 2}</span>}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-5">
          <div className="min-w-0 text-[11px] text-muted-foreground">
            <p className="truncate">{book.language}</p>
            <p className="mt-0.5 inline-flex items-center gap-1 truncate" title={`Source: ${book.source.file}, line ${book.source.line}`}>
              <GitFork className="size-3 shrink-0" aria-hidden /> {book.source.file.replace("books/", "")}
            </p>
          </div>
          {canRead ? (
            <Button size="sm" asChild aria-label={`Read ${book.title}`}>
              <Link href={`/read/${book.id}`}>Read <ArrowUpRight className="size-3.5" aria-hidden /></Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild aria-label={`View details for ${book.title}`}>
              <Link href={`/books/${book.id}`}><BookOpenText className="size-3.5" aria-hidden /> Details</Link>
            </Button>
          )}
        </div>
      </div>
      <span className="sr-only">Category slug: {slugify(book.categories[0] ?? "")}</span>
    </article>
  );
}

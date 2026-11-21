"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, Search, X } from "lucide-react";
import { BookGrid } from "@/components/books/book-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchBooks, fetchMetadata } from "@/lib/client-data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { buildSearchIndex, searchBooks } from "@/lib/search";
import type { Book, LibraryMetadata } from "@/types/book";

type Sort = "title" | "new";
type Availability = "all" | "readable" | "external";
const PAGE_SIZE = 20;

export function Catalog() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [metadata, setMetadata] = useState<LibraryMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("");
  const [category, setCategory] = useState("");
  const [format, setFormat] = useState("");
  const [availability, setAvailability] = useState<Availability>("all");
  const [sort, setSort] = useState<Sort>("title");
  const [view, setView] = useState({ key: "", count: PAGE_SIZE });
  const debounced = useDebouncedValue(query, 220);

  useEffect(() => {
    let active = true;
    Promise.all([fetchBooks(), fetchMetadata()])
      .then(([data, meta]) => {
        if (!active) return;
        buildSearchIndex(data);
        setBooks(data);
        setMetadata(meta);
        const initial = new URLSearchParams(window.location.search).get("category");
        if (initial) setCategory(initial);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load the catalog"); });
    return () => { active = false; };
  }, []);

  const filterKey = JSON.stringify([debounced, language, category, format, availability, sort]);
  const visible = view.key === filterKey ? view.count : PAGE_SIZE;
  const loadMore = () => setView({ key: filterKey, count: visible + PAGE_SIZE });

  const languages = useMemo(() => [...new Set((books ?? []).map((book) => book.language))].sort(), [books]);
  const categories = useMemo(() => [...new Set((books ?? []).flatMap((book) => book.categories))].sort(), [books]);
  const formats = useMemo(() => [...new Set((books ?? []).map((book) => book.format))].sort(), [books]);

  const filtered = useMemo(() => {
    const source = debounced.trim().length >= 2
      ? searchBooks(debounced, 5000).map((result) => result.item)
      : (books ?? []);
    const result = source.filter((book) => {
      if (language && book.language !== language) return false;
      if (category && !book.categories.includes(category)) return false;
      if (format && book.format !== format) return false;
      if (availability === "readable" && !book.reading.available) return false;
      if (availability === "external" && book.reading.available) return false;
      return true;
    });
    return result.sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : b.firstSeenAt.localeCompare(a.firstSeenAt) || a.title.localeCompare(b.title),
    );
  }, [books, debounced, language, category, format, availability, sort]);

  const activeFilters = [
    language && { label: language, clear: () => setLanguage("") },
    category && { label: category, clear: () => setCategory("") },
    format && { label: format === "unknown" ? "unverified format" : format, clear: () => setFormat("") },
    availability !== "all" && { label: availability === "readable" ? "readable here" : "external only", clear: () => setAvailability("all") },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const clearAll = () => {
    setQuery(""); setLanguage(""); setCategory(""); setFormat(""); setAvailability("all"); setSort("title");
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-30 -mx-4 border-y border-line bg-background/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or author..." className="h-9 rounded-[12px] border-line bg-card pl-9 text-[13px] focus:border-lime" aria-label="Search catalog" />
          </div>
          <Select value={language || "__all__"} onValueChange={(value) => setLanguage(value === "__all__" ? "" : value)}>
            <SelectTrigger className="w-auto min-w-[140px] whitespace-nowrap" aria-label="Filter by language"><SelectValue placeholder="Language" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All languages</SelectItem>{languages.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={category || "__all__"} onValueChange={(value) => setCategory(value === "__all__" ? "" : value)}>
            <SelectTrigger className="w-auto min-w-[140px] whitespace-nowrap" aria-label="Filter by category"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All categories</SelectItem>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={format || "__all__"} onValueChange={(value) => setFormat(value === "__all__" ? "" : value)}>
            <SelectTrigger className="w-auto min-w-[140px] whitespace-nowrap" aria-label="Filter by format"><SelectValue placeholder="Format" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All formats</SelectItem>{formats.map((item) => <SelectItem key={item} value={item}>{item === "unknown" ? "unverified" : item}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={availability} onValueChange={(value) => setAvailability(value as Availability)}>
            <SelectTrigger className="w-auto min-w-[140px] whitespace-nowrap" aria-label="Filter by reading availability"><SelectValue placeholder="Availability" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any availability</SelectItem>
              <SelectItem value="readable">Readable here</SelectItem>
              <SelectItem value="external">External only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as Sort)}>
            <SelectTrigger className="w-auto min-w-[140px] whitespace-nowrap" aria-label="Sort results"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Sort: A → Z</SelectItem>
              <SelectItem value="new">Sort: newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mx-auto mt-2 flex max-w-7xl flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] text-muted" aria-live="polite">
            {books ? `${filtered.length.toLocaleString()} of ${books.length.toLocaleString()} books` : "loading..."}
          </span>
          {activeFilters.map((item) => (
            <button key={item.label} onClick={item.clear} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] text-muted hover:border-lime" aria-label={`Remove filter ${item.label}`}>
              {item.label}<X className="size-3" aria-hidden />
            </button>
          ))}
          {activeFilters.length > 0 && <button onClick={clearAll} className="text-[11px] link-lime">Clear all</button>}
        </div>
      </div>

      {error && <div role="alert" className="rounded-[16px] border border-destructive/50 p-6 text-center text-[13px] text-destructive">{error}</div>}
      {!books && !error && (
        <div className="grid grid-cols-2 gap-[14px] md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => <Skeleton key={index} className="aspect-[3/4] rounded-[12px]" />)}
        </div>
      )}
      {books && filtered.length === 0 && (
        <div className="rounded-[16px] border border-dashed border-line py-16 text-center">
          <p className="text-sm font-medium">No books match these filters</p>
          <p className="mt-1 text-[13px] text-muted">Try removing a filter or searching for another term.</p>
          <Button variant="outline" size="sm" className="mt-4 rounded-[12px]" onClick={clearAll}>Clear all filters</Button>
        </div>
      )}
      {books && filtered.length > 0 && (
        <>
          <BookGrid books={filtered.slice(0, visible)} />
          {visible < filtered.length && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" className="rounded-[12px]" onClick={loadMore}>
                <ArrowDown className="size-4" aria-hidden /> Load more ({filtered.length - visible} left)
              </Button>
            </div>
          )}
          {metadata && <p className="text-center font-mono text-[10px] text-muted">synced {metadata.syncedAt.slice(0, 10)} · {metadata.repository}</p>}
        </>
      )}
    </div>
  );
}

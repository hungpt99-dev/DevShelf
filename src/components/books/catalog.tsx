"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, Filter, Search, X } from "lucide-react";
import { BookCard } from "@/components/books/book-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchBooks, fetchMetadata } from "@/lib/client-data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { buildSearchIndex, searchBooks } from "@/lib/search";
import type { Book, LibraryMetadata } from "@/types/book";

type Sort = "title" | "new";
type Availability = "all" | "readable" | "external";

const PAGE_SIZE = 24;

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
    availability !== "all" && { label: availability === "readable" ? "readable in DevShelf" : "external only", clear: () => setAvailability("all") },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const clearAll = () => {
    setQuery(""); setLanguage(""); setCategory(""); setFormat(""); setAvailability("all"); setSort("title");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or author..." className="pl-9" aria-label="Search catalog" />
          </div>
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" aria-label="Filter by language">
            <option value="">All languages</option>
            {languages.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3 md:col-span-2 lg:col-span-2">
            <select value={format} onChange={(event) => setFormat(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" aria-label="Filter by format">
              <option value="">All formats</option>
              {formats.map((item) => <option key={item} value={item}>{item === "unknown" ? "unverified" : item}</option>)}
            </select>
            <select value={availability} onChange={(event) => setAvailability(event.target.value as Availability)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" aria-label="Filter by reading availability">
              <option value="all">Any availability</option>
              <option value="readable">Readable here</option>
              <option value="external">External only</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Filter className="size-3.5 text-muted-foreground" aria-hidden />
          <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="rounded-md border border-input bg-background px-2 py-1 text-xs" aria-label="Sort results">
            <option value="title">Sort: A → Z</option>
            <option value="new">Sort: newest in sync</option>
          </select>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {books ? `${filtered.length.toLocaleString()} of ${books.length.toLocaleString()} resources` : "Loading catalog..."}
          </span>
          {activeFilters.length > 0 && (
            <>
              {activeFilters.map((item) => (
                <button key={item.label} onClick={item.clear} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] hover:bg-accent" aria-label={`Remove filter ${item.label}`}>
                  {item.label}<X className="size-3" aria-hidden />
                </button>
              ))}
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearAll}>Clear all</Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive">{error}</div>
      )}

      {!books && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => <Skeleton key={index} className="h-[220px] rounded-lg" />)}
        </div>
      )}

      {books && filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-base font-medium">No books match these filters</p>
          <p className="mt-1 text-sm text-muted-foreground">Try removing a filter or searching for a different term.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={clearAll}>Clear all filters</Button>
        </div>
      )}

      {books && filtered.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, visible).map((book) => <BookCard key={book.id} book={book} />)}
          </div>
          {visible < filtered.length && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={loadMore}>
                <ArrowDown className="size-4" aria-hidden /> Load more ({filtered.length - visible} left)
              </Button>
            </div>
          )}
          {metadata && (
            <p className="text-center text-xs text-muted-foreground">
              Catalog synced {new Date(metadata.syncedAt).toLocaleDateString("en-US")} from {metadata.repository}
            </p>
          )}
        </>
      )}
    </div>
  );
}

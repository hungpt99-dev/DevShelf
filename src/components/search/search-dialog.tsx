"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CornerDownLeft, Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Highlight } from "@/components/search/highlight";
import { fetchBooks } from "@/lib/client-data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { buildSearchIndex, searchBooks } from "@/lib/search";
import { useUIStore } from "@/stores/ui-store";
import type { Book } from "@/types/book";

export function SearchDialog() {
  const router = useRouter();
  const { searchOpen, setSearchOpen, searchQuery, setSearchQuery } = useUIStore();
  const [books, setBooks] = useState<Book[] | null>(null);
  const [query, setQuery] = useState(searchQuery);
  const debounced = useDebouncedValue(query, 180);
  const results = useMemo(() => searchBooks(debounced, 10), [debounced]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const timer = window.setTimeout(() => setQuery(searchQuery), 0);
    return () => window.clearTimeout(timer);
  }, [searchOpen, searchQuery]);

  useEffect(() => {
    if (!searchOpen || books) return;
    let active = true;
    fetchBooks().then((data) => {
      if (!active) return;
      buildSearchIndex(data);
      setBooks(data);
    }).catch(() => { if (active) setBooks([]); });
    return () => { active = false; };
  }, [searchOpen, books]);

  const open = (id: string) => {
    setSearchQuery(query);
    setSearchOpen(false);
    router.push(`/books/${id}`);
  };

  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent className="top-[10%] max-h-[78vh] w-[min(94vw,640px)] translate-y-0 overflow-hidden rounded-[16px] border border-line-strong bg-card p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Search the library</DialogTitle>
          <DialogDescription>Search titles, authors, categories and languages. Results stay in your browser.</DialogDescription>
        </DialogHeader>
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          <Search className="size-4 shrink-0 text-muted" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) open(results[0].item.id);
            }}
            placeholder="Search books, authors, categories..."
            className="h-full w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
            aria-label="Search books"
          />
          <kbd className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">ESC</kbd>
        </div>

        <div className="max-h-[56vh] overflow-y-auto p-2" role="listbox" aria-label="Search results">
          {!books && (
            <div className="flex items-center justify-center gap-2 py-14 text-[13px] text-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Indexing the library...
            </div>
          )}
          {books && debounced.trim().length < 2 && (
            <p className="px-4 py-12 text-center text-[13px] text-muted">Type at least two characters to search {books.length.toLocaleString()} books.</p>
          )}
          {books && debounced.trim().length >= 2 && results.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-medium">No matches for “{debounced}”</p>
              <p className="mt-1 text-[13px] text-muted">Try another title, author or category.</p>
            </div>
          )}
          {results.map((result) => (
            <button
              key={result.item.id}
              type="button"
              onClick={() => open(result.item.id)}
              role="option"
              aria-selected={false}
              className="group flex w-full items-center gap-3 rounded-[12px] border border-transparent px-3 py-2.5 text-left hover:border-lime"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-background font-mono text-[10px] text-muted">
                {result.item.format === "unknown" ? "TXT" : result.item.format.toUpperCase().slice(0, 3)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium"><Highlight text={result.item.title} query={debounced} /></span>
                <span className="block truncate text-[11px] text-muted">
                  {result.item.authors.length ? <Highlight text={result.item.authors.join(", ")} query={debounced} /> : "Unknown"}
                  {" · "}{result.item.categories.slice(0, 2).join(", ")} · {result.item.language}
                </span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </button>
          ))}
          {results.length > 0 && (
            <p className="mt-1 flex items-center gap-2 border-t border-line px-4 py-2.5 font-mono text-[10px] text-muted">
              <CornerDownLeft className="size-3" aria-hidden /> {results.length} results · enter opens the first
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

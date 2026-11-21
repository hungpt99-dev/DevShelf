"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Highlight } from "@/components/search/highlight";
import { fetchBooks } from "@/lib/client-data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { buildSearchIndex, searchBooks } from "@/lib/search";
import { useUIStore } from "@/stores/ui-store";
import type { Book } from "@/types/book";

export function SearchDialog() {
  const router = useRouter();
  const { searchOpen, setSearchOpen } = useUIStore();
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<Book[] | null>(null);
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
    setSearchOpen(false);
    setQuery("");
    router.push(`/books/${id}`);
  };

  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent className="top-[12%] max-h-[75vh] w-[min(94vw,640px)] translate-y-0 overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Search the library</DialogTitle>
          <DialogDescription>Search titles, authors, categories and languages. Results stay in your browser.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) open(results[0].item.id);
            }}
            placeholder="Title, author, category or language..."
            className="h-16 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            aria-label="Search books"
          />
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">ESC</kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2" role="listbox" aria-label="Search results">
          {!books && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Building local search index...
            </div>
          )}
          {books && debounced.trim().length < 2 && (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">Type at least two characters to search {books.length.toLocaleString()} resources.</p>
          )}
          {books && debounced.trim().length >= 2 && results.length === 0 && (
            <div className="px-3 py-10 text-center">
              <p className="text-sm font-medium">No matches for “{debounced}”</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different title, author or category.</p>
            </div>
          )}
          {results.map((result) => (
            <button
              key={result.item.id}
              type="button"
              onClick={() => open(result.item.id)}
              role="option"
              aria-selected={false}
              className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-secondary"
            >
              <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium"><Highlight text={result.item.title} query={debounced} /></span>
                <span className="block truncate text-xs text-muted-foreground">
                  {result.item.authors.length ? <Highlight text={result.item.authors.join(", ")} query={debounced} /> : "Author not listed in source"}
                  {" · "}{result.item.categories.slice(0, 2).join(", ")} · {result.item.language}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </button>
          ))}
          {results.length > 0 && (
            <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              {results.length} result{results.length === 1 ? "" : "s"} · press Enter to open the first result
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

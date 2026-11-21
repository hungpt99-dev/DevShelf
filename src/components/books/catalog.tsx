"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDown, Search, X } from "lucide-react";
import { BookGrid } from "@/components/books/book-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchBooks, fetchLanguages, fetchMetadata } from "@/lib/client-data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useI18n } from "@/lib/i18n";
import { buildSearchIndex, searchBooks } from "@/lib/search";
import { browserLanguageName, buildFilterSearch, defaultFilters, parseFilters, type FilterState } from "@/lib/url-filters";
import type { Book, LanguageRecord, LibraryMetadata } from "@/types/book";

const PAGE_SIZE = 20;
const TRIGGER = "w-auto min-w-[140px] whitespace-nowrap";

export function Catalog() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [override, setOverride] = useState<string | null>(null);
  const search = override ?? searchParams.toString();
  const [books, setBooks] = useState<Book[] | null>(null);
  const [metadata, setMetadata] = useState<LibraryMetadata | null>(null);
  const [languageRecords, setLanguageRecords] = useState<LanguageRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const defaultLanguage = useMemo(
    () => browserLanguageName(languageRecords, typeof navigator === "undefined" ? "en-US" : navigator.language) ?? "",
    [languageRecords],
  );
  const filters = useMemo(() => parseFilters(search, defaultLanguage), [search, defaultLanguage]);
  const debounced = useDebouncedValue(filters.q, 220);

  useEffect(() => {
    let active = true;
    Promise.all([fetchBooks(), fetchMetadata(), fetchLanguages()])
      .then(([data, meta, languages]) => {
        if (!active) return;
        buildSearchIndex(data);
        setBooks(data);
        setMetadata(meta);
        setLanguageRecords(languages);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load the catalog"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onPop = () => setOverride(window.location.search.replace(/^\?/, ""));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const writeSearch = (next: FilterState, push = true) => {
    const query = buildFilterSearch(next, defaultLanguage);
    const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
    if (push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
    setOverride(query);
  };
  const setFilter = <K extends keyof FilterState>(key: K, value: FilterState[K], push = true) => {
    writeSearch({ ...filters, [key]: value, page: 1 }, push);
  };

  const languages = useMemo(() => [...new Set((books ?? []).map((book) => book.language))].sort(), [books]);
  const categories = useMemo(() => [...new Set((books ?? []).flatMap((book) => book.categories))].sort(), [books]);
  const formats = useMemo(() => [...new Set((books ?? []).map((book) => book.format))].sort(), [books]);
  const licenses = useMemo(
    () => [...new Set((books ?? []).map((book) => book.license).filter((license): license is string => Boolean(license)))].sort(),
    [books],
  );

  const filtered = useMemo(() => {
    const source = debounced.trim().length >= 2
      ? searchBooks(debounced, 5000).map((result) => result.item)
      : (books ?? []);
    const result = source.filter((book) => {
      if (filters.language && book.language !== filters.language) return false;
      if (filters.category && !book.categories.includes(filters.category)) return false;
      if (filters.format && book.format !== filters.format) return false;
      if (filters.availability === "readable" && !book.reading.available) return false;
      if (filters.availability === "external" && book.reading.available) return false;
      if (filters.license && book.license !== filters.license) return false;
      return true;
    });
    return result.sort((a, b) =>
      filters.sort === "title"
        ? a.title.localeCompare(b.title)
        : b.firstSeenAt.localeCompare(a.firstSeenAt) || a.title.localeCompare(b.title),
    );
  }, [books, debounced, filters.language, filters.category, filters.format, filters.availability, filters.license, filters.sort]);

  const activeFilters = [
    filters.language && { label: filters.language, clear: () => setFilter("language", "") },
    filters.category && { label: filters.category, clear: () => setFilter("category", "") },
    filters.format && { label: filters.format === "unknown" ? t("catalog.unverified") : filters.format, clear: () => setFilter("format", "") },
    filters.availability !== "all" && { label: filters.availability === "readable" ? t("catalog.readable") : t("catalog.external"), clear: () => setFilter("availability", "all") },
    filters.license && { label: filters.license, clear: () => setFilter("license", "") },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const clearAll = () => writeSearch(defaultFilters(defaultLanguage));
  const visibleCount = filters.page * PAGE_SIZE;

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-30 -mx-4 border-y border-line bg-background/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              value={filters.q}
              onChange={(event) => setFilter("q", event.target.value, false)}
              placeholder={t("catalog.searchPlaceholder")}
              className="h-9 rounded-[12px] border-line bg-card pl-9 text-[13px] focus:border-lime"
              aria-label={t("catalog.searchPlaceholder")}
            />
          </div>
          <Select value={filters.language || "__all__"} onValueChange={(value) => setFilter("language", value === "__all__" ? "" : value)}>
            <SelectTrigger className={TRIGGER} aria-label={t("catalog.language")}><SelectValue placeholder={t("catalog.language")} /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">{t("catalog.allLanguages")}</SelectItem>{languages.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.category || "__all__"} onValueChange={(value) => setFilter("category", value === "__all__" ? "" : value)}>
            <SelectTrigger className={TRIGGER} aria-label={t("catalog.category")}><SelectValue placeholder={t("catalog.category")} /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">{t("catalog.allCategories")}</SelectItem>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.format || "__all__"} onValueChange={(value) => setFilter("format", value === "__all__" ? "" : value)}>
            <SelectTrigger className={TRIGGER} aria-label={t("catalog.format")}><SelectValue placeholder={t("catalog.format")} /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">{t("catalog.allFormats")}</SelectItem>{formats.map((item) => <SelectItem key={item} value={item}>{item === "unknown" ? t("catalog.unverified") : item}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.availability} onValueChange={(value) => setFilter("availability", value as FilterState["availability"])}>
            <SelectTrigger className={TRIGGER} aria-label={t("catalog.availability")}><SelectValue placeholder={t("catalog.availability")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("catalog.anyAvailability")}</SelectItem>
              <SelectItem value="readable">{t("catalog.readable")}</SelectItem>
              <SelectItem value="external">{t("catalog.external")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.license || "__all__"} onValueChange={(value) => setFilter("license", value === "__all__" ? "" : value)}>
            <SelectTrigger className={TRIGGER} aria-label={t("catalog.license")}><SelectValue placeholder={t("catalog.license")} /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">{t("catalog.anyLicense")}</SelectItem>{licenses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.sort} onValueChange={(value) => setFilter("sort", value as FilterState["sort"])}>
            <SelectTrigger className={TRIGGER} aria-label={t("catalog.sort")}><SelectValue placeholder={t("catalog.sort")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="title">{t("catalog.sortTitle")}</SelectItem>
              <SelectItem value="new">{t("catalog.sortNew")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mx-auto mt-2 flex max-w-7xl flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] text-muted" aria-live="polite">
            {books
              ? t("catalog.results").replace("{shown}", filtered.length.toLocaleString()).replace("{total}", books.length.toLocaleString())
              : t("catalog.loading")}
          </span>
          {filters.language && (
            <button onClick={() => setFilter("language", "")} className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted hover:border-lime">
              {t("catalog.allLanguagesButton")}
            </button>
          )}
          {activeFilters.map((item) => (
            <button key={item.label} onClick={item.clear} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] text-muted hover:border-lime" aria-label={t("catalog.removeFilter").replace("{label}", item.label)}>
              {item.label}<X className="size-3" aria-hidden />
            </button>
          ))}
          {(activeFilters.length > 0 || filters.q) && <button onClick={clearAll} className="text-[11px] link-lime">{t("catalog.clearAll")}</button>}
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
          <p className="text-sm font-medium">{t("catalog.emptyTitle")}</p>
          <p className="mt-1 text-[13px] text-muted">{t("catalog.emptyText")}</p>
          <Button variant="outline" size="sm" className="mt-4 rounded-[12px]" onClick={clearAll}>{t("catalog.clearFilters")}</Button>
        </div>
      )}
      {books && filtered.length > 0 && (
        <>
          <BookGrid books={filtered.slice(0, visibleCount)} />
          {visibleCount < filtered.length && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" className="rounded-[12px]" onClick={() => writeSearch({ ...filters, page: filters.page + 1 })}>
                <ArrowDown className="size-4" aria-hidden /> {t("catalog.loadMore").replace("{count}", (filtered.length - visibleCount).toLocaleString())}
              </Button>
            </div>
          )}
          {metadata && <p className="text-center font-mono text-[10px] text-muted">synced {metadata.syncedAt.slice(0, 10)} · {metadata.repository}</p>}
        </>
      )}
    </div>
  );
}

export type Sort = "title" | "new";
export type Availability = "all" | "readable" | "external";

export interface FilterState {
  q: string;
  language: string;
  category: string;
  format: string;
  availability: Availability;
  license: string;
  sort: Sort;
  page: number;
}

export function defaultFilters(defaultLanguage = ""): FilterState {
  return { q: "", language: defaultLanguage, category: "", format: "", availability: "all", license: "", sort: "title", page: 1 };
}

export function parseFilters(search: string, defaultLanguage = ""): FilterState {
  const params = new URLSearchParams(search.replace(/^\?/, ""));
  const availability = params.get("avail");
  const sort = params.get("sort");
  const rawPage = Number(params.get("page"));
  return {
    q: params.get("q") ?? "",
    language: params.has("lang") ? (params.get("lang") === "all" ? "" : (params.get("lang") ?? "")) : defaultLanguage,
    category: params.get("cat") ?? "",
    format: params.get("fmt") ?? "",
    availability: availability === "readable" || availability === "external" ? availability : "all",
    license: params.get("lic") ?? "",
    sort: sort === "new" ? "new" : "title",
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}

export function clampPage(page: number, total: number, pageSize: number): number {
  if (!Number.isFinite(page) || page < 1) return 1;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  return Math.min(Math.trunc(page), maxPage);
}

/**
 * Inclusive-exclusive slice bounds for one catalog page. Clamping the page to
 * the last valid page is not enough on its own: 124 * 20 = 2,480 overshoots a
 * 2,470-book result set, so a cumulative slice would render the whole catalog.
 * Page N shows only books (N-1)*PAGE_SIZE .. N*PAGE_SIZE, capped at the total.
 */
export interface PageSlice {
  start: number;
  end: number;
}

export function pageSlice(page: number, total: number, pageSize: number): PageSlice {
  const start = Math.max(0, (page - 1) * pageSize);
  return { start, end: Math.min(total, start + pageSize) };
}

export function buildFilterSearch(filters: FilterState, defaultLanguage = ""): string {
  const params = new URLSearchParams();
  const q = filters.q.trim();
  if (q) params.set("q", q);
  if (filters.language) {
    if (filters.language !== defaultLanguage) params.set("lang", filters.language);
  } else if (defaultLanguage) params.set("lang", "all");
  if (filters.category) params.set("cat", filters.category);
  if (filters.format) params.set("fmt", filters.format);
  if (filters.availability !== "all") params.set("avail", filters.availability);
  if (filters.license) params.set("lic", filters.license);
  if (filters.sort !== "title") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

const COMMON_LANGUAGES: Record<string, string> = { en: "English", vi: "Vietnamese" };

export function browserLanguageName(
  languages: { code: string; name: string }[],
  navigatorLanguage: string,
): string | undefined {
  const requested = navigatorLanguage.toLowerCase();
  const exact = languages.find((item) => item.code.toLowerCase() === requested || item.name.toLowerCase() === requested);
  if (exact) return exact.name;
  const base = requested.split("-")[0];
  const expectedName = (COMMON_LANGUAGES[base] ?? base).toLowerCase();
  return languages.find((item) => item.name.toLowerCase() === expectedName)?.name;
}

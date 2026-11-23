import assert from "node:assert/strict";
import test from "node:test";
import { browserLanguageName, buildFilterSearch, clampPage, defaultFilters, pageSlice, parseFilters, type FilterState } from "../../src/lib/url-filters";

const languages = [{ code: "langs", name: "English" }, { code: "vi", name: "Vietnamese" }];

test("parseFilters reads every query param and drops unknown values", () => {
  const filters = parseFilters("?q=go%20book&lang=all&cat=Go&fmt=pdf&avail=readable&lic=CC%20BY&sort=new&page=3", "English");
  assert.deepEqual(filters, {
    q: "go book", language: "", category: "Go", format: "pdf",
    availability: "readable", license: "CC BY", sort: "new", page: 3,
  });
  assert.deepEqual(parseFilters("?sort=bogus&page=-2&avail=nope", "English"), defaultFilters("English"));
});

test("missing lang param uses the browser language and lang=all opts out", () => {
  assert.equal(parseFilters("", "English").language, "English");
  assert.equal(parseFilters("?lang=all", "English").language, "");
  assert.equal(parseFilters("?lang=English", "English").language, "English");
});

test("buildFilterSearch omits defaults and keeps explicit all-languages", () => {
  const defaults = defaultFilters("English");
  assert.equal(buildFilterSearch(defaults, "English"), "");
  assert.equal(buildFilterSearch({ ...defaults, language: "" }, "English"), "lang=all");
  assert.equal(buildFilterSearch({ ...defaults, q: "go", license: "CC BY", page: 2 }, "English"), "q=go&lic=CC+BY&page=2");
});

test("browserLanguageName matches code, name and base language", () => {
  assert.equal(browserLanguageName(languages, "vi-VN"), "Vietnamese");
  assert.equal(browserLanguageName(languages, "en-US"), "English");
  assert.equal(browserLanguageName(languages, "xx-YY"), undefined);
});

test("filter page values are always positive integers", () => {
  assert.equal(parseFilters("?page=0", "English").page, 1);
  assert.equal(parseFilters("?page=999", "English").page, 999);
  const state: FilterState = { ...defaultFilters("English"), page: 4 };
  assert.equal(buildFilterSearch(state, "English"), "page=4");
});

test("buildFilterSearch keeps internal spaces in the query and trims only the edges", () => {
  const defaults = defaultFilters("English");
  assert.equal(buildFilterSearch({ ...defaults, q: "web design" }, "English"), "q=web+design");
  assert.equal(buildFilterSearch({ ...defaults, q: "  web  design  " }, "English"), "q=web++design");
  assert.equal(parseFilters("?q=web+design", "English").q, "web design");
});

test("clampPage keeps out-of-range pages within the available result set", () => {
  assert.equal(clampPage(999, 0, 20), 1);
  assert.equal(clampPage(999, 20, 20), 1);
  assert.equal(clampPage(999, 21, 20), 2);
  assert.equal(clampPage(999, 4739, 20), 237);
  assert.equal(clampPage(2, 4739, 20), 2);
  assert.equal(clampPage(0, 4739, 20), 1);
});

test("pageSlice renders one page (not the whole catalog) when the total is not a multiple of PAGE_SIZE (DS-03/R-01)", () => {
  const cards = (page: number, total: number, size = 20) => {
    const { start, end } = pageSlice(clampPage(page, total, size), total, size);
    return Array.from({ length: total }, (_, i) => i).slice(start, end);
  };

  // QA repro: 2,470 results, page=999 clamps to 124. A cumulative 124 * 20
  // slice would render all 2,470 books; the last page holds only 10.
  assert.equal(cards(999, 2470).length, 10);
  assert.deepEqual(cards(999, 2470), Array.from({ length: 10 }, (_, i) => 2460 + i));
  assert.equal(cards(1, 2470).length, 20);
  assert.equal(cards(2, 2470).length, 20);

  // Smaller non-multiple total: 45 books -> last page has 5, page 2 has 20
  // and still leaves 5 for load-more.
  assert.equal(cards(999, 45).length, 5);
  assert.deepEqual(cards(999, 45), [40, 41, 42, 43, 44]);
  assert.equal(cards(2, 45).length, 20);
  assert.equal(45 - pageSlice(2, 45, 20).end, 5); // load-more count
  assert.deepEqual(pageSlice(1, 0, 20), { start: 0, end: 0 }); // empty state

  // Exact multiples are unchanged: page 2 of 40 renders 20, last page renders 20.
  assert.equal(cards(999, 40).length, 20);
  assert.equal(cards(1, 40).length, 20);
  assert.equal(40 - pageSlice(2, 40, 20).end, 0); // no load-more on last page
});


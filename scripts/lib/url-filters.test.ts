import assert from "node:assert/strict";
import test from "node:test";
import { browserLanguageName, buildFilterSearch, defaultFilters, parseFilters, type FilterState } from "../../src/lib/url-filters";

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
